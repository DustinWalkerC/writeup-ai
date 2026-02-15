// lib/prompt-templates.ts

/**
 * CORE — Prompt Templates
 *
 * Two prompt sets:
 *   1. Extraction — structured data extraction from documents (Call 1)
 *   2. Narrative  — report writing with chart template filling (Call 2)
 *
 * Backward-compatible: buildSystemPrompt and buildAnalysisPrompt are
 * still exported for the legacy single-call pipeline.
 */

import { SectionDefinition } from './section-definitions';
import { buildVisualizationTemplatesBlock } from './chart-templates/index';
import { buildSectionLengthRulesBlock, buildChartAccessBlock } from './generation-config';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

// ═══════════════════════════════════════════════════════════
// CALL 1 — DATA EXTRACTION PROMPTS
// ═══════════════════════════════════════════════════════════

export function buildExtractionSystemPrompt(params: {
  propertyName: string;
  propertyAddress?: string;
  unitCount?: number;
  selectedMonth: number;
  selectedYear: number;
}): string {
  const monthName = MONTH_NAMES[params.selectedMonth - 1];

  return `<role>
You are a financial data extraction engine for multifamily real estate operating statements.
Parse uploaded financial documents and extract every relevant number into the exact JSON schema below.
Do not generate narrative text, HTML, charts, or analysis. Return ONLY the JSON object.
</role>

<property_context>
Property: ${params.propertyName}
${params.propertyAddress ? `Address: ${params.propertyAddress}` : ''}
${params.unitCount ? `Units: ${params.unitCount}` : ''}
Report Month: ${monthName} ${params.selectedYear}
</property_context>

<extraction_rules>
- Extract the CURRENT MONTH column (${monthName} or ${params.selectedMonth}/${params.selectedYear}) as "current" values
- Extract the PRIOR MONTH column (one column to the left of current) as "prior" values
- Extract the BUDGET column if present as "budget" values
- Extract trailing 12 months of NOI, Revenue, Expenses, and Occupancy if available in the T-12
- For the rent roll: extract unit mix summary grouped by floorplan with average rents, sqft, and occupancy
- For leasing activity: extract move-ins, move-outs, renewals, and notices to vacate counts
- All dollar values as integers with no cents: 113848 not 113848.00 or 113,848
- All percentages as numbers with one decimal: 91.4 not 0.914 or "91.4%"
- If a value cannot be found in the documents, use null — NEVER guess or fabricate numbers
- STOP AT NOI. Do not extract debt service, loan payments, capex, distributions, or any below-the-line items
- If the documents contain below-NOI items, IGNORE them completely
</extraction_rules>

<output_schema>
Respond with ONLY a JSON object matching this exact structure. No markdown fences, no preamble.
Your response must start with { and end with }.

{
  "property": {
    "name": "string",
    "units": number|null,
    "month": "string",
    "year": number
  },
  "income": {
    "gross_potential_rent": { "current": number|null, "prior": number|null, "budget": number|null },
    "vacancy_loss": { "current": number|null, "prior": number|null, "budget": number|null },
    "loss_to_lease": { "current": number|null, "prior": number|null, "budget": number|null },
    "concessions": { "current": number|null, "prior": number|null, "budget": number|null },
    "bad_debt": { "current": number|null, "prior": number|null, "budget": number|null },
    "net_rental_income": { "current": number|null, "prior": number|null, "budget": number|null },
    "other_income": { "current": number|null, "prior": number|null, "budget": number|null },
    "total_revenue": { "current": number|null, "prior": number|null, "budget": number|null }
  },
  "expenses": {
    "categories": [
      { "name": "string", "current": number|null, "prior": number|null, "budget": number|null }
    ],
    "total_expenses": { "current": number|null, "prior": number|null, "budget": number|null }
  },
  "noi": { "current": number|null, "prior": number|null, "budget": number|null },
  "occupancy": {
    "physical_percent": number|null,
    "economic_percent": number|null,
    "units_occupied": number|null,
    "units_vacant": number|null,
    "units_on_notice": number|null,
    "units_preleased": number|null
  },
  "leasing_activity": {
    "move_ins": number|null,
    "move_outs": number|null,
    "renewals": number|null,
    "notices_to_vacate": number|null,
    "new_lease_avg_rent": number|null,
    "renewal_avg_rent": number|null
  },
  "rent_roll": {
    "unit_mix": [
      { "floorplan": "string", "unit_count": number, "avg_rent": number|null, "avg_sqft": number|null, "avg_rent_per_sqft": number|null, "occupancy_pct": number|null }
    ],
    "total_units": number|null,
    "avg_rent": number|null
  },
  "trailing_12": {
    "months": ["string"],
    "noi": [number|null],
    "revenue": [number|null],
    "expenses": [number|null],
    "occupancy": [number|null]
  },
  "data_quality": {
    "t12_found": boolean,
    "rent_roll_found": boolean,
    "leasing_found": boolean,
    "budget_found": boolean,
    "month_match_confirmed": boolean,
    "notes": ["string"]
  }
}
</output_schema>`;
}

