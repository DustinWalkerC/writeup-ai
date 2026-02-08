import Anthropic from '@anthropic-ai/sdk'

// Initialize the Anthropic client
// The SDK automatically reads ANTHROPIC_API_KEY from environment
const anthropic = new Anthropic()

// Model to use - Claude 3.5 Sonnet is best balance of quality/speed/cost
const MODEL = 'claude-sonnet-4-20250514'

// Maximum tokens for response
const MAX_TOKENS = 4096

export type GenerationResult = {
  success: boolean
  narrative?: string
  error?: string
  usage?: {
    inputTokens: number
    outputTokens: number
  }
}

/**
 * Generate a report narrative using Claude
 */
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
  financialContext: string // Extracted from uploaded files
): Promise<GenerationResult> {
  
  // Build the prompt
  const systemPrompt = buildSystemPrompt()
  const userPrompt = buildUserPrompt(
    propertyName,
    propertyInfo,
    month,
    year,
    questionnaire,
    freeformNarrative,
    financialContext
  )

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ]
    })

    // Extract the text response
    const textContent = response.content.find(block => block.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return { success: false, error: 'No text response from Claude' }
    }

    return {
      success: true,
      narrative: textContent.text,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens
      }
    }

  } catch (error) {
    console.error('Claude API error:', error)
    
    if (error instanceof Anthropic.APIError) {
      return { 
        success: false, 
        error: `API Error: ${error.message}` 
      }
    }
    
    return { 
      success: false, 
      error: 'Failed to generate narrative' 
    }
  }
}

/**
 * System prompt - defines Claude's role and output format
 */
function buildSystemPrompt(): string {
  return `You are an expert multifamily real estate asset manager writing monthly investor reports.

Your writing style is:
- Professional but accessible
- Data-driven with specific numbers when available
- Concise and action-oriented
- Optimistic but honest about challenges
- Focused on what investors care about: returns, occupancy, NOI, and value creation

Output format:
- Write in clear paragraphs, not bullet points
- Use headers to organize sections: ## Executive Summary, ## Occupancy & Leasing, ## Financial Performance, ## Capital Projects, ## Market Outlook
- Include specific metrics when provided
- Keep the total length to 400-600 words
- End with a forward-looking statement

Do NOT:
- Make up specific numbers that weren't provided
- Use overly promotional language
- Include disclaimers or caveats about being an AI
- Add formatting like bold or italics`
}

/**
 * User prompt - contains all the context for this specific report
 */
function buildUserPrompt(
  propertyName: string,
  propertyInfo: { address?: string; city?: string; state?: string; units?: number },
  month: string,
  year: number,
  questionnaire: Record<string, unknown>,
  freeformNarrative: string | null,
  financialContext: string
): string {
  
  let prompt = `Write a monthly investor report for the following property:

## Property Information
- Name: ${propertyName}
- Location: ${propertyInfo.city || 'N/A'}, ${propertyInfo.state || 'N/A'}
- Units: ${propertyInfo.units || 'N/A'}
- Report Period: ${month} ${year}

`

  // Add financial context if available
  if (financialContext && financialContext.trim()) {
    prompt += `## Financial Data from Uploaded Documents
${financialContext}

`
  }

  // Add questionnaire answers if provided
  if (questionnaire && Object.keys(questionnaire).length > 0) {
    prompt += `## Context Provided by Asset Manager
${formatQuestionnaire(questionnaire)}

`
  }

  // Add freeform narrative if provided
  if (freeformNarrative && freeformNarrative.trim()) {
    prompt += `## Additional Notes from Asset Manager
${freeformNarrative}

`
  }

  prompt += `Based on the above information, write a professional monthly investor report. Focus on what was provided and acknowledge if certain areas weren't covered.`

  return prompt
}

/**
 * Format questionnaire answers into readable text
 */
function formatQuestionnaire(questionnaire: Record<string, unknown>): string {
  const sections: Record<string, string> = {
    occupancy: 'Occupancy & Leasing',
    collections: 'Collections & Delinquency',
    revenue: 'Revenue & Trade-Outs',
    expenses: 'Expenses & Variances',
    capex: 'CapEx & Projects',
    operations: 'Operations',
    market: 'Market & Competition',
    risks: 'Risks & Mitigation'
  }

  let formatted = ''

  for (const [key, label] of Object.entries(sections)) {
    const sectionData = questionnaire[key] as Record<string, string> | undefined
    if (sectionData && typeof sectionData === 'object') {
      const entries = Object.entries(sectionData).filter(([, v]) => v && v.trim())
      if (entries.length > 0) {
        formatted += `\n### ${label}\n`
        for (const [, value] of entries) {
          formatted += `- ${value}\n`
        }
      }
    }
  }

  return formatted || 'No specific context provided.'
}

/**
 * Extract text content from a file (for PDFs and text-based files)
 * Note: For V1, we'll do basic extraction. Full parsing comes later.
 */
export async function extractTextFromFile(
  fileBuffer: ArrayBuffer,
  fileName: string,
  fileType: string
): Promise<string> {
  // For V1, we'll handle this simply
  // PDFs would need a library like pdf-parse
  // Excel would need xlsx library
  // For now, we'll note what was uploaded
  
  const fileSizeKB = Math.round(fileBuffer.byteLength / 1024)
  
  return `[Uploaded file: ${fileName} (${fileType}, ${fileSizeKB}KB) - Full parsing coming in future update]`
}
