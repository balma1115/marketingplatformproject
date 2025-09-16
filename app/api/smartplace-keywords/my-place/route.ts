import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/auth-middleware'

export async function GET(req: NextRequest) {
  return withAuth(req, async (request, userId) => {
    try {
      console.log('my-place API - userId:', userId, 'type:', typeof userId)
      
      // TrackingProject 테이블에서 먼저 조회 (기존 데이터가 있을 수 있음)
      const trackingProject = await prisma.trackingProject.findFirst({
        where: {
          userId: parseInt(userId)
        }
      })
      
      // SmartPlace 테이블에서 사용자의 스마트플레이스 프로젝트 조회 (1개만)
      let place = await prisma.smartPlace.findUnique({
        where: {
          userId: parseInt(userId)
        },
        include: {
          _count: {
            select: { keywords: true }
          }
        }
      })
      
      // SmartPlace가 없지만 TrackingProject가 있는 경우, 자동으로 마이그레이션
      if (!place && trackingProject) {
        console.log('Migrating TrackingProject to SmartPlace for user:', userId)
        
        // 먼저 이 placeId가 다른 사용자에게 이미 있는지 확인
        const existingPlace = await prisma.smartPlace.findUnique({
          where: {
            placeId: trackingProject.placeId
          }
        })
        
        if (existingPlace) {
          // 다른 사용자가 이미 이 placeId를 사용 중이면 새로운 placeId 생성
          // 원래 placeId에 사용자 ID를 추가하여 고유하게 만듦
          const newPlaceId = `${trackingProject.placeId}_user${userId}`
          console.log(`PlaceId ${trackingProject.placeId} already exists, creating new placeId: ${newPlaceId}`)
          
          // SmartPlace 생성 (고유한 placeId로)
          place = await prisma.smartPlace.create({
            data: {
              userId: parseInt(userId),
              placeId: newPlaceId,
              placeName: trackingProject.placeName
            },
            include: {
              _count: {
                select: { keywords: true }
              }
            }
          })
        } else {
          // placeId가 사용 가능하면 그대로 사용
          place = await prisma.smartPlace.create({
            data: {
              userId: parseInt(userId),
              placeId: trackingProject.placeId,
              placeName: trackingProject.placeName
            },
            include: {
              _count: {
                select: { keywords: true }
              }
            }
          })
        }
        
        // TrackingKeyword도 SmartPlaceKeyword로 복사
        const trackingKeywords = await prisma.trackingKeyword.findMany({
          where: {
            projectId: trackingProject.id
          }
        })
        
        for (const tk of trackingKeywords) {
          await prisma.smartPlaceKeyword.create({
            data: {
              userId: parseInt(userId),
              smartPlaceId: place.id,
              keyword: tk.keyword,
              isActive: tk.isActive
            }
          }).catch(() => {
            // 중복 무시
          })
        }
        
        console.log('Migration completed for user:', userId)
      }

      console.log('my-place API - place found:', place ? 'Yes' : 'No')
      if (place) {
        console.log('my-place API - place details:', {
          id: place.id,
          placeId: place.placeId,
          placeName: place.placeName,
          userId: place.userId
        })
      }

      if (!place) {
        return NextResponse.json({ place: null })
      }

      // 데이터 포맷팅
      const formattedPlace = {
        id: place.id,
        placeName: place.placeName,
        placeId: place.placeId,
        keywordCount: place._count.keywords,
        isActive: true, // SmartPlace 테이블에는 isActive 필드가 없으므로 기본값
        lastUpdated: place.lastUpdated
      }

      return NextResponse.json({ place: formattedPlace })
    } catch (error) {
      console.error('Failed to fetch user smartplace:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}