
import { Report, Property, StructuredContent, UserSettings } from './supabase'
import { ReportTemplateData, KPIMetric, getStatusFromValue } from './report-template-types'
import { REPORT_SECTIONS } from './report-sections'

/**
 * Extract template data from a report and its related data
 */
export function extractReportTemplateData(
  report: Report,
  property: Property | undefined,
  userSettings?: UserSettings | null
): ReportTemplateData {
  const content = report.content as StructuredContent | null
  const questionnaire = report.questionnaire || {}
  const narrative = report.narrative || ''
  
  // Parse sections from structured content or narrative
  const sections = parseSections(content, narrative)
  
  // Extract KPIs from ALL sources (questionnaire + narrative)
  const kpis = extractAllKPIs(questionnaire, narrative)
  
  // Extract progress metrics
  const progress = extractProgress(questionnaire, narrative)
  
  // Build company info for footer
  const companyName = userSettings?.company_name || 'Your Firm Name'
  const disclaimer = userSettings?.custom_disclaimer || 
    'Confidential – For Investor Use Only. This report contains proprietary information and is intended solely for the use of the intended recipient(s). Any distribution or reproduction without prior written consent is strictly prohibited.'
  
  return {
    propertyName: property?.name || 'Property',
    propertyAddress: property?.address 
      ? `${property.address}${property.city ? `, ${property.city}` : ''}${property.state ? `, ${property.state}` : ''}`
      : undefined,
    reportPeriod: `${report.month} ${report.year}`,
    reportDate: new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    kpis,
    progress,
    sections,
    templateVersion: report.template_version || 'v1',
    generatedAt: report.updated_at || new Date().toISOString(),
    companyName,
    disclaimer,
    accentColor: userSettings?.accent_color || '#0f172a',
  }
}

/**
 * Extract ALL KPIs from questionnaire data AND narrative text
 */
