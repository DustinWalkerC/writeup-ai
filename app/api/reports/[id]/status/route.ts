import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const { data: report, error } = await supabase
      .from('reports')
      .select('status')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (error || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    return NextResponse.json({ status: report.status })
  } catch (error) {
    console.error('Status API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}








