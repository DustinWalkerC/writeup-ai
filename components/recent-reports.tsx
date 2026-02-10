'use client'

import Link from 'next/link'

type Report = {
  id: string
  status: string
  month: string
  year: number
  updatedAt: string
  propertyName: string
}

type Props = {
  reports: Report[]
}

export function RecentReports({ reports }: Props) {
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'complete':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'generating':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200'
      case 'draft':
        return 'bg-slate-50 text-slate-600 border-slate-200'
      case 'error':
        return 'bg-red-50 text-red-700 border-red-200'
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (reports.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Reports</h3>
        <div className="text-center py-8">
          <p className="text-slate-500">No reports yet</p>
          <Link
            href="/dashboard/reports/new"
            className="inline-block mt-3 text-cyan-600 hover:text-cyan-700 font-medium"
          >
            Create your first report →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Recent Reports</h3>
        <Link
          href="/dashboard/reports"
          className="text-sm text-cyan-600 hover:text-cyan-700 font-medium"
        >
          View all →
        </Link>
      </div>

      <div className="space-y-3">
        {reports.map((report) => (
          <Link
            key={report.id}
            href={`/dashboard/reports/${report.id}`}
            className="block p-4 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">{report.propertyName}</p>
                <p className="text-sm text-slate-500">
                  {report.month} {report.year}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">
                  {formatDate(report.updatedAt)}
                </span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusStyles(report.status)}`}>
                  {report.status}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

