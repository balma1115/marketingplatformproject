import { NextRequest, NextResponse } from 'next/server'
import { NaverAdsAPI } from '@/lib/services/naver-ads-api'
import { prisma } from '@/lib/db'
import { verifyAuth } from '@/lib/auth-middleware'

// GET: 네이버에 등록된 플레이스 목록 조회
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req)
    if (!auth.success || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's Naver Ads credentials
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        naverAdsAccessKey: true,
        naverAdsSecretKey: true,
        naverAdsCustomerId: true,
        naverAdApiKey: true,
        naverAdSecret: true,
        naverAdCustomerId: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다' }, { status: 404 })
    }

    // Check both new and old field names for credentials
    const accessKey = user.naverAdsAccessKey || user.naverAdApiKey
    const secretKey = user.naverAdsSecretKey || user.naverAdSecret
    const customerId = user.naverAdsCustomerId || user.naverAdCustomerId

    if (!accessKey || !secretKey || !customerId) {
      return NextResponse.json({ 
        channels: [],
        purchasable: [],
        message: '네이버 광고 API 자격 증명이 없습니다'
      })
    }

    try {
      // Initialize Naver Ads API
      const naverApi = new NaverAdsAPI({
        accessKey,
        secretKey,
        customerId
      })

      // Get both registered channels and purchasable places
      // Note: getPurchasablePlaceChannels might return 404 if not available
      let channels = []
      let purchasablePlaces = []
      
      try {
        channels = await naverApi.getBusinessChannels('PLACE') // Get only PLACE type channels
        console.log('Business channels retrieved:', {
          isArray: Array.isArray(channels),
          length: channels?.length,
          firstItem: channels?.[0]
        })
      } catch (error) {
        console.error('Failed to get business channels:', error)
      }
      
      try {
        purchasablePlaces = await naverApi.getPurchasablePlaceChannels()
      } catch (error) {
        console.error('Failed to get purchasable place channels:', error)
        // This is expected to fail with 404, so we continue without purchasable places
      }

      // Format response - using correct field names from the actual response
      console.log('Formatting channels, raw count:', channels?.length)
      const formattedChannels = (channels || []).map((channel: any) => ({
        id: channel.nccBusinessChannelId,
        placeId: channel.channelKey || channel.referenceKey || channel.nccBusinessChannelId,
        placeName: channel.name || channel.businessInfo?.siteName,
        channelType: channel.channelTp,
        status: channel.status,
        isRegistered: true,
        address: channel.address || channel.businessInfo?.address,
        phoneNumber: channel.telNo || channel.businessInfo?.phoneNumber,
        category: channel.businessInfo?.categoryPath?.join(' > ') || channel.category,
        businessInfo: channel.businessInfo
      }))
      console.log('Formatted channels count:', formattedChannels.length)

      const formattedPurchasable = (purchasablePlaces || []).map((place: any) => ({
        id: place.nccBusinessChannelId || place.channelId,
        placeId: place.businessChannelKey || place.placeId,
        placeName: place.name || place.placeName,
        channelType: 'PLACE',
        status: 'PURCHASABLE',
        isRegistered: false,
        address: place.address,
        phoneNumber: place.telNo,
        category: place.category
      }))

      // Combine and deduplicate
      const allPlaces = [...formattedChannels]
      
      // Add purchasable places that are not already registered
      formattedPurchasable.forEach((place: any) => {
        const exists = formattedChannels.find((ch: any) => 
          ch.placeId === place.placeId || ch.placeName === place.placeName
        )
        if (!exists) {
          allPlaces.push(place)
        }
      })

      const response = {
        places: allPlaces,
        registered: formattedChannels,
        purchasable: formattedPurchasable,
        total: allPlaces.length
      }
      
      console.log('API Response:', {
        placesCount: allPlaces.length,
        registeredCount: formattedChannels.length,
        purchasableCount: formattedPurchasable.length
      })
      
      return NextResponse.json(response)
    } catch (apiError: any) {
      console.error('Naver API failed:', apiError)
      
      // Return empty array if API fails
      return NextResponse.json({
        places: [],
        registered: [],
        purchasable: [],
        error: '네이버 API 호출 실패',
        details: apiError.message
      })
    }
  } catch (error: any) {
    console.error('Failed to get Naver places:', error)
    return NextResponse.json(
      { error: '네이버 플레이스를 가져오는데 실패했습니다' },
      { status: 500 }
    )
  }
}