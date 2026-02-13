// app/api/reports/[id]/route.ts
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// GET - Fetch a single report
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const { data: report, error } = await supabase
    .from('reports')
    .select('*, properties(*)')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error || !report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  return NextResponse.json(report);
}

// PATCH - Update report fields
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  try {
    const body = await request.json();
    const allowedFields = [
      'name', 'status', 'questionnaire_answers', 'distribution_status',
      'distribution_note', 'selected_month', 'selected_year',
      'generated_sections', 'raw_analysis', 'generation_status',
      'generation_completed_at', 'generation_config',
      'input_mode', 'freeform_narrative',
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) updateData[field] = body[field];
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('reports')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, report: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Update failed' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a report
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  // Delete associated files from storage first
  const { data: files } = await supabase
    .from('report_files')
    .select('storage_path')
    .eq('report_id', id)
    .eq('user_id', userId);

  if (files && files.length > 0) {
    await supabase.storage
      .from('report-files')
      .remove(files.map(f => f.storage_path));
  }

  const { error } = await supabase
    .from('reports')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
