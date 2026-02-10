import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { PropertiesContent } from './properties-content'

export default async function PropertiesPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  return <PropertiesContent />
}

