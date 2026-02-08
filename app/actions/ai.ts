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
// Add these imports at the top if not present
import { REPORT_SECTIONS } from '@/lib/report-sections'

// ... existing code ...

/**
 * Save a single section's content
 */
export async function saveSection(
  reportId: string,
  sectionId: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  const { userId } = await auth()
  if (!userId) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    // Fetch current report
    const { data: report, error: fetchError } = await supabase
      .from('reports')
      .select('content, narrative')
      .eq('id', reportId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !report) {
      return { success: false, error: 'Report not found' }
    }

    // Update the specific section in content
    const currentContent = (report.content as Record<string, unknown>) || { sections: {} }
    const sections = (currentContent.sections as Record<string, unknown>) || {}
    
    const sectionDef = REPORT_SECTIONS.find(s => s.id === sectionId)
    
    sections[sectionId] = {
      ...(sections[sectionId] as Record<string, unknown> || {}),
      content,
      title: sectionDef?.title || sectionId,
      order: sectionDef?.order || 99,
    }

    // Also update the full narrative to keep in sync
    const updatedNarrative = rebuildNarrativeFromSections(sections)

    const { error: updateError } = await supabase
      .from('reports')
      .update({
        content: { ...currentContent, sections },
        narrative: updatedNarrative,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId)
      .eq('user_id', userId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    revalidatePath(`/dashboard/reports/${reportId}`)
    return { success: true }

  } catch (error) {
    console.error('Save section error:', error)
    return { success: false, error: 'Failed to save section' }
  }
}

/**
 * Regenerate a single section using AI
 */
export async function regenerateSection(
  reportId: string,
  sectionId: string
): Promise<{ success: boolean; content?: string; error?: string }> {
  const { userId } = await auth()
  if (!userId) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    // Fetch full report context
    const { data: report, error: fetchError } = await supabase
      .from('reports')
      .select(`
        *,
        property:properties(*)
      `)
      .eq('id', reportId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !report) {
      return { success: false, error: 'Report not found' }
    }

    const sectionDef = REPORT_SECTIONS.find(s => s.id === sectionId)
    if (!sectionDef) {
      return { success: false, error: 'Invalid section' }
    }

    // Build a focused prompt for just this section
    const sectionContent = await generateSingleSection(
      sectionDef,
      {
        name: report.property?.name || 'Property',
        city: report.property?.city,
        state: report.property?.state,
        units: report.property?.units,
      },
      {
        month: report.month,
        year: report.year,
        questionnaire: report.questionnaire || {},
        freeformNarrative: report.freeform_narrative,
      }
    )

    if (!sectionContent) {
      return { success: false, error: 'Failed to generate section' }
    }

    // Save the regenerated section
    const saveResult = await saveSection(reportId, sectionId, sectionContent)
    
    if (!saveResult.success) {
      return { success: false, error: saveResult.error }
    }

    return { success: true, content: sectionContent }

  } catch (error) {
    console.error('Regenerate section error:', error)
    return { success: false, error: 'Failed to regenerate section' }
  }
}

/**
 * Generate a single section using Claude
 */
async function generateSingleSection(
  section: typeof REPORT_SECTIONS[0],
  property: { name: string; city?: string | null; state?: string | null; units?: number | null },
  context: { month: string; year: number; questionnaire: Record<string, unknown>; freeformNarrative: string | null }
): Promise<string | null> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const anthropic = new Anthropic()

  const systemPrompt = `You are a senior asset manager at a top-tier multifamily PE firm. 
Write ONLY the "${section.title}" section of a monthly investor report.

Requirements:
- 2-4 paragraphs, professional tone
- Use specific numbers when available
- Be concise and data-driven
- No section header in output (just the content)
- No bullet points - use prose paragraphs`

  const userPrompt = `Property: ${property.name}
Location: ${property.city || 'N/A'}, ${property.state || 'N/A'}
Units: ${property.units || 'N/A'}
Period: ${context.month} ${context.year}

Section to write: ${section.title}
Section description: ${section.description}

Context from asset manager:
${JSON.stringify(context.questionnaire, null, 2)}
${context.freeformNarrative ? `\nAdditional notes: ${context.freeformNarrative}` : ''}

Write the ${section.title} section now:`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const textContent = response.content.find(block => block.type === 'text')
    return textContent?.type === 'text' ? textContent.text : null

  } catch (error) {
    console.error('Generate single section error:', error)
    return null
  }
}

/**
 * Rebuild the full narrative from sections
 */
function rebuildNarrativeFromSections(
  sections: Record<string, unknown>
): string {
  const orderedSections = REPORT_SECTIONS
    .map(def => {
      const section = sections[def.id] as { title?: string; content?: string; order?: number } | undefined
      if (section?.content) {
        return {
          order: section.order || def.order,
          title: section.title || def.title,
          content: section.content,
        }
      }
      return null
    })
    .filter(Boolean)
    .sort((a, b) => (a?.order || 0) - (b?.order || 0))

  return orderedSections
    .map(s => `## ${s?.title}\n\n${s?.content}`)
    .join('\n\n')
}