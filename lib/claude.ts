import Anthropic from '@anthropic-ai/sdk'
import { REPORT_SECTIONS, StructuredReport } from './report-sections'

const anthropic = new Anthropic()
const MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 4096

// ============================================
// TYPES
// ============================================

export type PropertyContext = {
  name: string
  address?: string | null
  city?: string | null
  state?: string | null
  units?: number | null
}

export type ReportContext = {
  month: string
  year: number
  questionnaire: Record<string, unknown>
  freeformNarrative: string | null
  uploadedFiles: { name: string; type: string }[]
}

export type GenerationResult = {
  success: boolean
  narrative?: string
  structuredSections?: StructuredReport
  error?: string
  usage?: {
    inputTokens: number
    outputTokens: number
  }
}

// ============================================
// MAIN GENERATION FUNCTION
// ============================================

export async function generateInstitutionalReport(
  property: PropertyContext,
  context: ReportContext
): Promise<GenerationResult> {
  const systemPrompt = buildInstitutionalSystemPrompt()
  const userPrompt = buildInstitutionalUserPrompt(property, context)

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const textContent = response.content.find((block) => block.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return { success: false, error: 'No text response from Claude' }
    }

    // Parse the structured response
    const structured = parseStructuredResponse(textContent.text)

    return {
      success: true,
      narrative: textContent.text,
      structuredSections: structured,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    }
  } catch (error) {
    console.error('Claude API error:', error)
    if (error instanceof Anthropic.APIError) {
      return { success: false, error: `API Error: ${error.message}` }
    }
    return { success: false, error: 'Failed to generate narrative' }
  }
}

// ============================================
// STREAMING GENERATION
// ============================================

export async function* generateInstitutionalReportStream(
  property: PropertyContext,
  context: ReportContext
): AsyncGenerator<{ type: 'text' | 'done' | 'error'; content: string }, void, unknown> {
  const systemPrompt = buildInstitutionalSystemPrompt()
  const userPrompt = buildInstitutionalUserPrompt(property, context)

  try {
    const stream = await anthropic.messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        yield { type: 'text', content: event.delta.text }
      }
    }

    yield { type: 'done', content: '' }
  } catch (error) {
    console.error('Streaming error:', error)
    yield {
      type: 'error',
      content: error instanceof Error ? error.message : 'Generation failed',
    }
  }
}

// ============================================
// INSTITUTIONAL SYSTEM PROMPT
// ============================================

function buildInstitutionalSystemPrompt(): string {
  return `You are a senior asset manager at a top-tier multifamily private equity firm writing monthly investor reports for Limited Partners (LPs).

YOUR WRITING STYLE:
- Professional, confident, and direct — like a GP communicating to sophisticated institutional investors
- Data-driven with specific metrics (percentages to one decimal, dollar amounts, basis point changes)
- Concise paragraphs (3-5 sentences each) — LPs read dozens of reports, respect their time
- Forward-looking — always include what's next, not just what happened
- Balanced — acknowledge challenges honestly while highlighting mitigation strategies

REPORT STRUCTURE (follow this exactly):
## Executive Summary
2-3 sentences with the month's key headline metrics and overall assessment.

## Occupancy & Leasing  
Current occupancy rate, month-over-month change, new leases signed, renewals, lease velocity, any concessions.

## Financial Performance
Collections rate, trade-out performance, revenue vs budget, notable expense variances, NOI trend.

## Capital Projects
Projects completed, in-progress with % completion, upcoming projects, budget tracking.

## Operations
Staffing updates, maintenance highlights, vendor changes, operational wins or challenges.

## Market & Outlook
Submarket conditions, competitive positioning, demand trends, forward guidance for next 1-3 months.

FORMATTING RULES:
- Use ## for section headers (exactly as shown above)
- Write in paragraphs, NOT bullet points
- Include specific numbers when provided: "94.2% occupancy (+120bps MoM)" not "occupancy improved"
- Format currency: $1,250 or $1.2M
- Format percentages: 94.2% or +3.5%
- Format changes: +120bps, -$15K vs budget, +8 units
- Keep total length to 500-700 words
- No bold, italics, or other markdown formatting within paragraphs
- No disclaimers about being an AI

ANTI-PATTERNS TO AVOID:
- Vague statements like "performed well" or "making progress"
- Excessive hedging: "may", "might", "could potentially"
- Generic market commentary without local specifics
- Missing the "so what" — always explain why a metric matters
- Repetitive sentence structures

If certain information wasn't provided, acknowledge it briefly and move on. Never fabricate specific numbers.`
}

// ============================================
// INSTITUTIONAL USER PROMPT
// ============================================

