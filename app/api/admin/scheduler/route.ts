import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-middleware';
import { getDailyScheduler } from '@/lib/services/daily-scheduler';

// GET: 스케줄러 상태 조회
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const scheduler = getDailyScheduler();
    const status = scheduler.getStatus();

    // 현재 서버 시간 추가
    const serverTime = new Date();
    const koreaTime = new Date(serverTime.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));

    return NextResponse.json({
      scheduler: status,
      serverTime: {
        utc: serverTime.toISOString(),
        korea: koreaTime.toISOString(),
        koreaString: koreaTime.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
      }
    });

  } catch (error) {
    console.error('Scheduler GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: 스케줄러 제어
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, type } = body;

    const scheduler = getDailyScheduler();

    switch (action) {
      case 'start':
        scheduler.start();
        return NextResponse.json({
          success: true,
          message: 'Scheduler started',
          status: scheduler.getStatus()
        });

      case 'stop':
        scheduler.stop();
        return NextResponse.json({
          success: true,
          message: 'Scheduler stopped',
          status: scheduler.getStatus()
        });

      case 'restart':
        scheduler.restart();
        return NextResponse.json({
          success: true,
          message: 'Scheduler restarted',
          status: scheduler.getStatus()
        });

      case 'run':
        // 수동 실행 (백그라운드)
        scheduler.runManually(type || 'all').then(() => {
          console.log(`[Scheduler API] Manual run completed for ${type || 'all'}`);
        }).catch(error => {
          console.error('[Scheduler API] Manual run error:', error);
        });

        return NextResponse.json({
          success: true,
          message: `Manual run started for ${type || 'all'}`,
          status: scheduler.getStatus()
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: start, stop, restart, or run' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Scheduler POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}