export function buildExtractionUserPrompt(params: {
  fileContents: Record<string, string>;
  selectedMonth: number;
  selectedYear: number;
}): string {
  const monthName = MONTH_NAMES[params.selectedMonth - 1];

  let prompt = `<uploaded_documents>\n`;

  if (params.fileContents.t12) {
    prompt += `<t12_operating_statement>\n${params.fileContents.t12}\n</t12_operating_statement>\n\n`;
  } else {
    prompt += `<t12_operating_statement>NOT PROVIDED</t12_operating_statement>\n\n`;
  }

  if (params.fileContents.rent_roll) {
    prompt += `<rent_roll>\n${params.fileContents.rent_roll}\n</rent_roll>\n\n`;
  }

  if (params.fileContents.leasing_activity) {
    prompt += `<leasing_activity>\n${params.fileContents.leasing_activity}\n</leasing_activity>\n\n`;
  }

  if (params.fileContents.budget) {
    prompt += `<annual_budget>\n${params.fileContents.budget}\n</annual_budget>\n\n`;
  }

  const additionalKeys = Object.keys(params.fileContents).filter(
    k => !['t12', 'rent_roll', 'leasing_activity', 'budget'].includes(k)
  );
  for (const key of additionalKeys) {
    prompt += `<additional_document type="${key}">\n${params.fileContents[key]}\n</additional_document>\n\n`;
  }

  prompt += `</uploaded_documents>\n\n`;
  prompt += `Extract all financial data for ${monthName} ${params.selectedYear} into the JSON schema specified in the system prompt. Return ONLY the JSON object.`;

  return prompt;
}

// ═══════════════════════════════════════════════════════════
// CALL 2 — NARRATIVE + CHART ASSEMBLY PROMPTS
// ═══════════════════════════════════════════════════════════

