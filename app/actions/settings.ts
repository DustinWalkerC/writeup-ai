'use server'

import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { UserSettings } from '@/lib/supabase'

/**
 * Get user settings
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

  // If no settings exist, create default settings
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

/**
 * Update user settings
 */
export async function updateUserSettings(
  updates: Partial<UserSettings>
): Promise<{ success: boolean; error?: string }> {
  const { userId } = await auth()
  if (!userId) {
    return { success: false, error: 'Unauthorized' }
  }

  // First check if settings exist
  const { data: existing } = await supabase
    .from('user_settings')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (existing) {
    // Update existing settings
    const { error } = await supabase
      .from('user_settings')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    if (error) {
      console.error('Error updating user settings:', error)
      return { success: false, error: error.message }
    }
  } else {
    // Create new settings
    const { error } = await supabase
      .from('user_settings')
      .insert({
        user_id: userId,
        ...updates,
      })

    if (error) {
      console.error('Error creating user settings:', error)
      return { success: false, error: error.message }
    }
  }

  revalidatePath('/dashboard/settings')
  return { success: true }
}

/**
 * Upload company logo to Supabase Storage
 */
export async function uploadCompanyLogo(
  file: File
): Promise<{ success: boolean; url?: string; error?: string }> {
  const { userId } = await auth()
  if (!userId) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    // Convert File to ArrayBuffer for server-side upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Create unique filename
    const ext = file.name.split('.').pop()
    const filename = `${userId}/logo-${Date.now()}.${ext}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('company-assets')
      .upload(filename, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: true,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return { success: false, error: uploadError.message }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('company-assets')
      .getPublicUrl(filename)

    // Update user settings with logo URL
    const updateResult = await updateUserSettings({ 
      company_logo_url: urlData.publicUrl 
    })

    if (!updateResult.success) {
      return { success: false, error: updateResult.error }
    }

    return { success: true, url: urlData.publicUrl }
  } catch (error) {
    console.error('Logo upload error:', error)
    return { success: false, error: 'Upload failed' }
  }
}

// Alias for backward compatibility with settings-form.tsx
export { updateUserSettings as createOrUpdateSettings }
