// lib/prompt-templates.ts

import { SectionDefinition } from './section-definitions';

export function buildSystemPrompt(params: {
  tier: string;
  propertyName: string;
  propertyAddress?: string;
  unitCount?: number;
  investmentStrategy?: string;
  brandColors?: { primary: string; secondary: string; accent: string };
  historicalContext?: string;
}): string {
  const colors = params.brandColors || {
    primary: '#27272A',
    secondary: '#EFF6FF',
    accent: '#2563EB',
  };

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
${params.tier === 'foundational' ? `<instructions>
Concise report with 4 sections. Use KPI metric cards but NO charts or graphs.
Focus on high-level numbers: occupancy, revenue, expenses, NOI.
Keep narrative brief — 2-3 paragraphs per section maximum.
</instructions>` : ''}
${params.tier === 'professional' ? `<instructions>
Polished report with up to 10 sections. Include inline HTML/SVG charts and data tables.
Balance narrative with visual data presentation. Charts should help investors scan the report quickly.
The report should be impressive enough that investors feel the value immediately.
</instructions>` : ''}
${params.tier === 'institutional' ? `<instructions>
Comprehensive institutional-grade report with up to 15 sections. Include premium HTML/SVG visualizations.
Think CBRE/JLL investor memo quality. Dense with data, rich with visualizations, but every word earns its place.
Multiple chart types: bar charts, waterfall charts, comparison tables, risk matrices, progress trackers.
</instructions>` : ''}
</tier_config>

<brand_colors>
<primary>${colors.primary}</primary>
<secondary>${colors.secondary}</secondary>
<accent>${colors.accent}</accent>
<usage_guide>
When generating HTML charts, tables, or KPI cards, use these colors:
- Primary (${colors.primary}): headers, chart bars, table headers, KPI card accents
- Secondary (${colors.secondary}): backgrounds, alternating row colors, light fills
- Accent (${colors.accent}): highlights, trend indicators, links, call-to-action elements
- Success: #059669 (green) for positive variances
- Warning: #D97706 (amber) for caution items
- Danger: #DC2626 (red) for negative variances or high-risk items
- Text: #1E293B (dark slate) for body text, #64748B for muted text
All charts must use inline CSS styles — no external stylesheets, no JavaScript.
All HTML must be email-safe: inline styles, simple HTML tables, inline SVG only.
</usage_guide>
</brand_colors>

${params.historicalContext ? `<historical_data>
${params.historicalContext}
</historical_data>` : ''}

<critical_rules>
<rule priority="highest">STOP AT NOI. Never include debt service, loan payments, capex, distributions, or any below-the-line items in your financial analysis UNLESS the user explicitly provides this data via their questionnaire notes. The T-12 may contain these line items — ignore them.</rule>
<rule>Use exact dollar amounts and percentages from the uploaded documents. Never round unless the source is rounded.</rule>
<rule>Format numbers consistently: $1,234,567 (with commas) | 94.5% (one decimal) | $850/unit | +3.2% or -1.5% (always show sign for changes)</rule>
<rule>Calculate MoM changes, YTD figures, and budget variances from the source data.</rule>
<rule>If a number seems inconsistent across documents, flag it explicitly in the narrative.</rule>
<rule>Never fabricate data. If data is missing, say "Data not available" and set included: false for that section.</rule>
<rule>Match the T-12 column to the selected report month exactly.</rule>
<rule>Use industry terminology naturally: NOI, GPR, EGI, NER, loss-to-lease, etc.</rule>
</critical_rules>

<visualization_rules>
${params.tier === 'foundational' ? `<foundational_viz>
Use KPI metric cards only — no SVG charts.
KPI cards are returned in the "metrics" array of each section JSON.
Each metric: { "label": "...", "value": "$...", "change": "+X.X%", "changeDirection": "up|down|flat", "vsbudget": "+X.X%" }
</foundational_viz>` : ''}
${params.tier === 'professional' || params.tier === 'institutional' ? `<chart_viz>
Generate inline HTML/SVG visualizations directly in the "content" field of each section.
Charts must be self-contained HTML with inline CSS — no external dependencies.
Keep SVG charts simple: basic shapes, text labels, inline styles.
Tables should use clean HTML with brand-colored headers and alternating row backgrounds.
Every chart must have a clear title and labeled axes/columns.
Charts SHORTEN the narrative — use them to replace paragraphs of numbers, not duplicate them.
After a chart, write 1-2 sentences of insight, not a re-description of the chart data.
</chart_viz>` : ''}
</visualization_rules>

<output_format>
Return valid JSON with this exact structure:
{
  "sections": [
    {
      "id": "section_id",
      "title": "Section Title",
      "content": "Narrative content with optional inline HTML charts and tables...",
      "metrics": [
        {
          "label": "Metric Name",
          "value": "$125,000",
          "change": "+3.2%",
          "changeDirection": "up",
          "vsbudget": "+1.5%"
        }
      ],
      "included": true,
      "skipReason": null
    }
  ],
  "analysis_summary": {
    "overall_sentiment": "improving|stable|declining",
    "key_findings": ["finding 1", "finding 2"],
    "data_quality_notes": ["any data issues found"]
  }
}

For sections with insufficient data: set "included": false and provide a clear "skipReason".
The "content" field may contain raw markdown AND inline HTML (charts/tables). Both will be rendered.
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
  const monthNames = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];
  const monthName = monthNames[params.selectedMonth - 1];

  let prompt = `Generate the investor report for ${monthName} ${params.selectedYear}.\n\n`;

  // ── Document context ──
  prompt += `<uploaded_documents>\n`;

  if (params.fileContents.t12) {
    prompt += `<t12_operating_statement>\n${params.fileContents.t12}\n</t12_operating_statement>\n\n`;
  } else {
    prompt += `<t12_operating_statement>NOT PROVIDED — skip any sections requiring T-12 data</t12_operating_statement>\n\n`;
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

  // Additional files
  const additionalKeys = Object.keys(params.fileContents).filter(
    k => !['t12', 'rent_roll', 'leasing_activity', 'budget'].includes(k)
  );
  for (const key of additionalKeys) {
    prompt += `<additional_document type="${key}">\n${params.fileContents[key]}\n</additional_document>\n\n`;
  }

  prompt += `</uploaded_documents>\n\n`;

  // ── Asset manager questionnaire ──
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
    prompt += `<distribution_status>
<status>${params.distributionStatus}</status>
${params.distributionNote ? `<note>${params.distributionNote}</note>` : ''}
</distribution_status>\n\n`;
  }

  // ── Sections to generate ──
  prompt += `<sections_to_generate>\n`;
  for (const section of params.sections) {
    prompt += `<section id="${section.id}" title="${section.title}" conditional="${section.isConditional}" visualizations="${section.visualizations}">
${section.promptGuidance}
</section>\n\n`;
  }
  prompt += `</sections_to_generate>\n\n`;

  // ── Final instructions ──
  prompt += `<final_instructions>
<instruction>Use the ${monthName} column from the T-12 as "current month" data.</instruction>
<instruction>Calculate variances against the prior month column and budget column if available.</instruction>
<instruction>Return valid JSON matching the output format specified in the system prompt.</instruction>
<instruction>For conditional sections with no supporting data, set "included": false with a clear "skipReason".</instruction>
<instruction>Charts and tables go in the "content" field as inline HTML. KPI metrics go in the "metrics" array.</instruction>
<instruction>STOP AT NOI. Do not calculate or reference debt service, capex, or distributions unless the asset manager explicitly provided that data in their notes.</instruction>
</final_instructions>`;

  return prompt;
}

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
Return as JSON:
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