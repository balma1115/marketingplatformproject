import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { prisma } from './db'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

export interface JWTPayload {
  userId: number
  email: string
  role: string
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch (error) {
    return null
  }
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  })
}

export async function removeAuthCookie() {
  const cookieStore = await cookies()
  cookieStore.delete('auth-token')
}

export async function getAuthCookie(): Promise<string | undefined> {
  const cookieStore = await cookies()
  return cookieStore.get('auth-token')?.value
}

export async function getCurrentUser() {
  const token = await getAuthCookie()
  
  if (!token) {
    return null
  }

  const payload = verifyToken(token)
  
  if (!payload) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      plan: true,
      academyName: true,
      coin: true,
      usedCoin: true
    }
  })

  return user
}

export async function requireAuth() {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error('Unauthorized')
  }
  
  return user
}

export async function requireRole(requiredRoles: string[]) {
  const user = await requireAuth()
  
  if (!requiredRoles.includes(user.role)) {
    throw new Error('Forbidden')
  }
  
  return user
}