import Anthropic from '@anthropic-ai/sdk'
import * as XLSX from 'xlsx'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

/**
 * Structured financial data extracted by Claude
 */
export type ExtractedFinancialData = {
  summary: {
    totalRevenue: number
    totalExpenses: number
    noi: number
    noiMargin: number
    occupancy: number | null
    averageRent: number | null
    totalUnits: number | null
  }
  
  revenue: {
    grossPotentialRent: number | null
    lossToLease: number | null
    vacancyLoss: number | null
    concessions: number | null
    badDebt: number | null
    otherIncome: number | null
    effectiveGrossIncome: number | null
    items: LineItemWithGL[]
  }
  
  expenses: {
    payroll: number | null
    repairsAndMaintenance: number | null
    utilities: number | null
    insurance: number | null
    propertyTaxes: number | null
    managementFee: number | null
    administrative: number | null
    marketing: number | null
    contractServices: number | null
    turnover: number | null
    other: number | null
    items: LineItemWithGL[]
  }
  
  monthlyData: MonthlyData[]
  
  insights: {
    anomalies: string[]
    trends: string[]
    recommendations: string[]
  }
  
  metadata: {
    sourceFormat: string
    reportingPeriod: string
    confidence: 'high' | 'medium' | 'low'
    extractedAt: string
    sourceFiles: string[]
    warnings: string[]
  }
}

export type LineItemWithGL = {
  name: string
  glCode: string | null
  amount: number
  category: string
  notes?: string
}

export type MonthlyData = {
  month: string
  revenue: number
  expenses: number
  noi: number
  occupancy?: number
}

/**
 * Convert Excel file to text for Claude
 */
export function excelToText(buffer: ArrayBuffer, fileName: string): string {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const textParts: string[] = [`File: ${fileName}\n`]
  
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName]
    textParts.push(`\n--- Sheet: ${sheetName} ---\n`)
    
    const csv = XLSX.utils.sheet_to_csv(worksheet, { 
      blankrows: false,
      strip: true 
    })
    textParts.push(csv)
  }
  
  return textParts.join('\n')
}

/**
 * Extract text from PDF
 */
export async function pdfToText(buffer: Buffer, fileName: string): Promise<string> {
  // Use require-style import for pdf-parse to avoid ESM issues
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse')
  const data = await pdfParse(buffer)
  return `File: ${fileName}\n\n${data.text}`
}

/**
 * Use Claude to intelligently extract financial data
 */
export async function extractFinancialDataWithClaude(
  documentText: string,
  propertyName: string,
  reportingPeriod: string
): Promise<ExtractedFinancialData> {
  
  const systemPrompt = `You are a senior asset manager at a top-tier multifamily private equity firm with 15+ years of experience analyzing T-12 operating statements.

Your expertise includes:
- Reading T-12s from any Property Management System (RealPage, Yardi, Entrata, AppFolio, MRI, custom formats)
- Understanding GL codes and chart of accounts variations
- Identifying revenue and expense line items regardless of naming conventions
- Spotting anomalies, trends, and items that need attention

You understand that:
- "GPR" = "Gross Potential Rent" = "Scheduled Rent" = "Market Rent"
- "L2L" = "Loss to Lease" = "Rent Concessions on Occupied"
- "Vacancy" = "Vacancy Loss" = "Physical Vacancy"
- GL codes like "4000-4999" typically = Revenue, "5000-5999" typically = Expenses
- Different PMS systems format data differently but contain the same core information

Always extract the ANNUAL/TOTAL figures (T-12 = Trailing 12 months).`

  const userPrompt = `Analyze this T-12 operating statement for ${propertyName} (${reportingPeriod}).

Extract all financial data and return ONLY valid JSON matching this structure:

{
  "summary": {
    "totalRevenue": 0,
    "totalExpenses": 0,
    "noi": 0,
    "noiMargin": 0,
    "occupancy": null,
    "averageRent": null,
    "totalUnits": null
  },
  "revenue": {
    "grossPotentialRent": null,
    "lossToLease": null,
    "vacancyLoss": null,
    "concessions": null,
    "badDebt": null,
    "otherIncome": null,
    "effectiveGrossIncome": null,
    "items": []
  },
  "expenses": {
    "payroll": null,
    "repairsAndMaintenance": null,
    "utilities": null,
    "insurance": null,
    "propertyTaxes": null,
    "managementFee": null,
    "administrative": null,
    "marketing": null,
    "contractServices": null,
    "turnover": null,
    "other": null,
    "items": []
  },
  "monthlyData": [],
  "insights": {
    "anomalies": [],
    "trends": [],
    "recommendations": []
  },
  "metadata": {
    "sourceFormat": "Unknown",
    "reportingPeriod": "",
    "confidence": "medium",
    "warnings": []
  }
}

Rules:
- Extract ACTUAL numbers from the document
- Include ALL line items, preserving original names
- GL codes often appear as prefixes like "5010" or "5010-00"
- Loss to Lease, Vacancy, Concessions are typically NEGATIVE
- NOI = Total Revenue - Total Expenses
- Return ONLY valid JSON, no explanation

Document content:
${documentText}`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    messages: [
      { role: 'user', content: userPrompt }
    ],
    system: systemPrompt,
  })

  const responseText = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map(block => block.text)
    .join('')

  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in Claude response')
    }
    
    const extracted = JSON.parse(jsonMatch[0]) as ExtractedFinancialData
    
    extracted.metadata = {
      ...extracted.metadata,
      extractedAt: new Date().toISOString(),
      sourceFiles: [],
    }
    
    return extracted
  } catch (parseError) {
    console.error('Failed to parse Claude response:', responseText)
    throw new Error('Failed to parse financial data from document')
  }
}

