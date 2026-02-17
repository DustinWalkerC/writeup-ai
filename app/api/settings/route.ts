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

    const {
      company_name,
      accent_color,
      secondary_color,
      report_accent_color,
      ai_tone,
      custom_disclaimer,
      report_template,
      export_name_template,
    } = await request.json()

    // Check if settings exist
    const { data: existing } = await supabase
      .from('user_settings')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (existing) {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }
      // Only include fields that were sent (allows partial updates)
      if (company_name !== undefined) updateData.company_name = company_name
      if (accent_color !== undefined) updateData.accent_color = accent_color
      if (secondary_color !== undefined) updateData.secondary_color = secondary_color
      if (report_accent_color !== undefined) updateData.report_accent_color = report_accent_color || '#2563EB'
      if (ai_tone !== undefined) updateData.ai_tone = ai_tone
      if (custom_disclaimer !== undefined) updateData.custom_disclaimer = custom_disclaimer
      if (report_template !== undefined) updateData.report_template = report_template
      if (export_name_template !== undefined) updateData.export_name_template = export_name_template

      const { data, error } = await supabase
        .from('user_settings')
        .update(updateData)
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
          report_accent_color: report_accent_color || '#2563EB',
          ai_tone,
          custom_disclaimer,
          report_template: report_template || null,
          export_name_template: export_name_template || null,
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
