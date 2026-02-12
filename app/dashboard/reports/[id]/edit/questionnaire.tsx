'use client';
import { useState, useEffect } from 'react';

interface QuestionnaireProps {
  initialAnswers: Record<string, string>;
  distributionStatus: string;
  distributionNote: string;
  selectedMonth: number;
  selectedYear: number;
  onAnswersChanged: (answers: Record<string, string>) => void;
  onDistributionChanged: (status: string, note: string) => void;
  onMonthChanged: (month: number, year: number) => void;
}

const QUESTIONS = [
  { id: 'executive_summary_notes', label: 'Executive Summary', placeholder: 'What should investors know this month?' },
  { id: 'occupancy_notes', label: 'Occupancy Updates', placeholder: 'Notable occupancy changes?' },
  { id: 'lease_expiration_notes', label: 'Lease Expirations & Renewals', placeholder: 'Renewals completed? Upcoming expirations?' },
  { id: 'financial_notes', label: 'Financial Performance', placeholder: 'Revenue or expense items to highlight?' },
  { id: 'delinquency_notes', label: 'Delinquency & Collections', placeholder: 'Delinquent tenants? Collection actions?' },
  { id: 'leasing_notes', label: 'Leasing Activity', placeholder: 'Traffic trends? Application volume?' },
  { id: 'capex_notes', label: 'Capital Expenditures', placeholder: 'Renovation updates? CapEx spending?' },
  { id: 'market_notes', label: 'Market Context', placeholder: 'Local market changes? New competitive supply?' },
  { id: 'covenant_notes', label: 'Loan Covenant Notes', placeholder: 'Covenant concerns? DSCR status?' },
  { id: 'outlook_notes', label: 'Outlook', placeholder: 'What should investors expect coming months?' },
];

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function Questionnaire({
  initialAnswers, distributionStatus: initDist, distributionNote: initNote,
  selectedMonth: initMonth, selectedYear: initYear,
  onAnswersChanged, onDistributionChanged, onMonthChanged,
}: QuestionnaireProps) {
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
  const [distStatus, setDistStatus] = useState(initDist || 'none');
  const [distNote, setDistNote] = useState(initNote || '');
  const [month, setMonth] = useState(initMonth || new Date().getMonth() + 1);
  const [year, setYear] = useState(initYear || new Date().getFullYear());

  useEffect(() => {
    const t = setTimeout(() => onAnswersChanged(answers), 500);
    return () => clearTimeout(t);
  }, [answers, onAnswersChanged]);

  const curYear = new Date().getFullYear();

  return (
    <div className="space-y-8">
      {/* Report Period */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Period</h3>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <select value={month} onChange={e => { const m = parseInt(e.target.value); setMonth(m); onMonthChanged(m, year); }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500">
              {MONTHS.map((n, i) => <option key={i} value={i+1}>{n}</option>)}
            </select>
          </div>
          <div className="w-32">
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <select value={year} onChange={e => { const y = parseInt(e.target.value); setYear(y); onMonthChanged(month, y); }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500">
              {[curYear-1, curYear, curYear+1].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Distribution Status */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribution Update</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <div className="flex gap-3">
              {[{v:'none',l:'No Update'},{v:'distributing',l:'Distributing'},{v:'accruing',l:'Accruing'},{v:'paused',l:'Paused'}].map(o => (
                <button key={o.v} onClick={() => { setDistStatus(o.v); onDistributionChanged(o.v, distNote); }}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition ${distStatus === o.v ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  {o.l}
                </button>
              ))}
            </div>
          </div>
          {distStatus !== 'none' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Distribution Note (optional)</label>
              <textarea value={distNote} onChange={e => { setDistNote(e.target.value); onDistributionChanged(distStatus, e.target.value); }}
                placeholder="Enter distribution narrative for investors..." rows={3} maxLength={500}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500" />
              <p className="text-xs text-gray-400 mt-1">{distNote.length}/500</p>
            </div>
          )}
        </div>
      </div>

      {/* Section Questions */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Asset Manager Notes</h3>
        <p className="text-sm text-gray-500 mb-6">Fill in what you know — leave blank to skip or let Claude extract from files.</p>
        <div className="space-y-6">
          {QUESTIONS.map(q => (
            <div key={q.id}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{q.label}</label>
              <textarea value={answers[q.id] || ''} onChange={e => setAnswers(prev => ({...prev, [q.id]: e.target.value}))}
                placeholder={q.placeholder} rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 placeholder-gray-400" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
