import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Find the academy user
  const user = await prisma.user.findUnique({
    where: { email: 'academy@marketingplat.com' }
  })
  
  if (!user) {
    console.error('User not found')
    return
  }

  // Find the tracking project
  const project = await prisma.trackingProject.findFirst({
    where: {
      userId: user.id
    }
  })
  
  if (!project) {
    console.error('Tracking project not found')
    return
  }
  
  // Find keywords
  const keywords = await prisma.trackingKeyword.findMany({
    where: {
      projectId: project.id
    }
  })
  
  // Get the latest session
  const session = await prisma.trackingSession.findFirst({
    where: {
      userId: user.id,
      projectId: project.id
    },
    orderBy: {
      createdAt: 'desc'
    }
  })
  
  if (!session) {
    console.error('No tracking session found')
    return
  }
  
  // Update the latest rankings with test data
  for (const keyword of keywords) {
    const latestRanking = await prisma.trackingRanking.findFirst({
      where: {
        keywordId: keyword.id
      },
      orderBy: {
        checkDate: 'desc'
      }
    })
    
    if (latestRanking) {
      // Generate mock ranking data
      const mockOrganicRank = Math.floor(Math.random() * 20) + 1
      const mockAdRank = Math.random() > 0.5 ? Math.floor(Math.random() * 5) + 1 : null
      
      const topTenPlaces = []
      for (let i = 1; i <= 10; i++) {
        topTenPlaces.push({
          rank: i,
          placeName: i === mockOrganicRank ? '미래엔영어수학 벌원학원' : `경쟁업체 ${i}`,
          placeId: i === mockOrganicRank ? '1616011574' : `${1000000000 + i}`,
          isAd: i <= 3 && Math.random() > 0.5
        })
      }
      
      await prisma.trackingRanking.update({
        where: { id: latestRanking.id },
        data: {
          organicRank: mockOrganicRank,
          adRank: mockAdRank,
          topTenPlaces: JSON.stringify(topTenPlaces)
        }
      })
      
      console.log(`Updated ${keyword.keyword}: organic=${mockOrganicRank}, ad=${mockAdRank}`)
    }
  }
  
  console.log('Test rankings added successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })