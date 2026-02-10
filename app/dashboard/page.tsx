import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { DashboardContent } from './dashboard-content'

export default async function DashboardPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  const user = await currentUser()
  const userName = user?.firstName 
    ? `${user.firstName} ${user.lastName || ''}`.trim()
    : user?.emailAddresses?.[0]?.emailAddress || 'User'

  return <DashboardContent userName={userName} />
}
