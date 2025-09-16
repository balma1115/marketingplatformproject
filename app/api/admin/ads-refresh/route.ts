import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-middleware';
import { adsDataRefreshService } from '@/lib/services/ads-data-refresh-service';

// GET: 광고 데이터 새로고침 상태 조회
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 특정 사용자의 데이터 조회
    const searchParams = req.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (userId) {
      const data = await adsDataRefreshService.getUserAdsData(parseInt(userId));
      return NextResponse.json({ data });
    }

    return NextResponse.json({ 
      message: 'Use POST to refresh ads data',
      endpoints: {
        'POST /api/admin/ads-refresh': 'Refresh all users ads data',
        'POST /api/admin/ads-refresh?userId=X': 'Refresh specific user ads data',
        'GET /api/admin/ads-refresh?userId=X': 'Get user ads data'
      }
    });

  } catch (error) {
    console.error('Ads refresh GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: 광고 데이터 새로고침 실행
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const cleanupOnly = searchParams.get('cleanup') === 'true';

    // 오래된 데이터 정리만 수행
    if (cleanupOnly) {
      const cleanedCount = await adsDataRefreshService.cleanupOldData();
      return NextResponse.json({
        success: true,
        message: `Cleaned up old data for ${cleanedCount} users`
      });
    }

    // 특정 사용자 데이터 새로고침
    if (userId) {
      const result = await adsDataRefreshService.refreshUserAdsData(parseInt(userId));
      return NextResponse.json({
        success: result.success,
        result
      });
    }

    // 모든 사용자 데이터 새로고침 (백그라운드 실행)
    adsDataRefreshService.refreshAllUsersAdsData()
      .then(results => {
        console.log(`[AdsRefresh] Completed refreshing ${results.length} users`);
        const successCount = results.filter(r => r.success).length;
        console.log(`[AdsRefresh] Success: ${successCount}/${results.length}`);
      })
      .catch(error => {
        console.error('[AdsRefresh] Background refresh error:', error);
      });

    return NextResponse.json({
      success: true,
      message: 'Ads data refresh started in background'
    });

  } catch (error) {
    console.error('Ads refresh POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}