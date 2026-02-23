// app/dashboard/reports/page.tsx
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import ReportsContent from './reports-content';

export default async function ReportsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const { data: reports } = await supabase
    .from('reports')
    .select('id, property_id, user_id, pipeline_stage, selected_month, selected_year, updated_at, returned, return_note, properties(name, address, city, state)')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <ReportsContent initialReports={(reports as any[]) || []} />;
}
