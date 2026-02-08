import { getReport } from '@/app/actions/reports'
import { getUserSettings } from '@/app/actions/settings'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ReportViewer } from './report-viewer'

export default async function ReportViewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [report, userSettings] = await Promise.all([
    getReport(id),
    getUserSettings(),
  ])

  if (!report) {
    redirect('/dashboard/reports')
  }

  if (report.status === 'draft') {
    redirect(`/dashboard/reports/${id}/edit`)
  }

  if (report.status === 'generating') {
    redirect(`/dashboard/reports/${id}/generate`)
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href="/dashboard/reports"
            className="text-slate-500 hover:text-slate-700 text-sm"
          >
            ← Back to Reports
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">
            {report.property?.name} — {report.month} {report.year}
          </h1>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            report.status === 'complete'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {report.status === 'complete' ? 'Complete' : 'Error'}
        </span>
      </div>

      {/* Report Content */}
      <ReportViewer
        reportId={report.id}
        report={{
          id: report.id,
          month: report.month,
          year: report.year,
          narrative: report.narrative,
          content: report.content,
          questionnaire: report.questionnaire || {},
          template_version: report.template_version,
          updated_at: report.updated_at,
          property: report.property,
        }}
        userSettings={userSettings}
      />
    </div>
  )
}
