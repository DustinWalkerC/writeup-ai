// lib/section-definitions.ts

export type SectionId =
  | 'executive_summary'
  | 'property_overview'
  | 'key_metrics'
  | 'occupancy_analysis'
  | 'lease_analysis'
  | 'financial_performance'
  | 'delinquency_status'
  | 'leasing_activity'
  | 'capex_needs'
  | 'distribution_update'
  | 'covenant_compliance'
  | 'risk_assessment'
  | 'market_analysis'
  | 'strategic_recommendations'
  | 'outlook';

export interface SectionDefinition {
  id: SectionId;
  title: string;
  description: string;
  requiredFiles: string[];
  requiredQuestions: string[];
  isConditional: boolean;
  promptGuidance: string;
}

export const ALL_SECTIONS: Record<SectionId, SectionDefinition> = {
  executive_summary: {
    id: 'executive_summary',
    title: 'Executive Summary',
    description: 'High-level overview of property performance',
    requiredFiles: ['t12'],
    requiredQuestions: ['executive_summary_notes'],
    isConditional: false,
    promptGuidance: `Write a concise executive summary (3-5 paragraphs):
- Overall property performance this month
- Key wins and concerns
- Material changes from prior month
- Forward-looking outlook
Use specific numbers from the T-12. Every sentence must convey real information.`
  },
  property_overview: {
    id: 'property_overview',
    title: 'Property Overview',
    description: 'Property details, unit mix, investment thesis',
    requiredFiles: [],
    requiredQuestions: [],
    isConditional: false,
    promptGuidance: `Brief property description (1-2 paragraphs):
- Property name, location, unit count, year built
- Unit mix if available from rent roll
- Investment strategy context if provided`
  },
  key_metrics: {
    id: 'key_metrics',
    title: 'Key Performance Metrics',
    description: 'KPI dashboard with variances',
    requiredFiles: ['t12'],
    requiredQuestions: [],
    isConditional: false,
    promptGuidance: `Generate structured metrics. For each metric provide:
- Current month value
- Prior month value and % change
- Budget value and variance % (if budget provided)
- YTD value

Metrics to extract:
1. Gross Potential Rent (GPR)
2. Economic Occupancy %
3. Effective Gross Income (EGI)
4. Total Operating Expenses
5. Net Operating Income (NOI)
6. NOI per unit
7. Expense ratio (OpEx / EGI)

Return as structured JSON for KPI dashboard rendering.`
  },
  occupancy_analysis: {
    id: 'occupancy_analysis',
    title: 'Occupancy Analysis',
    description: 'Physical and economic occupancy trends',
    requiredFiles: ['t12', 'rent_roll'],
    requiredQuestions: ['occupancy_notes'],
    isConditional: false,
    promptGuidance: `Analyze occupancy:
- Physical occupancy (from rent roll: occupied / total units)
- Economic occupancy (from T-12: collected / GPR)
- Gap between physical and economic (concessions or delinquency)
- Trend vs. prior months
- Vacant unit details if rent roll shows them`
  },
  lease_analysis: {
    id: 'lease_analysis',
    title: 'Lease Expiration & Renewal Analysis',
    description: 'Upcoming expirations, renewal rates, rent growth',
    requiredFiles: ['rent_roll'],
    requiredQuestions: ['lease_expiration_notes'],
    isConditional: true,
    promptGuidance: `Analyze leasing (only if rent roll has lease dates):
- Leases expiring in next 30/60/90 days
- Renewal rate and average rent increase
- New lease rates vs. expiring rates
- Month-to-month tenants and risk`
  },
  financial_performance: {
    id: 'financial_performance',
    title: 'Financial Performance',
    description: 'Revenue, expenses, NOI deep dive',
    requiredFiles: ['t12'],
    requiredQuestions: ['financial_notes'],
    isConditional: false,
    promptGuidance: `Deep dive into financials:
REVENUE: GPR vs. collected, loss to lease, vacancy loss, concessions, bad debt, other income
EXPENSES: Total vs. budget, line items >10% over budget, controllable vs. non-controllable, per-unit metrics
NOI: Current month, margin, MoM change with explanation, YTD vs. budget
Use exact dollar amounts and percentages.`
  },
  delinquency_status: {
    id: 'delinquency_status',
    title: 'Delinquency & Collections',
    description: 'Delinquent accounts and collections',
    requiredFiles: ['t12'],
    requiredQuestions: ['delinquency_notes'],
    isConditional: true,
    promptGuidance: `Report on collections (only if T-12 shows delinquency/bad debt or user provides notes):
- Total delinquent amount and % of GPR
- Number of delinquent accounts
- Aging breakdown (30/60/90+ days)
- Bad debt write-offs
- Collection actions from user notes`
  },
  leasing_activity: {
    id: 'leasing_activity',
    title: 'Leasing Activity',
    description: 'Traffic, applications, move-ins/outs, turn costs',
    requiredFiles: ['leasing_activity'],
    requiredQuestions: ['leasing_notes'],
    isConditional: true,
    promptGuidance: `Summarize leasing (only if leasing activity file uploaded):
- First-time visits / traffic
- Applications received
- New leases executed
- Move-ins and move-outs, lease breaks, renewals
- Average turn cost and turn time`
  },
  capex_needs: {
    id: 'capex_needs',
    title: 'Capital Expenditures',
    description: 'CapEx spending and renovation progress',
    requiredFiles: [],
    requiredQuestions: ['capex_notes'],
    isConditional: true,
    promptGuidance: `Report on CapEx (only if user provides notes or T-12 shows CapEx):
- CapEx spent this month and YTD
- Renovation progress and premiums achieved
- Budget vs. actual CapEx`
  },
  distribution_update: {
    id: 'distribution_update',
    title: 'Distribution Update',
    description: 'Distribution status for investors',
    requiredFiles: [],
    requiredQuestions: ['distribution_notes'],
    isConditional: true,
    promptGuidance: `Report distribution status using user-provided status and note.
Status options: distributing, accruing, paused, none.
If user provided a narrative, incorporate it directly. Keep factual.`
  },
  covenant_compliance: {
    id: 'covenant_compliance',
    title: 'Loan Covenant Compliance',
    description: 'DSCR, LTV tracking',
    requiredFiles: ['t12'],
    requiredQuestions: ['covenant_notes'],
    isConditional: true,
    promptGuidance: `Analyze covenants (only if debt service in T-12 or user provides info):
- Current DSCR
- Required DSCR threshold
- Margin of compliance
- Actions if near breach`
  },
  risk_assessment: {
    id: 'risk_assessment',
    title: 'Risk Assessment',
    description: 'Key risks and mitigation',
    requiredFiles: ['t12', 'rent_roll'],
    requiredQuestions: [],
    isConditional: false,
    promptGuidance: `Identify risks based on data:
- Concentration risk, delinquency trend, expense escalation
- Market/competitive risk, lease expiration clusters, occupancy trend
Rate each as Low/Medium/High with mitigation. No generic language.`
  },
  market_analysis: {
    id: 'market_analysis',
    title: 'Market Context',
    description: 'Local market conditions',
    requiredFiles: [],
    requiredQuestions: ['market_notes'],
    isConditional: true,
    promptGuidance: `Market context (only if user provides notes):
- Local conditions, supply/demand, competitive positioning
- How property compares to market`
  },
  strategic_recommendations: {
    id: 'strategic_recommendations',
    title: 'Strategic Recommendations',
    description: 'Actionable recommendations from analysis',
    requiredFiles: ['t12'],
    requiredQuestions: [],
    isConditional: false,
    promptGuidance: `3-5 specific, actionable recommendations:
- Each tied to a specific finding
- Quantify impact where possible
- Prioritize by impact and feasibility
- Align with investment strategy`
  },
  outlook: {
    id: 'outlook',
    title: 'Outlook',
    description: 'Forward-looking expectations',
    requiredFiles: ['t12'],
    requiredQuestions: ['outlook_notes'],
    isConditional: false,
    promptGuidance: `Forward-looking outlook:
- Expected trajectory for next 1-3 months
- Key milestones coming up
- Risks to monitor
- Overall sentiment (improving/stable/declining) with rationale`
  }
};

export const TIER_SECTIONS: Record<string, SectionId[]> = {
  foundational: [
    'executive_summary', 'key_metrics', 'occupancy_analysis', 'outlook'
  ],
  professional: [
    'executive_summary', 'key_metrics', 'occupancy_analysis', 'lease_analysis',
    'financial_performance', 'delinquency_status', 'leasing_activity',
    'distribution_update', 'capex_needs', 'outlook'
  ],
  institutional: [
    'executive_summary', 'property_overview', 'key_metrics', 'occupancy_analysis',
    'lease_analysis', 'financial_performance', 'delinquency_status', 'leasing_activity',
    'capex_needs', 'distribution_update', 'covenant_compliance', 'risk_assessment',
    'market_analysis', 'strategic_recommendations', 'outlook'
  ]
};

export function getSectionsForTier(tier: string): SectionDefinition[] {
  const sectionIds = TIER_SECTIONS[tier] || TIER_SECTIONS.foundational;
  return sectionIds.map(id => ALL_SECTIONS[id]);
}
