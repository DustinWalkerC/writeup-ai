'use server'

import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

type UserSettings = {
  id: string
  user_id: string
  company_name: string | null
  company_logo_url: string | null
  accent_color: string
  secondary_color: string
  ai_tone: string
  custom_disclaimer: string | null
  created_at?: string
  updated_at?: string
}

/**
 * Get user settings - for use in Server Components only
 */
export async function getUserSettings(): Promise<UserSettings | null> {
  const { userId } = await auth()
  if (!userId) return null

  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching user settings:', error)
    return null
  }

  if (!data) {
    const defaultSettings = {
      user_id: userId,
      company_name: null,
      company_logo_url: null,
      accent_color: '#162e4b',
      secondary_color: '#e9ebf2',
      ai_tone: 'balanced',
      custom_disclaimer: null,
    }

    const { data: newSettings, error: insertError } = await supabase
      .from('user_settings')
      .insert(defaultSettings)
      .select()
      .single()

    if (insertError) {
      console.error('Error creating user settings:', insertError)
      return null
    }

    return newSettings
  }

  return data
}
