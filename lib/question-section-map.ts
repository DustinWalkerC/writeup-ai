// lib/question-section-map.ts
// Maps questionnaire questions to report sections.
// Single source of truth for filtering + lightbulb hints.

import type { SectionId } from './section-definitions'

export interface QuestionDefinition {
  id: string
  label: string
  placeholder: string
  relatedSections: SectionId[]
  /** Food-for-thought prompts shown in lightbulb tooltip */
  hints: string[]
}

export const ALL_QUESTIONS: QuestionDefinition[] = [
  {
    id: 'executive_summary_notes',
    label: 'Executive Summary',
    placeholder: 'What should investors know this month?',
    relatedSections: ['executive_summary'],
    hints: [
      'What were the top 2-3 wins this month?',
      'Any surprises or material changes from last period?',
      'How would you characterize the trajectory — improving, stable, or declining?',
      'What would an LP want to hear first about this asset?',
    ],
  },
  {
    id: 'occupancy_notes',
    label: 'Occupancy & Leasing',
    placeholder: 'Notable occupancy changes? Move-ins/outs?',
    relatedSections: ['occupancy_leasing', 'lease_expiration_rollover', 'resident_operational_metrics'],
    hints: [
      'How does current occupancy compare to your stabilized target?',
      'Are you seeing seasonal patterns in traffic or applications?',
      'Average days on market for vacant units?',
      'What is driving move-outs — rent increases, relocations, or dissatisfaction?',
      'Any corporate, student, or bulk lease activity?',
    ],
  },
  {
    id: 'lease_expiration_notes',
    label: 'Lease Expirations & Renewals',
    placeholder: 'Renewals completed? Upcoming expirations?',
    relatedSections: ['lease_expiration_rollover', 'rent_roll_insights', 'rent_roll_deep_dive'],
    hints: [
      'What is the renewal rate on leases expiring this month?',
      'Are renewals signing at higher, same, or lower rents?',
      'Any lease expiration concentration risk in upcoming months?',
      'Are you offering renewal concessions or incentives?',
      'Month-to-month tenants — how many and what is the plan?',
    ],
  },
  {
    id: 'financial_notes',
    label: 'Financial Performance',
    placeholder: 'Revenue or expense items to highlight?',
    relatedSections: ['revenue_summary', 'revenue_analysis', 'expense_summary', 'expense_analysis', 'noi_performance', 'budget_vs_actual'],
    hints: [
      'Any non-recurring revenue or expense items this month?',
      'Are concessions trending up or down compared to prior months?',
      'Which expense categories are significantly over or under budget?',
      'How does actual NOI track against your original underwriting?',
      'Any utility rebates, insurance refunds, or other one-time items?',
      'Loss-to-lease — is the gap widening or closing?',
    ],
  },
  {
    id: 'delinquency_notes',
    label: 'Delinquency & Collections',
    placeholder: 'Delinquent tenants? Collection actions?',
    relatedSections: ['risk_watch_items', 'risk_matrix'],
    hints: [
      'What is the delinquency trend — improving or worsening?',
      'Any eviction filings this period?',
      'Are payment plans in place for delinquent accounts?',
      'Bad debt write-offs this month?',
      'What percentage of tenants are 30+ days vs. 60+ days past due?',
    ],
  },
  {
    id: 'leasing_notes',
    label: 'Leasing Activity',
    placeholder: 'Traffic trends? Application volume?',
    relatedSections: ['occupancy_leasing', 'rent_roll_insights'],
    hints: [
      'What is the closing ratio on applications this month?',
      'Average lease-up velocity for newly vacant units?',
      'Any changes to marketing strategy or lead sources?',
      'Are you adjusting asking rents up or down?',
      'How does foot traffic compare to prior months?',
    ],
  },
  {
    id: 'capex_notes',
    label: 'Capital Expenditures',
    placeholder: 'Renovation updates? CapEx spending?',
    relatedSections: ['capital_improvements', 'capital_improvements_tracker'],
    hints: [
      'What is the ROI on completed unit renovations (rent premium achieved)?',
      'Are projects on schedule and on budget?',
      'Any supply chain delays or cost overruns?',
      'Interior vs. exterior improvement focus this period?',
      'How many units renovated this month vs. plan?',
      'Any deferred maintenance items being addressed?',
    ],
  },
  {
    id: 'market_notes',
    label: 'Market Context',
    placeholder: 'Local market changes? New competitive supply?',
    relatedSections: ['market_positioning', 'market_submarket_analysis'],
    hints: [
      'Any new competitive supply delivered or under construction within 3 miles?',
      'What are comparable properties achieving in rent and occupancy?',
      'Local employment or economic developments affecting demand?',
      'Any zoning, regulatory, or tax assessment changes?',
      'Submarket rent growth trend — accelerating, stable, or softening?',
    ],
  },
  {
    id: 'operations_notes',
    label: 'Operations & Maintenance',
    placeholder: 'Work order volume? Staffing? Turn times?',
    relatedSections: ['resident_operational_metrics'],
    hints: [
      'Average unit turn time this month?',
      'Work order volume and completion rate?',
      'Any staffing changes or challenges on-site?',
      'Vendor contract renewals or changes?',
      'Resident satisfaction — any survey results or notable feedback?',
    ],
  },
  {
    id: 'compliance_notes',
    label: 'Compliance & Covenants',
    placeholder: 'Covenant status? Insurance renewals? Regulatory changes?',
    relatedSections: ['regulatory_compliance'],
    hints: [
      'Current DSCR and loan covenant compliance status?',
      'Insurance renewal timing and expected rate changes?',
      'Property tax assessment updates or appeals?',
      'Any regulatory inspections, violations, or findings?',
      'Upcoming compliance deadlines?',
    ],
  },
  {
    id: 'outlook_notes',
    label: 'Outlook & Distributions',
    placeholder: 'What should investors expect? Distribution updates? This feeds the Asset Manager Outlook section.',
    relatedSections: ['asset_manager_outlook', 'asset_manager_strategic_outlook', 'investment_thesis_update'],
    hints: [
      'Top 3 priorities for the next 30-60 days?',
      'Biggest risk on the horizon for this asset?',
      'Distribution status — currently distributing, accruing, or paused? (This appears in the Asset Manager Outlook)',
      'When do you expect to begin or increase distributions?',
      'Any strategic pivots or hold/sell considerations?',
      'How is the asset tracking against the original business plan?',
    ],
  },
]

