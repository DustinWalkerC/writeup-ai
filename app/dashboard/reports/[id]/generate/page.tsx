import { getReport } from '@/app/actions/reports'
import { redirect } from 'next/navigation'
import { GenerateClient } from './generate-client'

export default async function GeneratePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const report = await getReport(id)

  if (!report) {
    redirect('/dashboard/reports')
  }

  // IMPORTANT:
  // Do NOT redirect when complete.
  // Let the user stay on /generate so they can see the result,
  // then click “Review & Export” when ready.

  return (
    <GenerateClient
      reportId={report.id}
      propertyName={report.property?.name || 'Unknown Property'}
      month={report.month}
      year={report.year}
      initialStatus={report.status}
      initialNarrative={report.narrative}
    />
  )
}