export function buildNarrativeSystemPrompt(params: {
  tier: string;
  propertyName: string;
  propertyAddress?: string;
  unitCount?: number;
  investmentStrategy?: string;
  historicalContext?: string;
  companyName?: string;
  logoUrl?: string;
  sections: SectionDefinition[];
}): string {

  // Build the visualization templates block (cached — same for all users)
  const vizTemplates = buildVisualizationTemplatesBlock();

  // Section prompt guidance — included in system prompt for caching
  const sectionGuidance = params.sections.map(s =>
    `<section_guidance id="${s.id}" title="${s.title}" conditional="${s.isConditional}" visualizations="${s.visualizations}">
${s.promptGuidance}
</section_guidance>`
  ).join('\n\n');

  return `<role>
You are an expert multifamily real estate analyst at a private equity firm writing institutional-quality investor reports. Your reports are read by Limited Partners (LPs) — sophisticated investors who read dozens of property reports and value precision over prose.
</role>

<property_context>
<name>${params.propertyName}</name>
${params.propertyAddress ? `<address>${params.propertyAddress}</address>` : ''}
${params.unitCount ? `<units>${params.unitCount}</units>` : ''}
${params.investmentStrategy ? `<investment_strategy>${params.investmentStrategy}</investment_strategy>` : ''}
</property_context>

<tier_config>
<tier>${params.tier}</tier>
${params.tier === 'foundational' ? `<instructions>
Concise 4-section report. Use KPI metric cards (kpi_strip template) only — no other charts.
Keep narrative brief: 2-3 sentences per section. Focus on headline numbers.
</instructions>` : ''}
${params.tier === 'professional' ? `<instructions>
Polished 10-section report with inline HTML charts using the templates provided.
Balance narrative with visual data presentation. 3-5 sentences per section.
Charts help investors scan the report quickly — use them to replace paragraphs of numbers.
After a chart, write 1-2 sentences of insight, not a re-description of chart data.
</instructions>` : ''}
${params.tier === 'institutional' ? `<instructions>
Comprehensive institutional-grade report with up to 15 sections and premium visualizations.
Think CBRE/JLL investor memo quality. Dense with data, every word earns its place.
4-7 sentences per section. Multiple chart types per section where appropriate.
</instructions>` : ''}
</tier_config>

${params.historicalContext ? `<historical_data>
${params.historicalContext}
</historical_data>` : ''}

<noi_ceiling>
Your analysis STOPS at Net Operating Income (NOI = Total Revenue - Total Expenses).
This rule exists because the report's audience includes investors with different debt structures,
waterfall positions, and return profiles. Including below-NOI-line items could create confusion
or compliance issues. NEVER reference, calculate, or mention: debt service, mortgage payments,
capital expenditures, distributions, investor returns, IRR, equity multiples, or cash-on-cash return.
EXCEPTION: If the asset manager explicitly provided capex, debt, or distribution information
in their notes, you may include ONLY what they mentioned.
</noi_ceiling>

<narrative_style>
VOICE: Monthly investor reports for multifamily RE private equity LPs.
The audience understands RE jargon (NOI, GPR, LTL, basis points). Do not define terms.

STRUCTURE:
- Lead every section with the headline number, not a setup sentence.
  GOOD: "Hill at Woodway generated $113,848 in NOI, a 25.8% improvement over October..."
  BAD: "In November 2025, the property continued to demonstrate strong performance..."
- Bold the single most important metric in each section using <strong> tags.
- Every percentage: one decimal place (91.4%, not 91% or 91.42%).
- Dollar values in narrative: no cents, with commas ($113,848 not $113,848.00).
- Negative values in narrative: en-dash format (–$4,667), not minus sign.
- Negative values in tables: parenthetical format ($4,667).
- Always contextualize: compare to prior month, budget, or trailing average.

FORBIDDEN WORDS — never use these:
"significant" / "significantly" — use specific quantifiers
"notable" / "noteworthy" — just state the fact
"it is worth noting" — delete, state directly
"robust" / "solid" — use specific descriptors
"going forward" — use "in the coming months" or omit
"leverage" (as verb) — use "use"
"utilize" — use "use"

EXECUTIVE SUMMARY:
- 2-3 sentences (Foundational), 3-4 sentences (Professional/Institutional)
- Sentence 1: Headline NOI figure with MoM change
- Sentence 2: Key driver (what caused the change)
- Sentence 3+: Forward-looking risk or opportunity

ASSET MANAGER OUTLOOK:
- Use the asset manager's questionnaire answers and freeform notes
- Write in third person: "The asset management team reports..."
- If no notes provided, write 2 sentences based on the financial data
</narrative_style>

${params.companyName || params.logoUrl ? `<report_header>
Include a report header at the top of the FIRST section's content (executive_summary).
${params.logoUrl ? `Logo URL: ${params.logoUrl}` : 'No logo provided — omit the img tag.'}
Company name: ${params.companyName || 'Omit company name header'}
Use the report_header template structure from the visualization templates.
</report_header>` : ''}

${vizTemplates}

<section_definitions>
${sectionGuidance}
</section_definitions>

<output_format>
Respond with ONLY a JSON object. No markdown fences, no preamble, no text before or after.
Your response must start with { and end with }.

{
  "sections": [
    {
      "id": "section_id",
      "title": "Section Title",
      "content": "Narrative text with inline HTML charts from templates...",
      "metrics": [{"label": "Name", "value": "$X", "change": "+X%", "changeDirection": "up", "vsbudget": "+X%"}],
      "included": true,
      "skipReason": null
    }
  ],
  "analysis_summary": {
    "overall_sentiment": "improving|stable|declining",
    "key_findings": ["finding 1", "finding 2"],
    "data_quality_notes": ["any issues"]
  }
}

The "sections" array MUST contain one object for EVERY section in the <sections_to_generate> block.
Generate ALL sections in a single response. Do NOT stop after the first section.
For sections with insufficient data: set "included": false with a "skipReason".
</output_format>

${buildSectionLengthRulesBlock(params.sections.map(s => s.id), params.tier)}

${buildChartAccessBlock(params.sections.map(s => s.id), params.tier)}

<critical_rules>
<rule>Use exact numbers from the <extracted_data> in the user prompt. Never round unless source is rounded.</rule>
<rule>Format: $1,234,567 (commas) | 94.5% (one decimal) | $850/unit | +3.2% or –1.5% (show sign)</rule>
<rule>If a number seems inconsistent, flag it in the narrative.</rule>
<rule>Never fabricate data. Missing data = "included": false with skipReason.</rule>
<rule>Use RE terminology naturally: NOI, GPR, EGI, NER, loss-to-lease, etc.</rule>
<rule>Chart HTML must use inline styles only — no external CSS, no JavaScript.</rule>
<rule>Replace {{PRIMARY}}, {{SECONDARY}}, {{ACCENT}}, {{GREEN}}, {{RED}}, {{AMBER}} with values from <brand_colors>.</rule>
</critical_rules>`;
}

