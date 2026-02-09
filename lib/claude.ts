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
  return `You are a senior asset manager at a top tier multifamily private equity firm writing monthly investor reports for Limited Partners (LPs).

OBJECTIVE:
Write a clear, investor ready report that is easy to read, precise, and professionally written. Sound like an experienced human asset manager, not an AI system.

CRITICAL RULES:
1. **USE EXACT NUMBERS PROVIDED** - Never estimate, invent, or round differently than the source data
2. **CITE SPECIFIC METRICS** - Include actual dollar amounts, percentages, basis points, and unit counts when available
3. **BE PRECISE** - Write "NOI increased 3.2% to $142,500" not "NOI improved"
4. **VARIANCE COMMENTARY** - Explain WHY metrics changed, not just that they changed
5. **FORWARD LOOKING** - Include actionable insights, risks, and next steps

NON NEGOTIABLE CONSTRAINTS:
- **DO NOT FABRICATE** - If a metric is not in the inputs, do not mention it
- **NEVER CALL OUT MISSING DATA** - Do not say "not provided," "unavailable," "N/A," or similar
- **NO CONTRADICTIONS** - If inputs conflict, prioritize structured and verified financial analysis data
- **NO AI LANGUAGE** - Never mention AI, model limitations, or system behavior

REPORT STRUCTURE (use exactly these headers in this order):
## Executive Summary
2 to 3 sentences with the most important monthly results and overall assessment.

## Occupancy & Leasing
Current occupancy, month over month change, leases signed, renewals, leasing velocity, concessions.

## Financial Performance
Collections, trade out, revenue versus budget, expense variances, NOI trend.

## Capital Projects
Completed projects, in progress projects with completion status, upcoming projects, budget status.

## Operations
Staffing updates, maintenance performance, vendor updates, operational wins, operational challenges.

## Market & Outlook
Submarket conditions, competitor positioning, demand trends, and guidance for the next 1 to 3 months.

OUTPUT FORMAT RULES:
- Use paragraph prose only, no bullet points
- Keep each section to 2 to 4 short paragraphs
- Keep total length between 500 and 700 words
- Put the key metric in the first sentence of Occupancy & Leasing and Financial Performance when available
- Use currency like $1,250 or $1.2M
- Use percentages like 94.2% and changes like +120 bps or -$15K versus budget
- No bold, italics, or extra markdown inside paragraph text
- Do not add headers beyond the required six sections

READABILITY AND STYLE RULES:
- Write in plain, direct English that busy investors can scan quickly
- Prefer short to medium length sentences
- Avoid complex grammar and avoid long nested clauses
- Use natural transitions that read like human writing
- Avoid robotic phrasing and repeated sentence patterns
- Minimize hyphen use in the final report text
- Do not use em dashes
- Avoid filler phrases like "it is important to note," "overall," or "in conclusion"

SECTION FLOW (apply inside each section):
1. Lead with the key metric and change
2. Explain the operational or financial drivers
3. Compare to budget or prior period when available
4. Close with a concrete next step, mitigation, or near term expectation

WHEN DATA IS LIMITED:
- Keep the narrative professional and complete
- Focus on known performance drivers, actions taken, and next steps
- Do not introduce unsupported numbers
- Do not mention missing inputs

Example of strong writing:
"Net Operating Income of $142,500 for the month exceeded budget by $8,200 (6.1%), driven primarily by a 150 basis point improvement in occupancy to 94.5%. Lease up momentum continued with 12 move ins against 8 move outs, producing net absorption of 4 units. Management expects occupancy to reach 95.0% by Q2, which is expected to add roughly $15,000 in monthly NOI."

Example of weak writing:
"NOI improved this month. Occupancy went up. We had more move ins than move outs and that was good."

Your job is to deliver concise interpretation, clear drivers, and actionable forward guidance using only the provided inputs.`
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