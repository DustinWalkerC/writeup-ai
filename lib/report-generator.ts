// report-generator.ts

import { supabaseAdmin as supabase } from './supabase';
import { parseUploadedFile, validateT12Month } from './file-parser';
import {
  buildSystemPrompt,
  buildAnalysisPrompt,
  buildExtractionSystemPrompt,
  buildExtractionUserPrompt,
  buildNarrativeSystemPrompt,
  buildNarrativeUserPrompt,
  buildUserPreferencesBlock,
  type AIPreferences,
} from './prompt-templates';
import { getSectionsForTier, ALL_SECTIONS, TIER_SECTIONS, SectionId } from './section-definitions';
import { generateReport, generateReportStream } from './claude';
import { resolveBrandColors } from './chart-templates/index';
import { validateExtractedData, getSkipReason } from './data-validator';
import type { ExtractedFinancialData } from './extraction-schema';
import { getModelConfig, getLegacyMaxTokens } from './generation-config';

import { validateReport, applyCorrections, type ValidatorResult } from './math-validator';
import { buildRegistryFromExtraction, type SourceDataRegistry } from './source-data-registry';
import { SERVER_DEV_FLAGS } from './dev-config';
import { SECTION_STATUS_MAP } from './progress-engine';

// ── Phase 5: Chart template filler ──
import {
  fillChartTemplate,
  type BrandColors,
  type ChartTemplateData,
} from './chart-template-filler';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

/**
 * Writes live generation progress to the reports table.
 * Non-critical — failures should not break report generation.
 */
async function writeGenerationProgress(reportId: string, progress: number, statusText: string) {
  try {
    await supabase
      .from('reports')
      .update({
        generation_progress: progress,
        generation_status_text: statusText,
      })
      .eq('id', reportId);
  } catch (err) {
    // Non-critical — don't break generation for a progress write failure
    console.warn('[CORE] Progress write failed:', err);
  }
}

/**
 * Get sections for a user — checks user_settings.report_template first,
 * falls back to tier defaults if not configured.
 */
async function getSectionsForUser(userId: string, tier: string) {
  try {
    const { data: settings } = await supabase
      .from('user_settings')
      .select('report_template')
      .eq('user_id', userId)
      .single();

    if (settings?.report_template && Array.isArray(settings.report_template) && settings.report_template.length > 0) {
      // Validate that all section IDs exist and are within the user's tier
      const tierSections = new Set(getAllAvailableSectionsForTier(tier));
      const validIds = (settings.report_template as string[]).filter(
        (id) => ALL_SECTIONS[id as SectionId] && tierSections.has(id as SectionId)
      ) as SectionId[];

      if (validIds.length > 0) {
        return validIds.map((id) => ALL_SECTIONS[id]);
      }
    }
  } catch {
    // Fall through to defaults
  }

  // Fallback: tier defaults
  return getSectionsForTier(tier);
}

/**
 * Get all section IDs available for a tier (including lower tiers).
 * Used for validation — ensures users can't enable sections above their tier.
 */
function getAllAvailableSectionsForTier(tier: string): SectionId[] {
  const tiers: string[] = ['foundational'];
  if (tier === 'professional' || tier === 'institutional') tiers.push('professional');
  if (tier === 'institutional') tiers.push('institutional');

  const seen = new Set<SectionId>();
  const result: SectionId[] = [];
  for (const t of tiers) {
    for (const id of TIER_SECTIONS[t] || []) {
      if (!seen.has(id)) {
        seen.add(id);
        result.push(id);
      }
    }
  }
  return result;
}

// ═══════════════════════════════════════════════════════════
// Feature flag — set USE_CORE_PIPELINE=true in .env.local to enable
// ═══════════════════════════════════════════════════════════
const USE_CORE_PIPELINE = process.env.USE_CORE_PIPELINE === 'true';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

export interface ReportGenerationInput {
  reportId: string;
  propertyId: string;
  userId: string;
  selectedMonth: number;
  selectedYear: number;
  tier: string;
  distributionStatus: string;
  distributionNote: string;
  questionnaireAnswers: Record<string, string>;
}

export type ChartType =
  | 'waterfall'
  | 'horizontal_bar'
  | 'vertical_bar'
  | 'comparison_table'
  | 'metric_cards'
  // Phase 5 chart types (matching chart-template-filler.ts)
  | 'report_header'
  | 'budget_variance_table'
  | 'revenue_waterfall'
  | 'expense_horizontal_bars'
  | 'occupancy_gauge'
  | 'noi_trend_bars'
  | 'rent_roll_table'
  | 'risk_cards'
  | 'move_in_out_bars';

export interface GeneratedSection {
  id: string;
  title: string;
  content: string;
  chart_html?: string;

  // Phase 5: chart_data schema
  chart_data?: {
    chart_type: ChartType | string;
    title?: string;
    subtitle?: string;
    data: any;
  } | null;

