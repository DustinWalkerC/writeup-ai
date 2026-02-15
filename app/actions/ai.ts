'use server'

import { analyzeFinancials, formatAnalysisForNarrative, AnalyzedFinancials } from '@/lib/financial-analysis'
import { calculateKPIs } from '@/lib/kpi-calculator'
import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { REPORT_SECTIONS } from '@/lib/report-sections'
import { parseReportFilesWithAI } from './files'
import { ExtractedFinancialData, formatFinancialContextForReport } from '@/lib/document-intelligence'

export type GenerateReportResult = {
  success: boolean
  narrative?: string
  error?: string
}

type ReportFile = {
  file_name: string
  file_type: string
}

type CalculatedKPIs = ReturnType<typeof calculateKPIs>

// Define types locally since they were removed from lib/claude.ts
type PropertyContext = {
  name: string
  address?: string | null
  city?: string | null
  state?: string | null
  units?: number | null
}

type ReportContext = {
  month: string
  year: number
  questionnaire: Record<string, unknown>
  freeformNarrative: string | null
  uploadedFiles?: Array<{ name: string; type: string }>
}

/**
 * Legacy report generation function.
 * NOTE: The new Day 16+ pipeline uses /api/reports/generate/route.ts instead.
 * This is kept for backward compatibility with existing report pages.
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
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId)
      .eq('user_id', userId)

    // 2. Fetch the report with property info and files
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select(
        `
        *,
        property:properties(*),
        report_files(*)
      `
      )
      .eq('id', reportId)
      .eq('user_id', userId)
      .single()

    if (reportError || !report) {
      throw new Error('Report not found')
    }

    // 3. === CLAUDE-POWERED FILE PARSING ===
    let financialData: ExtractedFinancialData | null = null
    let financialContext = ''

    const reportFiles: ReportFile[] = report.report_files || []
    const hasFinancialFiles = reportFiles.some((file) => {
      const name = file.file_name.toLowerCase()
      return name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.pdf')
    })

    if (hasFinancialFiles) {
      console.log('Parsing financial files with Claude...')
      const parseResult = await parseReportFilesWithAI(reportId)

      if (parseResult.success && parseResult.data) {
        financialData = parseResult.data
        financialContext = formatFinancialContextForReport(financialData)
        console.log('Financial data extracted:', {
          revenue: financialData.summary.totalRevenue,
          noi: financialData.summary.noi,
          confidence: financialData.metadata.confidence,
        })
      } else {
        console.warn('Could not parse financial files:', parseResult.error)
      }
    }

    // === STEP 2: ANALYZE FINANCIALS ===
    let analyzedFinancials: AnalyzedFinancials | null = null
    let analysisContext = ''

    if (financialData) {
      console.log('Analyzing financials with Claude...')

      try {
        analyzedFinancials = await analyzeFinancials(financialData, {
          name: report.property?.name || 'Property',
          units: report.property?.units,
          budgetNOI: extractBudgetValue(report.questionnaire, 'budgetNOI'),
          targetOccupancy: extractBudgetValue(report.questionnaire, 'targetOccupancy'),
        })

        analysisContext = formatAnalysisForNarrative(analyzedFinancials)

        console.log('Financial analysis complete:', {
          noiMargin: analyzedFinancials.metrics.noiMargin,
          confidence: analyzedFinancials.verification.confidence,
          mathVerified: analyzedFinancials.verification.mathVerified,
        })
      } catch (analysisError) {
        console.warn('Financial analysis failed:', analysisError)
      }
    }

    // === STEP 3: CALCULATE KPIS ===
    let calculatedKPIs: CalculatedKPIs | null = null

    if (financialData && analyzedFinancials) {
      calculatedKPIs = calculateKPIs(
        financialData,
        analyzedFinancials,
        report.questionnaire as Record<string, Record<string, string>> | undefined
      )
      console.log(
        'KPIs calculated:',
        Object.keys(calculatedKPIs).filter((k) => calculatedKPIs![k as keyof CalculatedKPIs] !== null)
      )
    }

    // 4. Build context objects
    const propertyContext: PropertyContext = {
      name: report.property?.name || 'Unknown Property',
      address: report.property?.address,
      city: report.property?.city,
      state: report.property?.state,
      units: report.property?.units,
    }

    const enhancedFreeformNarrative = buildEnhancedContext(financialContext, analysisContext, report.freeform_narrative)

    const reportContext: ReportContext = {
      month: report.month,
      year: report.year,
      questionnaire: report.questionnaire || {},
      freeformNarrative: enhancedFreeformNarrative,
      uploadedFiles: reportFiles.map((f) => ({
        name: f.file_name,
        type: f.file_type,
      })),
    }

    // 5. Call Claude directly (replaces old generateInstitutionalReport)
    const result = await generateInstitutionalReportDirect(propertyContext, reportContext)

    if (!result.success) {
      await supabase
        .from('reports')
        .update({
          status: 'error',
          updated_at: new Date().toISOString(),
        })
        .eq('id', reportId)
        .eq('user_id', userId)

      return { success: false, error: result.error }
    }

    // 6. Save the generated narrative
    const updateData: Record<string, unknown> = {
      narrative: result.narrative,
      status: 'complete',
      updated_at: new Date().toISOString(),
    }

    if (result.structuredSections) {
      const contentWithKPIs = {
        ...result.structuredSections,
        calculatedKPIs: calculatedKPIs,
        analysisMetadata: analyzedFinancials
          ? {
              confidence: analyzedFinancials.verification.confidence,
              mathVerified: analyzedFinancials.verification.mathVerified,
              analyzedAt: new Date().toISOString(),
            }
          : null,
      }
      updateData.content = contentWithKPIs
    }

    if (financialData) {
      updateData.financial_data = {
        ...financialData,
        analysis: analyzedFinancials,
      }
    }

    await supabase.from('reports').update(updateData).eq('id', reportId).eq('user_id', userId)

    revalidatePath(`/dashboard/reports/${reportId}`)

    return {
      success: true,
      narrative: result.narrative,
    }
  } catch (error) {
    console.error('Generate report error:', error)

    await supabase.from('reports').update({ status: 'error' }).eq('id', reportId).eq('user_id', userId)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Generation failed',
    }
  }
}

/**
 * Direct Claude call — replaces the old generateInstitutionalReport from lib/claude.ts
 */
