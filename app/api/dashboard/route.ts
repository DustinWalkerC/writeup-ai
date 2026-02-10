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

    // Get current month/year for filtering
    const now = new Date()
    const currentMonth = now.toLocaleString('default', { month: 'long' })
    const currentYear = now.getFullYear()

    // Fetch all data in parallel
    const [
      propertiesResult,
      reportsResult,
      recentReportsResult,
    ] = await Promise.all([
      // Total properties
      supabase
        .from('properties')
        .select('id, name, address, units, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      
      // All reports for stats
      supabase
        .from('reports')
        .select('id, status, month, year, created_at, updated_at, property_id')
        .eq('user_id', userId),
      
      // Recent reports with property info
      supabase
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
        .limit(5),
    ])

    const properties = propertiesResult.data || []
    const allReports = reportsResult.data || []
    const recentReports = recentReportsResult.data || []

    // Calculate stats
    const totalProperties = properties.length
    const totalUnits = properties.reduce((sum, p) => sum + (p.units || 0), 0)
    
    const reportsThisMonth = allReports.filter(
      r => r.month === currentMonth && r.year === currentYear
    ).length

    const completedReports = allReports.filter(r => r.status === 'complete').length
    const pendingReports = allReports.filter(r => r.status === 'draft' || r.status === 'generating').length

    // Properties without reports this month
    const propertiesWithReportsThisMonth = new Set(
      allReports
        .filter(r => r.month === currentMonth && r.year === currentYear)
        .map(r => r.property_id)
    )
    const propertiesNeedingReports = properties.filter(
      p => !propertiesWithReportsThisMonth.has(p.id)
    )

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalProperties,
          totalUnits,
          reportsThisMonth,
          completedReports,
          pendingReports,
          propertiesNeedingReports: propertiesNeedingReports.length,
        },
        properties: properties.slice(0, 5), // Top 5 recent
        recentReports: recentReports.map(r => ({
          id: r.id,
          status: r.status,
          month: r.month,
          year: r.year,
          updatedAt: r.updated_at,
          propertyName: (r.properties as any)?.name || 'Unknown Property',
        })),
        propertiesNeedingReports: propertiesNeedingReports.slice(0, 3),
        currentPeriod: { month: currentMonth, year: currentYear },
      },
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}

