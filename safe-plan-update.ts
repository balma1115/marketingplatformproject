import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function safePlanUpdate(email: string, newPlan: string, expiryDays: number = 365) {
  try {
    console.log('=== 안전한 플랜 업데이트 시작 ===')
    console.log(`대상: ${email}`)
    console.log(`새 플랜: ${newPlan}`)
    
    // 1. 사용자 확인
    const user = await prisma.user.findUnique({
      where: { email }
    })
    
    if (!user) {
      console.error('사용자를 찾을 수 없습니다.')
      return
    }
    
    // 2. 현재 데이터 백업 확인
    const currentDataStats = {
      projects: await prisma.trackingProject.count({ where: { userId: user.id } }),
      keywords: await prisma.trackingKeyword.count({ 
        where: { project: { userId: user.id } } 
      }),
      rankings: await prisma.trackingRanking.count({
        where: { keyword: { project: { userId: user.id } } }
      }),
      snapshots: await prisma.trackingSnapshot.count({
        where: { project: { userId: user.id } }
      })
    }
    
    console.log('\n현재 데이터 상태:')
    console.log(`- 프로젝트: ${currentDataStats.projects}개`)
    console.log(`- 키워드: ${currentDataStats.keywords}개`)
    console.log(`- 순위 기록: ${currentDataStats.rankings}개`)
    console.log(`- 스냅샷: ${currentDataStats.snapshots}개`)
    
    // 3. 플랜만 업데이트 (다른 데이터는 건드리지 않음)
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        plan: newPlan,
        planExpiry: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000),
        // 플랜에 따른 코인 보너스 (기존 코인에 추가)
        ...(newPlan === 'premium' && { coin: { increment: 5000 } }),
        ...(newPlan === 'enterprise' && { coin: { increment: 10000 } })
      }
    })
    
    // 4. 업데이트 후 데이터 검증
    const afterDataStats = {
      projects: await prisma.trackingProject.count({ where: { userId: user.id } }),
      keywords: await prisma.trackingKeyword.count({ 
        where: { project: { userId: user.id } } 
      }),
      rankings: await prisma.trackingRanking.count({
        where: { keyword: { project: { userId: user.id } } }
      }),
      snapshots: await prisma.trackingSnapshot.count({
        where: { project: { userId: user.id } }
      })
    }
    
    console.log('\n업데이트 완료!')
    console.log(`플랜: ${updatedUser.plan}`)
    console.log(`만료일: ${updatedUser.planExpiry}`)
    console.log(`코인: ${updatedUser.coin}`)
    
    console.log('\n데이터 무결성 확인:')
    const dataIntact = 
      currentDataStats.projects === afterDataStats.projects &&
      currentDataStats.keywords === afterDataStats.keywords &&
      currentDataStats.rankings === afterDataStats.rankings &&
      currentDataStats.snapshots === afterDataStats.snapshots
    
    if (dataIntact) {
      console.log('✅ 모든 데이터가 안전하게 보존되었습니다.')
    } else {
      console.error('⚠️ 경고: 데이터 불일치 감지!')
      console.log('변경 전:', currentDataStats)
      console.log('변경 후:', afterDataStats)
    }
    
  } catch (error) {
    console.error('플랜 업데이트 중 오류 발생:', error)
  }
}

// 실행 예시
safePlanUpdate('academy@marketingplat.com', 'premium', 365)
  .finally(() => prisma.$disconnect())