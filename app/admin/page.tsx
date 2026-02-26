import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import AdminAIConfig from '@/components/admin-ai-config'

export default async function AdminPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  // TODO: Check admin role
  // const user = await clerkClient.users.getUser(userId)
  // if (user.publicMetadata.role !== 'admin') redirect('/dashboard')

  const { data } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', 'ai_config')
    .single()

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 16px' }}>
      <AdminAIConfig initialConfig={data?.value || undefined} />
    </div>
  )
}
