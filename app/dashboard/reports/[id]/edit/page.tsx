// app/dashboard/reports/[id]/edit/page.tsx

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ReportEditClient from './report-edit-client';

export default async function ReportEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  const { id } = await params;

  const { data: report } = await supabase
    .from('reports')
    .select('*, properties(*)')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (!report) redirect('/dashboard/reports');

  const { data: files } = await supabase
    .from('report_files')
    .select('*')
    .eq('report_id', id)
    .eq('user_id', userId)
    .order('uploaded_at', { ascending: false });

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('tier')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  return (
    <ReportEditClient
      report={report}
      property={report.properties}
      existingFiles={files || []}
      tier={sub?.tier || 'foundational'}
    />
  );
}


