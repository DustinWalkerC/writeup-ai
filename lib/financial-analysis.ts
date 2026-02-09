import Anthropic from '@anthropic-ai/sdk'
import { ExtractedFinancialData } from './document-intelligence'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

/**
 * Analyzed financial metrics with variance analysis
 */
export type AnalyzedFinancials = {
  // Core metrics (verified)
  metrics: {
    totalRevenue: number
    totalExpenses: number
    noi: number
    noiMargin: number
    occupancy: number | null
    averageRent: number | null
    collectionsRate: number | null
    expenseRatio: number
    revenuePerUnit: number | null
    expensePerUnit: number | null
  }

  // Variance analysis
  variances: {
    noiVsBudget?: VarianceItem
    noiVsPriorMonth?: VarianceItem
    noiVsPriorYear?: VarianceItem
    revenueVsBudget?: VarianceItem
    expensesVsBudget?: VarianceItem
    occupancyVsTarget?: VarianceItem
  }

  // Trend analysis
  trends: {
    revenueDirection: 'increasing' | 'stable' | 'decreasing'
    expenseDirection: 'increasing' | 'stable' | 'decreasing'
    occupancyDirection: 'increasing' | 'stable' | 'decreasing'
    noiDirection: 'increasing' | 'stable' | 'decreasing'
    monthsAnalyzed: number
  }

  // Key insights (for narrative)
  insights: {
    strengths: string[]
    concerns: string[]
    opportunities: string[]
    recommendations: string[]
  }

  // Expense analysis
  expenseBreakdown: {
    category: string
    amount: number
    percentOfRevenue: number
    percentOfTotal: number
    status: 'normal' | 'elevated' | 'low'
    note?: string
  }[]

  // Verification
  verification: {
    mathVerified: boolean
    calculationsChecked: string[]
    discrepancies: string[]
    confidence: 'high' | 'medium' | 'low'
  }
}

export type VarianceItem = {
  actual: number
  target: number
  variance: number
  variancePercent: number
  favorable: boolean
  significance: 'material' | 'minor' | 'immaterial'
  explanation?: string
}

/**
 * Step 2: Analyze financials and calculate variances
 */
