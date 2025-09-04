import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAuth } from '@/lib/auth-middleware';
import { trackAllUsers, getTrackingStatus } from '@/lib/services/simple-tracking-service';

// GET: 모든 계정의 추적 상태 조회
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth || !['admin', 'agency'].includes(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 페이지네이션 파라미터
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // 조건 설정
    let whereCondition: any = {
      role: { in: ['academy', 'branch'] }
    };

    // 대행사는 자신에게 할당된 계정만 조회
    if (auth.role === 'agency') {
      whereCondition.agencyId = auth.userId;
    }

    // 사용자 목록 조회
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where: whereCondition,
        include: {
          smartPlace: {
            include: {
              keywords: {
                where: { isActive: true },
                select: { id: true }
              }
            }
          },
          blogProjects: {
            include: {
              keywords: {
                where: { isActive: true },
                select: { id: true }
              }
            }
          }
        },
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where: whereCondition })
    ]);

    // 각 사용자의 최신 추적 정보 조회
    const trackingData = await Promise.all(
      users.map(async (user) => {
        // SmartPlace 최신 추적 시간
        let smartplaceLastUpdate = null;
        if (user.smartPlace) {
          const latestSmartplace = await prisma.smartPlaceRanking.findFirst({
            where: {
              keyword: {
                userId: user.id
              }
            },
            orderBy: { checkDate: 'desc' },
            select: { checkDate: true }
          });
          smartplaceLastUpdate = latestSmartplace?.checkDate;
        }

        // Blog 최신 추적 시간
        let blogLastUpdate = null;
        const blogProject = user.blogProjects[0];
        if (blogProject) {
          const latestBlog = await prisma.blogRanking.findFirst({
            where: {
              keyword: {
                userId: user.id
              }
            },
            orderBy: { checkDate: 'desc' },
            select: { checkDate: true }
          });
          blogLastUpdate = latestBlog?.checkDate;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          smartplace: {
            registered: !!user.smartPlace,
            placeName: user.smartPlace?.placeName,
            placeId: user.smartPlace?.placeId,
            activeKeywords: user.smartPlace?.keywords.length || 0,
            lastUpdate: smartplaceLastUpdate
          },
          blog: {
            registered: user.blogProjects.length > 0,
            blogName: blogProject?.blogName,
            blogUrl: blogProject?.blogUrl,
            activeKeywords: blogProject?.keywords.length || 0,
            lastUpdate: blogLastUpdate
          }
        };
      })
    );

    // Tracking 상태 조회
    const trackingStatus = getTrackingStatus();
    const queueStatus = {
      smartplace: trackingStatus.smartplace,
      blog: trackingStatus.blog
    };
    
    // Scheduler 상태 (simplified for now)
    const schedulerStatus = {
      isRunning: false,
      lastRun: null,
      nextRun: null
    };

    const response = NextResponse.json({
      users: trackingData,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      },
      queueStatus,
      schedulerStatus
    });
    
    // Add caching headers for 5 seconds
    response.headers.set('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=10');
    
    return response;

  } catch (error) {
    console.error('Tracking API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: 수동으로 전체 추적 실행
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all active users to track (admin과 agency 제외)
    const users = await prisma.user.findMany({
      where: {
        role: { in: ['academy', 'branch'] },
        isActive: true
      },
      include: {
        smartPlace: true,
        blogProjects: true
      }
    });

    // Count actual tracking jobs (등록된 서비스만)
    let jobsCount = 0;
    let usersWithService = 0;
    for (const user of users) {
      let hasService = false;
      if (user.smartPlace) {
        jobsCount++;
        hasService = true;
      }
      if (user.blogProjects && user.blogProjects.length > 0) {
        jobsCount++;
        hasService = true;
      }
      if (hasService) {
        usersWithService++;
      }
    }

    // Start tracking in background (don't await)
    trackAllUsers().then(result => {
      console.log(`[Background Tracking] Completed with ${result.results.length} results`);
    }).catch(error => {
      console.error('[Background Tracking] Error:', error);
    });

    // Return immediately
    return NextResponse.json({
      message: 'Tracking started in background',
      success: true,
      jobsCount,
      usersCount: usersWithService
    });

  } catch (error) {
    console.error('Tracking trigger error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}