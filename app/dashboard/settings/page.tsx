import { getUserSettings } from '@/app/actions/settings'
import { SettingsForm } from './settings-form'

export default async function SettingsPage() {
  const settings = await getUserSettings()

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Settings</h1>
      <p className="text-slate-500 mb-8">Configure your company information and report preferences.</p>
      
      <SettingsForm initialSettings={settings} />
    </div>
  )
}