function extractAllKPIs(
  questionnaire: Record<string, unknown>,
  narrative: string
): ReportTemplateData['kpis'] {
  const kpis: ReportTemplateData['kpis'] = {}
  
  // Combine all text sources for extraction
  const allText = [
    narrative,
    JSON.stringify(questionnaire),
  ].join(' ')
  
  // === OCCUPANCY ===
  const occupancyPatterns = [
    /occupancy[:\s]+(\d+\.?\d*)%/i,
    /(\d+\.?\d*)%\s*occupancy/i,
    /occupancy[^.]*?(\d+\.?\d*)%/i,
    /occupied[:\s]+(\d+\.?\d*)%/i,
  ]
  const occupancyValue = extractFirstMatch(allText, occupancyPatterns)
  if (occupancyValue !== null) {
    const change = extractChangeNear(allText, 'occupancy', occupancyValue)
    kpis.occupancy = {
      label: 'Occupancy',
      value: occupancyValue,
      format: 'percent',
      status: getStatusFromValue(occupancyValue, { good: 93, warning: 88 }),
      change,
    }
  }
  
  // === COLLECTIONS ===
  const collectionsPatterns = [
    /collections?[:\s]+(\d+\.?\d*)%/i,
    /(\d+\.?\d*)%\s*collections?/i,
    /collection rate[:\s]+(\d+\.?\d*)%/i,
    /collected[:\s]+(\d+\.?\d*)%/i,
  ]
  const collectionsValue = extractFirstMatch(allText, collectionsPatterns)
  if (collectionsValue !== null) {
    kpis.collections = {
      label: 'Collections',
      value: collectionsValue,
      format: 'percent',
      status: getStatusFromValue(collectionsValue, { good: 97, warning: 94 }),
    }
  }
  
  // === AVERAGE RENT ===
  const avgRentPatterns = [
    /average rent[:\s]+\$?([\d,]+)/i,
    /avg\.?\s*rent[:\s]+\$?([\d,]+)/i,
    /rent[:\s]+\$?([\d,]+)(?:\s*\/\s*(?:month|mo|unit))?/i,
    /averaging\s+\$?([\d,]+)/i,
    /\$?([\d,]+)\s*(?:per|\/)\s*(?:month|mo|unit)/i,
  ]
  const avgRentValue = extractFirstMatchCurrency(allText, avgRentPatterns)
  if (avgRentValue !== null && avgRentValue > 500 && avgRentValue < 10000) {
    kpis.avgRent = {
      label: 'Avg Rent',
      value: avgRentValue,
      format: 'currency',
      status: 'neutral',
      change: extractRentChange(allText),
    }
  }
  
  // === NOI ===
  const noiPatterns = [
    /NOI[:\s]+\$?([\d,]+\.?\d*)\s*[KkMm]?/i,
    /net operating income[:\s]+\$?([\d,]+\.?\d*)\s*[KkMm]?/i,
    /\$?([\d,]+\.?\d*)\s*[KkMm]?\s*NOI/i,
  ]
  const noiValue = extractFirstMatchCurrency(allText, noiPatterns, true)
  if (noiValue !== null) {
    const noiChange = extractChangeNear(allText, 'NOI', noiValue)
    kpis.noi = {
      label: 'NOI',
      value: noiValue,
      format: 'currency',
      status: noiChange?.direction === 'down' ? 'warning' : 'good',
      change: noiChange,
    }
  }
  
  // === LEASE VELOCITY ===
  const leasePatterns = [
    /(\d+)\s*(?:new\s*)?leases?\s*(?:signed|executed)/i,
    /signed\s*(\d+)\s*(?:new\s*)?leases?/i,
    /(\d+)\s*move[- ]?ins?/i,
    /lease velocity[:\s]+(\d+)/i,
  ]
  const leaseValue = extractFirstMatchInteger(allText, leasePatterns)
  if (leaseValue !== null && leaseValue > 0 && leaseValue < 100) {
    kpis.leaseVelocity = {
      label: 'New Leases',
      value: leaseValue,
      format: 'number',
      status: leaseValue >= 5 ? 'good' : leaseValue >= 2 ? 'neutral' : 'warning',
    }
  }
  
  // === RENEWAL RATE ===
  const renewalPatterns = [
    /renewal rate[:\s]+(\d+\.?\d*)%/i,
    /(\d+\.?\d*)%\s*renewal/i,
    /renewed[:\s]+(\d+\.?\d*)%/i,
    /retention[:\s]+(\d+\.?\d*)%/i,
  ]
  const renewalValue = extractFirstMatch(allText, renewalPatterns)
  if (renewalValue !== null) {
    kpis.renewalRate = {
      label: 'Renewal Rate',
      value: renewalValue,
      format: 'percent',
      status: getStatusFromValue(renewalValue, { good: 55, warning: 45 }),
    }
  }
  
  // === TRADE-OUTS (if no avg rent found) ===
  if (!kpis.avgRent) {
    const tradeOutPatterns = [
      /trade[- ]?outs?[:\s]+\+?\$?([\d,]+)/i,
      /\+\$?([\d,]+)\s*(?:per|\/)\s*unit/i,
      /trade[- ]?out[^.]*?\$?([\d,]+)/i,
    ]
    const tradeOutValue = extractFirstMatchCurrency(allText, tradeOutPatterns)
    if (tradeOutValue !== null && tradeOutValue > 0 && tradeOutValue < 500) {
      kpis.avgRent = {
        label: 'Trade-Out',
        value: tradeOutValue,
        format: 'currency',
        status: tradeOutValue > 50 ? 'good' : 'neutral',
        change: {
          value: tradeOutValue,
          direction: 'up',
          comparison: 'per unit',
        },
      }
    }
  }
  
  return kpis
}

/**
 * Extract progress metrics from questionnaire and narrative
 */
function extractProgress(
  questionnaire: Record<string, unknown>,
  narrative: string
): ReportTemplateData['progress'] {
  const progress: ReportTemplateData['progress'] = {}
  const allText = narrative + ' ' + JSON.stringify(questionnaire)
  
  // CapEx progress
  const capexPatterns = [
    /(\d+)%\s*complete/i,
    /completed?\s*(\d+)%/i,
    /(\d+)%\s*of\s*(?:capex|capital|budget)/i,
  ]
  const capexValue = extractFirstMatch(allText, capexPatterns)
  if (capexValue !== null) {
    progress.capexCompletion = {
      label: 'CapEx Progress',
      current: capexValue,
      target: 100,
      format: 'percent',
      status: capexValue >= 80 ? 'on-track' : capexValue >= 50 ? 'at-risk' : 'behind',
    }
  }
  
  // Budget YTD
  const budgetPatterns = [
    /(\d+\.?\d*)%\s*(?:of|vs\.?)\s*budget/i,
    /budget[:\s]+(\d+\.?\d*)%/i,
  ]
  const budgetValue = extractFirstMatch(allText, budgetPatterns)
  if (budgetValue !== null) {
    progress.budgetYTD = {
      label: 'Budget YTD',
      current: budgetValue,
      target: 100,
      format: 'percent',
    }
  }
  
  return progress
}

