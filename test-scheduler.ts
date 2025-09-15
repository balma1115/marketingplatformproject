/**
 * 스케줄러 테스트 스크립트
 * 자동 추적 스케줄러가 제대로 작동하는지 확인
 */

import { getDailyScheduler } from './lib/services/daily-scheduler';
import { formatInTimeZone } from 'date-fns-tz';

async function main() {
  console.log('=== 스케줄러 테스트 시작 ===\n');

  const scheduler = getDailyScheduler();

  // 1. 현재 스케줄러 상태 확인
  console.log('1. 현재 스케줄러 상태:');
  const status = scheduler.getStatus();
  console.log('- 실행 중:', status.isRunning ? '✅ Yes' : '❌ No');
  console.log('- 마지막 실행:', status.lastRunTimeString || '없음');
  console.log('- 다음 실행:', status.nextRunTimeString || '없음');
  console.log('- 작업 상태:');
  console.log('  • 일일 작업:', status.jobs.daily || 'Not scheduled');
  console.log('  • 설명:', status.jobs.description || 'All tasks run at midnight');

  // 2. 현재 시간 확인 (한국 시간)
  const now = new Date();
  const koreaTime = formatInTimeZone(now, 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss zzz');
  console.log('\n2. 현재 시간:');
  console.log('- 한국 시간:', koreaTime);
  console.log('- UTC 시간:', now.toISOString());

  // 3. 환경 변수 확인
  console.log('\n3. 환경 변수:');
  console.log('- NODE_ENV:', process.env.NODE_ENV);
  console.log('- APP_ENV:', process.env.APP_ENV);
  console.log('- ENABLE_SCHEDULER:', process.env.ENABLE_SCHEDULER);
  console.log('- AUTO_SCHEDULER:', process.env.AUTO_SCHEDULER);

  // 4. 스케줄러 시작 테스트
  if (!status.isRunning) {
    console.log('\n4. 스케줄러 시작 테스트:');
    console.log('스케줄러를 시작합니다...');
    scheduler.start();

    // 상태 재확인
    const newStatus = scheduler.getStatus();
    console.log('- 실행 중:', newStatus.isRunning ? '✅ Yes' : '❌ No');
    console.log('- 다음 실행 예정:', newStatus.nextRunTimeString || '없음');
  } else {
    console.log('\n4. 스케줄러가 이미 실행 중입니다.');
  }

  // 5. 수동 실행 테스트 (선택적)
  const args = process.argv.slice(2);
  if (args.includes('--run')) {
    console.log('\n5. 수동 실행 테스트:');
    const type = args[args.indexOf('--run') + 1] || 'all';
    console.log(`${type} 작업을 수동으로 실행합니다...`);

    try {
      await scheduler.runManually(type as any);
      console.log('✅ 수동 실행 완료');
    } catch (error) {
      console.error('❌ 수동 실행 실패:', error);
    }
  } else {
    console.log('\n5. 수동 실행 테스트:');
    console.log('수동 실행을 원하시면 --run [all|smartplace|blog|ads] 옵션을 추가하세요.');
    console.log('예: npx tsx test-scheduler.ts --run smartplace');
  }

  // 6. 다음 실행까지 남은 시간 계산
  if (status.nextRunTime) {
    const nextRun = new Date(status.nextRunTime);
    const timeDiff = nextRun.getTime() - now.getTime();
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

    console.log('\n6. 다음 자동 실행까지:');
    console.log(`${hours}시간 ${minutes}분 남음`);
  }

  console.log('\n=== 테스트 완료 ===');

  // 스케줄러를 중지하지 않고 프로세스 종료
  // (실제 운영에서는 계속 실행되어야 함)
  if (args.includes('--keep-running')) {
    console.log('\n스케줄러가 백그라운드에서 계속 실행됩니다.');
    console.log('종료하려면 Ctrl+C를 누르세요.');
    // 프로세스를 계속 실행
    setInterval(() => {
      const status = scheduler.getStatus();
      if (status.lastRunTime) {
        console.log(`[${new Date().toISOString()}] 스케줄러 실행 중... 다음 실행: ${status.nextRunTimeString}`);
      }
    }, 60000); // 1분마다 상태 출력
  } else {
    // 테스트 모드에서는 스케줄러 중지
    if (!args.includes('--no-stop')) {
      scheduler.stop();
      console.log('\n테스트 모드: 스케줄러를 중지했습니다.');
    }
    process.exit(0);
  }
}

main().catch(console.error);