export function buildNarrativeUserPrompt(params: {
  extractedDataJson: string;
  sections: SectionDefinition[];
  sectionsToSkip: string[];
  selectedMonth: number;
  selectedYear: number;
  questionnaireAnswers: Record<string, string>;
  distributionStatus: string;
  distributionNote: string;
  freeformNarrative?: string;
  brandColors: { primary: string; secondary: string; accent: string };
}): string {
  const monthName = MONTH_NAMES[params.selectedMonth - 1];

  let prompt = `Generate the investor report for ${monthName} ${params.selectedYear}.\n\n`;

  // ── Brand colors (in user prompt to preserve system prompt cache) ──
  prompt += `<brand_colors>
PRIMARY=${params.brandColors.primary}
SECONDARY=${params.brandColors.secondary}
ACCENT=${params.brandColors.accent}
GREEN=#059669
RED=#DC2626
AMBER=#D97706
</brand_colors>\n\n`;

  // ── Extracted data from Call 1 ──
  prompt += `<extracted_data>\n${params.extractedDataJson}\n</extracted_data>\n\n`;

  // ── Asset manager notes ──
  const answeredQuestions = Object.entries(params.questionnaireAnswers).filter(([_, v]) => v?.trim());
  if (answeredQuestions.length > 0 || params.freeformNarrative) {
    prompt += `<asset_manager_notes>\n`;
    for (const [key, value] of answeredQuestions) {
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      prompt += `<note category="${key}">${label}: ${value}</note>\n`;
    }
    if (params.freeformNarrative) {
      prompt += `<freeform>${params.freeformNarrative}</freeform>\n`;
    }
    prompt += `</asset_manager_notes>\n\n`;
  }

  if (params.distributionStatus && params.distributionStatus !== 'none') {
    prompt += `<distribution_status>
<status>${params.distributionStatus}</status>
${params.distributionNote ? `<note>${params.distributionNote}</note>` : ''}
</distribution_status>\n\n`;
  }

  // ── Sections to generate ──
  const activeSections = params.sections.filter(s => !params.sectionsToSkip.includes(s.id));
  const skippedSections = params.sections.filter(s => params.sectionsToSkip.includes(s.id));

  prompt += `<sections_to_generate>\n`;
  for (const section of activeSections) {
    prompt += `<section id="${section.id}" title="${section.title}" visualizations="${section.visualizations}">
Refer to section_guidance id="${section.id}" in the system prompt for analysis instructions.
</section>\n\n`;
  }
  prompt += `</sections_to_generate>\n\n`;

  // Pre-skipped sections (include as not-included in response)
  if (skippedSections.length > 0) {
    prompt += `<pre_skipped_sections>
These sections were skipped due to missing data. Include them in your response with "included": false.
${skippedSections.map(s => `- ${s.id}: "${s.title}"`).join('\n')}
</pre_skipped_sections>\n\n`;
  }

  // ── Final instructions ──
  prompt += `<final_instructions>
<instruction>Use the data from <extracted_data> — do not re-read original documents.</instruction>
<instruction>Replace all {{COLOR}} tokens in chart HTML with values from <brand_colors>.</instruction>
<instruction>Return a SINGLE JSON with ALL ${params.sections.length} sections (${activeSections.length} active + ${skippedSections.length} skipped).</instruction>
<instruction>STOP AT NOI. No debt service, capex, or distributions unless the asset manager mentioned them.</instruction>
</final_instructions>`;

  return prompt;
}

