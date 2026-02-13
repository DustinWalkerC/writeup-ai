import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id: reportId } = await params;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileType = formData.get('fileType') as string;

    if (!file || !fileType) return NextResponse.json({ error: 'File and fileType required' }, { status: 400 });

    const validTypes = ['t12', 'rent_roll', 'leasing_activity', 'other', 'additional'];
    if (!validTypes.includes(fileType)) return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['xlsx','xls','csv','pdf','txt','doc','docx'].includes(ext))
      return NextResponse.json({ error: 'Unsupported format. Use .xlsx, .csv, .pdf, .doc, or .txt' }, { status: 400 });

    if (file.size > 10 * 1024 * 1024)
      return NextResponse.json({ error: 'File too large (10MB max)' }, { status: 400 });

    // For primary file types, remove existing file of same type
    // For additional files, don't replace — allow multiple
    if (fileType !== 'additional') {
      const { data: existing } = await supabase
        .from('report_files').select('id, storage_path')
        .eq('report_id', reportId).eq('file_type', fileType).eq('user_id', userId);

      if (existing?.length) {
        for (const e of existing) {
          await supabase.storage.from('report-files').remove([e.storage_path]);
          await supabase.from('report_files').delete().eq('id', e.id);
        }
      }
    }

    const storagePath = `${userId}/${reportId}/${fileType}_${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadErr } = await supabase.storage.from('report-files').upload(storagePath, buffer, { contentType: file.type, upsert: true });
    if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);

    const { data: fileRecord, error: dbErr } = await supabase.from('report_files').insert({
      report_id: reportId,
      user_id: userId,
      file_type: fileType,
      file_name: file.name,
      storage_path: storagePath,
      file_size: file.size,
      processing_status: 'pending',
    }).select().single();

    if (dbErr) throw new Error(`DB error: ${dbErr.message}`);
    return NextResponse.json({ success: true, file: fileRecord });
  } catch (error) {
    console.error('FILE UPLOAD ERROR:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Upload failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id: reportId } = await params;

  const { data: files, error } = await supabase
    .from('report_files').select('*').eq('report_id', reportId).eq('user_id', userId).order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ files });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { fileId } = await request.json();
  const { data: file } = await supabase.from('report_files').select('*').eq('id', fileId).eq('user_id', userId).single();
  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await supabase.storage.from('report-files').remove([file.storage_path]);
  await supabase.from('report_files').delete().eq('id', fileId);
  return NextResponse.json({ success: true });
}
