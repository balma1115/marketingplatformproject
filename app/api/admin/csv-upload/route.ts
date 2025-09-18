import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAuth } from '@/lib/auth-middleware'

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req)
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
      // Process academies CSV
      for (const line of dataLines) {
        const [subjectName, branchName, academyName, address, phone, registrationNumber] = 
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
              phone: phone || undefined,
              registrationNumber: registrationNumber || undefined
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