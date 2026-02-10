import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Get current month/year
    const now = new Date()
    const currentMonth = now.toLocaleString('default', { month: 'long' })
    const currentYear = now.getFullYear()

    // Fetch reports with property info
    const { data: reports, error: reportsError } = await supabase
      .from('reports')
      .select(`
        id,
        status,
        month,
        year,
        created_at,
        updated_at,
        properties (
          id,
          name
        )
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (reportsError) {
      console.error('Reports fetch error:', reportsError)
      return NextResponse.json({ success: false, error: reportsError.message }, { status: 500 })
    }

    // Calculate stats
    const totalReports = reports?.length || 0
    const completeReports = reports?.filter(r => r.status === 'complete').length || 0
    const draftReports = reports?.filter(r => r.status === 'draft').length || 0
    const generatingReports = reports?.filter(r => r.status === 'generating').length || 0
    const errorReports = reports?.filter(r => r.status === 'error').length || 0
    const reportsThisMonth = reports?.filter(
      r => r.month === currentMonth && r.year === currentYear
    ).length || 0

    // Format reports
    const formattedReports = reports?.map(r => ({
      id: r.id,
      propertyName: (r.properties as any)?.name || 'Unknown Property',
      month: r.month,
      year: r.year,
      status: r.status,
      updatedAt: r.updated_at,
      createdAt: r.created_at,
    })) || []

    return NextResponse.json({
      success: true,
      data: {
        reports: formattedReports,
        stats: {
          total: totalReports,
          complete: completeReports,
          draft: draftReports,
          generating: generatingReports,
          error: errorReports,
          thisMonth: reportsThisMonth,
        },
        currentPeriod: { month: currentMonth, year: currentYear },
      },
    })
  } catch (error) {
    console.error('Reports API error:', error)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}
