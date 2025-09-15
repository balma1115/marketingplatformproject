/**
 * 스케줄러 초기화 모듈
 * Next.js 앱 시작 시 자동으로 스케줄러를 시작합니다.
 */

import { getDailyScheduler } from './services/daily-scheduler';
import { env } from './utils/environment';

// 서버 사이드에서만 실행
if (typeof window === 'undefined') {
  const initScheduler = () => {
    try {
      const scheduler = getDailyScheduler();

      // 환경에 따라 스케줄러 자동 시작
      const shouldAutoStart =
        env.isProduction ||
        process.env.AUTO_SCHEDULER === 'true' ||
        process.env.ENABLE_SCHEDULER === 'true';

      if (shouldAutoStart) {
        // 약간의 지연 후 시작 (서버 초기화 완료 대기)
        setTimeout(() => {
          scheduler.start();
          console.log('========================================');
          console.log('📅 Daily Scheduler Started');
          console.log(`Environment: ${env.isProduction ? 'Production' : 'Development'}`);
          console.log(`Status:`, scheduler.getStatus());
          console.log('========================================');
        }, 5000); // 5초 지연
      } else {
        console.log('========================================');
        console.log('📅 Daily Scheduler Not Started');
        console.log('Reason: Not in production mode');
        console.log('To enable: Set ENABLE_SCHEDULER=true in .env.local');
        console.log('========================================');
      }
    } catch (error) {
      console.error('Failed to initialize scheduler:', error);
    }
  };

  // 초기화 실행
  initScheduler();
}

export default {};