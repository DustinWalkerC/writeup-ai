'use server'

import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'
import { generateReportNarrative, extractTextFromFile } from '@/lib/claude'
import { revalidatePath } from 'next/cache'

export type GenerateReportResult = {
  success: boolean
  narrative?: string
  error?: string
}

/**
 * Generate AI narrative for a report
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
      .update({ status: 'generating', updated_at: new Date().toISOString() })
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

    // 3. Fetch uploaded files
    const { data: files } = await supabase
      .from('report_files')
      .select('*')
      .eq('report_id', reportId)
      .eq('user_id', userId)

    // 4. Extract content from files (basic for V1)
    let financialContext = ''
    if (files && files.length > 0) {
      const fileDescriptions = files.map(f => 
        `- ${f.file_name} (${f.file_type}, uploaded ${new Date(f.created_at).toLocaleDateString()})`
      )
      financialContext = `Uploaded documents:\n${fileDescriptions.join('\n')}\n\n[Note: Full document parsing coming in future update. Please reference the context provided by the asset manager below.]`
    }

    // 5. Call Claude to generate narrative
    const result = await generateReportNarrative(
      report.property?.name || 'Unknown Property',
      {
        address: report.property?.address,
        city: report.property?.city,
        state: report.property?.state,
        units: report.property?.units
      },
      report.month,
      report.year,
      report.questionnaire || {},
      report.freeform_narrative,
      financialContext
    )

    if (!result.success) {
      // Update status to error
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

    // 6. Save the generated narrative and update status
    await supabase
      .from('reports')
      .update({ 
        narrative: result.narrative,
        status: 'complete',
        updated_at: new Date().toISOString()
      })
      .eq('id', reportId)
      .eq('user_id', userId)

    revalidatePath(`/dashboard/reports/${reportId}`)

    return { 
      success: true, 
      narrative: result.narrative 
    }

  } catch (error) {
    console.error('Generate report error:', error)
    
    // Update status to error
    await supabase
      .from('reports')
      .update({ status: 'error' })
      .eq('id', reportId)
      .eq('user_id', userId)

    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Generation failed' 
    }
  }
}

/**
 * Regenerate a report (if user wants to try again)
 */
export async function regenerateReport(reportId: string): Promise<GenerateReportResult> {
  // Reset status to draft first
  const { userId } = await auth()
  if (!userId) {
    return { success: false, error: 'Unauthorized' }
  }

  await supabase
    .from('reports')
    .update({ status: 'draft', narrative: null })
    .eq('id', reportId)
    .eq('user_id', userId)

  // Then generate fresh
  return generateReport(reportId)
}
