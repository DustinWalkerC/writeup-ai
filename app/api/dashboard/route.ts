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

    const now = new Date()
    const currentMonth = now.toLocaleString('default', { month: 'long' })
    const currentYear = now.getFullYear()

    // Parallel fetches
    const [propertiesResult, allReportsResult, recentReportsResult] = await Promise.all([
      supabase
        .from('properties')
        .select('id, name, address, units')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      supabase
        .from('reports')
        .select('id, property_id, month, year, status, generation_status, pipeline_stage')
        .eq('user_id', userId),
      supabase
        .from('reports')
        .select('id, status, month, year, updated_at, pipeline_stage, returned, return_note, properties(name)')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(6),
    ])

    const properties = propertiesResult.data || []
    const allReports = allReportsResult.data || []
    const recentReports = recentReportsResult.data || []

    const totalProperties = properties.length
    const totalUnits = properties.reduce((sum: number, p: any) => sum + (p.units || 0), 0)

    const reportsThisMonth = allReports.filter(
      (r: any) => r.month === currentMonth && r.year === currentYear
    ).length

    // Pipeline-based stats
    const pipelineCounts = {
      draft: 0,
      in_review: 0,
      final_review: 0,
      ready_to_send: 0,
      sent: 0,
    }
    for (const r of allReports) {
      const stage = (r as any).pipeline_stage || 'draft'
      if (stage in pipelineCounts) {
        pipelineCounts[stage as keyof typeof pipelineCounts]++
      }
    }

    const inPipeline = pipelineCounts.draft + pipelineCounts.in_review + pipelineCounts.final_review + pipelineCounts.ready_to_send
    const delivered = pipelineCounts.sent

    // Properties needing reports this month
    const propertiesWithReportsThisMonth = new Set(
      allReports
        .filter((r: any) => r.month === currentMonth && r.year === currentYear)
        .map((r: any) => r.property_id)
    )
    const propertiesNeedingReports = properties.filter(
      (p: any) => !propertiesWithReportsThisMonth.has(p.id)
    )

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalProperties,
          totalUnits,
          reportsThisMonth,
          inPipeline,
          delivered,
          pipelineCounts,
        },
        recentReports: recentReports.map((r: any) => ({
          id: r.id,
          status: r.status,
          month: r.month,
          year: r.year,
          updatedAt: r.updated_at,
          pipelineStage: r.pipeline_stage || 'draft',
          returned: r.returned || false,
          propertyName: r.properties?.name || 'Unknown Property',
        })),
        propertiesNeedingReports: propertiesNeedingReports.slice(0, 5).map((p: any) => ({
          id: p.id,
          name: p.name,
        })),
        currentPeriod: { month: currentMonth, year: currentYear },
      },
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}
