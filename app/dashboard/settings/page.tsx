import { auth } from '@clerk/nextjs/server'
import { getUserSettings } from '@/app/actions/settings'
import { getUserTier } from '@/lib/get-user-tier'
import { SettingsForm } from './settings-form'

export default async function SettingsPage() {
  const { userId } = await auth()
  const tier = await getUserTier(userId || '')
  const initialSettings = await getUserSettings()

  return <SettingsForm initialSettings={initialSettings} tier={tier} />
}
