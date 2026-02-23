// app/api/reports/generate/route.ts
import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { generateFullReport, generateFullReportStream } from '@/lib/report-generator';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { reportId, propertyId, selectedMonth, selectedYear, tier, distributionStatus, distributionNote, questionnaireAnswers, streaming = false } = body;

    if (!reportId || !propertyId || !selectedMonth || !selectedYear)
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

    const input = {
      reportId, propertyId, userId,
      selectedMonth: parseInt(selectedMonth), selectedYear: parseInt(selectedYear),
      tier: tier || 'foundational',
      distributionStatus: distributionStatus || 'none',
      distributionNote: distributionNote || '',
      questionnaireAnswers: questionnaireAnswers || {},
    };

    if (streaming) {
      const stream = await generateFullReportStream(input);

      // For streaming: advance pipeline after stream completes
      // We wrap the stream to detect completion and update pipeline_stage
      const transformStream = new TransformStream({
        transform(chunk, controller) {
          controller.enqueue(chunk);
        },
        async flush() {
          // Stream finished — advance to in_review
          await supabase
            .from('reports')
            .update({
              pipeline_stage: 'in_review',
              updated_at: new Date().toISOString(),
            })
            .eq('id', reportId)
            .eq('user_id', userId);
        },
      });

      const pipedStream = stream.pipeThrough(transformStream);

      return new Response(pipedStream, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
      });
    }

    const result = await generateFullReport(input);
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });

    // Non-streaming: advance pipeline after successful generation
    await supabase
      .from('reports')
      .update({
        pipeline_stage: 'in_review',
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId)
      .eq('user_id', userId);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Generation failed' }, { status: 500 });
  }
}
