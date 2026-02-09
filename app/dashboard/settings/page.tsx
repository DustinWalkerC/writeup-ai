import { getUserSettings } from '@/app/actions/settings'
import { SettingsForm } from './settings-form'

// This is a SERVER component - it can call server actions directly
export default async function SettingsPage() {
  const initialSettings = await getUserSettings()
  
  return <SettingsForm initialSettings={initialSettings} />
}
