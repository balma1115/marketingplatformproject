import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAuth } from '@/lib/auth-middleware'

// FormData 또는 JSON 처리
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req)
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const contentType = req.headers.get('content-type')

    // JSON 요청 처리 (새로운 방식)
    if (contentType?.includes('application/json')) {
      const body = await req.json()
      const { type, data, autoCreate } = body

      if (!data || !Array.isArray(data)) {
        return NextResponse.json({ error: 'Invalid data format' }, { status: 400 })
      }

      const results = {
        success: 0,
        failed: 0,
        details: [] as string[]
      }

      if (type === 'academies' && autoCreate) {
        // 학원 데이터 처리 (과목/지사 자동 생성)
        for (const item of data) {
          try {
            const { subjectName, branchName, academyName, address, phone } = item

            // 1. 과목 생성 또는 조회
            let subject = await prisma.subject.findFirst({
              where: { name: subjectName }
            })

            if (!subject) {
              // 과목이 없으면 생성
              const subjectCode = subjectName.toLowerCase().replace(/[^a-z0-9]/g, '')
              subject = await prisma.subject.create({
                data: {
                  name: subjectName,
                  code: subjectCode
                }
              })
              results.details.push(`✅ 과목 '${subjectName}' 생성됨`)
            }

            // 2. 지사 생성 또는 조회 (과목별로 구분)
            let branch = await prisma.branch.findFirst({
              where: {
                subjectId: subject.id,
                name: branchName
              }
            })

            if (!branch) {
              // 지사가 없으면 생성 (과목별로 고유한 지사)
              const branchCode = `${subjectName.toLowerCase().replace(/[^a-z0-9]/g, '')}_${branchName.toLowerCase().replace(/[^a-z0-9]/g, '')}`
              branch = await prisma.branch.create({
                data: {
                  subjectId: subject.id,
                  name: branchName,
                  code: branchCode
                }
              })
              results.details.push(`✅ [${subjectName}] 과목의 지사 '${branchName}' 생성됨`)
            }

            // 3. 학원 생성 (지사별로 중복 체크)
            const existingAcademy = await prisma.academy.findFirst({
              where: {
                branchId: branch.id,
                name: academyName
              }
            })

            if (existingAcademy) {
              results.failed++
              results.details.push(`⚠️ [${subjectName} > ${branchName}] 학원 '${academyName}'은(는) 이미 존재합니다`)
            } else {
              await prisma.academy.create({
                data: {
                  branchId: branch.id,
                  name: academyName,
                  address: address || undefined,
                  phone: phone || undefined
                }
              })
              results.success++
              results.details.push(`✅ [${subjectName} > ${branchName}] 학원 '${academyName}' 등록됨`)
            }
          } catch (error) {
            results.failed++
            results.details.push(`❌ 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
          }
        }

        return NextResponse.json(results)
      }
    }

    // 기존 FormData 처리 (이전 버전 호환)
    const formData = await req.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    let text = await file.text()
    // Remove BOM if present
    if (text.charCodeAt(0) === 0xFEFF) {
      text = text.substring(1)
    }
    const lines = text.split('\n').filter(line => line.trim())

    // Skip header row
    const dataLines = lines.slice(1)

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    }

    if (type === 'subjects') {
      // Process subjects CSV
      for (const line of dataLines) {
        const [name, code] = line.split(',').map(s => s.trim())

        if (!name || !code) {
          results.failed++
          results.errors.push(`Invalid data: ${line}`)
          continue
        }

        try {
          // Check if already exists
          const existing = await prisma.subject.findFirst({
            where: {
              OR: [{ name }, { code }]
            }
          })

          if (existing) {
            results.failed++
            results.errors.push(`Subject already exists: ${name}`)
            continue
          }

          await prisma.subject.create({
            data: { name, code }
          })

          results.success++
        } catch (error) {
          results.failed++
          results.errors.push(`Failed to create subject: ${name}`)
        }
      }
    } else if (type === 'branches') {
      // Process branches CSV
      for (const line of dataLines) {
        const [subjectName, branchName, branchCode] = line.split(',').map(s => s.trim())

        if (!subjectName || !branchName) {
          results.failed++
          results.errors.push(`Invalid data: ${line}`)
          continue
        }

        try {
          // Find subject
          const subject = await prisma.subject.findFirst({
            where: { name: subjectName }
          })

          if (!subject) {
            results.failed++
            results.errors.push(`Subject not found: ${subjectName}`)
            continue
          }

          // Check if branch already exists
          const existing = await prisma.branch.findFirst({
            where: {
              subjectId: subject.id,
              name: branchName
            }
          })

          if (existing) {
            results.failed++
            results.errors.push(`Branch already exists: ${branchName}`)
            continue
          }

          await prisma.branch.create({
            data: {
              subjectId: subject.id,
              name: branchName,
              code: branchCode || undefined
            }
          })

          results.success++
        } catch (error) {
          results.failed++
          results.errors.push(`Failed to create branch: ${branchName}`)
        }
      }
    } else if (type === 'academies') {
      // Process academies CSV (기존 방식 - 과목/지사가 이미 존재해야 함)
      for (const line of dataLines) {
        const [subjectName, branchName, academyName, address, phone] =
          line.split(',').map(s => s.trim())

        if (!subjectName || !branchName || !academyName) {
          results.failed++
          results.errors.push(`Invalid data: ${line}`)
          continue
        }

        try {
          // Find subject
          const subject = await prisma.subject.findFirst({
            where: { name: subjectName }
          })

          if (!subject) {
            results.failed++
            results.errors.push(`Subject not found: ${subjectName}`)
            continue
          }

          // Find branch
          const branch = await prisma.branch.findFirst({
            where: {
              subjectId: subject.id,
              name: branchName
            }
          })

          if (!branch) {
            results.failed++
            results.errors.push(`Branch not found: ${branchName}`)
            continue
          }

          // Check if academy already exists
          const existing = await prisma.academy.findFirst({
            where: {
              branchId: branch.id,
              name: academyName
            }
          })

          if (existing) {
            results.failed++
            results.errors.push(`Academy already exists: ${academyName}`)
            continue
          }

          await prisma.academy.create({
            data: {
              branchId: branch.id,
              name: academyName,
              address: address || undefined,
              phone: phone || undefined
              // registrationNumber는 관리자가 별도로 입력
            }
          })

          results.success++
        } catch (error) {
          results.failed++
          results.errors.push(`Failed to create academy: ${academyName}`)
        }
      }
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('CSV upload failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}