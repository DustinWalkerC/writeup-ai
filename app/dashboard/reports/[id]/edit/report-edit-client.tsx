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

type InputMode = 'guided' | 'freeform';

export default function ReportEditClient({ report, property, existingFiles, tier }: ReportEditClientProps) {
  const router = useRouter();
  const [files, setFiles] = useState<UploadedFile[]>(existingFiles);
  const [answers, setAnswers] = useState<Record<string, string>>((report.questionnaire_answers as Record<string,string>) || {});
  const [distStatus, setDistStatus] = useState((report.distribution_status as string) || 'none');
  const [distNote, setDistNote] = useState((report.distribution_note as string) || '');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>((report.input_mode as InputMode) || 'guided');
  const [freeformNarrative, setFreeformNarrative] = useState((report.freeform_narrative as string) || '');

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
          input_mode: inputMode,
          freeform_narrative: freeformNarrative,
        }),
      });
    } finally { setSaving(false); }
  }, [report.id, answers, distStatus, distNote, inputMode, freeformNarrative]);

  const handleGenerate = useCallback(async () => {
    if (!files.some(f => f.file_type === 't12')) {
      alert('Please upload a T-12 Operating Statement before generating.');
      return;
    }
    setGenerating(true);
    await handleSave();

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

  // Step icons as SVG paths
  const stepIcons = {
    property: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />,
    upload: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />,
    generate: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />,
    review: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />,
  };

  const steps = [
    { key: 'property', label: 'Property & Period', icon: stepIcons.property, done: true, active: false },
    { key: 'upload', label: 'Upload & Context', icon: stepIcons.upload, done: false, active: true },
    { key: 'generate', label: 'Generate', icon: stepIcons.generate, done: false, active: false },
    { key: 'review', label: 'Review & Export', icon: stepIcons.review, done: false, active: false },
  ];

  return (
    <div className="max-w-4xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/dashboard/reports')}
          className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700 mb-4 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Reports
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {propertyName} — {month} {year}
            </h1>
            <p className="text-slate-500 mt-1">Upload files and provide context for your report</p>
          </div>
          <span className="px-3 py-1 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full">
            Draft
          </span>
        </div>
      </div>

      {/* Stepper */}
      <div className="mb-8">
        <div className="relative flex items-center justify-between">
          {/* Connector line — sits behind everything */}
          <div className="absolute top-[18px] left-[36px] right-[36px] h-[2px] bg-slate-200" />
          {/* Green progress overlay */}
          <div className="absolute top-[18px] left-[36px] h-[2px] bg-green-400 transition-all" style={{ width: `${(steps.filter(s => s.done).length / (steps.length - 1)) * (100 - (72 / 8))}%` }} />

          {steps.map((step) => (
            <div key={step.key} className="relative z-10 flex flex-col items-center" style={{ width: '72px' }}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                step.done
                  ? 'bg-green-500 shadow-sm'
                  : step.active
                  ? 'bg-gradient-to-br from-cyan-500 to-teal-500 shadow-md shadow-cyan-200/50'
                  : 'bg-white border-2 border-slate-200'
              }`}>
                {step.done ? (
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className={`w-4 h-4 ${step.active ? 'text-white' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    {step.icon}
                  </svg>
                )}
              </div>
              <span className={`text-[11px] font-medium mt-2 text-center whitespace-nowrap ${
                step.done ? 'text-green-600' :
                step.active ? 'text-cyan-600' :
                'text-slate-400'
              }`}>{step.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* File Upload Section — UNTOUCHED */}
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

      {/* Asset Manager Notes — with Guided/Freeform toggle at top */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Asset Manager Notes</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              Provide context for the analysis engine. Leave sections blank to auto-extract from files.
            </p>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-1 p-1 bg-slate-100 rounded-lg mb-6 w-fit">
          <button
            onClick={() => setInputMode('guided')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              inputMode === 'guided'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Guided Questions
            </span>
          </button>
          <button
            onClick={() => setInputMode('freeform')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              inputMode === 'freeform'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Freeform Notes
            </span>
          </button>
        </div>

        {/* Guided Mode */}
        {inputMode === 'guided' && (
          <div className="space-y-5">
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
        )}

        {/* Freeform Mode */}
        {inputMode === 'freeform' && (
          <div>
            <p className="text-sm text-slate-500 mb-3">
              Paste your notes, commentary, or any context you want included in the report. The analysis engine will incorporate this into the narrative.
            </p>
            <textarea
              value={freeformNarrative}
              onChange={e => setFreeformNarrative(e.target.value)}
              placeholder="Paste your monthly notes here — property updates, market observations, investor talking points, action items, anything relevant to this period..."
              rows={14}
              className="w-full border border-slate-200 rounded-lg px-4 py-3 text-slate-900 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all placeholder-slate-400 leading-relaxed"
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-slate-400">
                Tip: Include specific numbers, tenant names, or project details for a more accurate report.
              </p>
              <p className="text-xs text-slate-400">{freeformNarrative.length.toLocaleString()} characters</p>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between border-t border-slate-200 pt-6 mt-6 pb-8">
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
          className={`px-10 py-3 text-sm font-semibold rounded-xl transition-all shadow-lg ${
            hasT12
              ? 'btn-animated-gradient text-white disabled:opacity-50 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
          }`}
        >
          {generating ? (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Preparing Report...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              {hasT12 ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Generate Report
                </>
              ) : (
                'Upload T-12 to Generate'
              )}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
