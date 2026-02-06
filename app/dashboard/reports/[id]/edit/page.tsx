// app/dashboard/reports/[id]/edit/page.tsx
import { getReport, getReportFiles } from '@/app/actions/reports'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FileUploader } from './file-uploader'
import { Questionnaire } from './questionnaire'

type Params = { id: string }
type Props = { params: Params | Promise<Params> }

export default async function EditReportPage({ params }: Props) {
  const { id } = await Promise.resolve(params)
  if (!id) redirect('/dashboard/reports')

  const report = await getReport(id)
  if (!report) redirect('/dashboard/reports')

  const files = await getReportFiles(id)

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/dashboard/reports" className="text-slate-500 hover:text-slate-700 text-sm">
            ← Back to Reports
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">
            {report.property?.name} - {report.month} {report.year}
          </h1>
          <p className="text-slate-500">Upload files and provide context for your report</p>
        </div>
        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
          Draft
        </span>
      </div>

      <div className="flex items-center gap-4 mb-8 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs">✓</span>
          <span className="text-slate-600">Property & Period</span>
        </div>
        <div className="flex-1 h-px bg-slate-200"></div>
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">2</span>
          <span className="font-medium text-slate-900">Upload & Context</span>
        </div>
        <div className="flex-1 h-px bg-slate-200"></div>
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs">3</span>
          <span className="text-slate-400">Generate</span>
        </div>
        <div className="flex-1 h-px bg-slate-200"></div>
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs">4</span>
          <span className="text-slate-400">Review & Export</span>
        </div>
      </div>

      <section className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">📁 Upload Financial Documents</h2>
        <p className="text-slate-500 text-sm mb-4">
          Upload your T-12, rent roll, or other financial documents. You can upload multiple files.
          Supported formats: Excel (.xlsx, .xls), PDF
        </p>
        <FileUploader reportId={report.id} existingFiles={files} />
      </section>

      <section className="bg-white rounded-lg border border-slate-200 p-6">
        <Questionnaire
          reportId={report.id}
          initialData={report.questionnaire}
          initialMode={report.input_mode}
          initialFreeform={report.freeform_narrative}
        />
      </section>
    </div>
  )
}
