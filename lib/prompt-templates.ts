// lib/prompt-templates.ts

import { SectionDefinition } from './section-definitions';

export function buildSystemPrompt(params: {
  tier: string;
  propertyName: string;
  propertyAddress?: string;
  unitCount?: number;
  investmentStrategy?: string;
  brandColors?: { primary: string; secondary: string; accent: string };
}): string {
  return `You are an expert multifamily real estate analyst writing investor reports for a private equity firm.

WRITING RULES:
1. DATA-DRIVEN — Every claim backed by specific numbers from uploaded documents
2. CONCISE — No filler, no fluff, no generic language. Every sentence adds value.
3. PROFESSIONAL — Institutional-quality writing for sophisticated investors
4. HONEST — If performance is poor, say so clearly. Investors respect transparency.
5. ACTIONABLE — Include specific insights investors can use

PROPERTY CONTEXT:
- Property: ${params.propertyName}
${params.propertyAddress ? `- Address: ${params.propertyAddress}` : ''}
${params.unitCount ? `- Units: ${params.unitCount}` : ''}
${params.investmentStrategy ? `- Investment Strategy: ${params.investmentStrategy}` : ''}

TIER: ${params.tier}
${params.tier === 'foundational' ? '- Concise, focused (4 sections max)' : ''}
${params.tier === 'professional' ? '- Detailed analysis (up to 10 sections)' : ''}
${params.tier === 'institutional' ? '- Comprehensive institutional-grade (up to 15 sections)' : ''}

RULES:
- Use exact dollar amounts and percentages from documents
- Calculate MoM changes, YTD figures, and budget variances
- If a number seems inconsistent across documents, flag it
- Never fabricate data. Say "Data not available" if missing
- Match T-12 column to selected report month
- Use industry terminology (NOI, GPR, EGI, DSCR, etc.)

OUTPUT FORMAT — Return valid JSON:
{
  "sections": [
    {
      "id": "section_id",
      "title": "Section Title",
      "content": "Narrative content as markdown...",
      "metrics": [
        {
          "label": "Net Operating Income",
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
    "data_quality_notes": ["any data issues"]
  }
}

For skipped sections: set "included": false and provide "skipReason".

METRICS: $1,234,567 (commas) | 94.5% (one decimal) | $850/unit | +3.2% or -1.5% (always show sign)`;
}

export function buildAnalysisPrompt(params: {
  sections: SectionDefinition[];
  selectedMonth: number;
  selectedYear: number;
  questionnaireAnswers: Record<string, string>;
  distributionStatus: string;
  distributionNote: string;
  fileContents: { t12?: string; rent_roll?: string; leasing_activity?: string; budget?: string };
}): string {
  const monthNames = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];
  const monthName = monthNames[params.selectedMonth - 1];

  let prompt = `Generate the investor report for ${monthName} ${params.selectedYear}.\n\nUPLOADED DOCUMENTS:\n`;

  if (params.fileContents.t12) {
    prompt += `\n--- T-12 OPERATING STATEMENT ---\n${params.fileContents.t12}\n--- END T-12 ---\n`;
  }
  if (params.fileContents.rent_roll) {
    prompt += `\n--- RENT ROLL ---\n${params.fileContents.rent_roll}\n--- END RENT ROLL ---\n`;
  }
  if (params.fileContents.leasing_activity) {
    prompt += `\n--- LEASING ACTIVITY ---\n${params.fileContents.leasing_activity}\n--- END LEASING ACTIVITY ---\n`;
  }
  if (params.fileContents.budget) {
    prompt += `\n--- ANNUAL BUDGET ---\n${params.fileContents.budget}\n--- END BUDGET ---\n`;
  }

  const answeredQuestions = Object.entries(params.questionnaireAnswers).filter(([_, v]) => v?.trim());
  if (answeredQuestions.length > 0) {
    prompt += `\nASSET MANAGER NOTES:\n`;
    for (const [key, value] of answeredQuestions) {
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      prompt += `- ${label}: ${value}\n`;
    }
  }

  if (params.distributionStatus && params.distributionStatus !== 'none') {
    prompt += `\nDISTRIBUTION STATUS: ${params.distributionStatus}`;
    if (params.distributionNote) prompt += `\nDistribution Note: ${params.distributionNote}`;
    prompt += '\n';
  }

  prompt += `\nSECTIONS TO GENERATE:\n`;
  for (const section of params.sections) {
    prompt += `\n${section.id}: ${section.title}`;
    if (section.isConditional) prompt += ` [CONDITIONAL — skip if no material data]`;
    prompt += `\n${section.promptGuidance}\n`;
  }

  prompt += `\nIMPORTANT:
- Use the ${monthName} column from T-12 as "current month"
- Calculate variances against prior month and budget columns
- Return valid JSON matching the system prompt output format
- For conditional sections with no data, set "included": false`;

  return prompt;
}

export function buildSectionRegeneratePrompt(params: {
  sectionId: string;
  sectionTitle: string;
  currentContent: string;
  userNotes: string;
  sectionGuidance: string;
}): string {
  return `Regenerate ONLY the "${params.sectionTitle}" section.

CURRENT CONTENT:
${params.currentContent}

USER FEEDBACK:
${params.userNotes}

GUIDELINES:
${params.sectionGuidance}

Return as JSON:
{
  "id": "${params.sectionId}",
  "title": "${params.sectionTitle}",
  "content": "...",
  "metrics": [...],
  "included": true,
  "skipReason": null
}`;
}
