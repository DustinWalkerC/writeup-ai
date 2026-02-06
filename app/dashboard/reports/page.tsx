import Link from 'next/link'
import { getReports } from '@/app/actions/reports'
import { ReportCard } from './report-card'

export default async function ReportsPage() {
  const reports = await getReports()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Reports</h1>
          <p className="text-slate-500">View and manage your investor reports</p>
        </div>
        <Link
          href="/dashboard/reports/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          + Create Report
        </Link>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
          <div className="text-5xl mb-4">📊</div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No reports yet</h3>
          <p className="text-slate-500 mb-4">Create your first investor report</p>
          <Link
            href="/dashboard/reports/new"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            + Create Your First Report
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      )}
    </div>
  )
}
