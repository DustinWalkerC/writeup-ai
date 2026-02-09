import { ExtractedFinancialData } from './document-intelligence'
import { AnalyzedFinancials } from './financial-analysis'
import { KPIMetric } from './report-template-types'

/**
 * Calculate KPIs from extracted and analyzed data
 */
export function calculateKPIs(
  extracted: ExtractedFinancialData,
  analyzed: AnalyzedFinancials,
  questionnaire?: Record<string, Record<string, string>>
): {
  occupancy: KPIMetric | null
  collections: KPIMetric | null
  avgRent: KPIMetric | null
  noi: KPIMetric | null
  leaseVelocity: KPIMetric | null
  renewalRate: KPIMetric | null
} {
  
  // Occupancy KPI
  const occupancy: KPIMetric | null = analyzed.metrics.occupancy ? {
    label: 'Occupancy',
    value: analyzed.metrics.occupancy,
    format: 'percent',
    status: getOccupancyStatus(analyzed.metrics.occupancy),
    change: analyzed.variances.occupancyVsTarget ? {
      value: analyzed.variances.occupancyVsTarget.variancePercent,
      direction: analyzed.variances.occupancyVsTarget.favorable ? 'up' : 'down',
      comparison: 'vs Target',
    } : undefined,
  } : null

  // Collections KPI
  const collectionsValue = analyzed.metrics.collectionsRate ?? 
    extractFromQuestionnaire(questionnaire, 'collections', 'collectionRate')
  
  const collections: KPIMetric | null = collectionsValue ? {
    label: 'Collections',
    value: parseFloat(String(collectionsValue)),
    format: 'percent',
    status: getCollectionsStatus(parseFloat(String(collectionsValue))),
  } : null

  // Average Rent KPI
  const avgRent: KPIMetric | null = analyzed.metrics.averageRent ? {
    label: 'Avg Rent',
    value: analyzed.metrics.averageRent,
    format: 'currency',
    status: 'neutral',
    change: calculateRentChange(extracted),
  } : null

  // NOI KPI
  const noi: KPIMetric | null = {
    label: 'NOI',
    value: analyzed.metrics.noi,
    format: 'currency',
    status: getNOIStatus(analyzed),
    change: analyzed.variances.noiVsBudget ? {
      value: Math.abs(analyzed.variances.noiVsBudget.variancePercent),
      direction: analyzed.variances.noiVsBudget.favorable ? 'up' : 'down',
      comparison: 'vs Budget',
    } : undefined,
  }

  // Lease Velocity (from questionnaire)
  const leaseVelocityValue = extractFromQuestionnaire(questionnaire, 'occupancy', 'leaseActivity')
  const leaseVelocity: KPIMetric | null = leaseVelocityValue ? {
    label: 'Lease Velocity',
    value: leaseVelocityValue,
    format: 'text',
    status: 'neutral',
  } : null

  // Renewal Rate (from questionnaire)
  const renewalValue = extractFromQuestionnaire(questionnaire, 'occupancy', 'renewalRate')
  const renewalRate: KPIMetric | null = renewalValue ? {
    label: 'Renewal Rate',
    value: parseFloat(String(renewalValue)) || renewalValue,
    format: typeof renewalValue === 'number' ? 'percent' : 'text',
    status: getRenewalStatus(renewalValue),
  } : null

  return {
    occupancy,
    collections,
    avgRent,
    noi,
    leaseVelocity,
    renewalRate,
  }
}

/**
 * Extract value from questionnaire data
 */
function extractFromQuestionnaire(
  questionnaire: Record<string, Record<string, string>> | undefined,
  category: string,
  field: string
): string | number | null {
  if (!questionnaire) return null
  const value = questionnaire[category]?.[field]
  if (!value) return null
  
  // Try to parse as number
  const num = parseFloat(value.replace(/[^0-9.-]/g, ''))
  if (!isNaN(num)) return num
  
  return value
}

/**
 * Status helpers
 */
function getOccupancyStatus(occupancy: number): 'good' | 'warning' | 'critical' {
  if (occupancy >= 95) return 'good'
  if (occupancy >= 90) return 'warning'
  return 'critical'
}

function getCollectionsStatus(rate: number): 'good' | 'warning' | 'critical' {
  if (rate >= 98) return 'good'
  if (rate >= 95) return 'warning'
  return 'critical'
}

function getNOIStatus(analyzed: AnalyzedFinancials): 'good' | 'warning' | 'critical' | 'neutral' {
  if (!analyzed.variances.noiVsBudget) return 'neutral'
  if (analyzed.variances.noiVsBudget.favorable) return 'good'
  if (analyzed.variances.noiVsBudget.significance === 'material') return 'critical'
  return 'warning'
}

function getRenewalStatus(value: string | number): 'good' | 'warning' | 'critical' | 'neutral' {
  if (typeof value === 'number') {
    if (value >= 60) return 'good'
    if (value >= 50) return 'warning'
    return 'critical'
  }
  return 'neutral'
}

function calculateRentChange(extracted: ExtractedFinancialData): KPIMetric['change'] | undefined {
  if (extracted.monthlyData.length < 2) return undefined
  
  const recent = extracted.monthlyData[extracted.monthlyData.length - 1]
  const prior = extracted.monthlyData[extracted.monthlyData.length - 2]
  
  if (!recent || !prior || prior.revenue === 0) return undefined
  
  const change = ((recent.revenue - prior.revenue) / prior.revenue) * 100
  
  return {
    value: Math.abs(change),
    direction: change > 0.5 ? 'up' : change < -0.5 ? 'down' : 'flat',
    comparison: 'vs LM',
  }
}
