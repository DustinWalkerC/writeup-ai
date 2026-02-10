import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { ReportsContent } from './reports-content'

export default async function ReportsPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  return <ReportsContent />
}
