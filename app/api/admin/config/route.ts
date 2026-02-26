// app/api/admin/config/route.ts

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'

// GET /api/admin/config — read system config
export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // TODO: Add admin role check via Clerk metadata
  // const user = await clerkClient.users.getUser(userId)
  // if (user.publicMetadata.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', 'ai_config')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data: data?.value })
}

// PATCH /api/admin/config — update system config
export async function PATCH(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // TODO: Add admin role check

  const body = await req.json()

  const { error } = await supabase
    .from('system_config')
    .upsert({
      key: 'ai_config',
      value: body,
      updated_at: new Date().toISOString(),
    })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}