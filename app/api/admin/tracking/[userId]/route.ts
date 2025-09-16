import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAuth } from '@/lib/auth-middleware';
import { trackSmartPlaceForUser, trackBlogForUser } from '@/lib/services/simple-tracking-service';
import { trackingManager } from '@/lib/services/tracking-manager';
import { adsDataRefreshService } from '@/lib/services/ads-data-refresh-service';

// POST: 특정 사용자의 추적 실행
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const auth = await verifyAuth(req);
    if (!auth || !['admin', 'agency'].includes(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;
    const body = await req.json();
    const { type } = body; // 'smartplace' | 'blog' | 'ads' | 'all'

    // 사용자 조회
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      include: {
        smartPlace: true,
        blogTrackingProjects: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 대행사는 자신에게 할당된 계정만 추적 가능
    if (auth.role === 'agency' && user.agencyId !== parseInt(auth.userId)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = [];

    // SmartPlace 추적
    if ((type === 'smartplace' || type === 'all') && user.smartPlace) {
      // 추적 작업 추가
      const jobId = trackingManager.addJob({
        userId: userId,
        userName: user.name,
        userEmail: user.email,
        type: 'smartplace',
        status: 'queued',
        progress: { current: 0, total: 0 }
      });
      
      const smartplaceResult = await trackSmartPlaceForUser(user.id, user.name, jobId);
      results.push(smartplaceResult);
    }

    // Blog 추적
    if ((type === 'blog' || type === 'all') && user.blogTrackingProjects.length > 0) {
      // 추적 작업 추가
      const jobId = trackingManager.addJob({
        userId: userId,
        userName: user.name,
        userEmail: user.email,
        type: 'blog',
        status: 'queued',
        progress: { current: 0, total: 0 }
      });
      
      const blogResult = await trackBlogForUser(user.id, user.name, jobId);
      results.push(blogResult);
    }

    // 광고 데이터 새로고침
    if ((type === 'ads' || type === 'all') && user.naverAdsCustomerId) {
      // API 키가 등록된 경우에만 실행
      if (user.naverAdsAccessKey && user.naverAdsSecretKey) {
        try {
          const adsResult = await adsDataRefreshService.refreshUserAdsData(user.id);
          results.push({
            success: adsResult.success,
            userId: user.id.toString(),
            userName: user.name,
            type: 'ads' as const,
            resultsCount: adsResult.dataCount,
            error: adsResult.error
          });
        } catch (error) {
          results.push({
            success: false,
            userId: user.id.toString(),
            userName: user.name,
            type: 'ads' as const,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      } else {
        console.log(`[Tracking] User ${user.name} has ad account but no API credentials`);
      }
    }

    if (results.length === 0) {
      return NextResponse.json(
        { error: 'No tracking service registered for this user' },
        { status: 400 }
      );
    }

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      message: 'Tracking completed',
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      successCount,
      failedCount,
      results
    });

  } catch (error) {
    console.error('Individual tracking error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET: 특정 사용자의 추적 상태 조회
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const auth = await verifyAuth(req);
    if (!auth || !['admin', 'agency'].includes(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;

    // 사용자 조회
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      include: {
        smartPlace: {
          include: {
            keywords: {
              where: { isActive: true },
              include: {
                rankings: {
                  orderBy: { checkDate: 'desc' },
                  take: 1
                }
              }
            }
          }
        },
        blogTrackingProjects: {
          include: {
            keywords: {
              where: { isActive: true },
              include: {
                results: {
                  orderBy: { trackingDate: 'desc' },
                  take: 1
                }
              }
            }
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 대행사는 자신에게 할당된 계정만 조회 가능
    if (auth.role === 'agency' && user.agencyId !== parseInt(auth.userId)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      smartplace: user.smartPlace ? {
        placeName: user.smartPlace.placeName,
        placeId: user.smartPlace.placeId,
        keywords: user.smartPlace.keywords.map(k => ({
          id: k.id,
          keyword: k.keyword,
          lastRanking: k.rankings[0] || null
        }))
      } : null,
      blog: user.blogTrackingProjects[0] ? {
        blogName: user.blogTrackingProjects[0].blogName,
        blogUrl: user.blogTrackingProjects[0].blogUrl,
        keywords: user.blogTrackingProjects[0].keywords.map(k => ({
          id: k.id,
          keyword: k.keyword,
          lastRanking: k.results[0] || null
        }))
      } : null
    });

  } catch (error) {
    console.error('User tracking status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}