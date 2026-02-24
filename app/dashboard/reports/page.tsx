// app/dashboard/reports/page.tsx
import { Suspense } from 'react';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import ReportsContent from './reports-content';

async function ReportsLoader() {
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

export default function ReportsPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          border: '2.5px solid #E8E5E0', borderTopColor: '#00B7DB',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <ReportsLoader />
    </Suspense>
  );
}
