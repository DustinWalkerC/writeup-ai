import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import GenerateClient from './generate-client';

export default async function GeneratePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  const { id } = await params;
  const search = await searchParams;

  const { data: report } = await supabase
    .from('reports').select('*, properties(name)').eq('id', id).eq('user_id', userId).single();
  if (!report) redirect('/dashboard/reports');

  const propertyId = search.propertyId || report.property_id;
  const selectedMonth = parseInt(search.month) || report.selected_month || new Date().getMonth() + 1;
  const selectedYear = parseInt(search.year) || report.selected_year || new Date().getFullYear();
  const tier = search.tier || 'foundational';
  const distributionStatus = search.distStatus || report.distribution_status || 'none';
  const distributionNote = search.distNote || report.distribution_note || '';

  let questionnaireAnswers: Record<string, string> = {};
  try {
    questionnaireAnswers = search.answers ? JSON.parse(search.answers) : (report.questionnaire_answers || {});
  } catch { questionnaireAnswers = {}; }

  return (
    <GenerateClient
      reportId={id}
      propertyId={propertyId}
      selectedMonth={selectedMonth}
      selectedYear={selectedYear}
      tier={tier}
      distributionStatus={distributionStatus}
      distributionNote={distributionNote}
      questionnaireAnswers={questionnaireAnswers}
      existingSections={report.generated_sections || []}
      propertyName={report.properties?.name || 'Property'}
    />
  );
}
