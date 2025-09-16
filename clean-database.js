const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function cleanDatabase() {
  try {
    console.log('🗑️ 데이터베이스 정리 시작')
    
    // 1. 모든 추적 데이터 삭제
    await prisma.trackingRanking.deleteMany()
    console.log('✅ 모든 순위 추적 데이터 삭제')
    
    // 2. 모든 세션 삭제
    await prisma.trackingSession.deleteMany()
    console.log('✅ 모든 추적 세션 삭제')
    
    // 3. 모든 스냅샷 삭제
    await prisma.trackingSnapshot.deleteMany()
    console.log('✅ 모든 스냅샷 데이터 삭제')
    
    // 4. lastUpdated를 null로 초기화
    await prisma.trackingProject.updateMany({
      data: {
        lastUpdated: null
      }
    })
    console.log('✅ 모든 프로젝트의 lastUpdated 초기화')
    
    console.log('\n🎯 데이터베이스 정리 완료!')
    console.log('이제 실제 추적만 진행하면 됩니다.')
    
  } catch (error) {
    console.error('❌ 데이터베이스 정리 실패:', error)
  } finally {
    await prisma.$disconnect()
  }
}

cleanDatabase()