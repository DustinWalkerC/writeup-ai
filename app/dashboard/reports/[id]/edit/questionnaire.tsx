'use client';
import { useState, useEffect, useMemo } from 'react';
import { getQuestionsForSections } from '@/lib/question-section-map';
import type { SectionId } from '@/lib/section-definitions';

interface QuestionnaireProps {
  initialAnswers: Record<string, string>;
  distributionStatus: string;
  distributionNote: string;
  selectedMonth: number;
  selectedYear: number;
  onAnswersChanged: (answers: Record<string, string>) => void;
  onDistributionChanged: (status: string, note: string) => void;
  onMonthChanged: (month: number, year: number) => void;
  /** If provided, only show questions relevant to these sections */
  enabledSections?: SectionId[] | null;
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function Questionnaire({
  initialAnswers, distributionStatus: initDist, distributionNote: initNote,
  selectedMonth: initMonth, selectedYear: initYear,
  onAnswersChanged, onDistributionChanged, onMonthChanged,
  enabledSections,
}: QuestionnaireProps) {
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
  const [distStatus, setDistStatus] = useState(initDist || 'none');
  const [distNote, setDistNote] = useState(initNote || '');
  const [month, setMonth] = useState(initMonth || new Date().getMonth() + 1);
  const [year, setYear] = useState(initYear || new Date().getFullYear());

  // Filter questions based on enabled sections
  const questions = useMemo(() => {
    return getQuestionsForSections(enabledSections || null)
  }, [enabledSections])

  useEffect(() => {
    const t = setTimeout(() => onAnswersChanged(answers), 500);
    return () => clearTimeout(t);
  }, [answers, onAnswersChanged]);

  const curYear = new Date().getFullYear();

  return (
    <div className="space-y-8">
      {/* Report Period */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Report Period</h3>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Month</label>
            <select value={month} onChange={e => { const m = parseInt(e.target.value); setMonth(m); onMonthChanged(m, year); }}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none">
              {MONTHS.map((n, i) => <option key={i} value={i+1}>{n}</option>)}
            </select>
          </div>
          <div className="w-32">
            <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
            <select value={year} onChange={e => { const y = parseInt(e.target.value); setYear(y); onMonthChanged(month, y); }}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none">
              {[curYear-1, curYear, curYear+1].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Distribution Status */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Distribution Update</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
            <div className="flex gap-3">
              {[{v:'none',l:'No Update'},{v:'distributing',l:'Distributing'},{v:'accruing',l:'Accruing'},{v:'paused',l:'Paused'}].map(o => (
                <button key={o.v} onClick={() => { setDistStatus(o.v); onDistributionChanged(o.v, distNote); }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${distStatus === o.v
                    ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {o.l}
                </button>
              ))}
            </div>
          </div>
          {distStatus !== 'none' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Distribution Note (optional)</label>
              <textarea value={distNote} onChange={e => { setDistNote(e.target.value); onDistributionChanged(distStatus, e.target.value); }}
                placeholder="Enter distribution narrative for investors..." rows={3} maxLength={500}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none" />
              <p className="text-xs text-slate-400 mt-1">{distNote.length}/500</p>
            </div>
          )}
        </div>
      </div>

      {/* Section Questions — now dynamically filtered */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Asset Manager Notes</h3>
        <p className="text-sm text-slate-500 mb-6">
          Fill in what you know — leave blank to let the analysis engine extract from your files.
          {enabledSections && (
            <span className="text-slate-400"> Showing {questions.length} questions based on your report sections.</span>
          )}
        </p>
        <div className="space-y-6">
          {questions.map(q => (
            <div key={q.id}>
              <label className="block text-sm font-medium text-slate-700 mb-1">{q.label}</label>
              <textarea value={answers[q.id] || ''} onChange={e => setAnswers(prev => ({...prev, [q.id]: e.target.value}))}
                placeholder={q.placeholder} rows={3}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none placeholder-slate-400" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}