  metrics: Array<{
    label: string;
    value: string;
    change?: string;
    changeDirection?: 'up' | 'down' | 'flat';
    vsbudget?: string;
  }>;
  calculations?: Array<{
    metric_name: string;
    inputs: Record<string, number>;
    formula: string;
    ai_result: number;
  }>;
  included: boolean;
  skipReason: string | null;
}

export interface ReportGenerationResult {
  success: boolean;
  sections: GeneratedSection[];
  analysisSummary: { overall_sentiment: string; key_findings: string[]; data_quality_notes: string[] };
  usage: { inputTokens: number; outputTokens: number };
  error?: string;
}

type ClaudeParsed = {
  sections: GeneratedSection[];
  analysisSummary: { overall_sentiment: string; key_findings: string[]; data_quality_notes: string[] };
};

// ═══════════════════════════════════════════════════════════
// Phase 5: Chart Template Filling
// Takes chart_data from Claude's output and fills chart_html
// using the same templates from standard.ts
// ═══════════════════════════════════════════════════════════

/**
 * Process an array of generated sections: for each section that has
 * chart_data but no chart_html, fill chart_html using the template filler.
 *
 * This produces the EXACT same HTML that Claude used to generate,
 * but deterministically from structured data — no token cost for the HTML.
 *
 * Mutates the sections array in-place and returns it.
 */
function fillSectionChartTemplates(
  sections: GeneratedSection[],
  brandColors?: { primary: string; secondary: string; accent: string }
): GeneratedSection[] {
  const colors: Partial<BrandColors> = brandColors
    ? {
        primary: brandColors.primary,
        secondary: brandColors.secondary,
        accent: brandColors.accent,
      }
    : undefined as any;

  for (const section of sections) {
    // Skip if section already has chart_html (backward compat with legacy pipeline)
    if (section.chart_html && section.chart_html.trim().length > 0) {
      continue;
    }

    // If chart_data exists, fill chart_html from it
    if (section.chart_data && section.chart_data.chart_type) {
      try {
        const filledHtml = fillChartTemplate(
          section.chart_data as ChartTemplateData,
          colors
        );
        if (filledHtml) {
          section.chart_html = filledHtml;
        }
      } catch (err) {
        console.warn(
          `[Phase5] Failed to fill chart template for section "${section.id}" (chart_type: ${section.chart_data.chart_type}):`,
          err
        );
        // Leave chart_html empty — viewer will try chart_data → renderChart() fallback
      }
    }
  }

  return sections;
}

/**
 * Validate chart_data structure. Returns true if the chart_data
 * has the minimum required fields for its chart_type.
 */
function validateChartData(chartData: any): boolean {
  if (!chartData || typeof chartData !== 'object') return false;
  if (!chartData.chart_type || typeof chartData.chart_type !== 'string') return false;
  if (!chartData.data && chartData.chart_type !== 'report_header') return false;
  return true;
}

// ═══════════════════════════════════════════════════════════
// JSON Parsing (shared by both pipelines)
// ═══════════════════════════════════════════════════════════

/**
 * Robust JSON parser for Claude's report output.
 * Handles: valid JSON, code-fenced JSON, truncated JSON, raw text fallback.
 * NOTE: No prefill assumption — works with Opus 4.6 and all models.
 */
