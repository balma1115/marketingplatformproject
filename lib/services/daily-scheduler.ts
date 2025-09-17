import * as cron from 'node-cron';
import { trackAllUsers } from './simple-tracking-service';
import { adsDataRefreshService } from './ads-data-refresh-service';
import { formatInTimeZone } from 'date-fns-tz';

class DailyScheduler {
  private dailyJob: cron.ScheduledTask | null = null;
  private isRunning: boolean = false;
  private lastRunTime: Date | null = null;
  private nextRunTime: Date | null = null;

  constructor() {
    this.initialize();
  }

  private initialize() {
    // 매일 자정(00:00)에 실행 - 한국 시간 기준
    // node-cron은 서버 시간대를 사용하므로 한국 시간대 설정 필요
    const timezone = 'Asia/Seoul';

    // 모든 추적 작업을 00:00에 통합 실행
    // 로컬: 큐 방식으로 순차 처리
    // 프로덕션: Lambda로 병렬 처리
    this.dailyJob = cron.schedule('0 0 * * *', async () => {
      await this.runAllDailyTasks();
    }, {
      timezone
    } as any);

    // 다음 실행 시간 계산
    this.calculateNextRunTime();
  }

  /**
   * 스케줄러 시작
   */
  start() {
    if (this.isRunning) {
      console.log('[Scheduler] Already running');
      return;
    }

    console.log('[Scheduler] Starting daily scheduler...');

    this.dailyJob?.start();

    this.isRunning = true;
    this.calculateNextRunTime();

    console.log('[Scheduler] Daily scheduler started');
    console.log(`[Scheduler] Next run at: ${this.getNextRunTimeString()}`);
  }

  /**
   * 스케줄러 중지
   */
  stop() {
    if (!this.isRunning) {
      console.log('[Scheduler] Not running');
      return;
    }

    console.log('[Scheduler] Stopping daily scheduler...');

    this.dailyJob?.stop();

    this.isRunning = false;
    this.nextRunTime = null;

    console.log('[Scheduler] Daily scheduler stopped');
  }

  /**
   * 스케줄러 재시작
   */
  restart() {
    this.stop();
    setTimeout(() => {
      this.start();
    }, 1000);
  }

  /**
   * 모든 일일 작업 실행 (00:00에 통합 실행)
   * 로컬: 큐 방식으로 순차 처리
   * 프로덕션: Lambda로 병렬 처리
   */
  private async runAllDailyTasks() {
    try {
      console.log('[Scheduler] ========================================');
      console.log('[Scheduler] Starting daily tasks at 00:00 KST');
      console.log('[Scheduler] ========================================');

      const startTime = new Date();
      this.lastRunTime = startTime;

      // 모든 추적 작업 실행 (스마트플레이스 + 블로그)
      console.log('[Scheduler] Starting all tracking tasks...');
      const trackingResult = await trackAllUsers('all');

      const trackingDuration = (Date.now() - startTime.getTime()) / 1000;
      console.log(`[Scheduler] Tracking completed in ${trackingDuration}s`);
      console.log(`[Scheduler] Results: ${trackingResult.success} success, ${trackingResult.failed} failed`);

      // 광고 데이터 새로고침
      console.log('[Scheduler] Starting ads data refresh...');
      const adsStartTime = Date.now();

      try {
        const adsResults = await adsDataRefreshService.refreshAllUsersAdsData();
        await adsDataRefreshService.cleanupOldData();

        const adsDuration = (Date.now() - adsStartTime) / 1000;
        const adsSuccessCount = adsResults.filter(r => r.success).length;

        console.log(`[Scheduler] Ads refresh completed in ${adsDuration}s`);
        console.log(`[Scheduler] Ads Results: ${adsSuccessCount}/${adsResults.length} success`);
      } catch (adsError) {
        console.error('[Scheduler] Error in ads refresh:', adsError);
      }

      const totalDuration = (Date.now() - startTime.getTime()) / 1000;
      console.log('[Scheduler] ========================================');
      console.log(`[Scheduler] All daily tasks completed in ${totalDuration}s`);
      console.log('[Scheduler] ========================================');

      // 다음 실행 시간 업데이트
      this.calculateNextRunTime();

    } catch (error) {
      console.error('[Scheduler] Error in daily tasks:', error);
    }
  }

  /**
   * 수동 실행 (테스트용)
   */
  async runManually(type: 'all' | 'smartplace' | 'blog' | 'ads' = 'all') {
    console.log(`[Scheduler] Manual run triggered for: ${type}`);

    if (type === 'all') {
      // 전체 작업 실행
      await this.runAllDailyTasks();
    } else if (type === 'ads') {
      // 광고만 실행
      console.log('[Scheduler] Running ads refresh only...');
      const results = await adsDataRefreshService.refreshAllUsersAdsData();
      await adsDataRefreshService.cleanupOldData();
      const successCount = results.filter(r => r.success).length;
      console.log(`[Scheduler] Ads refresh completed: ${successCount}/${results.length} success`);
    } else {
      // 스마트플레이스 또는 블로그만 실행
      console.log(`[Scheduler] Running ${type} tracking only...`);
      const result = await trackAllUsers(type);
      console.log(`[Scheduler] ${type} tracking completed: ${result.success} success, ${result.failed} failed`);
    }
  }

  /**
   * 다음 실행 시간 계산
   */
  private calculateNextRunTime() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    // 오늘 자정이 아직 안 지났으면 오늘 자정
    const todayMidnight = new Date(now);
    todayMidnight.setHours(0, 0, 0, 0);
    
    if (now < todayMidnight) {
      this.nextRunTime = todayMidnight;
    } else {
      this.nextRunTime = tomorrow;
    }
  }

  /**
   * 스케줄러 상태 조회
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRunTime: this.lastRunTime,
      nextRunTime: this.nextRunTime,
      lastRunTimeString: this.lastRunTime
        ? formatInTimeZone(this.lastRunTime, 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss')
        : null,
      nextRunTimeString: this.getNextRunTimeString(),
      jobs: {
        daily: this.dailyJob ? 'Scheduled (00:00 KST)' : 'Not scheduled',
        description: 'All tasks (SmartPlace + Blog + Ads) run together at midnight'
      }
    };
  }

  /**
   * 다음 실행 시간 문자열 반환
   */
  private getNextRunTimeString(): string | null {
    if (!this.nextRunTime) return null;
    return formatInTimeZone(this.nextRunTime, 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
  }
}

// 싱글톤 인스턴스 생성
let schedulerInstance: DailyScheduler | null = null;

export function getDailyScheduler(): DailyScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new DailyScheduler();
  }
  return schedulerInstance;
}

// 자동 시작 (프로덕션 환경에서만)
if (process.env.NODE_ENV === 'production' || process.env.AUTO_SCHEDULER === 'true') {
  const scheduler = getDailyScheduler();
  scheduler.start();
  console.log('[Scheduler] Auto-started in production mode');
}