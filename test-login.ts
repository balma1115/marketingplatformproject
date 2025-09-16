import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function testLogin() {
  try {
    const email = 'admin@marketingplat.com'
    const password = 'admin123'

    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      console.log('User not found')
      return
    }

    console.log('User found:', user.email)
    console.log('Stored password hash:', user.password)

    // Test password validation
    const isValid = await bcrypt.compare(password, user.password)
    console.log('Password validation result:', isValid)

    // Also test with the hash directly
    const testHash = await bcrypt.hash(password, 10)
    console.log('New hash for comparison:', testHash)

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testLogin()