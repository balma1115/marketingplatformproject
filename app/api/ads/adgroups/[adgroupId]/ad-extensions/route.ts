import { NextRequest, NextResponse } from 'next/server'
import { NaverAdsAPI } from '@/lib/services/naver-ads-api'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ adgroupId: string }> }
) {
  try {
    const params = await props.params
    const adgroupId = params.adgroupId
    
    if (!adgroupId) {
      return NextResponse.json(
        { error: 'AdGroup ID is required' },
        { status: 400 }
      )
    }

    // Get authenticated user
    const authHeader = request.headers.get('cookie')
    if (!authHeader || !authHeader.includes('token=')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user from database
    let user = await prisma.user.findFirst({
      where: {
        email: 'nokyang@marketingplat.com'
      }
    })
    
    if (!user) {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { role: 'admin' },
            { role: 'academy' }
          ],
          AND: {
            OR: [
              {
                naverAdsAccessKey: { not: null },
                naverAdsSecretKey: { not: null },
                naverAdsCustomerId: { not: null }
              },
              {
                naverAdApiKey: { not: null },
                naverAdSecret: { not: null },
                naverAdCustomerId: { not: null }
              }
            ]
          }
        }
      })
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found or no API credentials' },
        { status: 404 }
      )
    }

    const accessKey = user.naverAdsAccessKey || user.naverAdApiKey
    const secretKey = user.naverAdsSecretKey || user.naverAdSecret
    const customerId = user.naverAdsCustomerId || user.naverAdCustomerId

    if (!accessKey || !secretKey || !customerId) {
      return NextResponse.json(
        { error: 'Naver Ads API credentials not configured' },
        { status: 400 }
      )
    }

    // Initialize Naver Ads API
    const naverAdsApi = new NaverAdsAPI({
      accessKey,
      secretKey,
      customerId
    })

    // Get ad extensions for the ad group
    const extensions = await naverAdsApi.getAdExtensions(adgroupId)
    
    // Parse adExtension JSON if needed
    const parsedExtensions = extensions.map((ext: any) => {
      let parsedData = {}
      
      // adExtension 필드가 JSON 문자열인 경우 파싱
      if (ext.adExtension) {
        if (typeof ext.adExtension === 'string') {
          try {
            // JSON 파싱 시도
            parsedData = JSON.parse(ext.adExtension)
          } catch (e) {
            // JSON 파싱 실패 시 - PHONE 타입의 경우 직접 전화번호일 수 있음
            if (ext.type === 'PHONE' || ext.type === 'CALL') {
              // 전화번호 형식인지 확인
              const phoneRegex = /^[\d\-\+\(\)\s]+$/
              if (phoneRegex.test(ext.adExtension)) {
                parsedData = { phoneNumber: ext.adExtension }
              } else {
                parsedData = ext.adExtension
              }
            } else {
              console.error('Failed to parse adExtension string:', e)
              parsedData = ext.adExtension
            }
          }
        } else if (typeof ext.adExtension === 'object') {
          parsedData = ext.adExtension
        }
      }
      
      console.log(`Extension ${ext.nccAdExtensionId}:`, {
        type: ext.type,
        status: ext.status,
        adExtension: parsedData,
        originalData: ext
      })
      
      return {
        ...ext,
        parsedAdExtension: parsedData
      }
    })
    
    console.log('All Parsed Extensions:', parsedExtensions)
    
    return NextResponse.json({
      success: true,
      data: parsedExtensions || []
    })
    
  } catch (error: any) {
    console.error('Error fetching ad extensions:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to fetch ad extensions'
      },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ adgroupId: string }> }
) {
  try {
    const params = await props.params
    const adgroupId = params.adgroupId
    const body = await request.json()
    
    // Get authenticated user
    const authHeader = request.headers.get('cookie')
    if (!authHeader || !authHeader.includes('token=')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    let user = await prisma.user.findFirst({
      where: {
        email: 'nokyang@marketingplat.com'
      }
    })
    
    if (!user) {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { role: 'admin' },
            { role: 'academy' }
          ],
          AND: {
            OR: [
              {
                naverAdsAccessKey: { not: null },
                naverAdsSecretKey: { not: null },
                naverAdsCustomerId: { not: null }
              },
              {
                naverAdApiKey: { not: null },
                naverAdSecret: { not: null },
                naverAdCustomerId: { not: null }
              }
            ]
          }
        }
      })
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found or no API credentials' },
        { status: 404 }
      )
    }

    const accessKey = user.naverAdsAccessKey || user.naverAdApiKey
    const secretKey = user.naverAdsSecretKey || user.naverAdSecret
    const customerId = user.naverAdsCustomerId || user.naverAdCustomerId

    if (!accessKey || !secretKey || !customerId) {
      return NextResponse.json(
        { error: 'Naver Ads API credentials not configured' },
        { status: 400 }
      )
    }

    const naverAdsApi = new NaverAdsAPI({
      accessKey,
      secretKey,
      customerId
    })

    // Create new ad extension
    const newExtension = await naverAdsApi.createAdExtension({
      ...body,
      ownerId: adgroupId
    })
    
    return NextResponse.json({
      success: true,
      data: newExtension
    })
    
  } catch (error: any) {
    console.error('Error creating ad extension:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to create ad extension'
      },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ adgroupId: string }> }
) {
  try {
    const body = await request.json()
    
    // Get authenticated user
    const authHeader = request.headers.get('cookie')
    if (!authHeader || !authHeader.includes('token=')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    let user = await prisma.user.findFirst({
      where: {
        email: 'nokyang@marketingplat.com'
      }
    })
    
    if (!user) {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { role: 'admin' },
            { role: 'academy' }
          ],
          AND: {
            OR: [
              {
                naverAdsAccessKey: { not: null },
                naverAdsSecretKey: { not: null },
                naverAdsCustomerId: { not: null }
              },
              {
                naverAdApiKey: { not: null },
                naverAdSecret: { not: null },
                naverAdCustomerId: { not: null }
              }
            ]
          }
        }
      })
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found or no API credentials' },
        { status: 404 }
      )
    }

    const accessKey = user.naverAdsAccessKey || user.naverAdApiKey
    const secretKey = user.naverAdsSecretKey || user.naverAdSecret
    const customerId = user.naverAdsCustomerId || user.naverAdCustomerId

    if (!accessKey || !secretKey || !customerId) {
      return NextResponse.json(
        { error: 'Naver Ads API credentials not configured' },
        { status: 400 }
      )
    }

    const naverAdsApi = new NaverAdsAPI({
      accessKey,
      secretKey,
      customerId
    })

    // Update ad extension
    const updatedExtension = await naverAdsApi.updateAdExtension(body.extensionId, body)
    
    return NextResponse.json({
      success: true,
      data: updatedExtension
    })
    
  } catch (error: any) {
    console.error('Error updating ad extension:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to update ad extension'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ adgroupId: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const extensionId = searchParams.get('extensionId')
    
    if (!extensionId) {
      return NextResponse.json({ error: 'Extension ID is required' }, { status: 400 })
    }
    
    // Get authenticated user
    const authHeader = request.headers.get('cookie')
    if (!authHeader || !authHeader.includes('token=')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    let user = await prisma.user.findFirst({
      where: {
        email: 'nokyang@marketingplat.com'
      }
    })
    
    if (!user) {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { role: 'admin' },
            { role: 'academy' }
          ],
          AND: {
            OR: [
              {
                naverAdsAccessKey: { not: null },
                naverAdsSecretKey: { not: null },
                naverAdsCustomerId: { not: null }
              },
              {
                naverAdApiKey: { not: null },
                naverAdSecret: { not: null },
                naverAdCustomerId: { not: null }
              }
            ]
          }
        }
      })
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found or no API credentials' },
        { status: 404 }
      )
    }

    const accessKey = user.naverAdsAccessKey || user.naverAdApiKey
    const secretKey = user.naverAdsSecretKey || user.naverAdSecret
    const customerId = user.naverAdsCustomerId || user.naverAdCustomerId

    if (!accessKey || !secretKey || !customerId) {
      return NextResponse.json(
        { error: 'Naver Ads API credentials not configured' },
        { status: 400 }
      )
    }

    const naverAdsApi = new NaverAdsAPI({
      accessKey,
      secretKey,
      customerId
    })

    // Delete ad extension
    await naverAdsApi.deleteAdExtension(extensionId)
    
    return NextResponse.json({
      success: true,
      message: '확장소재가 삭제되었습니다.'
    })
    
  } catch (error: any) {
    console.error('Error deleting ad extension:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to delete ad extension'
      },
      { status: 500 }
    )
  }
}