// ═══════════════════════════════════════════════════════════
// SECTION REGENERATION PROMPT
// ═══════════════════════════════════════════════════════════

export function buildSectionRegeneratePrompt(params: {
  sectionId: string;
  sectionTitle: string;
  currentContent: string;
  userNotes: string;
  sectionGuidance: string;
}): string {
  return `<task>Regenerate ONLY the "${params.sectionTitle}" section based on user feedback.</task>

<current_content>
${params.currentContent}
</current_content>

<user_feedback>
${params.userNotes}
</user_feedback>

<section_guidelines>
${params.sectionGuidance}
</section_guidelines>

<output_format>
Respond with ONLY a JSON object. No markdown fences, no preamble.
{
  "id": "${params.sectionId}",
  "title": "${params.sectionTitle}",
  "content": "Updated content with any inline HTML charts/tables...",
  "metrics": [...],
  "included": true,
  "skipReason": null
}
</output_format>`;
}

// ═══════════════════════════════════════════════════════════
// BACKWARD COMPAT — Legacy single-call aliases
// These are used by the legacy pipeline (when USE_CORE_PIPELINE=false)
// ═══════════════════════════════════════════════════════════

export function buildSystemPrompt(params: {
  tier: string;
  propertyName: string;
  propertyAddress?: string;
  unitCount?: number;
  investmentStrategy?: string;
  brandColors?: { primary: string; secondary: string; accent: string };
  historicalContext?: string;
}): string {
  const colors = params.brandColors || { primary: '#27272A', secondary: '#EFF6FF', accent: '#2563EB' };

  return `<role>
You are an expert multifamily real estate analyst at a private equity firm. You write institutional-quality investor reports that are data-driven, concise, and visually compelling. Your reports are read by sophisticated investors who value precision and transparency.
</role>

<property_context>
<name>${params.propertyName}</name>
${params.propertyAddress ? `<address>${params.propertyAddress}</address>` : ''}
${params.unitCount ? `<units>${params.unitCount}</units>` : ''}
${params.investmentStrategy ? `<investment_strategy>${params.investmentStrategy}</investment_strategy>` : ''}
</property_context>

<tier_config>
<tier>${params.tier}</tier>
${params.tier === 'foundational' ? `<instructions>Concise report with 4 sections. Use KPI metric cards but NO charts or graphs. Keep narrative brief.</instructions>` : ''}
${params.tier === 'professional' ? `<instructions>Polished report with up to 10 sections. Include inline HTML/SVG charts and data tables.</instructions>` : ''}
${params.tier === 'institutional' ? `<instructions>Comprehensive institutional-grade report with up to 15 sections. Include premium HTML/SVG visualizations.</instructions>` : ''}
</tier_config>

<brand_colors>
<primary>${colors.primary}</primary>
<secondary>${colors.secondary}</secondary>
<accent>${colors.accent}</accent>
<usage_guide>
Primary (${colors.primary}): headers, chart bars, table headers, KPI card accents
Secondary (${colors.secondary}): backgrounds, alternating row colors, light fills
Accent (${colors.accent}): highlights, trend indicators, links
Success: #059669 (green). Warning: #D97706 (amber). Danger: #DC2626 (red).
Text: #1E293B (dark). Muted: #64748B. All charts: inline CSS only.
</usage_guide>
</brand_colors>

${params.historicalContext ? `<historical_data>\n${params.historicalContext}\n</historical_data>` : ''}

<critical_rules>
<rule priority="highest">STOP AT NOI. Never include debt service, loan payments, capex, distributions, or any below-the-line items unless the user explicitly provides this data.</rule>
<rule>Use exact dollar amounts and percentages from the uploaded documents.</rule>
<rule>Format: $1,234,567 | 94.5% | +3.2% or -1.5%</rule>
<rule>Never fabricate data. Missing data = "included": false.</rule>
</critical_rules>

<visualization_rules>
${params.tier === 'foundational' ? `Use KPI metric cards only — no SVG charts.` : ''}
${params.tier !== 'foundational' ? `Generate inline HTML/SVG charts in the "content" field. Charts must be self-contained with inline CSS. Use brand colors.` : ''}
</visualization_rules>

<output_format>
Respond with ONLY a JSON object. No markdown fences, no preamble.
Your response must start with { and end with }.

{
  "sections": [
    {
      "id": "section_id",
      "title": "Section Title",
      "content": "Narrative with optional inline HTML charts...",
      "metrics": [{"label": "Name", "value": "$X", "change": "+X%", "changeDirection": "up", "vsbudget": "+X%"}],
      "included": true,
      "skipReason": null
    }
  ],
  "analysis_summary": {
    "overall_sentiment": "improving|stable|declining",
    "key_findings": ["finding 1"],
    "data_quality_notes": ["any issues"]
  }
}

Generate ALL sections listed in <sections_to_generate>. Do NOT stop after the first section.
For sections with insufficient data: set "included": false with a "skipReason".
</output_format>`;
}