async function generateInstitutionalReportDirect(
  property: PropertyContext,
  context: ReportContext
): Promise<{ success: boolean; narrative?: string; structuredSections?: Record<string, unknown>; error?: string }> {
  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const anthropic = new Anthropic()

    const systemPrompt = `You are a senior asset manager at a top-tier multifamily private equity firm.
Write a comprehensive monthly investor report. Use institutional-quality language.
Be specific with numbers, concise, and data-driven. No fluff or filler.
Format with markdown headers (##) for each section.`

    const userPrompt = `Property: ${property.name}
Location: ${property.city || 'N/A'}, ${property.state || 'N/A'}
Units: ${property.units || 'N/A'}
Period: ${context.month} ${context.year}

Context:
${JSON.stringify(context.questionnaire, null, 2)}
${context.freeformNarrative ? `\nAdditional context:\n${context.freeformNarrative}` : ''}

Write the full investor report now.`

    const response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const textContent = response.content.find((block) => block.type === 'text')
    const narrative = textContent?.type === 'text' ? textContent.text : null

    if (!narrative) {
      return { success: false, error: 'No content generated' }
    }

    return { success: true, narrative, structuredSections: {} }
  } catch (error) {
    console.error('Claude generation error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Generation failed' }
  }
}

/**
 * Extract budget values from questionnaire
 */
