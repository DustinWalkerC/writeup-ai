import { getReport } from '@/app/actions/reports'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ReportViewer } from './report-viewer'

export default async function ReportViewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const report = await getReport(id)

  if (!report) {
    redirect('/dashboard/reports')
  }

  // If still draft, redirect to edit
  if (report.status === 'draft') {
    redirect(`/dashboard/reports/${id}/edit`)
  }

  // If generating, redirect to generate page
  if (report.status === 'generating') {
    redirect(`/dashboard/reports/${id}/generate`)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/dashboard/reports" className="text-slate-500 hover:text-slate-700 text-sm">
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

      <ReportViewer
        reportId={report.id}
        narrative={report.narrative}
        propertyName={report.property?.name || 'Property'}
        month={report.month}
        year={report.year}
      />
    </div>
  )
}