function parseGeneratedJSON(fullText: string): ClaudeParsed {
  let jsonContent = fullText.trim();

  // Strip markdown fences
  const fenceMatch = jsonContent.match(/```(?:json)?\s*\n?([\s\S]+?)```/);
  if (fenceMatch) {
    jsonContent = fenceMatch[1].trim();
  }

  // Find JSON object
  const objStart = jsonContent.indexOf('{');
  if (objStart >= 0) {
    jsonContent = jsonContent.slice(objStart);
  }

  const defaultAnalysis = {
    overall_sentiment: 'unknown',
    key_findings: [] as string[],
    data_quality_notes: [] as string[],
  };

  // Try clean parse
  try {
    const parsed = JSON.parse(jsonContent);
    const sectionsRaw = Array.isArray(parsed.sections) ? parsed.sections : [];
    const analysisSummary = parsed.analysis_summary || parsed.analysisSummary || defaultAnalysis;

    const sections: GeneratedSection[] = sectionsRaw.map((s: any) => {
      // Parse chart_data — validate structure
      const cd = s?.chart_data ?? null;
      let chart_data: GeneratedSection['chart_data'] = null;
      if (cd && typeof cd === 'object' && validateChartData(cd)) {
        chart_data = {
          chart_type: cd.chart_type as ChartType,
          title: typeof cd.title === 'string' ? cd.title : undefined,
          subtitle: typeof cd.subtitle === 'string' ? cd.subtitle : undefined,
          data: cd.data,
        };
      }

      return {
        id: s.id,
        title: s.title,
        content: s.content ?? '',
        chart_html: typeof s.chart_html === 'string' ? s.chart_html : '',
        chart_data,
        metrics: Array.isArray(s.metrics) ? s.metrics : [],
        calculations: Array.isArray(s.calculations) ? s.calculations : [],
        included: s.included !== false,
        skipReason: s.skipReason ?? null,
      };
    });

    if (sections.length > 0 || parsed.analysis_summary || parsed.analysisSummary) {
      return {
        sections,
        analysisSummary: {
          overall_sentiment: analysisSummary.overall_sentiment || 'unknown',
          key_findings: Array.isArray(analysisSummary.key_findings) ? analysisSummary.key_findings : [],
          data_quality_notes: Array.isArray(analysisSummary.data_quality_notes) ? analysisSummary.data_quality_notes : [],
        },
      };
    }
  } catch {
    // likely truncated — try regex recovery
  }

  // Regex recovery for truncated JSON
  try {
    const sections: GeneratedSection[] = [];

    const sectionRegex =
      /\{\s*"id"\s*:\s*"([^"]+)"\s*,\s*"title"\s*:\s*"([^"]+)"\s*,\s*"content"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,\s*(?:"chart_html"\s*:\s*"(?:[^"\\]|\\.)*"\s*,\s*)?(?:"chart_data"\s*:\s*(\{[\s\S]*?\}|null)\s*,\s*)?"metrics"\s*:\s*(\[[\s\S]*?\])\s*,\s*"included"\s*:\s*(true|false)\s*,\s*"skipReason"\s*:\s*(null|"[^"]*")\s*\}/g;

    let match: RegExpExecArray | null;
    while ((match = sectionRegex.exec(jsonContent)) !== null) {
      const chartDataStr = match[4];

      let chart_data: GeneratedSection['chart_data'] = null;
      if (chartDataStr && chartDataStr !== 'null') {
        try {
          const cd = JSON.parse(chartDataStr);
          if (validateChartData(cd)) {
            chart_data = {
              chart_type: cd.chart_type as ChartType,
              title: typeof cd.title === 'string' ? cd.title : undefined,
              subtitle: typeof cd.subtitle === 'string' ? cd.subtitle : undefined,
              data: cd.data,
            };
          }
        } catch {
          chart_data = null;
        }
      }

      try {
        const parsed = JSON.parse(match[0]);
        const pcd = parsed.chart_data;
        sections.push({
          ...parsed,
          chart_html: typeof parsed.chart_html === 'string' ? parsed.chart_html : '',
          chart_data:
            pcd && typeof pcd === 'object' && validateChartData(pcd)
              ? {
                  chart_type: pcd.chart_type as ChartType,
                  title: typeof pcd.title === 'string' ? pcd.title : undefined,
                  subtitle: typeof pcd.subtitle === 'string' ? pcd.subtitle : undefined,
                  data: pcd.data,
                }
              : chart_data,
          calculations: Array.isArray(parsed.calculations) ? parsed.calculations : [],
        });
      } catch {
        sections.push({
          id: match[1],
          title: match[2],
          content: match[3].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\'),
          chart_html: '',
          chart_data,
          metrics: tryParseArray(match[5]),
          calculations: [],
          included: match[6] === 'true',
          skipReason: match[7] === 'null' ? null : match[7].replace(/^"|"$/g, ''),
        });
      }
    }

    if (sections.length > 0) {
      return {
        sections,
        analysisSummary: {
          ...defaultAnalysis,
          data_quality_notes: ['Response JSON was truncated — recovered sections from partial output'],
        },
      };
    }
  } catch {
    // ignore
  }

  // Last resort: wrap raw text as a single section
  return {
    sections: [
      {
        id: 'executive_summary',
        title: 'Report',
        content: fullText,
        chart_html: '',
        chart_data: null,
        metrics: [],
        included: true,
        skipReason: null,
      },
    ],
    analysisSummary: {
      ...defaultAnalysis,
      data_quality_notes: ['Response was not valid JSON — raw content preserved'],
    },
  };
}

function tryParseArray(str: string): GeneratedSection['metrics'] {
  try {
    return JSON.parse(str) || [];
  } catch {
    return [];
  }
}

function parseRegeneratedSection(resultText: string, fallback: GeneratedSection): GeneratedSection {
  let jsonStr = resultText.trim();
  const m = jsonStr.match(/```(?:json)?\s*\n?([\s\S]+?)```/);
  if (m) jsonStr = m[1].trim();

  const start = jsonStr.indexOf('{');
  if (start >= 0) jsonStr = jsonStr.slice(start);

  try {
    const obj = JSON.parse(jsonStr);
    if (obj && obj.id && obj.title) {
      const cd = obj.chart_data ?? null;
      let chart_data: GeneratedSection['chart_data'] = null;
      if (cd && typeof cd === 'object' && validateChartData(cd)) {
        chart_data = {
          chart_type: cd.chart_type as ChartType,
          title: typeof cd.title === 'string' ? cd.title : undefined,
          subtitle: typeof cd.subtitle === 'string' ? cd.subtitle : undefined,
          data: cd.data,
        };
      }

      return {
        id: obj.id,
        title: obj.title,
        content: obj.content || '',
        chart_html: typeof obj.chart_html === 'string' ? obj.chart_html : '',
        chart_data,
        metrics: Array.isArray(obj.metrics) ? obj.metrics : [],
        included: obj.included !== false,
        skipReason: obj.skipReason ?? null,
      };
    }
  } catch {
    /* fallthrough */
  }

  return { ...fallback, content: resultText };
}

// ═══════════════════════════════════════════════════════════
// File fetching (shared)
// ═══════════════════════════════════════════════════════════

async function fetchAndParseFiles(reportId: string, propertyId: string, _userId: string) {
  const fileContents: Record<string, string> = {};

  const { data: reportFiles } = await supabase.from('report_files').select('*').eq('report_id', reportId);

  if (reportFiles) {
    for (const file of reportFiles) {
      const { data: fileData } = await supabase.storage.from('report-files').download(file.storage_path);
      if (fileData) {
        const buffer = Buffer.from(await fileData.arrayBuffer());
        const parsed = await parseUploadedFile(buffer, file.file_name, '');
        if (parsed.success) fileContents[file.file_type] = parsed.content;
      }
    }
  }

  // Budget from property
  if (!fileContents.budget) {
    const { data: property } = await supabase
      .from('properties')
      .select('budget_file_path, budget_file_name')
      .eq('id', propertyId)
      .single();

    if (property?.budget_file_path) {
      const { data: budgetData } = await supabase.storage.from('report-files').download(property.budget_file_path);
      if (budgetData) {
        const buffer = Buffer.from(await budgetData.arrayBuffer());
        const parsed = await parseUploadedFile(buffer, property.budget_file_name || 'budget.xlsx', '');
        if (parsed.success) fileContents.budget = parsed.content;
      }
    }
  }

  return fileContents;
}

// ═══════════════════════════════════════════════════════════
// CORE Pipeline — Two-Call Generation
// ═══════════════════════════════════════════════════════════

async function generateWithCORE(input: ReportGenerationInput): Promise<ReadableStream<Uint8Array>> {
  // ── 1. Fetch files + property + settings ──
  const fileContents = await fetchAndParseFiles(input.reportId, input.propertyId, input.userId);
  const { data: property } = await supabase.from('properties').select('*').eq('id', input.propertyId).single();
  const { data: settings } = await supabase.from('user_settings').select('*').eq('user_id', input.userId).single();

  const sections = await getSectionsForUser(input.userId, input.tier);
  const brandColors = resolveBrandColors(settings || {});

  // ── 2. T-12 validation ──
  if (fileContents.t12) {
    const validation = validateT12Month(fileContents.t12, input.selectedMonth, input.selectedYear);
    if (!validation.valid) {
      throw new Error(validation.message);
    }
  }

  // ── 3. Call 1 — Data Extraction (non-streaming) ──
  const extractionConfig = getModelConfig(input.tier, 'extraction');

  const extractionSystemPrompt = buildExtractionSystemPrompt({
    propertyName: property?.name || 'Unknown Property',
    propertyAddress: property?.address,
    unitCount: property?.units,
    selectedMonth: input.selectedMonth,
    selectedYear: input.selectedYear,
  });

  const extractionUserPrompt = buildExtractionUserPrompt({
    fileContents,
    selectedMonth: input.selectedMonth,
    selectedYear: input.selectedYear,
  });

  const extractionResult = await generateReport({
    systemPrompt: extractionSystemPrompt,
    userPrompt: extractionUserPrompt,
    maxTokens: extractionConfig.maxTokens,
    model: extractionConfig.model,
    temperature: extractionConfig.temperature,
  });

  // Parse extraction response
  let extractedData: ExtractedFinancialData;
  try {
    let jsonStr = extractionResult.content.trim();
    const fenceMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]+?)```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();
    const objStart = jsonStr.indexOf('{');
    if (objStart >= 0) jsonStr = jsonStr.slice(objStart);
    extractedData = JSON.parse(jsonStr);
  } catch {
    throw new Error(
      'Failed to parse extraction response. The AI could not extract structured data from the uploaded documents.'
    );
  }

  // ── 4. Validate extracted data ──
  const validationResult = validateExtractedData(extractedData, sections);

  if (!validationResult.valid) {
    throw new Error(`Data validation failed: ${validationResult.errors.join('; ')}`);
  }

  // ── 5. Build historical context ──
  let historicalContext: string | undefined;
  const priorMonth = input.selectedMonth === 1 ? 12 : input.selectedMonth - 1;
  const priorYear = input.selectedMonth === 1 ? input.selectedYear - 1 : input.selectedYear;
  const { data: priorReport } = await supabase
    .from('reports')
    .select('generated_sections')
    .eq('property_id', input.propertyId)
    .eq('selected_month', priorMonth)
    .eq('selected_year', priorYear)
    .eq('status', 'complete')
    .single();

  if (priorReport?.generated_sections) {
    const priorSections = priorReport.generated_sections as Array<{
      id: string;
      title: string;
      metrics?: Array<{ label: string; value: string }>;
    }>;
    const priorMetrics = priorSections
      .filter((s) => s.metrics && s.metrics.length > 0)
      .flatMap((s) => s.metrics!.map((m) => `${m.label}: ${m.value}`));
    if (priorMetrics.length > 0) {
      historicalContext = `Prior month (${priorMonth}/${priorYear}) key metrics:\n${priorMetrics.join('\n')}`;
    }
  }

  // ── 6. Call 2 — Narrative + Chart Assembly (streaming) ──
  const narrativeConfig = getModelConfig(input.tier, 'narrative');

  // Parse AI preferences from user settings
  const aiPreferences: AIPreferences | null = settings?.ai_preferences
    ? (settings.ai_preferences as AIPreferences)
    : null;

  // Build budget summary from extracted data (if budget was found)
  const rawExtracted = extractedData as unknown as Record<string, unknown>;
  const rawNoi = rawExtracted.noi as Record<string, number | null> | undefined;
  const rawIncome = rawExtracted.income as Record<string, Record<string, number | null>> | undefined;
  const rawExpenses = rawExtracted.expenses as Record<string, unknown> | undefined;
  const rawExpTotal = rawExpenses?.total_expenses as Record<string, number | null> | undefined;

  const budgetSummary = rawNoi?.budget != null ? {
    budget_month: `${MONTH_NAMES[input.selectedMonth - 1]} ${input.selectedYear}`,
    budget_total_revenue: rawIncome?.total_revenue?.budget ?? undefined,
    budget_total_expenses: rawExpTotal?.budget ?? undefined,
    budget_noi: rawNoi.budget ?? undefined,
  } : null;

  const narrativeSystemPrompt = buildNarrativeSystemPrompt({
    tier: input.tier,
    propertyName: property?.name || 'Unknown Property',
    propertyAddress: property?.address,
    unitCount: property?.units,
    investmentStrategy: property?.investment_strategy,
    historicalContext,
    companyName: settings?.company_name || undefined,
    logoUrl: settings?.company_logo_url || undefined,
    sections,
    // Phase 1 additions
    aiPreferences,
    brandColors: {
      primary: brandColors.primary,
      secondary: brandColors.secondary,
      accent: brandColors.accent,
    },
    budgetSummary,
  });

  // Get freeform narrative from report
  const { data: reportData } = await supabase
    .from('reports')
    .select('freeform_narrative')
    .eq('id', input.reportId)
    .single();

  const narrativeUserPrompt = buildNarrativeUserPrompt({
    extractedDataJson: JSON.stringify(validationResult.corrected, null, 2),
    sections,
    sectionsToSkip: validationResult.sectionsToSkip,
    selectedMonth: input.selectedMonth,
    selectedYear: input.selectedYear,
    questionnaireAnswers: input.questionnaireAnswers,
    distributionStatus: input.distributionStatus,
    distributionNote: input.distributionNote,
    freeformNarrative: reportData?.freeform_narrative || undefined,
    brandColors: {
      primary: brandColors.primary,
      secondary: brandColors.secondary,
      accent: brandColors.accent,
    },
  });

  // Store extraction data and validation warnings for debugging
  await supabase
    .from('reports')
    .update({
      raw_analysis: {
        extraction: validationResult.corrected,
        validation_warnings: validationResult.warnings,
        sections_skipped: validationResult.sectionsToSkip,
        pipeline: 'CORE',
        extraction_model: extractionConfig.model,
        narrative_model: narrativeConfig.model,
        extraction_tokens: extractionResult.usage,
      },
    })
    .eq('id', input.reportId);

  // ── 7. Stream narrative, then validate + save on completion ──
  const rawStream = await generateReportStream({
    systemPrompt: narrativeSystemPrompt,
    userPrompt: narrativeUserPrompt,
    maxTokens: narrativeConfig.maxTokens,
    model: narrativeConfig.model,
    temperature: narrativeConfig.temperature,
  });

  // Build Source Data Registry for validation
  const monthName = MONTH_NAMES[input.selectedMonth - 1];
  const sourceRegistry: SourceDataRegistry | null = (() => {
    try {
      return buildRegistryFromExtraction(
        extractedData as unknown as Record<string, unknown>,
        property?.name || 'Unknown Property',
        `${monthName} ${input.selectedYear}`,
        property?.units || null
      );
    } catch (err) {
      console.warn('[CORE] Failed to build source registry for validation:', err);
      return null;
    }
  })();

  // Store the registry on the report for future reference
  if (sourceRegistry) {
    await supabase
      .from('reports')
      .update({ extracted_data: sourceRegistry })
      .eq('id', input.reportId);
  }

  // Wrap the stream: pass through all chunks, but also collect the full text
  // for post-generation validation + Phase 5 chart template filling
  let fullText = '';
  const decoder = new TextDecoder();

  // Pass brandColors to post-generation processing for Phase 5
  const reportBrandColors = {
    primary: brandColors.primary,
    secondary: brandColors.secondary,
    accent: brandColors.accent,
  };

  const validatingStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = rawStream.getReader();
      const reportId = input.reportId;
      const maxTokens = narrativeConfig.maxTokens;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Pass through to client
          controller.enqueue(value);

          // Collect for validation
          fullText += decoder.decode(value, { stream: true });

          // After collecting text, estimate progress and write to DB
          const estimatedProgress = 5 + (fullText.length / (maxTokens * 4)) * 85;
          const sectionMatch = fullText.match(/"id"\s*:\s*"([a-z_]+)"/g);
          const lastSection = sectionMatch?.[sectionMatch.length - 1]?.match(/"id"\s*:\s*"([a-z_]+)"/)?.[1];
          const statusText = lastSection
            ? SECTION_STATUS_MAP[lastSection] || `Generating: ${lastSection}...`
            : 'Generating report sections...';

          writeGenerationProgress(reportId, Math.min(estimatedProgress, 90), statusText);
        }

        // Stream complete — run validation + chart filling in background
        runPostGenerationValidation(reportId, fullText, sourceRegistry, input.tier, reportBrandColors)
          .catch(err => console.error('[CORE] Post-generation validation error:', err));

        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return validatingStream;
}

// ═══════════════════════════════════════════════════════════
// Post-Generation Validation + Phase 5 Chart Filling
// (runs after stream completes)
// ═══════════════════════════════════════════════════════════

async function runPostGenerationValidation(
  reportId: string,
  fullStreamText: string,
  registry: SourceDataRegistry | null,
  tier: string,
  brandColors?: { primary: string; secondary: string; accent: string }
): Promise<void> {
  try {
    // Parse the streamed response to extract sections
    let narrativeText = '';
    const lines = fullStreamText.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const event = JSON.parse(line.slice(6));
          if (event.type === 'text') {
            narrativeText += event.text;
          }
        } catch {
          // Not valid JSON event line — skip
        }
      }
    }

    // If we couldn't parse SSE events, try treating the whole text as the response
    if (!narrativeText) {
      narrativeText = fullStreamText;
    }

    // ── Phase 5: Parse full sections (not just for validation) ──
    const fullParsed = parseGeneratedJSONFull(narrativeText);
    if (!fullParsed || fullParsed.length === 0) {
      console.warn('[CORE] Could not parse sections for post-generation processing');
      return;
    }

    // ── Phase 5: Fill chart templates from chart_data ──
    if (brandColors) {
      fillSectionChartTemplates(fullParsed, brandColors);
      console.log(`[Phase5] Chart templates filled for ${fullParsed.filter(s => s.chart_html && s.chart_html.length > 0).length} sections`);
    }

    // ── Math Validation ──
    let validationLog: any = null;

    if (!SERVER_DEV_FLAGS.skipValidation) {
      const validationSections = fullParsed.map(s => ({
        id: s.id,
        calculations: s.calculations,
        metrics: s.metrics,
      }));

      const validationResult: ValidatorResult = validateReport(validationSections, registry);
      applyCorrections(validationSections, validationResult.log.details);

      // Merge corrections back into fullParsed
      for (const [sectionId, corrections] of validationResult.corrections) {
        const section = fullParsed.find(s => s.id === sectionId);
        if (!section) continue;
        const calcs = (section.calculations || []) as Array<{
          metric_name: string;
          ai_result: number;
          inputs: Record<string, number>;
        }>;
        for (const correction of corrections) {
          const calc = calcs.find(c => c.metric_name === correction.metric_name);
          if (calc) {
            calc.ai_result = correction.corrected_value;
          }
        }
      }

      validationLog = validationResult.log;

      if (SERVER_DEV_FLAGS.logValidation) {
        console.log('[CORE] Validation complete:', {
          total: validationResult.log.total_calculations,
          passed: validationResult.log.passed,
          overridden: validationResult.log.overridden,
          materialOverrides: validationResult.log.material_overrides,
          sectionsToRegen: validationResult.sectionsToRegenerate,
        });
      }

      if (validationResult.sectionsToRegenerate.length > 0) {
        console.warn(
          `[CORE] Material overrides detected in sections: ${validationResult.sectionsToRegenerate.join(', ')}. ` +
          `Consider re-generating these sections with corrected values.`
        );
      }
    }

    // ── Save updated sections + validation log to DB ──
    const updateData: Record<string, unknown> = {
      generated_sections: fullParsed,
    };
    if (validationLog) {
      updateData.validation_log = validationLog;
    }

    await supabase
      .from('reports')
      .update(updateData)
      .eq('id', reportId);

  } catch (err) {
    console.error('[CORE] Post-generation processing error:', err);
    // Post-processing failure should never block report delivery
  }
}

/**
 * Full section parser for post-generation processing.
 * Returns complete GeneratedSection objects (not just validation fields).
 */
function parseGeneratedJSONFull(text: string): GeneratedSection[] | null {
  try {
    let jsonStr = text.trim();
    const fenceMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]+?)```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();
    const objStart = jsonStr.indexOf('{');
    if (objStart >= 0) jsonStr = jsonStr.slice(objStart);

    const parsed = JSON.parse(jsonStr);
    if (parsed.sections && Array.isArray(parsed.sections)) {
      return parsed.sections.map((s: any) => {
        const cd = s?.chart_data ?? null;
        let chart_data: GeneratedSection['chart_data'] = null;
        if (cd && typeof cd === 'object' && validateChartData(cd)) {
          chart_data = {
            chart_type: cd.chart_type as ChartType,
            title: typeof cd.title === 'string' ? cd.title : undefined,
            subtitle: typeof cd.subtitle === 'string' ? cd.subtitle : undefined,
            data: cd.data,
          };
        }

        return {
          id: s.id,
          title: s.title,
          content: s.content ?? '',
          chart_html: typeof s.chart_html === 'string' ? s.chart_html : '',
          chart_data,
          metrics: Array.isArray(s.metrics) ? s.metrics : [],
          calculations: Array.isArray(s.calculations) ? s.calculations : [],
          included: s.included !== false,
          skipReason: s.skipReason ?? null,
        };
      });
    }
  } catch {
    // Can't parse — return null
  }
  return null;
}

/**
 * Simplified parser for validation — extracts sections with calculations.
 * KEPT for backward compat but parseGeneratedJSONFull is now preferred.
 */
function parseGeneratedJSONForValidation(
  text: string
): Array<{
  id: string;
  calculations?: Array<{ metric_name: string; inputs: Record<string, number>; formula: string; ai_result: number }>;
  metrics: Array<{ label: string; value: string; change?: string }>;
}> | null {
  return parseGeneratedJSONFull(text);
}

// ═══════════════════════════════════════════════════════════
// Legacy Pipeline — Single-Call (existing behavior)
// ═══════════════════════════════════════════════════════════

async function buildLegacyPrompts(input: ReportGenerationInput, fileContents: Record<string, string>) {
  const { data: property } = await supabase.from('properties').select('*').eq('id', input.propertyId).single();
  const { data: settings } = await supabase.from('user_settings').select('*').eq('user_id', input.userId).single();

  let historicalContext: string | undefined;
  const priorMonth = input.selectedMonth === 1 ? 12 : input.selectedMonth - 1;
  const priorYear = input.selectedMonth === 1 ? input.selectedYear - 1 : input.selectedYear;
  const { data: priorReport } = await supabase
    .from('reports')
    .select('generated_sections, financial_data')
    .eq('property_id', input.propertyId)
    .eq('selected_month', priorMonth)
    .eq('selected_year', priorYear)
    .eq('status', 'complete')
    .single();

  if (priorReport?.generated_sections) {
    const priorSections = priorReport.generated_sections as Array<{
      id: string;
      title: string;
      metrics?: Array<{ label: string; value: string }>;
    }>;
    const priorMetrics = priorSections
      .filter((s) => s.metrics && s.metrics.length > 0)
      .flatMap((s) => s.metrics!.map((m) => `${m.label}: ${m.value}`));
    if (priorMetrics.length > 0) {
      historicalContext = `Prior month (${priorMonth}/${priorYear}) key metrics:\n${priorMetrics.join('\n')}`;
    }
  }

  // Build the system prompt as before
  let systemPrompt = buildSystemPrompt({
    tier: input.tier,
    propertyName: property?.name || 'Unknown Property',
    propertyAddress: property?.address,
    unitCount: property?.units,
    investmentStrategy: property?.investment_strategy,
    historicalContext,
    brandColors: settings
      ? {
          primary: settings.accent_color || '#27272A',
          secondary: settings.secondary_color || '#EFF6FF',
          accent: settings.report_accent_color || settings.accent_color || '#2563EB',
        }
      : undefined,
  });

  // Inject user preferences block AFTER the tier block (appended to system prompt)
  const preferencesBlock = buildUserPreferencesBlock((settings?.ai_preferences as Record<string, unknown>) || {});
  systemPrompt += '\n' + preferencesBlock;

  const sections = await getSectionsForUser(input.userId, input.tier);

  const userPrompt = buildAnalysisPrompt({
    sections,
    selectedMonth: input.selectedMonth,
    selectedYear: input.selectedYear,
    questionnaireAnswers: input.questionnaireAnswers,
    distributionStatus: input.distributionStatus,
    distributionNote: input.distributionNote,
    fileContents,
  });

  return { systemPrompt, userPrompt, property, sections };
}

// ═══════════════════════════════════════════════════════════
// Public API — Main generation functions
// ═══════════════════════════════════════════════════════════

/** Non-streaming generation */
export async function generateFullReport(input: ReportGenerationInput): Promise<ReportGenerationResult> {
  try {
    await supabase
      .from('reports')
      .update({
        generation_status: 'generating',
        generation_started_at: new Date().toISOString(),
      })
      .eq('id', input.reportId);

    const fileContents = await fetchAndParseFiles(input.reportId, input.propertyId, input.userId);

    if (fileContents.t12) {
      const validation = validateT12Month(fileContents.t12, input.selectedMonth, input.selectedYear);
      if (!validation.valid) {
        await supabase.from('reports').update({ generation_status: 'error' }).eq('id', input.reportId);
        return {
          success: false,
          sections: [],
          analysisSummary: { overall_sentiment: '', key_findings: [], data_quality_notes: [] },
          usage: { inputTokens: 0, outputTokens: 0 },
          error: validation.message,
        };
      }
    }

    const { systemPrompt, userPrompt } = await buildLegacyPrompts(input, fileContents);
    const maxTokens = getLegacyMaxTokens(input.tier);
    const result = await generateReport({ systemPrompt, userPrompt, maxTokens });
    const parsed = parseGeneratedJSON(result.content);

    await supabase
      .from('reports')
      .update({
        status: 'complete',
        generated_sections: parsed.sections,
        raw_analysis: parsed.analysisSummary,
        generation_status: 'completed',
        generation_completed_at: new Date().toISOString(),
        generation_config: {
          tier: input.tier,
          model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929',
          pipeline: 'legacy',
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
          filesUsed: Object.keys(fileContents),
        },
      })
      .eq('id', input.reportId);

    return { success: true, sections: parsed.sections, analysisSummary: parsed.analysisSummary, usage: result.usage };
  } catch (error) {
    await supabase.from('reports').update({ generation_status: 'error' }).eq('id', input.reportId);
    return {
      success: false,
      sections: [],
      analysisSummary: { overall_sentiment: '', key_findings: [], data_quality_notes: [] },
      usage: { inputTokens: 0, outputTokens: 0 },
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/** Streaming generation — routes to CORE or legacy based on feature flag */
export async function generateFullReportStream(input: ReportGenerationInput): Promise<ReadableStream<Uint8Array>> {
  await supabase
    .from('reports')
    .update({
      generation_status: 'generating',
      generation_started_at: new Date().toISOString(),
    })
    .eq('id', input.reportId);

  if (USE_CORE_PIPELINE) {
    return generateWithCORE(input);
  }

  // Legacy path
  const fileContents = await fetchAndParseFiles(input.reportId, input.propertyId, input.userId);
  const { systemPrompt, userPrompt } = await buildLegacyPrompts(input, fileContents);
  const maxTokens = getLegacyMaxTokens(input.tier);

  return generateReportStream({ systemPrompt, userPrompt, maxTokens });
}

/** Regenerate single section */
export async function regenerateSingleSection(params: {
  reportId: string;
  sectionId: string;
  userNotes: string;
  userId: string;
}): Promise<GeneratedSection> {
  const { data: report } = await supabase.from('reports').select('*, properties(*)').eq('id', params.reportId).single();
  if (!report) throw new Error('Report not found');

  const property = report.properties;
  const config = report.generation_config || {};
  const tier = config.tier || 'foundational';
  const currentSections: GeneratedSection[] = report.generated_sections || [];
  const currentSection = currentSections.find((s) => s.id === params.sectionId);
  if (!currentSection) throw new Error('Section not found');

  const sectionDef = ALL_SECTIONS[params.sectionId as SectionId];
  if (!sectionDef) throw new Error('Invalid section ID');

  const { data: settings } = await supabase.from('user_settings').select('*').eq('user_id', params.userId).single();

  // Build the system prompt as before
  let systemPrompt = buildSystemPrompt({
    tier,
    propertyName: property.name,
    propertyAddress: property.address,
    unitCount: property.units,
    investmentStrategy: property.investment_strategy,
    brandColors: settings
      ? {
          primary: settings.accent_color || '#27272A',
          secondary: settings.secondary_color || '#EFF6FF',
          accent: settings.report_accent_color || settings.accent_color || '#2563EB',
        }
      : undefined,
  });

  // Inject user preferences block AFTER the tier block (appended to system prompt)
  const preferencesBlock = buildUserPreferencesBlock((settings?.ai_preferences as Record<string, unknown>) || {});
  systemPrompt += '\n' + preferencesBlock;

  const { regenerateSection: callRegenerate } = await import('./claude');
  const result = await callRegenerate(
    systemPrompt,
    `Regenerate ONLY "${sectionDef.title}".
CURRENT: ${currentSection.content}
FEEDBACK: ${params.userNotes}
GUIDELINES: ${sectionDef.promptGuidance}
Return ONLY a JSON object (no markdown fences):
{
  "id": "${params.sectionId}",
  "title": "${sectionDef.title}",
  "content": "...",
  "chart_html": "",
  "chart_data": null,
  "metrics": [...],
  "included": true,
  "skipReason": null
}`
  );

  const regenerated = parseRegeneratedSection(result, currentSection);

  // Phase 5: Fill chart template if chart_data is present
  if (regenerated.chart_data && !regenerated.chart_html) {
    const brandColors = settings ? resolveBrandColors(settings) : undefined;
    if (brandColors) {
      fillSectionChartTemplates([regenerated], brandColors);
    }
  }

  const updatedSections = currentSections.map((s) => (s.id === params.sectionId ? regenerated : s));
  await supabase.from('reports').update({ generated_sections: updatedSections }).eq('id', params.reportId);
  return regenerated;
}
