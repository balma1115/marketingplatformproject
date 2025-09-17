import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = global as unknown as { prisma: PrismaClient }

// Ensure DATABASE_URL is set correctly in production
const getDatabaseUrl = () => {
  // Production database URL
  if (process.env.NODE_ENV === 'production') {
    return process.env.DATABASE_URL || 'postgresql://postgres:Devmoonki119!@marketingplat-db.cn2ke0yskrjo.ap-northeast-2.rds.amazonaws.com:5432/marketingplat'
  }
  // Development database URL
  return process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/marketingplat'
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: getDatabaseUrl()
      }
    }
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Helper functions for user operations
export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email }
  })
}

export async function createUser(userData: {
  email: string
  password: string
  name: string
  phone?: string
  role?: string
  plan?: string
  academyName?: string
  academyAddress?: string
}) {
  const hashedPassword = await bcrypt.hash(userData.password, 10)
  
  return prisma.user.create({
    data: {
      email: userData.email,
      password: hashedPassword,
      name: userData.name,
      phone: userData.phone || null,
      role: userData.role || 'user',
      plan: userData.plan || 'basic',
      academyName: userData.academyName || null,
      academyAddress: userData.academyAddress || null
    }
  })
}

export async function validatePassword(password: string, hashedPassword: string) {
  return bcrypt.compare(password, hashedPassword)
}

export async function updateUserCoins(userId: number, amount: number, operation: 'add' | 'subtract') {
  if (operation === 'subtract') {
    // Check if user has enough coins
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { coin: true }
    })
    
    if (!user || user.coin < amount) {
      throw new Error('INSUFFICIENT_COINS')
    }
    
    return prisma.user.update({
      where: { id: userId },
      data: {
        coin: { decrement: amount },
        usedCoin: { increment: amount }
      }
    })
  } else {
    return prisma.user.update({
      where: { id: userId },
      data: {
        coin: { increment: amount },
        purchasedCoin: { increment: amount }
      }
    })
  }
}

export async function logApiUsage(userId: number, serviceType: string, costInNyang: number) {
  return prisma.aPIUsageLog.create({
    data: {
      userId,
      serviceType,
      costInNyang
    }
  })
}

// Initialize default users
export async function initializeDefaultUsers() {
  try {
    // Check if admin exists
    const adminExists = await findUserByEmail('admin@marketingplat.com')
    
    if (!adminExists) {
      // Create admin user
      await createUser({
        email: 'admin@marketingplat.com',
        password: 'admin123',
        name: '관리자',
        phone: '010-1111-1111',
        role: 'admin',
        plan: 'premium',
        academyName: 'MarketingPlat 본사'
      })
      
      // Update admin coin
      const admin = await findUserByEmail('admin@marketingplat.com')
      if (admin) {
        await prisma.user.update({
          where: { id: admin.id },
          data: { coin: 999999 }
        })
      }

      // Create test users for other roles
      const testUsers = [
        {
          email: 'agency@marketingplat.com',
          password: 'agency123',
          name: '김대행',
          phone: '010-2222-2222',
          role: 'agency',
          plan: 'premium',
          academyName: '스마트 마케팅 에이전시'
        },
        {
          email: 'branch@marketingplat.com',
          password: 'branch123',
          name: '이지사',
          phone: '010-3333-3333',
          role: 'branch',
          plan: 'platinum',
          academyName: '강남교육지사'
        },
        {
          email: 'academy@marketingplat.com',
          password: 'academy123',
          name: '박원장',
          phone: '010-4444-4444',
          role: 'academy',
          plan: 'platinum',
          academyName: 'ABC영어학원',
          academyAddress: '서울시 송파구 잠실동'
        },
        {
          email: 'user@marketingplat.com',
          password: 'user123',
          name: '일반회원',
          phone: '010-5555-5555',
          role: 'user',
          plan: 'basic'
        }
      ]

      for (const user of testUsers) {
        await createUser(user)
        
        // Update coin amounts
        const createdUser = await findUserByEmail(user.email)
        if (createdUser) {
          const coinAmounts: Record<string, number> = {
            'agency': 5000,
            'branch': 2000,
            'academy': 500,
            'user': 100
          }
          
          if (coinAmounts[user.role]) {
            await prisma.user.update({
              where: { id: createdUser.id },
              data: { coin: coinAmounts[user.role] }
            })
          }
        }
      }

      console.log('Default users created successfully')
    }
  } catch (error) {
    console.error('Error creating default users:', error)
  }
}