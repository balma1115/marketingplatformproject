import Database from 'better-sqlite3'
import { PrismaClient } from '@prisma/client'

const db = new Database('prisma/dev.db')
const prisma = new PrismaClient()

async function checkMiraenOwner() {
  try {
    console.log('=== SQLite 원본 데이터 확인 ===\n')

    // SQLite에서 원본 데이터 확인
    const sqliteProjects = db.prepare(`
      SELECT bp.*, u.email, u.name
      FROM blog_tracking_projects bp
      JOIN users u ON bp.user_id = u.id
      WHERE bp.blog_url LIKE '%miraen%'
    `).all() as any[]

    console.log('SQLite의 miraen 관련 블로그:')
    sqliteProjects.forEach(p => {
      console.log(`- ${p.blog_url}`)
      console.log(`  SQLite user_id: ${p.user_id}`)
      console.log(`  소유자: ${p.email} (${p.name})`)
      console.log('-'.repeat(60))
    })

    console.log('\n=== PostgreSQL 현재 데이터 ===\n')

    // PostgreSQL 현재 상태
    const pgProjects = await prisma.blogTrackingProject.findMany({
      where: {
        blogUrl: {
          contains: 'miraen'
        }
      },
      include: {
        user: {
          select: { email: true, name: true }
        }
      }
    })

    console.log('PostgreSQL의 miraen 관련 블로그:')
    pgProjects.forEach(p => {
      console.log(`- ${p.blogUrl}`)
      console.log(`  PostgreSQL userId: ${p.userId}`)
      console.log(`  소유자: ${p.user.email} (${p.user.name})`)
      console.log('-'.repeat(60))
    })

    // 올바른 소유자 확인
    console.log('\n=== 정확한 소유자 확인 ===')

    const correctOwners = db.prepare(`
      SELECT
        bp.blog_url,
        bp.user_id as sqlite_user_id,
        u.email as sqlite_email
      FROM blog_tracking_projects bp
      JOIN users u ON bp.user_id = u.id
    `).all() as any[]

    for (const owner of correctOwners) {
      console.log(`${owner.blog_url}`)
      console.log(`  SQLite: user_id=${owner.sqlite_user_id}, email=${owner.sqlite_email}`)
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    db.close()
    await prisma.$disconnect()
  }
}

checkMiraenOwner()