/**
 * Filter questions to only those relevant to the given enabled sections.
 * Returns all questions if no sections specified.
 */
export function getQuestionsForSections(enabledSectionIds: SectionId[] | null): QuestionDefinition[] {
  if (!enabledSectionIds || enabledSectionIds.length === 0) return ALL_QUESTIONS
  const enabledSet = new Set(enabledSectionIds)
  return ALL_QUESTIONS.filter(q => q.relatedSections.some(s => enabledSet.has(s)))
}

/** Chart badge labels for the section builder */
export const CHART_LABELS: Record<string, string> = {
  budget_variance_table: 'Budget Table',
  revenue_waterfall: 'Waterfall',
  expense_horizontal_bars: 'Expense Bars',
  occupancy_gauge: 'Occupancy Gauge',
  noi_trend_bars: 'NOI Trend',
  rent_roll_table: 'Rent Roll Table',
  risk_cards: 'Risk Cards',
  move_in_out_bars: 'Move In/Out',
  comparison_table: 'Comparison Table',
}

/** Section info for lightbulb tooltips in settings builder */
export const SECTION_INFO: Record<string, { summary: string; dataSource: string; guidedInput: string }> = {
  executive_summary: {
    summary: 'High-level overview of property performance with KPI cards covering occupancy, NOI, revenue, and expenses.',
    dataSource: 'T-12 operating statement, rent roll',
    guidedInput: 'Executive Summary question in guided mode',
  },
  revenue_summary: {
    summary: 'Top-line revenue performance including gross potential rent, effective gross income, and average effective rent.',
    dataSource: 'T-12 operating statement',
    guidedInput: 'Financial Performance question',
  },
  expense_summary: {
    summary: 'Total operating expenses, per-unit cost, and expense ratio with notable line items highlighted.',
    dataSource: 'T-12 operating statement',
    guidedInput: 'Financial Performance question',
  },
  asset_manager_outlook: {
    summary: 'Forward-looking narrative covering next 30-60 day plans, risks, opportunities, and distribution status updates.',
    dataSource: 'Questionnaire notes, financial trends',
    guidedInput: 'Outlook & Distributions question',
  },
  occupancy_leasing: {
    summary: 'Physical and economic occupancy analysis with move-in/out breakdown and occupancy gauge chart.',
    dataSource: 'T-12, rent roll',
    guidedInput: 'Occupancy & Leasing question',
  },
  revenue_analysis: {
    summary: 'Detailed revenue breakdown with waterfall chart showing GPR to EGI bridge (vacancy, concessions, bad debt).',
    dataSource: 'T-12 operating statement',
    guidedInput: 'Financial Performance question',
  },
  expense_analysis: {
    summary: 'Category-level expense breakdown with actual vs. budget variance bars and over-budget flagging.',
    dataSource: 'T-12, budget (if uploaded)',
    guidedInput: 'Financial Performance question',
  },
  noi_performance: {
    summary: 'Net operating income analysis with current vs. prior month vs. budget comparison and trend bars.',
    dataSource: 'T-12 operating statement',
    guidedInput: 'Financial Performance question',
  },
  rent_roll_insights: {
    summary: 'Unit mix breakdown by floorplan with average rents, occupancy, and rent per square foot table.',
    dataSource: 'Rent roll',
    guidedInput: 'Lease Expirations question',
  },
  market_positioning: {
    summary: 'How the property competes in its submarket — rent positioning, competitive advantages, and threats.',
    dataSource: 'Questionnaire notes',
    guidedInput: 'Market Context question',
  },
  capital_improvements: {
    summary: 'Capital improvement updates — only included when you provide CapEx notes in the questionnaire.',
    dataSource: 'Questionnaire notes only',
    guidedInput: 'Capital Expenditures question',
  },
  risk_watch_items: {
    summary: 'Data-driven risk identification with 2-4 specific items ranked by severity with mitigation suggestions.',
    dataSource: 'T-12, delinquency data',
    guidedInput: 'Delinquency & Collections question',
  },
  investment_thesis_update: {
    summary: 'Progress against the original investment strategy — are value-add milestones being met?',
    dataSource: 'T-12, property investment strategy',
    guidedInput: 'Outlook question',
  },
  lease_expiration_rollover: {
    summary: 'Lease expiration schedule with 12-month rollover chart showing units and revenue at risk.',
    dataSource: 'Rent roll lease dates',
    guidedInput: 'Lease Expirations question',
  },
  rent_roll_deep_dive: {
    summary: 'Institutional-grade rent roll analysis with rent distribution histogram and floorplan performance table.',
    dataSource: 'Rent roll',
    guidedInput: 'Lease Expirations question',
  },
  budget_vs_actual: {
    summary: 'Comprehensive variance analysis with color-coded bars showing favorable/unfavorable variances.',
    dataSource: 'T-12, budget CSV',
    guidedInput: 'Financial Performance question',
  },
  market_submarket_analysis: {
    summary: 'Institutional-grade market analysis with comp table, supply pipeline, and demand driver assessment.',
    dataSource: 'Questionnaire notes, comp data',
    guidedInput: 'Market Context question',
  },
  capital_improvements_tracker: {
    summary: 'Renovation progress tracker with budget vs. spent, completion %, and premium achieved per project.',
    dataSource: 'Questionnaire notes',
    guidedInput: 'Capital Expenditures question',
  },
  risk_matrix: {
    summary: 'Structured risk table with severity ratings, trend arrows, and mitigation plans across 5 categories.',
    dataSource: 'T-12, all available data',
    guidedInput: 'Delinquency & Collections question',
  },
  resident_operational_metrics: {
    summary: 'Operational KPIs including turnover rate, turn time, work order completion, and resident satisfaction.',
    dataSource: 'Questionnaire notes',
    guidedInput: 'Operations & Maintenance question',
  },
  regulatory_compliance: {
    summary: 'Loan covenant status, insurance, property tax, and regulatory compliance updates.',
    dataSource: 'Questionnaire notes',
    guidedInput: 'Compliance & Covenants question',
  },
  asset_manager_strategic_outlook: {
    summary: 'Comprehensive strategic outlook with specific 30/60/90-day action items and investment sentiment.',
    dataSource: 'T-12, all questionnaire notes',
    guidedInput: 'Outlook & Distributions question',
  },
}
