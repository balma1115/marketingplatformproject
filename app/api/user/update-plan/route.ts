import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/auth-middleware'

// PATCH: Update user's plan safely (preserves all data)
export async function PATCH(req: NextRequest) {
  return withAuth(req, async (request, userId) => {
    try {
      const body = await request.json()
      const { plan, expiryDays } = body
      
      // Validate plan type
      const validPlans = ['basic', 'premium', 'enterprise']
      if (!validPlans.includes(plan)) {
        return NextResponse.json(
          { error: '유효하지 않은 플랜입니다.' },
          { status: 400 }
        )
      }
      
      // Calculate plan expiry date if provided
      let planExpiry = null
      if (expiryDays && expiryDays > 0) {
        planExpiry = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000)
      }
      
      // Update ONLY the plan-related fields
      // This ensures all other data (projects, keywords, rankings) remain intact
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          plan: plan,
          planExpiry: planExpiry,
          // Optionally update coins based on plan
          ...(plan === 'premium' && { coin: { increment: 5000 } }),
          ...(plan === 'enterprise' && { coin: { increment: 10000 } })
        },
        select: {
          id: true,
          email: true,
          name: true,
          plan: true,
          planExpiry: true,
          coin: true
        }
      })
      
      // Verify that user's data is still intact
      const dataCheck = await prisma.trackingProject.count({
        where: { userId: userId }
      })
      
      const rankingsCheck = await prisma.trackingRanking.count({
        where: {
          keyword: {
            project: {
              userId: userId
            }
          }
        }
      })
      
      console.log(`Plan updated for user ${updatedUser.email}:`)
      console.log(`- New plan: ${updatedUser.plan}`)
      console.log(`- Projects intact: ${dataCheck}`)
      console.log(`- Rankings intact: ${rankingsCheck}`)
      
      return NextResponse.json({
        success: true,
        message: '플랜이 성공적으로 업데이트되었습니다.',
        user: updatedUser,
        dataIntegrity: {
          projectsCount: dataCheck,
          rankingsCount: rankingsCheck
        }
      })
      
    } catch (error) {
      console.error('Error updating plan:', error)
      return NextResponse.json(
        { error: '플랜 업데이트 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }
  })
}

// GET: Check current plan and data integrity
export async function GET(req: NextRequest) {
  return withAuth(req, async (request, userId) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          plan: true,
          planExpiry: true,
          coin: true
        }
      })
      
      if (!user) {
        return NextResponse.json(
          { error: '사용자를 찾을 수 없습니다.' },
          { status: 404 }
        )
      }
      
      // Check if plan is still valid
      const isPlanValid = user.planExpiry ? new Date(user.planExpiry) > new Date() : true
      
      // Count user's data
      const projectsCount = await prisma.trackingProject.count({
        where: { userId: userId }
      })
      
      const keywordsCount = await prisma.trackingKeyword.count({
        where: {
          project: {
            userId: userId
          }
        }
      })
      
      const rankingsCount = await prisma.trackingRanking.count({
        where: {
          keyword: {
            project: {
              userId: userId
            }
          }
        }
      })
      
      return NextResponse.json({
        user: {
          ...user,
          isPlanValid
        },
        dataStats: {
          projects: projectsCount,
          keywords: keywordsCount,
          rankings: rankingsCount
        }
      })
      
    } catch (error) {
      console.error('Error fetching plan info:', error)
      return NextResponse.json(
        { error: '플랜 정보를 가져오는 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }
  })
}