function extractBudgetValue(questionnaire: Record<string, unknown> | null, field: string): number | undefined {
  if (!questionnaire) return undefined

  const sections = ['expenses', 'revenue', 'financial']

  for (const section of sections) {
    const sectionData = questionnaire[section] as Record<string, string> | undefined
    if (sectionData?.[field]) {
      const value = parseFloat(sectionData[field].replace(/[^0-9.-]/g, ''))
      if (!isNaN(value)) return value
    }
  }

  return undefined
}

/**
 * Build enhanced context
 */
function buildEnhancedContext(financialContext: string, analysisContext: string, freeformNarrative: string | null): string {
  const parts: string[] = []
  if (financialContext) parts.push(financialContext)
  if (analysisContext) parts.push('\n' + analysisContext)
  if (freeformNarrative) {
    parts.push('\n## Additional Notes from Property Manager\n')
    parts.push(freeformNarrative)
  }
  return parts.join('\n')
}

/**
 * Regenerate a report with fresh AI output
 */
export async function regenerateReport(reportId: string): Promise<GenerateReportResult> {
  const { userId } = await auth()
  if (!userId) {
    return { success: false, error: 'Unauthorized' }
  }

  await supabase
    .from('reports')
    .update({
      status: 'draft',
      narrative: null,
      content: {},
      financial_data: null,
    })
    .eq('id', reportId)
    .eq('user_id', userId)

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
    const { data: report, error: fetchError } = await supabase
      .from('reports')
      .select('content, narrative')
      .eq('id', reportId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !report) {
      return { success: false, error: 'Report not found' }
    }

    const currentContent = (report.content as Record<string, unknown>) || { sections: {} }
    const sections = (currentContent.sections as Record<string, unknown>) || {}

    const sectionDef = REPORT_SECTIONS.find((s) => s.id === sectionId)

    sections[sectionId] = {
      ...(((sections[sectionId] as Record<string, unknown>) || {}) as Record<string, unknown>),
      content,
      title: sectionDef?.title || sectionId,
      order: sectionDef?.order || 99,
    }

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
  sectionId: string,
  instructions?: string
): Promise<{ success: boolean; content?: string; error?: string }> {
  const { userId } = await auth()
  if (!userId) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const { data: report, error: fetchError } = await supabase
      .from('reports')
      .select(
        `
        *,
        property:properties(*)
      `
      )
      .eq('id', reportId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !report) {
      return { success: false, error: 'Report not found' }
    }

    // Check both legacy and new section definitions
    const legacySectionDef = REPORT_SECTIONS.find((s) => s.id === sectionId)
    const { ALL_SECTIONS: allSections } = await import('@/lib/section-definitions')
    const newSectionDef = allSections[sectionId as keyof typeof allSections]

    const sectionDef =
      legacySectionDef ||
      (newSectionDef
        ? {
            id: newSectionDef.id,
            title: newSectionDef.title,
            description: newSectionDef.description,
            required: !newSectionDef.isConditional,
            order: 99,
          }
        : null)

    if (!sectionDef) {
      return { success: false, error: 'Invalid section' }
    }

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
      },
      instructions
    )

    if (!sectionContent) {
      return { success: false, error: 'Failed to generate section' }
    }

    // Save to BOTH legacy content.sections AND new generated_sections
    // Legacy save (backward compat)
    await saveSection(reportId, sectionId, sectionContent)

    // New pipeline: update generated_sections array directly
    try {
      const { data: currentReport } = await supabase
        .from('reports')
        .select('generated_sections')
        .eq('id', reportId)
        .eq('user_id', userId)
        .single()

      if (currentReport?.generated_sections) {
        const genSections = currentReport.generated_sections as Array<Record<string, unknown>>
        const updatedSections = genSections.map((s) => {
          if ((s.id as string) === sectionId) {
            return { ...s, content: sectionContent }
          }
          return s
        })

        await supabase
          .from('reports')
          .update({
            generated_sections: updatedSections,
            updated_at: new Date().toISOString(),
          })
          .eq('id', reportId)
          .eq('user_id', userId)
      }
    } catch (err) {
      console.warn('Could not update generated_sections:', err)
    }

    revalidatePath(`/dashboard/reports/${reportId}`)
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
  context: { month: string; year: number; questionnaire: Record<string, unknown>; freeformNarrative: string | null },
  instructions?: string
): Promise<string | null> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const anthropic = new Anthropic()

  // Try to get the new-style section definition for rich prompt guidance
  const { ALL_SECTIONS } = await import('@/lib/section-definitions')
  const { buildSystemPrompt } = await import('@/lib/prompt-templates')

  const newSectionDef = ALL_SECTIONS[section.id as keyof typeof ALL_SECTIONS]

  // Build a proper system prompt with tier, colors, etc.
  // We don't have full context here, so we fetch user settings
  const { supabase: supabaseClient } = await import('@/lib/supabase')
  const { userId } = await auth()
  let brandColors: { primary: string; secondary: string; accent: string } | undefined
  let tier = 'professional' // default for regeneration

  if (userId) {
    const { data: settings } = await supabaseClient
      .from('user_settings')
      .select('accent_color, secondary_color')
      .eq('user_id', userId)
      .single()

    if (settings) {
      brandColors = {
        primary: '#27272A',
        secondary: settings.secondary_color || '#EFF6FF',
        accent: settings.accent_color || '#2563EB',
      }
    }

    // Try to detect tier from the report's generation_config
    const { data: reports } = await supabaseClient
      .from('reports')
      .select('generation_config')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)

    if (reports?.[0]?.generation_config) {
      const config = reports[0].generation_config as Record<string, unknown>
      if (config.tier) tier = config.tier as string
    }
  }

  const systemPrompt = newSectionDef
    ? buildSystemPrompt({
        tier,
        propertyName: property.name,
        propertyAddress: [property.city, property.state].filter(Boolean).join(', ') || undefined,
        unitCount: property.units || undefined,
        brandColors,
      })
    : `You are a senior asset manager at a top-tier multifamily PE firm.
Write ONLY the "${section.title}" section of a monthly investor report.
Requirements: 2-4 paragraphs, professional tone, data-driven, no section header.`

  const sectionGuidance = newSectionDef?.promptGuidance || ''

  const userPrompt = `Regenerate ONLY the "${section.title}" section.

<property>
Name: ${property.name}
Location: ${property.city || 'N/A'}, ${property.state || 'N/A'}
Units: ${property.units || 'N/A'}
Period: ${context.month} ${context.year}
</property>

<asset_manager_notes>
${JSON.stringify(context.questionnaire, null, 2)}
${context.freeformNarrative ? `\nFreeform notes: ${context.freeformNarrative}` : ''}
</asset_manager_notes>

${sectionGuidance ? `<section_instructions>\n${sectionGuidance}\n</section_instructions>` : ''}

${instructions ? `<user_feedback>${instructions}</user_feedback>` : ''}

<output_format>
Return valid JSON:
{
  "id": "${section.id}",
  "title": "${section.title}",
  "content": "Section content with inline HTML charts/tables if appropriate for this tier...",
  "metrics": [{"label": "...", "value": "...", "change": "...", "changeDirection": "up|down|flat", "vsbudget": "..."}],
  "included": true,
  "skipReason": null
}
</output_format>`

  try {
    const response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const textContent = response.content.find((block) => block.type === 'text')
    const rawText = textContent?.type === 'text' ? textContent.text : null
    if (!rawText) return null

    // Try to parse as JSON and extract content
    try {
      let jsonStr = rawText
      const m = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
      if (m) jsonStr = m[1]
      const obj = jsonStr.match(/\{[\s\S]*\}/)
      if (obj) jsonStr = obj[0]
      const parsed = JSON.parse(jsonStr)
      return parsed.content || rawText
    } catch {
      // If JSON parse fails, return raw text (plain markdown)
      return rawText
    }
  } catch (error) {
    console.error('Generate single section error:', error)
    return null
  }
}

