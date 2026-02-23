// app/api/reports/[id]/pipeline/route.ts
import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['in_review'],
  in_review: ['final_review'],
  final_review: ['ready_to_send', 'in_review'],
  ready_to_send: ['sent'],
  sent: [],
};

// PATCH — normal pipeline transition (validates allowed moves)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { targetStage, returnNote } = await request.json();

  const { data: report, error: fetchError } = await supabase
    .from('reports')
    .select('pipeline_stage')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (fetchError || !report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  const allowed = VALID_TRANSITIONS[report.pipeline_stage] || [];
  if (!allowed.includes(targetStage)) {
    return NextResponse.json(
      { error: `Cannot move from ${report.pipeline_stage} to ${targetStage}` },
      { status: 400 }
    );
  }

  const update: Record<string, unknown> = {
    pipeline_stage: targetStage,
    updated_at: new Date().toISOString(),
  };

  if (report.pipeline_stage === 'final_review' && targetStage === 'in_review') {
    update.returned = true;
    update.return_note = returnNote || '';
    if (returnNote) {
      await supabase.from('report_return_notes').insert({
        report_id: id, user_id: userId, note: returnNote,
      });
    }
  }

  if (report.pipeline_stage === 'in_review' && targetStage === 'final_review') {
    update.returned = false;
    update.return_note = null;
  }

  const { error: updateError } = await supabase
    .from('reports').update(update).eq('id', id).eq('user_id', userId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, pipeline_stage: targetStage });
}

// PUT — force change status (skips transition validation, for admin override)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { targetStage } = await request.json();

  const validStages = ['draft', 'in_review', 'final_review', 'ready_to_send', 'sent'];
  if (!validStages.includes(targetStage)) {
    return NextResponse.json({ error: 'Invalid stage' }, { status: 400 });
  }

  const { data: report, error: fetchError } = await supabase
    .from('reports')
    .select('id')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (fetchError || !report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  const { error: updateError } = await supabase
    .from('reports')
    .update({
      pipeline_stage: targetStage,
      returned: false,
      return_note: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', userId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, pipeline_stage: targetStage });
}
