'use client';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import FileUploader from './file-uploader';
import { getQuestionsForSections } from '@/lib/question-section-map';
import { ReportStepper } from '@/components/report-stepper';
import type { SectionId } from '@/lib/section-definitions';
import { ALL_SECTIONS } from '@/lib/section-definitions';

interface UploadedFile {
  id: string; file_type: string; file_name: string; file_size: number; storage_path: string; created_at: string;
}
interface ReportEditClientProps {
  report: Record<string, unknown>; property: Record<string, unknown>; existingFiles: UploadedFile[]; tier: string;
}
type InputMode = 'guided' | 'freeform';
type TierSlug = 'foundational' | 'professional' | 'institutional';

const W = {
  accent: '#00B7DB',
  bg: '#FFFFFF', bgAlt: '#F7F5F1', bgWarm: '#FAF9F7',
  text: '#1A1A1A', textMid: '#4A4A4A', textSoft: '#7A7A7A', textMuted: '#A3A3A3',
  border: '#E8E5E0', borderL: '#F0EDE8',
  green: '#008A3E', red: '#CC0000', gold: '#B8960F',
};

const cardStyle: React.CSSProperties = { background: W.bg, border: `1px solid ${W.border}`, borderRadius: 14, padding: 24, marginBottom: 24 };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: W.textMid, marginBottom: 6 };
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 16px', fontSize: 14, color: W.text,
  fontFamily: 'var(--font-body, sans-serif)',
  background: W.bg, border: `1px solid ${W.border}`, borderRadius: 10,
  outline: 'none', transition: 'all 0.25s cubic-bezier(0.22,1,0.36,1)', resize: 'vertical' as const,
};
const sectionHeading: React.CSSProperties = {
  fontFamily: 'var(--font-display, Georgia, serif)', fontSize: 18, fontWeight: 500, color: W.text,
};

function onFocus(e: React.FocusEvent<any>) { e.currentTarget.style.borderColor = W.accent; e.currentTarget.style.boxShadow = `0 0 0 3px ${W.accent}15`; }
function onBlur(e: React.FocusEvent<any>) { e.currentTarget.style.borderColor = W.border; e.currentTarget.style.boxShadow = 'none'; }

export default function ReportEditClient({ report, property, existingFiles, tier: stripeTier }: ReportEditClientProps) {
  const router = useRouter();
  const [files, setFiles] = useState<UploadedFile[]>(existingFiles);
  const [answers, setAnswers] = useState<Record<string, string>>((report.questionnaire_answers as Record<string, string>) || {});
  const [distStatus, setDistStatus] = useState((report.distribution_status as string) || 'none');
  const [distNote, setDistNote] = useState((report.distribution_note as string) || '');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>((report.input_mode as InputMode) || 'guided');
  const [freeformNarrative, setFreeformNarrative] = useState((report.freeform_narrative as string) || '');
  const [enabledSections, setEnabledSections] = useState<string[] | null>(null);
  const [expandedHints, setExpandedHints] = useState<Set<string>>(new Set());

  const toggleHints = useCallback((questionId: string) => {
    setExpandedHints(prev => { const next = new Set(prev); if (next.has(questionId)) next.delete(questionId); else next.add(questionId); return next; });
  }, []);

  const [activeTier, setActiveTier] = useState<TierSlug>(stripeTier as TierSlug);

  useEffect(() => {
    function syncTier() {
      if (process.env.NODE_ENV === 'development') {
        const override = localStorage.getItem('writeup_tier_override');
        if (override && override !== 'none') setActiveTier(override as TierSlug); else setActiveTier(stripeTier as TierSlug);
      }
    }
    syncTier(); window.addEventListener('tierOverrideChanged', syncTier);
    return () => window.removeEventListener('tierOverrideChanged', syncTier);
  }, [stripeTier]);

  useEffect(() => {
    async function fetchTemplate() {
      try { const res = await fetch('/api/settings'); const data = await res.json(); if (data.success && data.data?.report_template) setEnabledSections(data.data.report_template); } catch {}
    }
    fetchTemplate();
  }, []);

  const filteredQuestions = useMemo(() => getQuestionsForSections((enabledSections as SectionId[] | null) || null), [enabledSections]);

  const month = (report.month as string) || '';
  const year = (report.year as number) || new Date().getFullYear();

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await fetch(`/api/reports/${report.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
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
    if (!files.some((f) => f.file_type === 't12')) { alert('Please upload a T-12 Operating Statement before generating.'); return; }
    setGenerating(true); await handleSave();
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const monthNum = monthNames.indexOf(month) + 1 || new Date().getMonth() + 1;
    const params = new URLSearchParams({
      propertyId: (report.property_id as string) || (property.id as string),
      month: String(monthNum),
      year: String(year),
      tier: activeTier,
      distStatus,
      distNote,
      answers: JSON.stringify(answers),
      autoGenerate: 'true',
    });
    router.push(`/dashboard/reports/${report.id}/generate?${params.toString()}`);
  }, [files, handleSave, report.id, report.property_id, property.id, month, year, activeTier, distStatus, distNote, answers, router]);

  const hasT12 = files.some((f) => f.file_type === 't12');
  const propertyName = (property.name as string) || 'Property';

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <button onClick={() => router.push('/dashboard/reports')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, color: W.textSoft, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 16 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          Back to Reports
        </button>

        <h1 style={{ fontFamily: 'var(--font-display, Georgia, serif)', fontSize: 26, fontWeight: 500, color: W.text }}>
          {propertyName} — {month} {year}
        </h1>
      </div>

      <ReportStepper currentStep={2} />

      <div style={cardStyle}>
        <FileUploader reportId={report.id as string} existingFiles={files} onFilesChanged={setFiles} tier={activeTier} />
      </div>

      <div style={cardStyle}>
        <h3 style={sectionHeading}>Asset Manager Notes</h3>

        <div style={{ display: 'flex', gap: 3, padding: 3, background: W.bgAlt, borderRadius: 10, marginBottom: 24, width: 'fit-content' }}>
          {['guided','freeform'].map(mode => (
            <button key={mode} onClick={() => setInputMode(mode as InputMode)}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                background: inputMode === mode ? W.bg : 'transparent'
              }}>
              {mode}
            </button>
          ))}
        </div>

        {inputMode === 'guided' && (
          <div>
            {filteredQuestions.map(q => (
              <textarea
                key={q.id}
                value={answers[q.id] || ''}
                onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                placeholder={q.placeholder}
                rows={3}
                style={inputStyle}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            ))}
          </div>
        )}

        {inputMode === 'freeform' && (
          <textarea
            value={freeformNarrative}
            onChange={(e) => setFreeformNarrative(e.target.value)}
            rows={14}
            style={inputStyle}
          />
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={handleSave}>{saving ? 'Saving...' : 'Save Draft'}</button>

        <button onClick={handleGenerate} disabled={!hasT12 || generating}>
          {generating ? 'Preparing Report...' : 'Generate Report'}
        </button>
      </div>
    </div>
  );
}