/**
 * Rebuild the full narrative from sections
 */
function rebuildNarrativeFromSections(sections: Record<string, unknown>): string {
  const orderedSections = REPORT_SECTIONS
    .map((def) => {
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

  return orderedSections.map((s) => `## ${s?.title}\n\n${s?.content}`).join('\n\n')
}

/**
 * Reorder sections by saving the new order to generated_sections
 */
export async function reorderSections(reportId: string, orderedSectionIds: string[]): Promise<{ success: boolean; error?: string }> {
  const { userId } = await auth()
  if (!userId) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const { data: report, error: fetchError } = await supabase
      .from('reports')
      .select('generated_sections')
      .eq('id', reportId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !report) {
      return { success: false, error: 'Report not found' }
    }

    const genSections = (report.generated_sections as Array<Record<string, unknown>>) || []

    // Build a map for quick lookup
    const sectionMap = new Map(genSections.map((s) => [s.id as string, s]))

    // Reorder: place sections in the order specified by orderedSectionIds
    const reordered = orderedSectionIds.map((id) => sectionMap.get(id)).filter(Boolean) as Array<Record<string, unknown>>

    // Append any sections not in the ordered list (shouldn't happen, but safety)
    for (const s of genSections) {
      if (!orderedSectionIds.includes(s.id as string)) {
        reordered.push(s)
      }
    }

    const { error: updateError } = await supabase
      .from('reports')
      .update({
        generated_sections: reordered,
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
    console.error('Reorder sections error:', error)
    return { success: false, error: 'Failed to reorder sections' }
  }
}

/**
 * Remove (hide) a section from the report
 */
export async function removeSection(reportId: string, sectionId: string): Promise<{ success: boolean; error?: string }> {
  const { userId } = await auth()
  if (!userId) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const { data: report, error: fetchError } = await supabase
      .from('reports')
      .select('generated_sections')
      .eq('id', reportId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !report) {
      return { success: false, error: 'Report not found' }
    }

    const genSections = (report.generated_sections as Array<Record<string, unknown>>) || []

    const updated = genSections.map((s) => {
      if ((s.id as string) === sectionId) {
        return { ...s, included: false, skipReason: 'Removed by user' }
      }
      return s
    })

    const { error: updateError } = await supabase
      .from('reports')
      .update({
        generated_sections: updated,
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
    console.error('Remove section error:', error)
    return { success: false, error: 'Failed to remove section' }
  }
}

/**
 * Add (restore or create blank) a section to the report
 */
export async function addSection(
  reportId: string,
  sectionId: string,
  sectionTitle: string
): Promise<{ success: boolean; error?: string }> {
  const { userId } = await auth()
  if (!userId) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const { data: report, error: fetchError } = await supabase
      .from('reports')
      .select('generated_sections')
      .eq('id', reportId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !report) {
      return { success: false, error: 'Report not found' }
    }

    const genSections = (report.generated_sections as Array<Record<string, unknown>>) || []

    // Check if section already exists (was previously removed)
    const existingIndex = genSections.findIndex((s) => (s.id as string) === sectionId)

    let updated: Array<Record<string, unknown>>

    if (existingIndex >= 0) {
      // Re-include the existing section
      updated = genSections.map((s) => {
        if ((s.id as string) === sectionId) {
          return { ...s, included: true, skipReason: null }
        }
        return s
      })
    } else {
      // Add a new blank section at the end
      updated = [
        ...genSections,
        {
          id: sectionId,
          title: sectionTitle,
          content: '',
          metrics: [],
          included: true,
          skipReason: null,
        },
      ]
    }

    const { error: updateError } = await supabase
      .from('reports')
      .update({
        generated_sections: updated,
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
    console.error('Add section error:', error)
    return { success: false, error: 'Failed to add section' }
  }
}

