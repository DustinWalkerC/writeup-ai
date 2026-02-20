import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id: propertyId } = await params;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'File required' }, { status: 400 });

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'csv' && ext !== 'xlsx' && ext !== 'xls')
      return NextResponse.json({ error: 'Budget must be CSV (.csv) or Excel (.xlsx)' }, { status: 400 });

    const { data: property } = await supabase
      .from('properties').select('budget_file_path').eq('id', propertyId).eq('user_id', userId).single();
    if (property?.budget_file_path)
      await supabase.storage.from('report-files').remove([property.budget_file_path]);

    const filePath = `${userId}/budgets/${propertyId}_budget_${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadErr } = await supabase.storage.from('report-files').upload(filePath, buffer, { contentType: file.type, upsert: true });
    if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);

    await supabase.from('properties').update({
      budget_file_path: filePath, budget_file_name: file.name, budget_uploaded_at: new Date().toISOString(),
    }).eq('id', propertyId).eq('user_id', userId);

    return NextResponse.json({ success: true, budgetFileName: file.name });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Upload failed' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id: propertyId } = await params;

  const { data: property } = await supabase
    .from('properties').select('budget_file_path').eq('id', propertyId).eq('user_id', userId).single();
  if (property?.budget_file_path)
    await supabase.storage.from('report-files').remove([property.budget_file_path]);

  await supabase.from('properties').update({
    budget_file_path: null, budget_file_name: null, budget_uploaded_at: null,
  }).eq('id', propertyId).eq('user_id', userId);

  return NextResponse.json({ success: true });
}

