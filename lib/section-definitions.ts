// lib/section-definitions.ts
// Defines report sections per tier with visualization instructions and prompt guidance.
// CRITICAL: All financial analysis stops at NOI. No debt service, no capex unless user provides via questionnaire.

export type SectionId =
  // Foundational
  | 'executive_summary'
  | 'revenue_summary'
  | 'expense_summary'
  | 'asset_manager_outlook'
  // Professional adds
  | 'occupancy_leasing'
  | 'revenue_analysis'
  | 'expense_analysis'
  | 'noi_performance'
  | 'rent_roll_insights'
  | 'market_positioning'
  | 'capital_improvements'
  | 'risk_watch_items'
  // Institutional adds
  | 'investment_thesis_update'
  | 'lease_expiration_rollover'
  | 'rent_roll_deep_dive'
  | 'budget_vs_actual'
  | 'market_submarket_analysis'
  | 'capital_improvements_tracker'
  | 'risk_matrix'
  | 'resident_operational_metrics'
  | 'regulatory_compliance'
  | 'asset_manager_strategic_outlook';

export type VisualizationType = 'none' | 'kpi-cards' | 'charts' | 'premium';

export interface SectionDefinition {
  id: SectionId;
  title: string;
  description: string;
  requiredFiles: string[];
  requiredQuestions: string[];
  isConditional: boolean;
  visualizations: VisualizationType;
  promptGuidance: string;
}

// ─── SECTION DEFINITIONS ─────────────────────────────────────────

