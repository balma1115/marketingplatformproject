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

  // Delete existing tracking data for this user
  await prisma.trackingRanking.deleteMany({
    where: {
      keyword: {
        project: {
          userId: user.id
        }
      }
    }
  })
  
  await prisma.trackingSnapshot.deleteMany({
    where: {
      project: {
        userId: user.id
      }
    }
  })
  
  await prisma.trackingSession.deleteMany({
    where: {
      userId: user.id
    }
  })
  
  await prisma.trackingKeyword.deleteMany({
    where: {
      project: {
        userId: user.id
      }
    }
  })
  
  await prisma.trackingProject.deleteMany({
    where: {
      userId: user.id
    }
  })

  // Create tracking project for 벌원학원
  const project = await prisma.trackingProject.create({
    data: {
      userId: user.id,
      placeName: '미래엔영어수학 벌원학원',
      placeId: '1616011574',
      isActive: true
    }
  })

  // Add keywords
  const keywords = [
    '벌원학원',
    '탄벌동 영어학원',
    '벌원초 영어학원'
  ]

  for (const keyword of keywords) {
    await prisma.trackingKeyword.create({
      data: {
        projectId: project.id,
        keyword: keyword,
        isActive: true,
        addedDate: new Date()
      }
    })
  }

  console.log(`Created SmartPlace project for user ${user.email}:`)
  console.log(`- Place: ${project.placeName} (ID: ${project.placeId})`)
  console.log(`- Keywords: ${keywords.join(', ')}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })