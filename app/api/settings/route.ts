import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    // If no settings exist, create defaults
    if (!data) {
      const defaultSettings = {
        user_id: userId,
        company_name: null,
        company_logo_url: null,
        accent_color: '#27272A',
        secondary_color: '#EFF6FF',
        report_accent_color: '#2563EB',
        ai_tone: 'balanced',
        custom_disclaimer: null,
      }

      const { data: newSettings, error: insertError } = await supabase
        .from('user_settings')
        .insert(defaultSettings)
        .select()
        .single()

      if (insertError) {
        return NextResponse.json({ success: false, error: insertError.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, data: newSettings })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Settings GET error:', error)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Line 1: destructure POST body (added report_accent_color)
    const { company_name, accent_color, secondary_color, report_accent_color, ai_tone, custom_disclaimer } =
      await request.json()

    // Check if settings exist
    const { data: existing } = await supabase
      .from('user_settings')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (existing) {
      // Update
      const { data, error } = await supabase
        .from('user_settings')
        .update({
          company_name,
          accent_color,
          secondary_color,
          // Line 2: added report_accent_color
          report_accent_color: report_accent_color || '#2563EB',
          ai_tone,
          custom_disclaimer,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, data })
    } else {
      // Insert
      const { data, error } = await supabase
        .from('user_settings')
        .insert({
          user_id: userId,
          company_name,
          accent_color,
          secondary_color,
          // Line 2: added report_accent_color
          report_accent_color: report_accent_color || '#2563EB',
          ai_tone,
          custom_disclaimer,
        })
        .select()
        .single()

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, data })
    }
  } catch (error) {
    console.error('Settings POST error:', error)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}


