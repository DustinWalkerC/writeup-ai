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

    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (propertiesError) {
      console.error('Properties fetch error:', propertiesError)
      return NextResponse.json({ success: false, error: propertiesError.message }, { status: 500 })
    }

    // Fetch latest report per property for "last report" date
    const { data: reports } = await supabase
      .from('reports')
      .select('id, property_id, month, year, status, generation_status, pipeline_stage, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    // Build map: property_id → most recent report info
    const reportsMap = new Map<string, { month: string; year: number; hasGenerated: boolean }>()
    if (reports) {
      for (const report of reports) {
        if (!reportsMap.has(report.property_id)) {
          const isGenerated = report.generation_status === 'complete' || report.status === 'complete'
          reportsMap.set(report.property_id, {
            month: report.month,
            year: report.year,
            hasGenerated: isGenerated,
          })
        } else {
          // Check if ANY report for this property is generated
          const existing = reportsMap.get(report.property_id)!
          if (!existing.hasGenerated) {
            const isGenerated = report.generation_status === 'complete' || report.status === 'complete'
            if (isGenerated) existing.hasGenerated = true
          }
        }
      }
    }

    const totalProperties = properties?.length || 0
    const totalUnits = properties?.reduce((sum: number, p: any) => sum + (p.units || 0), 0) || 0

    const enhancedProperties = properties?.map((property: any) => {
      const reportInfo = reportsMap.get(property.id)
      return {
        id: property.id,
        name: property.name,
        address: [property.city, property.state].filter(Boolean).join(', ') || property.address || '',
        units: property.units || 0,
        hasBudget: !!property.budget_file_path,
        hasContext: !!property.investment_strategy,
        lastReport: reportInfo ? `${reportInfo.month} ${reportInfo.year}` : null,
        hasGenerated: reportInfo?.hasGenerated || false,
      }
    }) || []

    return NextResponse.json({
      success: true,
      data: {
        properties: enhancedProperties,
        stats: { totalProperties, totalUnits },
      },
    })
  } catch (error) {
    console.error('Properties API error:', error)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}