function buildInstitutionalUserPrompt(
  property: PropertyContext,
  context: ReportContext
): string {
  const { month, year, questionnaire, freeformNarrative, uploadedFiles } = context

  let prompt = `Write a monthly investor report for the following property:

PROPERTY DETAILS:
- Name: ${property.name}
- Location: ${property.city || 'N/A'}, ${property.state || 'N/A'}
- Unit Count: ${property.units || 'N/A'}
- Reporting Period: ${month} ${year}

`

  // Add uploaded files context
  if (uploadedFiles.length > 0) {
    prompt += `UPLOADED DOCUMENTS:
${uploadedFiles.map((f) => `- ${f.name} (${f.type})`).join('\n')}
Note: Reference these as source documents. Full parsing coming in future update.

`
  }

  // Add questionnaire data
  if (questionnaire && Object.keys(questionnaire).length > 0) {
    prompt += `ASSET MANAGER'S INPUT BY CATEGORY:
${formatQuestionnaireForPrompt(questionnaire)}

`
  }

  // Add freeform narrative
  if (freeformNarrative && freeformNarrative.trim()) {
    prompt += `ADDITIONAL NOTES FROM ASSET MANAGER:
${freeformNarrative}

`
  }

  prompt += `Based on the above, write an institutional-quality investor report following the exact structure specified. Be specific with any metrics provided, and acknowledge where information is limited.`

  return prompt
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatQuestionnaireForPrompt(
  questionnaire: Record<string, unknown>
): string {
  const sectionLabels: Record<string, string> = {
    occupancy: 'OCCUPANCY & LEASING',
    collections: 'COLLECTIONS',
    revenue: 'REVENUE',
    expenses: 'EXPENSES',
    capex: 'CAPITAL PROJECTS',
    operations: 'OPERATIONS',
    market: 'MARKET',
    risks: 'RISKS',
  }

  let formatted = ''

  for (const [sectionKey, sectionLabel] of Object.entries(sectionLabels)) {
    const sectionData = questionnaire[sectionKey] as
      | Record<string, string>
      | undefined

    if (sectionData && typeof sectionData === 'object') {
      const entries = Object.entries(sectionData).filter(
        ([, value]) => value && typeof value === 'string' && value.trim()
      )

      if (entries.length > 0) {
        formatted += `\n[${sectionLabel}]\n`
        for (const [, value] of entries) {
          formatted += `• ${value}\n`
        }
      }
    }
  }

  return formatted || 'No specific context provided by asset manager.'
}

function parseStructuredResponse(text: string): StructuredReport {
  const sections: StructuredReport['sections'] = {}

  // Parse each section from the markdown response
  const sectionRegex = /## ([^\n]+)\n([\s\S]*?)(?=## |$)/g
  let match
  let order = 1

  while ((match = sectionRegex.exec(text)) !== null) {
    const title = match[1].trim()
    const content = match[2].trim()

    // Map title to section ID
    const sectionId = mapTitleToSectionId(title)

    sections[sectionId] = {
      title,
      content,
      order: order++,
    }
  }

  return {
    sections,
    generatedAt: new Date().toISOString(),
    modelUsed: MODEL,
    tokensUsed: { input: 0, output: 0 }, // Will be updated by caller
  }
}

function mapTitleToSectionId(title: string): string {
  const lowerTitle = title.toLowerCase()

  if (lowerTitle.includes('executive') || lowerTitle.includes('summary')) {
    return 'executive_summary'
  }
  if (lowerTitle.includes('occupancy') || lowerTitle.includes('leasing')) {
    return 'occupancy_leasing'
  }
  if (lowerTitle.includes('financial') || lowerTitle.includes('performance')) {
    return 'financial_performance'
  }
  if (lowerTitle.includes('capital') || lowerTitle.includes('project')) {
    return 'capital_projects'
  }
  if (lowerTitle.includes('operation')) {
    return 'operations'
  }
  if (lowerTitle.includes('market') || lowerTitle.includes('outlook')) {
    return 'market_outlook'
  }

  // Fallback: convert title to snake_case
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '_')
}

// Keep the old function for backward compatibility
export async function generateReportNarrative(
  propertyName: string,
  propertyInfo: {
    address?: string
    city?: string
    state?: string
    units?: number
  },
  month: string,
  year: number,
  questionnaire: Record<string, unknown>,
  freeformNarrative: string | null,
  financialContext: string
): Promise<GenerationResult> {
  // Convert to new format and call institutional generator
  return generateInstitutionalReport(
    {
      name: propertyName,
      address: propertyInfo.address,
      city: propertyInfo.city,
      state: propertyInfo.state,
      units: propertyInfo.units,
    },
    {
      month,
      year,
      questionnaire,
      freeformNarrative,
      uploadedFiles: financialContext
        ? [{ name: 'Uploaded documents', type: 'various' }]
        : [],
    }
  )
}