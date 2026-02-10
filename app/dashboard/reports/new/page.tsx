import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { NewReportForm } from './new-report-form'

export default async function NewReportPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  return <NewReportForm />
}
