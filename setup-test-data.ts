import { prisma } from './lib/db'
import bcrypt from 'bcryptjs'

async function setupTestData() {
  try {
    console.log('Setting up test data...\n')

    // 1. Create subjects if they don't exist
    let mathSubject = await prisma.subject.findFirst({
      where: { code: 'MATH' }
    })

    if (!mathSubject) {
      mathSubject = await prisma.subject.create({
        data: {
          name: '미래엔수학',
          code: 'MATH'
        }
      })
      console.log('✅ Created subject: 미래엔수학')
    }

    // 2. Create branch
    let branch = await prisma.branch.findFirst({
      where: {
        subjectId: mathSubject.id,
        name: '강남점'
      }
    })

    if (!branch) {
      branch = await prisma.branch.create({
        data: {
          subjectId: mathSubject.id,
          name: '강남점'
        }
      })
      console.log('✅ Created branch: 강남점')
    }

    // 3. Create academies
    let academy1 = await prisma.academy.findFirst({
      where: {
        branchId: branch.id,
        name: '대치수학학원'
      }
    })

    if (!academy1) {
      academy1 = await prisma.academy.create({
        data: {
          branchId: branch.id,
          name: '대치수학학원',
          address: '서울 강남구 대치동 123',
          phone: '02-1234-5678'
        }
      })
      console.log('✅ Created academy: 대치수학학원')
    }

    let academy2 = await prisma.academy.findFirst({
      where: {
        branchId: branch.id,
        name: '역삼수학교실'
      }
    })

    if (!academy2) {
      academy2 = await prisma.academy.create({
        data: {
          branchId: branch.id,
          name: '역삼수학교실',
          address: '서울 강남구 역삼동 456',
          phone: '02-2345-6789'
        }
      })
      console.log('✅ Created academy: 역삼수학교실')
    }

    // 4. Create branch manager user
    const hashedPassword = await bcrypt.hash('manager123', 10)

    let branchManager = await prisma.user.findFirst({
      where: { email: 'branch.manager@test.com' }
    })

    if (!branchManager) {
      branchManager = await prisma.user.create({
        data: {
          email: 'branch.manager@test.com',
          password: hashedPassword,
          name: `${mathSubject.name} ${branch.name} 지사장`,
          role: 'branch_manager',
          isApproved: true,
          userSubjects: {
            create: {
              subjectId: mathSubject.id,
              branchId: branch.id,
              academyId: null,
              isBranchManager: true
            }
          }
        }
      })
      console.log('\n✅ Branch Manager Created:')
      console.log(`   Email: branch.manager@test.com`)
      console.log(`   Password: manager123`)
      console.log(`   Name: ${branchManager.name}`)
    }

    // 5. Create pending users
    const pendingPassword = await bcrypt.hash('user123', 10)

    // Pending user 1
    let pendingUser1 = await prisma.user.findFirst({
      where: { email: 'pending.user1@test.com' }
    })

    if (!pendingUser1) {
      pendingUser1 = await prisma.user.create({
        data: {
          email: 'pending.user1@test.com',
          password: pendingPassword,
          name: academy1.name,
          role: 'user',
          isApproved: false,  // Pending
          userSubjects: {
            create: {
              subjectId: mathSubject.id,
              branchId: branch.id,
              academyId: academy1.id,
              isBranchManager: false
            }
          }
        }
      })
      console.log(`\n✅ Created pending user: ${pendingUser1.email}`)
    }

    // Pending user 2
    let pendingUser2 = await prisma.user.findFirst({
      where: { email: 'pending.user2@test.com' }
    })

    if (!pendingUser2) {
      pendingUser2 = await prisma.user.create({
        data: {
          email: 'pending.user2@test.com',
          password: pendingPassword,
          name: academy2.name,
          role: 'user',
          isApproved: false,  // Pending
          userSubjects: {
            create: {
              subjectId: mathSubject.id,
              branchId: branch.id,
              academyId: academy2.id,
              isBranchManager: false
            }
          }
        }
      })
      console.log(`✅ Created pending user: ${pendingUser2.email}`)
    }

    // 6. Create approved user
    let approvedUser = await prisma.user.findFirst({
      where: { email: 'approved.user@test.com' }
    })

    if (!approvedUser) {
      approvedUser = await prisma.user.create({
        data: {
          email: 'approved.user@test.com',
          password: pendingPassword,
          name: '삼성수학교실',
          role: 'user',
          isApproved: true,  // Already approved
          userSubjects: {
            create: {
              subjectId: mathSubject.id,
              branchId: branch.id,
              academyId: academy1.id,
              isBranchManager: false
            }
          }
        }
      })
      console.log(`✅ Created approved user: ${approvedUser.email}`)
    }

    console.log('\n📌 Test Setup Complete!')
    console.log('\n🔐 Login Credentials:')
    console.log('   Branch Manager: branch.manager@test.com / manager123')
    console.log('   Pending User 1: pending.user1@test.com / user123')
    console.log('   Pending User 2: pending.user2@test.com / user123')
    console.log('   Approved User: approved.user@test.com / user123')
    console.log('\n📍 Branch Manager Dashboard: http://localhost:3000/dashboard/branch/users')

  } catch (error: any) {
    if (error.code === 'P2002') {
      console.error('Some data already exists, continuing...')
    } else {
      console.error('Error:', error)
    }
  } finally {
    await prisma.$disconnect()
  }
}

setupTestData()