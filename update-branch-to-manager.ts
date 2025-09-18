import { prisma } from './lib/db'

async function updateBranchToManager() {
  try {
    console.log('Updating branch users to branch_manager role...\n')

    // Find all users with role='branch'
    const branchUsers = await prisma.user.findMany({
      where: { role: 'branch' },
      include: {
        userSubjects: {
          include: {
            subject: true,
            branch: true,
            academy: true
          }
        }
      }
    })

    if (branchUsers.length === 0) {
      console.log('No branch users found.')
      return
    }

    console.log(`Found ${branchUsers.length} branch users to update:`)

    for (const user of branchUsers) {
      console.log(`\nUpdating user: ${user.email}`)

      // Update role to branch_manager
      await prisma.user.update({
        where: { id: user.id },
        data: { role: 'branch_manager' }
      })

      // Update userSubjects to mark as branch manager
      if (user.userSubjects.length > 0) {
        for (const us of user.userSubjects) {
          // If user has no academy, they are likely a branch manager
          if (!us.academyId) {
            await prisma.userSubject.update({
              where: { id: us.id },
              data: { isBranchManager: true }
            })
            console.log(`  - Set as branch manager for ${us.subject.name} / ${us.branch.name}`)
          }
        }
      }

      console.log(`  ✅ Updated to branch_manager role`)
    }

    // Also check for users who might be branch managers but have wrong role
    const potentialManagers = await prisma.user.findMany({
      where: {
        userSubjects: {
          some: {
            isBranchManager: true
          }
        },
        NOT: {
          role: 'branch_manager'
        }
      }
    })

    if (potentialManagers.length > 0) {
      console.log(`\nFound ${potentialManagers.length} users with isBranchManager=true but wrong role:`)
      for (const user of potentialManagers) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: 'branch_manager' }
        })
        console.log(`  - Updated ${user.email} to branch_manager role`)
      }
    }

    console.log('\n✅ Update completed!')

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateBranchToManager()