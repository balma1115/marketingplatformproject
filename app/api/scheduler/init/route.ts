/**
 * 스케줄러 초기화 API
 * Next.js 앱 시작 시 자동으로 호출되어 스케줄러를 시작합니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDailyScheduler } from '@/lib/services/daily-scheduler';
import { env } from '@/lib/utils/environment';

// 스케줄러 초기화 상태 추적
let isInitialized = false;

export async function GET(req: NextRequest) {
  try {
    // 이미 초기화되었으면 스킵
    if (isInitialized) {
      return NextResponse.json({
        success: true,
        message: 'Scheduler already initialized',
        status: getDailyScheduler().getStatus()
      });
    }

    const scheduler = getDailyScheduler();

    // 환경에 따라 스케줄러 시작 여부 결정
    const shouldAutoStart =
      env.isProduction ||
      process.env.AUTO_SCHEDULER === 'true' ||
      process.env.ENABLE_SCHEDULER === 'true';

    if (shouldAutoStart) {
      scheduler.start();
      isInitialized = true;

      console.log('[Scheduler Init] Daily scheduler started automatically');
      console.log('[Scheduler Init] Environment:', {
        NODE_ENV: process.env.NODE_ENV,
        APP_ENV: process.env.APP_ENV,
        AUTO_SCHEDULER: process.env.AUTO_SCHEDULER,
        ENABLE_SCHEDULER: process.env.ENABLE_SCHEDULER
      });

      return NextResponse.json({
        success: true,
        message: 'Scheduler initialized and started',
        environment: env.isProduction ? 'production' : 'development',
        status: scheduler.getStatus()
      });
    } else {
      console.log('[Scheduler Init] Scheduler not started (not in production mode)');
      console.log('[Scheduler Init] To enable in development, set ENABLE_SCHEDULER=true in .env.local');

      return NextResponse.json({
        success: true,
        message: 'Scheduler initialized but not started (development mode)',
        hint: 'Set ENABLE_SCHEDULER=true in .env.local to enable automatic scheduling',
        status: scheduler.getStatus()
      });
    }

  } catch (error) {
    console.error('[Scheduler Init] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to initialize scheduler',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST: 수동으로 스케줄러 시작/중지
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    const scheduler = getDailyScheduler();

    switch (action) {
      case 'start':
        scheduler.start();
        isInitialized = true;
        return NextResponse.json({
          success: true,
          message: 'Scheduler started manually',
          status: scheduler.getStatus()
        });

      case 'stop':
        scheduler.stop();
        isInitialized = false;
        return NextResponse.json({
          success: true,
          message: 'Scheduler stopped',
          status: scheduler.getStatus()
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: start or stop' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('[Scheduler Init] POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}