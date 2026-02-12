'use server'

import { analyzeFinancials, formatAnalysisForNarrative, AnalyzedFinancials } from '@/lib/financial-analysis'
import { calculateKPIs } from '@/lib/kpi-calculator'
import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { REPORT_SECTIONS } from '@/lib/report-sections'
import { parseReportFilesWithAI } from './files'
import { 
  ExtractedFinancialData, 
  formatFinancialContextForReport 
} from '@/lib/document-intelligence'

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
        updated_at: new Date().toISOString() 
      })
      .eq('id', reportId)
      .eq('user_id', userId)

    // 2. Fetch the report with property info and files
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select(`
        *,
        property:properties(*),
        report_files(*)
      `)
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
        Object.keys(calculatedKPIs).filter(
          (k) => calculatedKPIs![k as keyof CalculatedKPIs] !== null
        )
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

    const enhancedFreeformNarrative = buildEnhancedContext(
      financialContext,
      analysisContext,
      report.freeform_narrative
    )

    const reportContext: ReportContext = {
      month: report.month,
      year: report.year,
      questionnaire: report.questionnaire || {},
      freeformNarrative: enhancedFreeformNarrative,
      uploadedFiles: reportFiles.map(f => ({
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
          updated_at: new Date().toISOString() 
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
        analysisMetadata: analyzedFinancials ? {
          confidence: analyzedFinancials.verification.confidence,
          mathVerified: analyzedFinancials.verification.mathVerified,
          analyzedAt: new Date().toISOString(),
        } : null,
      }
      updateData.content = contentWithKPIs
    }

    if (financialData) {
      updateData.financial_data = {
        ...financialData,
        analysis: analyzedFinancials,
      }
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

    const textContent = response.content.find(block => block.type === 'text')
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
function extractBudgetValue(
  questionnaire: Record<string, unknown> | null,
  field: string
): number | undefined {
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
function buildEnhancedContext(
  financialContext: string,
  analysisContext: string,
  freeformNarrative: string | null
): string {
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
    
    const sectionDef = REPORT_SECTIONS.find(s => s.id === sectionId)
    
    sections[sectionId] = {
      ...(sections[sectionId] as Record<string, unknown> || {}),
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
  sectionId: string
): Promise<{ success: boolean; content?: string; error?: string }> {
  const { userId } = await auth()
  if (!userId) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
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
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
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