export const ALL_SECTIONS: Record<SectionId, SectionDefinition> = {

  // ── FOUNDATIONAL SECTIONS ────────────────────────────────────
  executive_summary: {
    id: 'executive_summary',
    title: 'Executive Summary',
    description: 'High-level overview with KPI cards',
    requiredFiles: ['t12'],
    requiredQuestions: [],
    isConditional: false,
    visualizations: 'kpi-cards',
    promptGuidance: `<section_instructions>
<overview>Write a concise executive summary: 3-4 sentences covering overall property performance this month.</overview>
<data_requirements>
- Pull current month revenue, expenses, and NOI from the T-12
- Calculate occupancy from rent roll if available
- Reference month-over-month changes with exact numbers
</data_requirements>
<kpi_cards>
Generate exactly 4 KPI metric cards in the metrics array:
1. Occupancy Rate (% with MoM change)
2. Net Operating Income ($ with MoM change)
3. Total Revenue ($ with MoM change)
4. Total Expenses ($ with MoM change)
Each metric must include: label, value, change (e.g. "+2.3%"), changeDirection ("up"/"down"/"flat")
If budget data is available, include vsbudget variance.
</kpi_cards>
<rules>
- Every sentence must contain a specific number from the uploaded documents
- Do NOT include debt service, capex, or any below-the-line items
- Do NOT use generic language like "the property performed well" — be specific
</rules>
</section_instructions>`
  },

  revenue_summary: {
    id: 'revenue_summary',
    title: 'Revenue Summary',
    description: 'Top-line revenue performance',
    requiredFiles: ['t12'],
    requiredQuestions: [],
    isConditional: false,
    visualizations: 'kpi-cards',
    promptGuidance: `<section_instructions>
<overview>Summarize revenue performance in 2-3 paragraphs. Focus on rental income, other income, and effective gross income.</overview>
<kpi_cards>
Generate 3 KPI metric cards:
1. Gross Potential Rent (GPR)
2. Effective Gross Income (EGI)
3. Average Effective Rent per Unit
Each with value, MoM change, and budget variance if available.
</kpi_cards>
<analysis_points>
- Total rental income vs. prior month
- Concessions, vacancy loss, bad debt impact on collected revenue
- Other income sources if material
</analysis_points>
<rules>
- Use exact dollar amounts and percentages from the T-12
- Stop at revenue — do NOT discuss expenses or NOI here
- If a number seems off, flag it in the narrative
</rules>
</section_instructions>`
  },

  expense_summary: {
    id: 'expense_summary',
    title: 'Expense Summary',
    description: 'Total expenses and key categories',
    requiredFiles: ['t12'],
    requiredQuestions: [],
    isConditional: false,
    visualizations: 'kpi-cards',
    promptGuidance: `<section_instructions>
<overview>Summarize expense performance in 2-3 paragraphs. Highlight total expenses and any notable line items.</overview>
<kpi_cards>
Generate 3 KPI metric cards:
1. Total Operating Expenses
2. Expense per Unit
3. Expense Ratio (OpEx / EGI)
Each with value, MoM change, and budget variance if available.
</kpi_cards>
<analysis_points>
- Total expenses vs. prior month and budget
- Top 2-3 expense categories by dollar amount
- Any line items significantly over or under budget (>10% variance)
</analysis_points>
<rules>
- Use exact dollar amounts. Do NOT round unless the source data is rounded.
- Do NOT include capex, debt service, or below-the-line items
- Keep it concise — this is a summary, not a deep dive
</rules>
</section_instructions>`
  },

  asset_manager_outlook: {
    id: 'asset_manager_outlook',
    title: 'Asset Manager Outlook',
    description: 'Forward-looking narrative from questionnaire',
    requiredFiles: [],
    requiredQuestions: ['outlook_notes'],
    isConditional: false,
    visualizations: 'none',
    promptGuidance: `<section_instructions>
<overview>Write a forward-looking outlook in 2-3 paragraphs based on the asset manager's questionnaire notes.</overview>
<content_guidance>
- What is happening at the property right now
- What actions are planned for the next 30-60 days
- Any risks or opportunities the asset manager has flagged
- Overall sentiment: improving, stable, or declining
</content_guidance>
<rules>
- Heavily weight the asset manager's own words from the questionnaire
- If the asset manager provided notes, weave them into a professional narrative
- If no notes provided, synthesize outlook from the financial data trends
- Do NOT fabricate plans or initiatives not mentioned by the asset manager
</rules>
</section_instructions>`
  },

  // ── PROFESSIONAL SECTIONS ────────────────────────────────────
  occupancy_leasing: {
    id: 'occupancy_leasing',
    title: 'Occupancy & Leasing',
    description: 'Occupancy rate, lease activity, move-in/out breakdown',
    requiredFiles: ['t12', 'rent_roll'],
    requiredQuestions: ['occupancy_notes'],
    isConditional: false,
    visualizations: 'charts',
    promptGuidance: `<section_instructions>
<overview>Analyze occupancy and leasing in 3-4 paragraphs with an inline chart.</overview>
<chart_instructions>
Generate an HTML/SVG visualization embedded in the content showing:
- A horizontal bar or gauge chart showing current occupancy vs. target (e.g., 94.2% occupied)
- Use the brand colors provided in the system prompt
- The chart must be inline HTML with inline CSS (no external stylesheets)
- Keep SVG simple and email-safe
</chart_instructions>
<analysis_points>
- Physical occupancy (occupied units / total units from rent roll)
- Economic occupancy (collected revenue / GPR from T-12)
- Gap analysis between physical and economic occupancy
- New leases, renewals, move-outs this month
- Trend vs. prior month
</analysis_points>
<rules>
- Cross-reference rent roll unit count with T-12 occupancy data
- If data conflicts, note the discrepancy
- Do NOT include debt-related metrics
</rules>
</section_instructions>`
  },

  revenue_analysis: {
    id: 'revenue_analysis',
    title: 'Revenue Analysis',
    description: 'Detailed revenue breakdown with chart',
    requiredFiles: ['t12'],
    requiredQuestions: [],
    isConditional: false,
    visualizations: 'charts',
    promptGuidance: `<section_instructions>
<overview>Deep dive into revenue performance with a breakdown chart.</overview>
<chart_instructions>
Generate an inline HTML/SVG stacked bar chart or waterfall showing revenue components:
- Gross Potential Rent
- Less: Vacancy Loss
- Less: Concessions
- Less: Bad Debt
- = Effective Gross Income
Use brand colors. Chart must be inline HTML with inline CSS.
</chart_instructions>
<analysis_points>
- GPR vs. collected rental income
- Loss to lease quantified
- Concession impact (total $ and per unit)
- Other income sources and their contribution
- Month-over-month trend for each component
</analysis_points>
<rules>
- Every number must come directly from the T-12
- Show both dollar amounts and percentages
- Stop at EGI/revenue — do NOT cross into expenses
</rules>
</section_instructions>`
  },

  expense_analysis: {
    id: 'expense_analysis',
    title: 'Expense Analysis',
    description: 'Category-level expense breakdown with variance chart',
    requiredFiles: ['t12'],
    requiredQuestions: [],
    isConditional: false,
    visualizations: 'charts',
    promptGuidance: `<section_instructions>
<overview>Category-level expense analysis with variance visualization.</overview>
<chart_instructions>
Generate an inline HTML/SVG chart showing expense categories:
- Horizontal bar chart with actual vs. budget per category (if budget available)
- OR a simple bar chart of top 5-7 expense categories by dollar amount
- Color-code: green for under budget, red for over budget
- Use brand colors for neutral bars
</chart_instructions>
<analysis_points>
- Total operating expenses and per-unit cost
- Top 5 expense categories ranked by dollar amount
- Any category >10% over budget — explain why if possible
- Controllable vs. non-controllable expense split
- MoM change in total expenses
</analysis_points>
<rules>
- Use exact line items from the T-12
- Do NOT include capex or debt service in operating expenses
- If budget data is unavailable, compare to prior month only
</rules>
</section_instructions>`
  },

  noi_performance: {
    id: 'noi_performance',
    title: 'Net Operating Income',
    description: 'NOI with MoM or budget comparison chart',
    requiredFiles: ['t12'],
    requiredQuestions: [],
    isConditional: false,
    visualizations: 'charts',
    promptGuidance: `<section_instructions>
<overview>NOI analysis — this is the bottom line. 2-3 paragraphs with a chart.</overview>
<chart_instructions>
Generate an inline HTML/SVG NOI summary:
- Simple comparison: Current Month NOI vs. Prior Month vs. Budget
- Use a clean bar chart or KPI comparison layout
- Green if NOI improved, red if declined
- Show the dollar and percentage change prominently
</chart_instructions>
<analysis_points>
- Current month NOI (exact dollar amount)
- MoM change ($ and %)
- Budget variance if available
- NOI margin (NOI / EGI)
- Key drivers: what moved NOI up or down this month
</analysis_points>
<rules>
- THIS IS THE FINAL LINE. Do NOT go below NOI.
- No debt service coverage ratios, no capex, no distributions
- If the user asks about DSCR in their notes, you may reference it in the outlook section only
</rules>
</section_instructions>`
  },

  rent_roll_insights: {
    id: 'rent_roll_insights',
    title: 'Rent Roll Insights',
    description: 'Unit mix, avg rent by floorplan, lease expirations',
    requiredFiles: ['rent_roll'],
    requiredQuestions: [],
    isConditional: false,
    visualizations: 'charts',
    promptGuidance: `<section_instructions>
<overview>Analyze the rent roll for unit mix and rent insights with a table or chart.</overview>
<chart_instructions>
Generate an inline HTML table showing:
| Unit Type | Units | Avg Rent | Occupancy | Avg Sq Ft | Rent/Sq Ft |
Use brand colors for header row. Alternate row striping for readability.
If lease dates are available, add a lease expiration summary (count by month for next 6 months).
</chart_instructions>
<analysis_points>
- Unit mix breakdown (1BR, 2BR, etc.)
- Average rent by unit type
- Lease expiration concentrations
- Any units significantly below or above market
</analysis_points>
<rules>
- Data must come from the uploaded rent roll
- If rent roll doesn't have floorplan data, skip the table and note data limitation
- Do NOT fabricate unit types or rent amounts
</rules>
</section_instructions>`
  },

  market_positioning: {
    id: 'market_positioning',
    title: 'Market Positioning',
    description: 'Property vs. submarket context',
    requiredFiles: [],
    requiredQuestions: ['market_notes'],
    isConditional: false,
    visualizations: 'none',
    promptGuidance: `<section_instructions>
<overview>1-2 paragraphs on how the property is positioned in its submarket.</overview>
<content_guidance>
- Competitive landscape from asset manager notes
- Rent growth trends in the area
- New supply coming online
- Any competitive advantages or threats
</content_guidance>
<rules>
- This section is primarily driven by asset manager questionnaire input
- If no market notes provided, write a brief note that market context was not provided this period
- Do NOT fabricate market data or comp rents
</rules>
</section_instructions>`
  },

  capital_improvements: {
    id: 'capital_improvements',
    title: 'Capital & Improvements Update',
    description: 'Only if user provides CapEx info',
    requiredFiles: [],
    requiredQuestions: ['capex_notes'],
    isConditional: true,
    visualizations: 'none',
    promptGuidance: `<section_instructions>
<overview>Report on capital improvements — ONLY if the asset manager provided capex notes in the questionnaire.</overview>
<rules>
- If no capex notes provided, set included: false and skipReason: "No capital improvement data provided this period"
- Do NOT pull capex from the T-12 unless the user explicitly references it
- This is below-the-line — only include if user volunteered the information
</rules>
</section_instructions>`
  },

  risk_watch_items: {
    id: 'risk_watch_items',
    title: 'Risk & Watch Items',
    description: 'Flagged concerns from data analysis',
    requiredFiles: ['t12'],
    requiredQuestions: [],
    isConditional: false,
    visualizations: 'none',
    promptGuidance: `<section_instructions>
<overview>Identify 2-4 specific risks or items to watch based on the data.</overview>
<content_guidance>
- Each risk must be tied to a specific data point (e.g., "Delinquency rose to 4.2% of GPR, up from 3.1%")
- Rank by severity: High / Medium / Low
- Include a brief mitigation suggestion for each
</content_guidance>
<rules>
- Be honest — if performance is poor, say so
- Do NOT use generic risks like "market conditions could change"
- Every risk must reference a specific number from the data
</rules>
</section_instructions>`
  },

  // ── INSTITUTIONAL SECTIONS ───────────────────────────────────
  investment_thesis_update: {
    id: 'investment_thesis_update',
    title: 'Investment Thesis Update',
    description: 'Progress against original investment strategy',
    requiredFiles: ['t12'],
    requiredQuestions: [],
    isConditional: false,
    visualizations: 'none',
    promptGuidance: `<section_instructions>
<overview>2-3 paragraphs connecting current performance to the property's investment strategy.</overview>
<content_guidance>
- Reference the investment_strategy from property settings (provided in system prompt)
- How is the asset tracking against the original thesis?
- Are value-add milestones being met?
- Any strategic pivots needed?
</content_guidance>
<rules>
- If no investment strategy was provided, write a brief performance-against-plan narrative using financial trends
- Tie every observation to specific financial data
- This is for institutional investors — write at a sophisticated level
</rules>
</section_instructions>`
  },

  lease_expiration_rollover: {
    id: 'lease_expiration_rollover',
    title: 'Lease Expiration & Rollover Analysis',
    description: 'Expiration schedule with curve chart',
    requiredFiles: ['rent_roll'],
    requiredQuestions: [],
    isConditional: false,
    visualizations: 'premium',
    promptGuidance: `<section_instructions>
<overview>Detailed lease expiration analysis with a rollover chart.</overview>
<chart_instructions>
Generate an inline HTML/SVG chart:
- Bar chart showing lease expirations by month for the next 12 months
- Color-code: current month highlighted, near-term (1-3 months) in amber, 4+ months in brand color
- Below the chart, include a summary table: Month | Expiring Units | % of Total | Expiring Revenue
</chart_instructions>
<analysis_points>
- Total leases expiring in next 30/60/90/180 days
- Revenue at risk from near-term expirations
- Renewal probability based on historical patterns if available
- Month-to-month tenant count and risk assessment
- Concentration risk (any single month with >15% of leases expiring)
</analysis_points>
<rules>
- All data from rent roll lease dates
- If rent roll lacks lease expiration dates, set included: false with skipReason
- Show exact unit counts and dollar amounts
</rules>
</section_instructions>`
  },

  rent_roll_deep_dive: {
    id: 'rent_roll_deep_dive',
    title: 'Rent Roll Deep Dive',
    description: 'Unit-level analysis with distribution and floorplan tables',
    requiredFiles: ['rent_roll'],
    requiredQuestions: [],
    isConditional: false,
    visualizations: 'premium',
    promptGuidance: `<section_instructions>
<overview>Institutional-grade rent roll analysis with multiple visualizations.</overview>
<chart_instructions>
Generate TWO inline HTML visualizations:
1. Rent distribution chart: horizontal histogram or bar chart showing how many units fall into rent bands ($50 increments)
2. Floorplan performance table:
| Unit Type | Count | Avg Rent | Min | Max | Avg SF | Rent/SF | Occupancy |
Use brand colors. Tables must have clean borders and alternating row colors.
</chart_instructions>
<analysis_points>
- Rent distribution analysis — are rents clustered or spread?
- Mark-to-market opportunity (units significantly below average)
- Top-performing and underperforming unit types
- Vacant unit analysis: how long vacant, last rent, market rent
</analysis_points>
<rules>
- All numbers from rent roll data
- Do NOT fabricate market rents — only use if user provides
- If data is incomplete, note limitations clearly
</rules>
</section_instructions>`
  },

  budget_vs_actual: {
    id: 'budget_vs_actual',
    title: 'Budget vs. Actual',
    description: 'Full variance analysis — only if budget uploaded',
    requiredFiles: ['budget'],
    requiredQuestions: [],
    isConditional: true,
    visualizations: 'premium',
    promptGuidance: `<section_instructions>
<overview>Comprehensive budget vs. actual variance analysis — ONLY if budget CSV is uploaded.</overview>
<chart_instructions>
Generate an inline HTML/SVG variance chart:
- Horizontal bar chart showing key line items: Actual vs. Budget
- Color: green bars for favorable variance, red for unfavorable
- Include a variance table below:
| Line Item | Budget | Actual | Variance $ | Variance % |
Show both MTD and YTD if data available.
</chart_instructions>
<analysis_points>
- Revenue: actual vs. budget (total and key components)
- Expenses: actual vs. budget by category
- NOI: actual vs. budget with explanation of variance drivers
- YTD tracking: are we ahead or behind plan?
</analysis_points>
<rules>
- If no budget data uploaded, set included: false with skipReason: "No budget data available"
- Stop at NOI — do NOT show below-the-line budget items
- Flag any line item >10% over budget with explanation
</rules>
</section_instructions>`
  },

  market_submarket_analysis: {
    id: 'market_submarket_analysis',
    title: 'Market & Submarket Analysis',
    description: 'Comps, rent trends, supply pipeline',
    requiredFiles: [],
    requiredQuestions: ['market_notes'],
    isConditional: false,
    visualizations: 'charts',
    promptGuidance: `<section_instructions>
<overview>Institutional-grade market analysis in 3-4 paragraphs.</overview>
<chart_instructions>
If the asset manager provided comp data or market metrics, generate an inline HTML comparison table:
| Property | Units | Avg Rent | Occupancy | Distance |
Use brand colors for header.
</chart_instructions>
<analysis_points>
- Submarket rent growth trends
- New supply pipeline and impact
- Competitive positioning
- Demand drivers in the area
</analysis_points>
<rules>
- Heavily dependent on asset manager notes — if no market notes provided, write a brief placeholder
- Do NOT fabricate market data, comp properties, or rent statistics
- If user provides specific comp data, present it in the table format
</rules>
</section_instructions>`
  },

  capital_improvements_tracker: {
    id: 'capital_improvements_tracker',
    title: 'Capital Improvements & Value-Add Tracker',
    description: 'Renovation progress and ROI — only if data provided',
    requiredFiles: [],
    requiredQuestions: ['capex_notes'],
    isConditional: true,
    visualizations: 'charts',
    promptGuidance: `<section_instructions>
<overview>Track capital improvements and value-add execution — ONLY if user provides data.</overview>
<chart_instructions>
If user provides renovation data, generate a progress tracker:
- Simple HTML table or progress bars showing: Project | Budget | Spent | % Complete | Premium Achieved
</chart_instructions>
<rules>
- If no capex notes provided, set included: false with skipReason: "No capital improvement data provided"
- This is a below-the-line item — only include when user explicitly volunteers the data
- Show ROI on completed renovations if data available
</rules>
</section_instructions>`
  },

  risk_matrix: {
    id: 'risk_matrix',
    title: 'Risk Matrix',
    description: 'Categorized risk table with severity ratings',
    requiredFiles: ['t12'],
    requiredQuestions: [],
    isConditional: false,
    visualizations: 'premium',
    promptGuidance: `<section_instructions>
<overview>Generate a structured risk matrix for institutional investors.</overview>
<chart_instructions>
Generate an inline HTML risk table:
| Risk Category | Specific Risk | Severity | Trend | Mitigation |
Severity: High (red bg), Medium (amber bg), Low (green bg)
Trend: Improving / Stable / Worsening with arrow indicators
Use inline CSS for color-coding. Minimum 4, maximum 8 risk items.
</chart_instructions>
<risk_categories>
- Occupancy Risk (vacancy trend, lease expirations)
- Revenue Risk (delinquency, concession pressure, rent growth)
- Expense Risk (insurance, taxes, maintenance trending up)
- Market Risk (new supply, demand softening)
- Operational Risk (staffing, maintenance backlog)
</risk_categories>
<rules>
- Every risk must cite a specific data point
- Do NOT include generic risks — be specific to this property
- Severity must be justified by the data
- Include at least one positive (low risk) item if warranted
</rules>
</section_instructions>`
  },

  resident_operational_metrics: {
    id: 'resident_operational_metrics',
    title: 'Resident & Operational Metrics',
    description: 'Turnover, work orders, collections — if data available',
    requiredFiles: [],
    requiredQuestions: ['operations_notes'],
    isConditional: true,
    visualizations: 'charts',
    promptGuidance: `<section_instructions>
<overview>Operational metrics — ONLY if user provides operational data via questionnaire.</overview>
<chart_instructions>
If data available, generate KPI cards for:
- Turnover Rate
- Average Turn Time (days)
- Work Order Completion Rate
- Resident Satisfaction (if provided)
</chart_instructions>
<rules>
- If no operational data provided, set included: false with skipReason: "No operational data provided this period"
- Do NOT fabricate operational metrics from financial data alone
</rules>
</section_instructions>`
  },

  regulatory_compliance: {
    id: 'regulatory_compliance',
    title: 'Regulatory & Compliance Notes',
    description: 'Loan covenants, insurance, tax — if data available',
    requiredFiles: [],
    requiredQuestions: ['compliance_notes'],
    isConditional: true,
    visualizations: 'none',
    promptGuidance: `<section_instructions>
<overview>Compliance and regulatory updates — ONLY if user provides relevant data.</overview>
<content_guidance>
- Loan covenant status (DSCR, LTV) if user provides
- Insurance renewal status
- Property tax assessment updates
- Any regulatory changes affecting the property
</content_guidance>
<rules>
- If no compliance data provided, set included: false with skipReason: "No compliance data provided this period"
- Debt-related metrics are ONLY allowed here if the user explicitly provides them
- Do NOT calculate DSCR from T-12 data — only use if user provides the number
</rules>
</section_instructions>`
  },

  asset_manager_strategic_outlook: {
    id: 'asset_manager_strategic_outlook',
    title: 'Asset Manager Strategic Outlook',
    description: 'Comprehensive forward look with action items',
    requiredFiles: ['t12'],
    requiredQuestions: ['outlook_notes'],
    isConditional: false,
    visualizations: 'none',
    promptGuidance: `<section_instructions>
<overview>Comprehensive strategic outlook for institutional investors. 3-5 paragraphs.</overview>
<content_guidance>
- Synthesize all findings from previous sections into a forward-looking narrative
- Specific action items with owners and timelines
- 30/60/90 day priorities
- Key metrics to watch next month
- Overall investment sentiment with data-backed rationale
</content_guidance>
<rules>
- This is the final section — synthesize, don't repeat
- Action items must be specific and measurable
- Tie recommendations to the investment strategy if provided
- Be honest about challenges while maintaining professional tone
</rules>
</section_instructions>`
  },
};

