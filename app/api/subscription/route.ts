import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data: sub } = await supabase.from('subscriptions').select('*').eq('user_id', userId).single()
    const { count } = await supabase.from('properties').select('*', { count: 'exact', head: true }).eq('user_id', userId)

    return NextResponse.json({
      success: true,
      data: {
        subscription: sub || { plan_tier: 'free', property_slots: 0, status: 'inactive' },
        usage: { properties_used: count || 0, properties_available: (sub?.property_slots || 0) - (count || 0) },
      },
    })
  } catch (error) {
    console.error('Subscription fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 })
  }
}

