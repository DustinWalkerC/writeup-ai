import Link from 'next/link'
import { getReport } from '@/app/actions/reports'

export default async function GeneratePage({ params }: { params: { id: string } }) {
  const report = await getReport(params.id)

  return (
    <div className="max-w-2xl mx-auto text-center py-12">
      <div className="text-6xl mb-6">🤖</div>
      <h1 className="text-2xl font-bold text-slate-900 mb-4">
        AI Generation Coming Soon!
      </h1>
      <p className="text-slate-500 mb-8">
        We'll connect Claude AI on Day 5-6 to generate your report for<br />
        <strong>{report?.property?.name}</strong> - {report?.month} {report?.year}
      </p>
      
      <div className="flex justify-center gap-4">
        <Link
          href={`/dashboard/reports/${params.id}/edit`}
          className="px-4 py-2 text-slate-600 hover:text-slate-900"
        >
          ← Back to Edit
        </Link>
        <Link
          href="/dashboard/reports"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          View All Reports
        </Link>
      </div>
    </div>
  )
}
