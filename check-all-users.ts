import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkAllUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        plan: true,
        academyName: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    console.log(`\n총 사용자 수: ${users.length}명\n`)
    console.log('='.repeat(80))

    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`)
      console.log(`   - 이름: ${user.name}`)
      console.log(`   - 역할: ${user.role}`)
      console.log(`   - 플랜: ${user.plan}`)
      console.log(`   - 학원명: ${user.academyName || 'N/A'}`)
      console.log(`   - 생성일: ${user.createdAt}`)
      console.log('-'.repeat(80))
    })

    // Check for specific users
    const expectedUsers = [
      'admin@marketingplat.com',
      'nokyang@marketingplat.com',
      'academy@marketingplat.com',
      'user@test.com'
    ]

    console.log('\n특정 계정 확인:')
    console.log('='.repeat(80))

    for (const email of expectedUsers) {
      const exists = users.some(u => u.email === email)
      console.log(`${email}: ${exists ? '✅ 존재' : '❌ 없음'}`)
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkAllUsers()