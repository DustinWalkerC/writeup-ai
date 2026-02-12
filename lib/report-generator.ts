import { supabaseAdmin as supabase } from './supabase';
import { parseUploadedFile, validateT12Month } from './file-parser';
import { buildSystemPrompt, buildAnalysisPrompt } from './prompt-templates';
import { getSectionsForTier, ALL_SECTIONS, SectionId } from './section-definitions';
import { generateReport, generateReportStream } from './claude';

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

export interface GeneratedSection {
  id: string;
  title: string;
  content: string;
  metrics: Array<{
    label: string;
    value: string;
    change?: string;
    changeDirection?: 'up' | 'down' | 'flat';
    vsbudget?: string;
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

// Helper: fetch and parse all files for a report
async function fetchAndParseFiles(reportId: string, propertyId: string, userId: string) {
  const fileContents: Record<string, string> = {};

  const { data: reportFiles } = await supabase
    .from('report_files').select('*')
    .eq('report_id', reportId);

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
      .from('properties').select('budget_file_path, budget_file_name')
      .eq('id', propertyId).single();

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

// Helper: build prompts
async function buildPrompts(input: ReportGenerationInput, fileContents: Record<string, string>) {
  const { data: property } = await supabase.from('properties').select('*').eq('id', input.propertyId).single();
  const { data: settings } = await supabase.from('user_settings').select('*').eq('user_id', input.userId).single();

  const systemPrompt = buildSystemPrompt({
    tier: input.tier,
    propertyName: property?.name || 'Unknown Property',
    propertyAddress: property?.address,
    unitCount: property?.units,
    investmentStrategy: property?.investment_strategy,
    brandColors: settings ? {
      primary: settings.accent_color || '#162e4b',
      secondary: settings.secondary_color || '#e9ebf2',
      accent: settings.accent_color || '#2563eb'
    } : undefined,
  });

  const sections = getSectionsForTier(input.tier);

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

/** Main non-streaming generation */
export async function generateFullReport(input: ReportGenerationInput): Promise<ReportGenerationResult> {
  try {
    await supabase.from('reports').update({
      generation_status: 'generating', generation_started_at: new Date().toISOString(),
    }).eq('id', input.reportId);

    const fileContents = await fetchAndParseFiles(input.reportId, input.propertyId, input.userId);

    // Validate T-12 month
    if (fileContents.t12) {
      const validation = validateT12Month(fileContents.t12, input.selectedMonth, input.selectedYear);
      if (!validation.valid) {
        await supabase.from('reports').update({ generation_status: 'error' }).eq('id', input.reportId);
        return { success: false, sections: [], analysisSummary: { overall_sentiment: '', key_findings: [], data_quality_notes: [] }, usage: { inputTokens: 0, outputTokens: 0 }, error: validation.message };
      }
    }

    const { systemPrompt, userPrompt } = await buildPrompts(input, fileContents);

    const maxTokens = input.tier === 'institutional' ? 12000 : input.tier === 'professional' ? 8000 : 4000;
    const result = await generateReport({ systemPrompt, userPrompt, maxTokens });
    const parsed = parseClaudeResponse(result.content);

    // FIX: Also set status to 'complete' so report cards pick it up
    await supabase.from('reports').update({
      status: 'complete',
      generated_sections: parsed.sections,
      raw_analysis: parsed.analysisSummary,
      generation_status: 'completed',
      generation_completed_at: new Date().toISOString(),
      generation_config: {
        tier: input.tier,
        model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        filesUsed: Object.keys(fileContents),
      }
    }).eq('id', input.reportId);

    return { success: true, sections: parsed.sections, analysisSummary: parsed.analysisSummary, usage: result.usage };
  } catch (error) {
    await supabase.from('reports').update({ generation_status: 'error' }).eq('id', input.reportId);
    return {
      success: false, sections: [],
      analysisSummary: { overall_sentiment: '', key_findings: [], data_quality_notes: [] },
      usage: { inputTokens: 0, outputTokens: 0 },
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/** Streaming generation — note: status update is handled client-side after stream completes */
export async function generateFullReportStream(input: ReportGenerationInput): Promise<ReadableStream<Uint8Array>> {
  await supabase.from('reports').update({
    generation_status: 'generating', generation_started_at: new Date().toISOString(),
  }).eq('id', input.reportId);

  const fileContents = await fetchAndParseFiles(input.reportId, input.propertyId, input.userId);
  const { systemPrompt, userPrompt } = await buildPrompts(input, fileContents);
  const maxTokens = input.tier === 'institutional' ? 12000 : input.tier === 'professional' ? 8000 : 4000;

  return generateReportStream({ systemPrompt, userPrompt, maxTokens });
}

/** Regenerate single section */
export async function regenerateSingleSection(params: {
  reportId: string; sectionId: string; userNotes: string; userId: string;
}): Promise<GeneratedSection> {
  const { data: report } = await supabase
    .from('reports').select('*, properties(*)').eq('id', params.reportId).single();
  if (!report) throw new Error('Report not found');

  const property = report.properties;
  const config = report.generation_config || {};
  const tier = config.tier || 'foundational';
  const currentSections: GeneratedSection[] = report.generated_sections || [];
  const currentSection = currentSections.find(s => s.id === params.sectionId);
  if (!currentSection) throw new Error('Section not found');

  const sectionDef = ALL_SECTIONS[params.sectionId as SectionId];
  if (!sectionDef) throw new Error('Invalid section ID');

  const { data: settings } = await supabase.from('user_settings').select('*').eq('user_id', params.userId).single();

  const systemPrompt = buildSystemPrompt({
    tier,
    propertyName: property.name,
    propertyAddress: property.address,
    unitCount: property.units,
    investmentStrategy: property.investment_strategy,
    brandColors: settings ? {
      primary: settings.accent_color || '#162e4b',
      secondary: settings.secondary_color || '#e9ebf2',
      accent: settings.accent_color || '#2563eb'
    } : undefined,
  });

  const { regenerateSection: callRegenerate } = await import('./claude');
  const result = await callRegenerate(systemPrompt,
    `Regenerate ONLY "${sectionDef.title}".
CURRENT: ${currentSection.content}
FEEDBACK: ${params.userNotes}
GUIDELINES: ${sectionDef.promptGuidance}
Return JSON: { "id": "${params.sectionId}", "title": "${sectionDef.title}", "content": "...", "metrics": [...], "included": true, "skipReason": null }`
  );

  let regenerated: GeneratedSection;
  try {
    let jsonStr = result;
    const m = result.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (m) jsonStr = m[1];
    const obj = jsonStr.match(/\{[\s\S]*\}/);
    if (obj) jsonStr = obj[0];
    regenerated = JSON.parse(jsonStr);
  } catch {
    regenerated = { ...currentSection, content: result };
  }

  const updatedSections = currentSections.map(s => s.id === params.sectionId ? regenerated : s);
  await supabase.from('reports').update({ generated_sections: updatedSections }).eq('id', params.reportId);
  return regenerated;
}

function parseClaudeResponse(content: string) {
  try {
    let jsonStr = content;
    const m = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (m) jsonStr = m[1];
    const obj = jsonStr.match(/\{[\s\S]*\}/);
    if (obj) jsonStr = obj[0];
    const parsed = JSON.parse(jsonStr);
    return {
      sections: parsed.sections || [],
      analysisSummary: parsed.analysis_summary || { overall_sentiment: 'unknown', key_findings: [], data_quality_notes: [] }
    };
  } catch {
    return {
      sections: [{ id: 'executive_summary', title: 'Report', content, metrics: [], included: true, skipReason: null }],
      analysisSummary: { overall_sentiment: 'unknown', key_findings: [], data_quality_notes: ['Response was not valid JSON — raw content preserved'] }
    };
  }
}