export async function analyzeFinancials(
  extractedData: ExtractedFinancialData,
  propertyContext: {
    name: string
    units?: number | null
    budgetNOI?: number
    budgetRevenue?: number
    budgetExpenses?: number
    targetOccupancy?: number
    priorMonthNOI?: number
    priorYearNOI?: number
  }
): Promise<AnalyzedFinancials> {
  
  const systemPrompt = `You are a senior financial analyst at a top multifamily private equity firm. Your job is to analyze T-12 operating statements with extreme precision.

CRITICAL RULES FOR CALCULATIONS:
1. Show your work for every calculation
2. Round percentages to 1 decimal place
3. Round dollar amounts to whole numbers
4. NOI Margin = NOI / Total Revenue (as decimal, e.g., 0.45)
5. Expense Ratio = Total Expenses / Total Revenue (as decimal)
6. Revenue Per Unit = Total Revenue / Units / 12 (monthly)
7. Expense Per Unit = Total Expenses / Units / 12 (monthly)
8. Variance % = (Actual - Budget) / Budget * 100
9. A POSITIVE variance in revenue/NOI is FAVORABLE
10. A POSITIVE variance in expenses is UNFAVORABLE

For significance levels:
- Material: > 5% variance
- Minor: 2-5% variance  
- Immaterial: < 2% variance

Analyze trends by comparing monthly data if available. Look for:
- Consistent direction over 3+ months = trend
- Single month spike = anomaly, not trend`

  const userPrompt = `Analyze this financial data for ${propertyContext.name}:

EXTRACTED DATA:
- Total Revenue: $${extractedData.summary.totalRevenue.toLocaleString()}
- Total Expenses: $${extractedData.summary.totalExpenses.toLocaleString()}
- NOI: $${extractedData.summary.noi.toLocaleString()}
- Occupancy: ${extractedData.summary.occupancy ?? 'Not provided'}%
- Average Rent: $${extractedData.summary.averageRent ?? 'Not provided'}
- Units: ${propertyContext.units ?? 'Not provided'}

BUDGET/TARGETS (if provided):
- Budget NOI: ${propertyContext.budgetNOI ? '$' + propertyContext.budgetNOI.toLocaleString() : 'Not provided'}
- Budget Revenue: ${propertyContext.budgetRevenue ? '$' + propertyContext.budgetRevenue.toLocaleString() : 'Not provided'}
- Budget Expenses: ${propertyContext.budgetExpenses ? '$' + propertyContext.budgetExpenses.toLocaleString() : 'Not provided'}
- Target Occupancy: ${propertyContext.targetOccupancy ?? 'Not provided'}%
- Prior Month NOI: ${propertyContext.priorMonthNOI ? '$' + propertyContext.priorMonthNOI.toLocaleString() : 'Not provided'}
- Prior Year NOI: ${propertyContext.priorYearNOI ? '$' + propertyContext.priorYearNOI.toLocaleString() : 'Not provided'}

EXPENSE BREAKDOWN:
${JSON.stringify(extractedData.expenses, null, 2)}

MONTHLY DATA:
${JSON.stringify(extractedData.monthlyData, null, 2)}

Return ONLY valid JSON matching this structure:
{
  "metrics": {
    "totalRevenue": number,
    "totalExpenses": number,
    "noi": number,
    "noiMargin": number (as decimal like 0.45),
    "occupancy": number or null,
    "averageRent": number or null,
    "collectionsRate": number or null,
    "expenseRatio": number (as decimal),
    "revenuePerUnit": number or null,
    "expensePerUnit": number or null
  },
  "variances": {
    "noiVsBudget": { "actual": n, "target": n, "variance": n, "variancePercent": n, "favorable": bool, "significance": "material|minor|immaterial", "explanation": "string" } or null,
    "revenueVsBudget": same structure or null,
    "expensesVsBudget": same structure or null,
    "occupancyVsTarget": same structure or null
  },
  "trends": {
    "revenueDirection": "increasing|stable|decreasing",
    "expenseDirection": "increasing|stable|decreasing",
    "occupancyDirection": "increasing|stable|decreasing",
    "noiDirection": "increasing|stable|decreasing",
    "monthsAnalyzed": number
  },
  "insights": {
    "strengths": ["string array of 2-4 key strengths"],
    "concerns": ["string array of concerns if any"],
    "opportunities": ["string array of opportunities"],
    "recommendations": ["string array of actionable recommendations"]
  },
  "expenseBreakdown": [
    { "category": "string", "amount": number, "percentOfRevenue": number, "percentOfTotal": number, "status": "normal|elevated|low", "note": "optional string" }
  ],
  "verification": {
    "mathVerified": true,
    "calculationsChecked": ["list of calculations verified"],
    "discrepancies": ["any discrepancies found"],
    "confidence": "high|medium|low"
  }
}

SHOW YOUR CALCULATIONS in the verification.calculationsChecked array.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
  })

  const responseText = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map(block => block.text)
    .join('')

  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    
    const analyzed = JSON.parse(jsonMatch[0]) as AnalyzedFinancials
    
    // Step 3: Verify the math with a second call
    const verified = await verifyCalculations(analyzed, extractedData)
    
    return {
      ...analyzed,
      verification: verified.verification,
    }
  } catch (error) {
    console.error('Analysis parsing error:', error)
    throw new Error('Failed to analyze financial data')
  }
}

/**
 * Step 3: Verify calculations with a second Claude call
 */
async function verifyCalculations(
  analyzed: AnalyzedFinancials,
  originalData: ExtractedFinancialData
): Promise<{ verification: AnalyzedFinancials['verification'] }> {
  
  const systemPrompt = `You are a financial auditor. Your ONLY job is to verify math calculations. Check every number and flag any errors.`

  const userPrompt = `VERIFY THESE CALCULATIONS:

Original Data:
- Revenue: $${originalData.summary.totalRevenue.toLocaleString()}
- Expenses: $${originalData.summary.totalExpenses.toLocaleString()}
- NOI: $${originalData.summary.noi.toLocaleString()}

Calculated Metrics:
- NOI Margin: ${analyzed.metrics.noiMargin} (should be NOI/Revenue)
- Expense Ratio: ${analyzed.metrics.expenseRatio} (should be Expenses/Revenue)
${analyzed.metrics.revenuePerUnit ? `- Revenue Per Unit: $${analyzed.metrics.revenuePerUnit}` : ''}
${analyzed.metrics.expensePerUnit ? `- Expense Per Unit: $${analyzed.metrics.expensePerUnit}` : ''}

Variance Calculations:
${analyzed.variances.noiVsBudget ? `- NOI vs Budget: ${analyzed.variances.noiVsBudget.variancePercent}% (Actual: $${analyzed.variances.noiVsBudget.actual}, Target: $${analyzed.variances.noiVsBudget.target})` : 'No budget variance'}

VERIFY each calculation. Return JSON:
{
  "verification": {
    "mathVerified": boolean,
    "calculationsChecked": ["list what you verified"],
    "discrepancies": ["list any errors found"],
    "confidence": "high|medium|low"
  }
}`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
  })

  const responseText = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map(block => block.text)
    .join('')

  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return {
        verification: {
          mathVerified: false,
          calculationsChecked: [],
          discrepancies: ['Verification failed'],
          confidence: 'low',
        },
      }
    }
    return JSON.parse(jsonMatch[0])
  } catch {
    return {
      verification: {
        mathVerified: false,
        calculationsChecked: [],
        discrepancies: ['Verification parse error'],
        confidence: 'low',
      },
    }
  }
}

/**
 * Format analyzed data for report narrative
 */
export function formatAnalysisForNarrative(analysis: AnalyzedFinancials): string {
  const lines: string[] = []
  
  lines.push('## Financial Analysis Summary')
  lines.push('')
  
  // Core Metrics
  lines.push('### Key Performance Metrics')
  lines.push(`- **Net Operating Income:** $${analysis.metrics.noi.toLocaleString()}`)
  lines.push(`- **NOI Margin:** ${(analysis.metrics.noiMargin * 100).toFixed(1)}%`)
  lines.push(`- **Expense Ratio:** ${(analysis.metrics.expenseRatio * 100).toFixed(1)}%`)
  if (analysis.metrics.occupancy) {
    lines.push(`- **Occupancy:** ${analysis.metrics.occupancy.toFixed(1)}%`)
  }
  if (analysis.metrics.revenuePerUnit) {
    lines.push(`- **Revenue Per Unit:** $${analysis.metrics.revenuePerUnit.toLocaleString()}/month`)
  }
  
  // Variances
  if (analysis.variances.noiVsBudget) {
    lines.push('')
    lines.push('### Budget Performance')
    const v = analysis.variances.noiVsBudget
    const direction = v.favorable ? 'above' : 'below'
    lines.push(`- NOI is **${Math.abs(v.variancePercent).toFixed(1)}% ${direction} budget** ($${Math.abs(v.variance).toLocaleString()} ${v.favorable ? 'favorable' : 'unfavorable'})`)
    if (v.explanation) lines.push(`  - ${v.explanation}`)
  }
  
  // Trends
  lines.push('')
  lines.push('### Trends')
  lines.push(`- Revenue trend: ${analysis.trends.revenueDirection}`)
  lines.push(`- Expense trend: ${analysis.trends.expenseDirection}`)
  lines.push(`- NOI trend: ${analysis.trends.noiDirection}`)
  
  // Insights
  if (analysis.insights.strengths.length > 0) {
    lines.push('')
    lines.push('### Key Strengths')
    analysis.insights.strengths.forEach(s => lines.push(`- ${s}`))
  }
  
  if (analysis.insights.concerns.length > 0) {
    lines.push('')
    lines.push('### Areas of Concern')
    analysis.insights.concerns.forEach(c => lines.push(`- ${c}`))
  }
  
  if (analysis.insights.recommendations.length > 0) {
    lines.push('')
    lines.push('### Recommendations')
    analysis.insights.recommendations.forEach(r => lines.push(`- ${r}`))
  }
  
  // Verification note
  lines.push('')
  lines.push(`*Analysis confidence: ${analysis.verification.confidence}*`)
  
  return lines.join('\n')
}
