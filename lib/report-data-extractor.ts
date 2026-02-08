import { Report, Property, StructuredContent } from './supabase'
import { ReportTemplateData, KPIMetric, getStatusFromValue } from './report-template-types'
import { REPORT_SECTIONS } from './report-sections'

/**
 * Extract template data from a report and its related data
 */
export function extractReportTemplateData(
  report: Report,
  property: Property | undefined
): ReportTemplateData {
  const content = report.content as StructuredContent | null
  const questionnaire = report.questionnaire || {}
  
  // Parse sections from structured content or narrative
  const sections = parseSections(content, report.narrative)
  
  // Extract KPIs from questionnaire data
  const kpis = extractKPIs(questionnaire)
  
  // Extract progress metrics
  const progress = extractProgress(questionnaire)
  
  return {
    propertyName: property?.name || 'Property',
    propertyAddress: property?.address 
      ? `${property.address}, ${property.city}, ${property.state}`
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
  }
}

/**
 * Parse sections from structured content or raw narrative
 */
function parseSections(
  content: StructuredContent | null,
  narrative: string | null
): ReportTemplateData['sections'] {
  // Try structured content first
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
  
  // Fall back to parsing narrative
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
  
  // Return default empty sections
  return REPORT_SECTIONS.map(s => ({
    id: s.id,
    title: s.title,
    content: '',
    order: s.order,
  }))
}

/**
 * Extract KPI metrics from questionnaire data
 */
function extractKPIs(
  questionnaire: Record<string, unknown>
): ReportTemplateData['kpis'] {
  const occupancy = questionnaire.occupancy as Record<string, string> | undefined
  const collections = questionnaire.collections as Record<string, string> | undefined
  const revenue = questionnaire.revenue as Record<string, string> | undefined
  
  const kpis: ReportTemplateData['kpis'] = {}
  
  // Try to extract occupancy
  const occupancyValue = extractPercentage(occupancy?.currentOccupancy)
  if (occupancyValue !== null) {
    kpis.occupancy = {
      label: 'Occupancy',
      value: occupancyValue,
      format: 'percent',
      status: getStatusFromValue(occupancyValue, { good: 93, warning: 88 }),
      change: extractChange(occupancy?.occupancyChange),
    }
  }
  
  // Try to extract collections
  const collectionsValue = extractPercentage(collections?.collectionRate)
  if (collectionsValue !== null) {
    kpis.collections = {
      label: 'Collections',
      value: collectionsValue,
      format: 'percent',
      status: getStatusFromValue(collectionsValue, { good: 97, warning: 94 }),
    }
  }
  
  // Try to extract average rent / trade-outs
  const rentInfo = revenue?.tradeOutAmount || revenue?.rentGrowth
  const rentValue = extractCurrency(rentInfo)
  if (rentValue !== null) {
    kpis.avgRent = {
      label: 'Avg Rent',
      value: rentValue,
      format: 'currency',
      status: 'neutral',
    }
  }
  
  return kpis
}

/**
 * Extract progress metrics from questionnaire data
 */
function extractProgress(
  questionnaire: Record<string, unknown>
): ReportTemplateData['progress'] {
  const capex = questionnaire.capex as Record<string, string> | undefined
  const progress: ReportTemplateData['progress'] = {}
  
  // Try to extract CapEx progress
  const capexProgress = extractPercentage(capex?.budgetStatus || capex?.projectsInProgress)
  if (capexProgress !== null) {
    progress.capexCompletion = {
      label: 'CapEx Budget Utilized',
      current: capexProgress,
      target: 100,
      format: 'percent',
    }
  }
  
  return progress
}

/**
 * Extract a percentage from a string
 */
function extractPercentage(text: string | undefined): number | null {
  if (!text) return null
  const match = text.match(/(\d+\.?\d*)%/)
  if (match) return parseFloat(match[1])
  return null
}

/**
 * Extract a currency amount from a string
 */
function extractCurrency(text: string | undefined): number | null {
  if (!text) return null
  const match = text.match(/\$?([\d,]+\.?\d*)/)
  if (match) return parseFloat(match[1].replace(/,/g, ''))
  return null
}

/**
 * Extract change information from a string
 */
function extractChange(text: string | undefined): KPIMetric['change'] | undefined {
  if (!text) return undefined
  
  // Look for patterns like "+1.5%", "up 2%", "increased 120bps"
  const percentMatch = text.match(/([+-]?\d+\.?\d*)%/)
  const bpsMatch = text.match(/([+-]?\d+)\s*bps/i)
  const upDownMatch = text.match(/(up|down|increased|decreased)\s*(\d+\.?\d*)/i)
  
  if (percentMatch) {
    const value = parseFloat(percentMatch[1])
    return {
      value: Math.abs(value),
      direction: value > 0 ? 'up' : value < 0 ? 'down' : 'flat',
      comparison: 'vs LM',
    }
  }
  
  if (bpsMatch) {
    const value = parseInt(bpsMatch[1])
    return {
      value: Math.abs(value) / 100,
      direction: value > 0 ? 'up' : value < 0 ? 'down' : 'flat',
      comparison: 'vs LM',
    }
  }
  
  if (upDownMatch) {
    const value = parseFloat(upDownMatch[2])
    const direction = upDownMatch[1].toLowerCase().startsWith('up') || 
                      upDownMatch[1].toLowerCase().startsWith('increase') ? 'up' : 'down'
    return { value, direction, comparison: 'vs LM' }
  }
  
  return undefined
}
