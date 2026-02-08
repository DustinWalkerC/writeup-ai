'use server'

import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'
import { generateInstitutionalReport, PropertyContext, ReportContext } from '@/lib/claude'
import { revalidatePath } from 'next/cache'

export type GenerateReportResult = {
  success: boolean
  narrative?: string
  error?: string
}

/**
 * Generate institutional-quality AI narrative for a report
 */
export async function generateReport(reportId: string): Promise<GenerateReportResult> {
  const { userId } = await auth()
  if (!userId) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    // 1. Update status to "generating"
    await supabase
      .from('reports')
      .update({ 
        status: 'generating', 
        updated_at: new Date().toISOString() 
      })
      .eq('id', reportId)
      .eq('user_id', userId)

    // 2. Fetch the report with property info
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select(`
        *,
        property:properties(*)
      `)
      .eq('id', reportId)
      .eq('user_id', userId)
      .single()

    if (reportError || !report) {
      throw new Error('Report not found')
    }

    // 3. Fetch uploaded files metadata
    const { data: files } = await supabase
      .from('report_files')
      .select('file_name, file_type')
      .eq('report_id', reportId)
      .eq('user_id', userId)

    // 4. Build context objects
    const propertyContext: PropertyContext = {
      name: report.property?.name || 'Unknown Property',
      address: report.property?.address,
      city: report.property?.city,
      state: report.property?.state,
      units: report.property?.units,
    }

    const reportContext: ReportContext = {
      month: report.month,
      year: report.year,
      questionnaire: report.questionnaire || {},
      freeformNarrative: report.freeform_narrative,
      uploadedFiles: (files || []).map(f => ({
        name: f.file_name,
        type: f.file_type,
      })),
    }

    // 5. Call Claude to generate institutional-quality narrative
    const result = await generateInstitutionalReport(propertyContext, reportContext)

    if (!result.success) {
      await supabase
        .from('reports')
        .update({ 
          status: 'error', 
          updated_at: new Date().toISOString() 
        })
        .eq('id', reportId)
        .eq('user_id', userId)

      return { success: false, error: result.error }
    }

    // 6. Save the generated narrative and structured content
    const updateData: Record<string, unknown> = {
      narrative: result.narrative,
      status: 'complete',
      updated_at: new Date().toISOString(),
    }

    // Save structured sections if available
    if (result.structuredSections) {
      updateData.content = result.structuredSections
    }

    await supabase
      .from('reports')
      .update(updateData)
      .eq('id', reportId)
      .eq('user_id', userId)

    revalidatePath(`/dashboard/reports/${reportId}`)

    return {
      success: true,
      narrative: result.narrative,
    }

  } catch (error) {
    console.error('Generate report error:', error)

    await supabase
      .from('reports')
      .update({ status: 'error' })
      .eq('id', reportId)
      .eq('user_id', userId)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Generation failed',
    }
  }
}

/**
 * Regenerate a report with fresh AI output
 */
export async function regenerateReport(reportId: string): Promise<GenerateReportResult> {
  const { userId } = await auth()
  if (!userId) {
    return { success: false, error: 'Unauthorized' }
  }

  // Reset status and clear old narrative
  await supabase
    .from('reports')
    .update({ 
      status: 'draft', 
      narrative: null,
      content: {},
    })
    .eq('id', reportId)
    .eq('user_id', userId)

  // Generate fresh
  return generateReport(reportId)
}

/**
 * Update just the narrative (for manual edits)
 */
export async function updateNarrative(
  reportId: string, 
  narrative: string
): Promise<{ success: boolean; error?: string }> {
  const { userId } = await auth()
  if (!userId) {
    return { success: false, error: 'Unauthorized' }
  }

  const { error } = await supabase
    .from('reports')
    .update({ 
      narrative,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reportId)
    .eq('user_id', userId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath(`/dashboard/reports/${reportId}`)
  return { success: true }
}