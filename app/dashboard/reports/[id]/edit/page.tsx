import { getReport, getReportFiles } from '@/app/actions/reports'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FileUploader } from './file-uploader'
import { Questionnaire } from './questionnaire'
import { QuestionnaireData } from '@/lib/supabase'

export default async function EditReportPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params
  const report = await getReport(id)

  if (!report) {
    redirect('/dashboard/reports')
  }

  const files = await getReportFiles(id)

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href="/dashboard/reports"
            className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700 text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Reports
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">
            {report.property?.name} - {report.month} {report.year}
          </h1>
          <p className="text-slate-500">Upload files and provide context for your report</p>
        </div>
        <span className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-sm font-medium">
          Draft
        </span>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-4 mb-8 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </span>
          <span className="text-slate-600">Property & Period</span>
        </div>
        <div className="flex-1 h-px bg-slate-200"></div>
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-gradient-to-r from-cyan-600 to-teal-600 text-white flex items-center justify-center text-xs font-semibold">2</span>
          <span className="font-medium text-slate-900">Upload & Context</span>
        </div>
        <div className="flex-1 h-px bg-slate-200"></div>
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-xs font-semibold border border-slate-200">3</span>
          <span className="text-slate-400">Generate</span>
        </div>
        <div className="flex-1 h-px bg-slate-200"></div>
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-xs font-semibold border border-slate-200">4</span>
          <span className="text-slate-400">Review & Export</span>
        </div>
      </div>

      {/* File Upload Section */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-cyan-50 flex items-center justify-center">
            <svg className="w-5 h-5 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Upload Financial Documents
            </h2>
            <p className="text-slate-500 text-sm">
              Upload your T-12, rent roll, or other financial documents. Supported: Excel, PDF
            </p>
          </div>
        </div>
        <FileUploader reportId={report.id} existingFiles={files} />
      </section>

      {/* Questionnaire Section */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <Questionnaire
          reportId={report.id}
          initialData={report.questionnaire as QuestionnaireData}
          initialMode={report.input_mode as 'guided' | 'freeform'}
          initialFreeform={report.freeform_narrative}
        />
      </section>
    </div>
  )
}