// ─── TIER → SECTION MAPPING ─────────────────────────────────────

export const TIER_SECTIONS: Record<string, SectionId[]> = {
  foundational: [
    'executive_summary',
    'revenue_summary',
    'expense_summary',
    'asset_manager_outlook',
  ],
  professional: [
    'executive_summary',
    'occupancy_leasing',
    'revenue_analysis',
    'expense_analysis',
    'noi_performance',
    'rent_roll_insights',
    'market_positioning',
    'capital_improvements',
    'risk_watch_items',
    'asset_manager_outlook',
  ],
  institutional: [
    'executive_summary',
    'investment_thesis_update',
    'occupancy_leasing',
    'lease_expiration_rollover',
    'revenue_analysis',
    'expense_analysis',
    'noi_performance',
    'rent_roll_deep_dive',
    'budget_vs_actual',
    'market_submarket_analysis',
    'capital_improvements_tracker',
    'risk_matrix',
    'resident_operational_metrics',
    'regulatory_compliance',
    'asset_manager_strategic_outlook',
  ],
};

export function getSectionsForTier(tier: string): SectionDefinition[] {
  const sectionIds = TIER_SECTIONS[tier] || TIER_SECTIONS.foundational;
  return sectionIds.map(id => ALL_SECTIONS[id]);
}