/**
 * Parse sections from structured content or raw narrative
 */
function parseSections(
  content: StructuredContent | null,
  narrative: string | null
): ReportTemplateData['sections'] {
  if (content?.sections && Object.keys(content.sections).length > 0) {
    return Object.entries(content.sections)
      .map(([id, section]) => ({
        id,
        title: section.title,
        content: section.content,
        order: section.order,
      }))
      .sort((a, b) => a.order - b.order)
  }
  
  if (narrative) {
    const sections: ReportTemplateData['sections'] = []
    const sectionRegex = /## ([^\n]+)\n([\s\S]*?)(?=## |$)/g
    let match
    let order = 1
    
    while ((match = sectionRegex.exec(narrative)) !== null) {
      const title = match[1].trim()
      const content = match[2].trim()
      const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '_')
      sections.push({ id, title, content, order: order++ })
    }
    
    return sections
  }

  return REPORT_SECTIONS.map(s => ({
    id: s.id,
    title: s.title,
    content: '',
    order: s.order,
  }))
}

// === HELPER FUNCTIONS ===

function extractFirstMatch(text: string, patterns: RegExp[]): number | null {
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      const value = parseFloat(match[1].replace(/,/g, ''))
      if (!isNaN(value)) return value
    }
  }
  return null
}

function extractFirstMatchCurrency(text: string, patterns: RegExp[], allowMultiplier: boolean = false): number | null {
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      let value = parseFloat(match[1].replace(/,/g, ''))
      if (!isNaN(value)) {
        // Check for K or M multiplier
        if (allowMultiplier) {
          const fullMatch = match[0].toLowerCase()
          if (fullMatch.includes('k')) value *= 1000
          if (fullMatch.includes('m')) value *= 1000000
        }
        return value
      }
    }
  }
  return null
}

function extractFirstMatchInteger(text: string, patterns: RegExp[]): number | null {
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      const value = parseInt(match[1].replace(/,/g, ''), 10)
      if (!isNaN(value)) return value
    }
  }
  return null
}

function extractChangeNear(text: string, keyword: string, currentValue: number): KPIMetric['change'] | undefined {
  // Look for change indicators near the keyword
  const searchArea = text.toLowerCase()
  const keywordIndex = searchArea.indexOf(keyword.toLowerCase())
  if (keywordIndex === -1) return undefined
  
  // Get text within 100 chars of keyword
  const nearText = text.substring(Math.max(0, keywordIndex - 100), keywordIndex + 150)
  
  // Look for change patterns
  const changePatterns = [
    /([+-]?\d+\.?\d*)\s*(?:bps|basis points)/i,
    /([+-]?\d+\.?\d*)%\s*(?:vs|from|over|compared)/i,
    /(up|down|increased|decreased)\s*(\d+\.?\d*)%?/i,
    /(\d+\.?\d*)%?\s*(higher|lower|above|below)/i,
  ]
  
  for (const pattern of changePatterns) {
    const match = nearText.match(pattern)
    if (match) {
      if (match[1] === 'up' || match[1] === 'increased' || match[2] === 'higher' || match[2] === 'above') {
        const val = parseFloat(match[2] || match[1])
        if (!isNaN(val)) {
          return { value: val, direction: 'up', comparison: 'vs LM' }
        }
      }
      if (match[1] === 'down' || match[1] === 'decreased' || match[2] === 'lower' || match[2] === 'below') {
        const val = parseFloat(match[2] || match[1])
        if (!isNaN(val)) {
          return { value: val, direction: 'down', comparison: 'vs LM' }
        }
      }
      // Numeric with sign
      const numVal = parseFloat(match[1])
      if (!isNaN(numVal)) {
        return {
          value: Math.abs(numVal),
          direction: numVal > 0 ? 'up' : numVal < 0 ? 'down' : 'flat',
          comparison: 'vs LM',
        }
      }
    }
  }
  
  return undefined
}

function extractRentChange(text: string): KPIMetric['change'] | undefined {
  const patterns = [
    /trade[- ]?outs?\s*(?:averaging|of)?\s*\+?\$?(\d+)/i,
    /\+\$?(\d+)\s*(?:per|\/)\s*unit/i,
    /rent\s*(?:increased|grew|up)\s*\$?(\d+)/i,
  ]
  
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      const value = parseInt(match[1], 10)
      if (!isNaN(value) && value > 0) {
        return { value, direction: 'up', comparison: 'trade-out' }
      }
    }
  }
  
  return undefined
}

