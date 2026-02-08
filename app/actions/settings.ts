'use server'

import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { UserSettings } from '@/lib/supabase'

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

  return data
}

export async function createOrUpdateSettings(
  settings: Partial<Omit<UserSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<{ success: boolean; error?: string }> {
  const { userId } = await auth()
  if (!userId) {
    return { success: false, error: 'Unauthorized' }
  }

  // Check if settings exist
  const { data: existing } = await supabase
    .from('user_settings')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (existing) {
    // Update
    const { error } = await supabase
      .from('user_settings')
      .update({
        ...settings,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    if (error) {
      return { success: false, error: error.message }
    }
  } else {
    // Insert
    const { error } = await supabase
      .from('user_settings')
      .insert({
        user_id: userId,
        ...settings,
      })

    if (error) {
      return { success: false, error: error.message }
    }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateCompanyName(
  companyName: string
): Promise<{ success: boolean; error?: string }> {
  return createOrUpdateSettings({ company_name: companyName })
}
