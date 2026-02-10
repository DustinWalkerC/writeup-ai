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

    // Fetch properties
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (propertiesError) {
      console.error('Properties fetch error:', propertiesError)
      return NextResponse.json({ success: false, error: propertiesError.message }, { status: 500 })
    }

    // Fetch all reports to get last report for each property
    const { data: reports, error: reportsError } = await supabase
      .from('reports')
      .select('id, property_id, month, year, status, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (reportsError) {
      console.error('Reports fetch error:', reportsError)
    }

    // Map last report to each property
    const reportsMap = new Map<string, { month: string; year: number; status: string }>()
    if (reports) {
      for (const report of reports) {
        if (!reportsMap.has(report.property_id)) {
          reportsMap.set(report.property_id, {
            month: report.month,
            year: report.year,
            status: report.status,
          })
        }
      }
    }

    // Calculate stats
    const totalProperties = properties?.length || 0
    const totalUnits = properties?.reduce((sum, p) => sum + (p.units || 0), 0) || 0

    // Enhance properties with last report
    const enhancedProperties = properties?.map(property => ({
      ...property,
      lastReport: reportsMap.get(property.id) || null,
    })) || []

    return NextResponse.json({
      success: true,
      data: {
        properties: enhancedProperties,
        stats: {
          totalProperties,
          totalUnits,
        },
      },
    })
  } catch (error) {
    console.error('Properties API error:', error)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}