import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { generateFullReport, generateFullReportStream } from '@/lib/report-generator';

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
      return new Response(stream, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
      });
    }

    const result = await generateFullReport(input);
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Generation failed' }, { status: 500 });
  }
}