/**
 * Format extracted data for report generation prompt
 */
export function formatFinancialContextForReport(data: ExtractedFinancialData): string {
  const lines: string[] = []
  
  lines.push('## Extracted Financial Data (T-12)')
  lines.push('')
  lines.push('### Key Metrics')
  lines.push(`- **Total Revenue:** $${data.summary.totalRevenue.toLocaleString()}`)
  lines.push(`- **Total Expenses:** $${data.summary.totalExpenses.toLocaleString()}`)
  lines.push(`- **Net Operating Income (NOI):** $${data.summary.noi.toLocaleString()}`)
  lines.push(`- **NOI Margin:** ${(data.summary.noiMargin * 100).toFixed(1)}%`)
  
  if (data.summary.occupancy !== null) {
    lines.push(`- **Occupancy:** ${data.summary.occupancy.toFixed(1)}%`)
  }
  if (data.summary.averageRent !== null) {
    lines.push(`- **Average Rent:** $${data.summary.averageRent.toLocaleString()}`)
  }
  
  lines.push('')
  lines.push('### Revenue Breakdown')
  if (data.revenue.grossPotentialRent) {
    lines.push(`- Gross Potential Rent: $${data.revenue.grossPotentialRent.toLocaleString()}`)
  }
  if (data.revenue.lossToLease) {
    lines.push(`- Loss to Lease: $${data.revenue.lossToLease.toLocaleString()}`)
  }
  if (data.revenue.vacancyLoss) {
    lines.push(`- Vacancy Loss: $${data.revenue.vacancyLoss.toLocaleString()}`)
  }
  if (data.revenue.otherIncome) {
    lines.push(`- Other Income: $${data.revenue.otherIncome.toLocaleString()}`)
  }
  
  lines.push('')
  lines.push('### Major Expenses')
  const expenses = [
    { name: 'Payroll', value: data.expenses.payroll },
    { name: 'Repairs & Maintenance', value: data.expenses.repairsAndMaintenance },
    { name: 'Utilities', value: data.expenses.utilities },
    { name: 'Insurance', value: data.expenses.insurance },
    { name: 'Property Taxes', value: data.expenses.propertyTaxes },
    { name: 'Management Fee', value: data.expenses.managementFee },
  ].filter(e => e.value !== null && e.value > 0)
  
  for (const exp of expenses) {
    lines.push(`- ${exp.name}: $${exp.value!.toLocaleString()}`)
  }
  
  if (data.insights.anomalies.length > 0) {
    lines.push('')
    lines.push('### Notable Observations')
    for (const item of data.insights.anomalies) {
      lines.push(`- ${item}`)
    }
  }
  
  return lines.join('\n')
}








