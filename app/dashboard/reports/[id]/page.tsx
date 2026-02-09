import { getReport } from '@/app/actions/reports'
import { redirect } from 'next/navigation'
import { ReportViewer } from './report-viewer'
import { getUserSettings } from '@/app/actions/settings'

export default async function ReportPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params
  const report = await getReport(id)

  if (!report) {
    redirect('/dashboard/reports')
  }

  // Only redirect to generate if status is 'draft'
  // 'complete' reports should show the viewer
  // 'generating' should also redirect to generate page to see progress
  // 'error' should redirect to generate page to retry
  if (report.status === 'draft' || report.status === 'generating' || report.status === 'error') {
    redirect(`/dashboard/reports/${id}/generate`)
  }

  // Status is 'complete' - show the report
  const userSettings = await getUserSettings()
  // Ensure questionnaire is a non-null record for the viewer
  const safeReport = { ...report, questionnaire: report.questionnaire ?? {} } as any

  return (
    <ReportViewer 
      report={safeReport}
      reportId={id}
      userSettings={userSettings}
    />
  )
}
