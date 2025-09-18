import { prisma } from './lib/db'
import bcrypt from 'bcryptjs'

async function createTestBranchManager() {
  try {
    console.log('Creating test branch manager...\n')

    // Get some test data
    const subject = await prisma.subject.findFirst()
    const branch = await prisma.branch.findFirst({
      where: { subjectId: subject?.id }
    })

    if (!subject || !branch) {
      console.log('❌ No subject or branch found. Please add organization data first.')
      return
    }

    // Create branch manager user
    const hashedPassword = await bcrypt.hash('manager123', 10)

    const branchManager = await prisma.user.create({
      data: {
        email: 'branch.manager@test.com',
        password: hashedPassword,
        name: `${subject.name} ${branch.name} 지사장`,
        role: 'branch_manager',
        isApproved: true,
        userSubjects: {
          create: {
            subjectId: subject.id,
            branchId: branch.id,
            academyId: null,
            isBranchManager: true
          }
        }
      },
      include: {
        userSubjects: {
          include: {
            subject: true,
            branch: true
          }
        }
      }
    })

    console.log('✅ Branch Manager Created:')
    console.log(`   Email: ${branchManager.email}`)
    console.log(`   Password: manager123`)
    console.log(`   Name: ${branchManager.name}`)
    console.log(`   Role: ${branchManager.role}`)
    console.log(`   Managing: ${subject.name} / ${branch.name}`)

    // Create a regular user in the same branch (pending approval)
    const academy = await prisma.academy.findFirst({
      where: { branchId: branch.id }
    })

    if (academy) {
      const regularUser = await prisma.user.create({
        data: {
          email: 'pending.user@test.com',
          password: await bcrypt.hash('user123', 10),
          name: academy.name,
          role: 'user',
          isApproved: false,  // Pending approval
          userSubjects: {
            create: {
              subjectId: subject.id,
              branchId: branch.id,
              academyId: academy.id,
              isBranchManager: false
            }
          }
        }
      })

      console.log('\n✅ Pending User Created:')
      console.log(`   Email: ${regularUser.email}`)
      console.log(`   Password: user123`)
      console.log(`   Name: ${regularUser.name}`)
      console.log(`   Status: Pending Approval`)
      console.log(`   Academy: ${academy.name}`)
    }

    console.log('\n📌 You can now:')
    console.log('1. Login as branch.manager@test.com with password: manager123')
    console.log('2. Go to /dashboard/branch/users to see the user management page')
    console.log('3. Approve or reject the pending user')

  } catch (error: any) {
    if (error.code === 'P2002') {
      console.error('❌ User with this email already exists')
    } else {
      console.error('Error:', error)
    }
  } finally {
    await prisma.$disconnect()
  }
}

createTestBranchManager()