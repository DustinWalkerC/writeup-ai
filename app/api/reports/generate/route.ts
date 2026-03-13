// app/api/reports/generate/route.ts
import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { generateFullReport, generateFullReportStream } from '@/lib/report-generator';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export const maxDuration = 120;

// ── C2 FIX: Dev-only logging ──
const isDev = process.env.NODE_ENV === 'development';
function devLog(...args: any[]) {
  if (isDev) console.log('[GENERATE]', ...args);
}
function devWarn(...args: any[]) {
  if (isDev) console.warn('[GENERATE]', ...args);
}

// ─────────────────────────────────────────────────────
// Progress writer — always writes when called
// (throttle is handled per-request inside TransformStream)
// ─────────────────────────────────────────────────────
async function writeGenerationProgress(
  reportId: string,
  userId: string,
  progress: number,
  statusText: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('reports')
      .update({
        generation_progress: Math.round(progress),
        generation_status_text: statusText,
        pipeline_stage: 'generating',
      })
      .eq('id', reportId)
      .eq('user_id', userId);

    if (error) devWarn('Progress write DB error:', error.message);
  } catch (err) {
    devWarn('Progress write failed:', err);
  }
}

// ─────────────────────────────────────────────────────
// Section status map
// ─────────────────────────────────────────────────────
const SECTION_STATUS_MAP: Record<string, string> = {
  executive_summary: 'Writing executive summary...',
  net_operating_income: 'Analyzing net operating income...',
  revenue_analysis: 'Analyzing revenue drivers...',
  expense_analysis: 'Reviewing expense categories...',
  occupancy_leasing: 'Evaluating occupancy & leasing...',
  capital_expenditures: 'Reviewing capital expenditures...',
  debt_service: 'Analyzing debt service coverage...',
  market_overview: 'Assessing market conditions...',
  budget_variance: 'Calculating budget variances...',
  cash_flow: 'Reviewing cash flow performance...',
  investment_strategy: 'Drafting investment strategy...',
  distribution_update: 'Preparing distribution update...',
  risk_assessment: 'Evaluating risk factors...',
  portfolio_comparison: 'Comparing portfolio metrics...',
  forward_outlook: 'Writing forward outlook...',
};

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const {
      reportId,
      propertyId,
      selectedMonth,
      selectedYear,
      tier,
      distributionStatus,
      distributionNote,
      questionnaireAnswers,
      streaming = false,
    } = body;

    devLog('═══════════════════════════════════════');
    devLog('Report:', reportId, '| Tier:', tier, '| Streaming:', streaming);
    devLog('═══════════════════════════════════════');

    if (!reportId || !propertyId || !selectedMonth || !selectedYear)
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

    const input = {
      reportId,
      propertyId,
      userId,
      selectedMonth: parseInt(selectedMonth),
      selectedYear: parseInt(selectedYear),
      tier: tier || 'foundational',
      sectionIds: Array.isArray(body.sectionIds) ? body.sectionIds : undefined,
      distributionStatus: distributionStatus || 'none',
      distributionNote: distributionNote || '',
      questionnaireAnswers: questionnaireAnswers || {},
    };

    if (streaming) {
      devLog('>>> STREAMING PATH');
      const stream = await generateFullReportStream(input);

      // Set initial generating state
      const { error: initError } = await supabase
        .from('reports')
        .update({
          pipeline_stage: 'generating',
          generation_progress: 0,
          generation_status_text: 'Starting generation...',
          generation_started_at: new Date().toISOString(),
        })
        .eq('id', reportId)
        .eq('user_id', userId);

      if (initError) devWarn('Initial write error:', initError.message);

      // Per-request throttle (not module-level)
      let lastWrite = 0;

      // Track accumulated text for progress estimation
      let fullText = '';
      const decoder = new TextDecoder();

      // Estimate max tokens based on tier
      const maxTokens = tier === 'institutional' ? 32000 : tier === 'professional' ? 24000 : 16000;

      const transformStream = new TransformStream({
        async transform(chunk, controller) {
          controller.enqueue(chunk);

          const text = decoder.decode(chunk, { stream: true });
          fullText += text;

          const estimatedProgress = 5 + (fullText.length / (maxTokens * 4)) * 85;

          const sectionMatches = fullText.match(/"id"\s*:\s*"([a-z_]+)"/g);
          const lastMatch = sectionMatches?.[sectionMatches.length - 1]?.match(
            /"id"\s*:\s*"([a-z_]+)"/
          );
          const lastSection = lastMatch?.[1];
          const statusText = lastSection
            ? SECTION_STATUS_MAP[lastSection] || `Generating: ${lastSection.replace(/_/g, ' ')}...`
            : 'Generating report sections...';

          const now = Date.now();
          if (now - lastWrite >= 3000) {
            lastWrite = now;
            await writeGenerationProgress(
              reportId,
              userId,
              Math.min(estimatedProgress, 90),
              statusText
            );
          }
        },
        async flush() {
          devLog('Stream flush — writing in_review');
          const { error: flushError } = await supabase
            .from('reports')
            .update({
              pipeline_stage: 'in_review',
              generation_progress: 100,
              generation_status_text: 'Report complete',
              generation_completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', reportId)
            .eq('user_id', userId);

          if (flushError) devWarn('Flush write error:', flushError.message);
        },
      });

      const pipedStream = stream.pipeThrough(transformStream);

      return new Response(pipedStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    // Non-streaming path
    devLog('>>> NON-STREAMING PATH');

    const { error: initError2 } = await supabase
      .from('reports')
      .update({
        pipeline_stage: 'generating',
        generation_progress: 0,
        generation_status_text: 'Starting generation...',
        generation_started_at: new Date().toISOString(),
      })
      .eq('id', reportId)
      .eq('user_id', userId);

    if (initError2) devWarn('Non-streaming init error:', initError2.message);

    const result = await generateFullReport(input);
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });

    // Advance pipeline after successful generation
    const { error: completeError } = await supabase
      .from('reports')
      .update({
        pipeline_stage: 'in_review',
        generation_progress: 100,
        generation_status_text: 'Report complete',
        generation_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId)
      .eq('user_id', userId);

    if (completeError) devWarn('Completion write error:', completeError.message);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[GENERATE] Fatal error:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    );
  }
}