export function buildAnalysisPrompt(params: {
  sections: SectionDefinition[];
  selectedMonth: number;
  selectedYear: number;
  questionnaireAnswers: Record<string, string>;
  distributionStatus: string;
  distributionNote: string;
  fileContents: Record<string, string>;
}): string {
  const monthName = MONTH_NAMES[params.selectedMonth - 1];

  let prompt = `Generate the investor report for ${monthName} ${params.selectedYear}.\n\n`;

  prompt += `<uploaded_documents>\n`;
  if (params.fileContents.t12) {
    prompt += `<t12_operating_statement>\n${params.fileContents.t12}\n</t12_operating_statement>\n\n`;
  } else {
    prompt += `<t12_operating_statement>NOT PROVIDED</t12_operating_statement>\n\n`;
  }
  if (params.fileContents.rent_roll) prompt += `<rent_roll>\n${params.fileContents.rent_roll}\n</rent_roll>\n\n`;
  if (params.fileContents.leasing_activity) prompt += `<leasing_activity>\n${params.fileContents.leasing_activity}\n</leasing_activity>\n\n`;
  if (params.fileContents.budget) prompt += `<annual_budget>\n${params.fileContents.budget}\n</annual_budget>\n\n`;
  const additionalKeys = Object.keys(params.fileContents).filter(k => !['t12', 'rent_roll', 'leasing_activity', 'budget'].includes(k));
  for (const key of additionalKeys) {
    prompt += `<additional_document type="${key}">\n${params.fileContents[key]}\n</additional_document>\n\n`;
  }
  prompt += `</uploaded_documents>\n\n`;

  const answeredQuestions = Object.entries(params.questionnaireAnswers).filter(([_, v]) => v?.trim());
  if (answeredQuestions.length > 0) {
    prompt += `<asset_manager_notes>\n`;
    for (const [key, value] of answeredQuestions) {
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      prompt += `<note category="${key}">${label}: ${value}</note>\n`;
    }
    prompt += `</asset_manager_notes>\n\n`;
  }

  if (params.distributionStatus && params.distributionStatus !== 'none') {
    prompt += `<distribution_status><status>${params.distributionStatus}</status>${params.distributionNote ? `<note>${params.distributionNote}</note>` : ''}</distribution_status>\n\n`;
  }

  prompt += `<sections_to_generate>\n`;
  for (const section of params.sections) {
    prompt += `<section id="${section.id}" title="${section.title}" conditional="${section.isConditional}" visualizations="${section.visualizations}">\n${section.promptGuidance}\n</section>\n\n`;
  }
  prompt += `</sections_to_generate>\n\n`;

  prompt += `<final_instructions>
<instruction>Use the ${monthName} column from the T-12 as "current month" data.</instruction>
<instruction>Calculate variances against the prior month column and budget column if available.</instruction>
<instruction>Return a SINGLE JSON response containing ALL ${params.sections.length} sections. Do NOT stop after the first section.</instruction>
<instruction>For conditional sections with no supporting data, set "included": false with a clear "skipReason".</instruction>
<instruction>Charts and tables go in the "content" field as inline HTML. KPI metrics go in the "metrics" array.</instruction>
<instruction>STOP AT NOI. Do not calculate or reference debt service, capex, or distributions unless the asset manager explicitly provided that data.</instruction>
<instruction>Your response must be a complete JSON object with a "sections" array containing exactly ${params.sections.length} section objects and an "analysis_summary" object.</instruction>
</final_instructions>`;

  return prompt;
}
