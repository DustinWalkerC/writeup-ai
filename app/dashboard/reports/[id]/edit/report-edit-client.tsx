'use client';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import FileUploader from './file-uploader';

interface UploadedFile {
  id: string;
  file_type: string;
  file_name: string;
  file_size: number;
  storage_path: string;
  created_at: string;
}

interface ReportEditClientProps {
  report: Record<string, unknown>;
  property: Record<string, unknown>;
  existingFiles: UploadedFile[];
  tier: string;
}

export default function ReportEditClient({ report, property, existingFiles, tier }: ReportEditClientProps) {
  const router = useRouter();
  const [files, setFiles] = useState<UploadedFile[]>(existingFiles);
  const [answers, setAnswers] = useState<Record<string, string>>((report.questionnaire_answers as Record<string,string>) || {});
  const [distStatus, setDistStatus] = useState((report.distribution_status as string) || 'none');
  const [distNote, setDistNote] = useState((report.distribution_note as string) || '');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Month/year come from report creation — no need to ask again
  const month = (report.month as string) || '';
  const year = (report.year as number) || new Date().getFullYear();

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await fetch(`/api/reports/${report.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionnaire_answers: answers,
          distribution_status: distStatus,
          distribution_note: distNote,
        }),
      });
    } finally { setSaving(false); }
  }, [report.id, answers, distStatus, distNote]);

  const handleGenerate = useCallback(async () => {
    if (!files.some(f => f.file_type === 't12')) {
      alert('Please upload a T-12 Operating Statement before generating.');
      return;
    }
    setGenerating(true);
    await handleSave();

    // Map month name to number
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const monthNum = monthNames.indexOf(month) + 1 || new Date().getMonth() + 1;

    const params = new URLSearchParams({
      propertyId: (report.property_id as string) || (property.id as string),
      month: String(monthNum),
      year: String(year),
      tier,
      distStatus,
      distNote,
      answers: JSON.stringify(answers),
      autoGenerate: 'true',
    });
    router.push(`/dashboard/reports/${report.id}/generate?${params.toString()}`);
  }, [files, handleSave, report.id, report.property_id, property.id, month, year, tier, distStatus, distNote, answers, router]);

  const hasT12 = files.some(f => f.file_type === 't12');
  const propertyName = (property.name as string) || 'Property';

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/dashboard/reports')}
          className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700 mb-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Reports
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {propertyName} - {month} {year}
            </h1>
            <p className="text-slate-500 mt-1">Upload files and provide context for your report</p>
          </div>
          <span className="px-3 py-1 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full">
            Draft
          </span>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-between mb-8 px-4">
        {[
          { num: 1, label: 'Property & Period', done: true },
          { num: 2, label: 'Upload & Context', active: true },
          { num: 3, label: 'Generate', done: false },
          { num: 4, label: 'Review & Export', done: false },
        ].map((step, i, arr) => (
          <div key={step.num} className="flex items-center">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step.done ? 'bg-green-500 text-white' :
                step.active ? 'bg-cyan-600 text-white' :
                'bg-slate-200 text-slate-500'
              }`}>
                {step.done ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : step.num}
              </div>
              <span className={`text-sm font-medium ${
                step.done ? 'text-green-600' :
                step.active ? 'text-cyan-600' :
                'text-slate-400'
              }`}>{step.label}</span>
            </div>
            {i < arr.length - 1 && (
              <div className={`w-16 lg:w-24 h-0.5 mx-3 ${step.done ? 'bg-green-300' : 'bg-slate-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* File Upload Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <FileUploader
          reportId={report.id as string}
          existingFiles={files}
          onFilesChanged={setFiles}
        />
      </div>

      {/* Distribution Update */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Distribution Update</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
            <div className="flex gap-3">
              {[
                { v: 'none', l: 'No Update' },
                { v: 'distributing', l: 'Distributing' },
                { v: 'accruing', l: 'Accruing' },
                { v: 'paused', l: 'Paused' },
              ].map(o => (
                <button
                  key={o.v}
                  onClick={() => setDistStatus(o.v)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    distStatus === o.v
                      ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {o.l}
                </button>
              ))}
            </div>
          </div>
          {distStatus !== 'none' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Distribution Note (optional)</label>
              <textarea
                value={distNote}
                onChange={e => setDistNote(e.target.value)}
                placeholder="Enter distribution narrative for investors..."
                rows={3}
                maxLength={500}
                className="w-full border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
              />
              <p className="text-xs text-slate-400 mt-1">{distNote.length}/500</p>
            </div>
          )}
        </div>
      </div>

      {/* Questionnaire */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Asset Manager Notes</h3>
        <p className="text-sm text-slate-500 mb-6">
          Fill in what you know. Leave blank and the analysis engine will extract insights from your uploaded files.
        </p>
        <div className="space-y-6">
          {[
            { id: 'executive_summary_notes', label: 'Executive Summary', placeholder: 'What should investors know this month?' },
            { id: 'occupancy_notes', label: 'Occupancy & Leasing', placeholder: 'Notable occupancy changes? Traffic trends?' },
            { id: 'delinquency_notes', label: 'Collections & Delinquency', placeholder: 'Delinquent tenants? Collection actions?' },
            { id: 'financial_notes', label: 'Revenue Performance', placeholder: 'Revenue or expense items to highlight?' },
            { id: 'lease_expiration_notes', label: 'Expense Management', placeholder: 'Budget overruns? Unexpected costs?' },
            { id: 'capex_notes', label: 'Capital Projects', placeholder: 'Renovation updates? CapEx spending?' },
            { id: 'leasing_notes', label: 'Operations', placeholder: 'Staffing changes? Vendor updates? Maintenance?' },
            { id: 'market_notes', label: 'Market & Outlook', placeholder: 'Local market changes? What should investors expect?' },
          ].map(q => (
            <div key={q.id}>
              <label className="block text-sm font-medium text-slate-700 mb-1">{q.label}</label>
              <textarea
                value={answers[q.id] || ''}
                onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                placeholder={q.placeholder}
                rows={3}
                className="w-full border border-slate-200 rounded-lg px-4 py-3 text-slate-900 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all placeholder-slate-400"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between border-t border-slate-200 pt-6 mt-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Draft'}
        </button>
        <button
          onClick={handleGenerate}
          disabled={generating || !hasT12}
          className={`px-6 py-2.5 text-sm font-medium rounded-lg transition-all shadow-sm ${
            hasT12
              ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white hover:from-cyan-700 hover:to-teal-700 disabled:opacity-50'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          {generating ? (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Preparing...
            </span>
          ) : hasT12 ? 'Generate Report' : 'Upload T-12 to Generate'}
        </button>
      </div>
    </div>
  );
}