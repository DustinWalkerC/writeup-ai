'use client';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import FileUploader from './file-uploader';
import { getQuestionsForSections } from '@/lib/question-section-map';
import { ReportStepper } from '@/components/report-stepper';
import type { SectionId } from '@/lib/section-definitions';

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
        body: JSON.stringify({ questionnaire_answers: answers, distribution_status: distStatus, distribution_note: distNote, input_mode: inputMode, freeform_narrative: freeformNarrative }),
      });
    } finally { setSaving(false); }
  }, [report.id, answers, distStatus, distNote, inputMode, freeformNarrative]);

  const handleGenerate = useCallback(async () => {
    if (!files.some((f) => f.file_type === 't12')) { alert('Please upload a T-12 Operating Statement before generating.'); return; }
    setGenerating(true); await handleSave();
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const monthNum = monthNames.indexOf(month) + 1 || new Date().getMonth() + 1;
    const params = new URLSearchParams({ propertyId: (report.property_id as string) || (property.id as string), month: String(monthNum), year: String(year), tier: activeTier, distStatus, distNote, answers: JSON.stringify(answers), autoGenerate: 'true' });
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
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Back to Reports
        </button>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display, Georgia, serif)', fontSize: 26, fontWeight: 500, color: W.text, letterSpacing: '-0.015em' }}>
              {propertyName} — {month} {year}
            </h1>
            <p style={{ fontSize: 14, color: W.textSoft, marginTop: 4 }}>Upload files and provide context for your report</p>
          </div>
          <span style={{
            padding: '5px 14px', fontSize: 12, fontWeight: 600, color: W.gold,
            background: `${W.gold}12`, border: `1px solid ${W.gold}25`, borderRadius: 100,
          }}>Draft</span>
        </div>
      </div>

      {/* Stepper */}
      <ReportStepper currentStep={2} />

      {/* File Upload */}
      <div style={cardStyle}>
        <FileUploader reportId={report.id as string} existingFiles={files} onFilesChanged={setFiles} tier={activeTier} />
      </div>

      {/* Distribution Update */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={sectionHeading}>Distribution Update</h3>
          <span style={{ fontSize: 10, fontWeight: 600, color: W.textMuted, background: W.bgAlt, border: `1px solid ${W.borderL}`, padding: '3px 10px', borderRadius: 100 }}>Appears in Asset Manager Outlook</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Status</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {[
                { v: 'none', l: 'No Update' }, { v: 'distributing', l: 'Distributing' },
                { v: 'accruing', l: 'Accruing' }, { v: 'paused', l: 'Paused' },
              ].map((o) => (
                <button key={o.v} onClick={() => setDistStatus(o.v)}
                  style={{
                    padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    transition: 'all 0.2s', border: 'none',
                    color: distStatus === o.v ? '#fff' : W.textMid,
                    background: distStatus === o.v ? W.accent : W.bgAlt,
                    boxShadow: distStatus === o.v ? `0 2px 10px ${W.accent}25` : 'none',
                  }}>{o.l}</button>
              ))}
            </div>
          </div>
          {distStatus !== 'none' && (
            <div>
              <label style={labelStyle}>Distribution Note (optional)</label>
              <textarea value={distNote} onChange={(e) => setDistNote(e.target.value)}
                placeholder="Enter distribution narrative for investors..." rows={3} maxLength={500}
                style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              <p style={{ fontSize: 11, color: W.textMuted, marginTop: 4 }}>{distNote.length}/500</p>
            </div>
          )}
        </div>
      </div>

      {/* Asset Manager Notes */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h3 style={sectionHeading}>Asset Manager Notes</h3>
            <p style={{ fontSize: 13, color: W.textSoft, marginTop: 4 }}>Provide context for the analysis engine. Leave sections blank to auto-extract from files.</p>
          </div>
        </div>

        {/* Mode Toggle */}
        <div style={{ display: 'flex', gap: 3, padding: 3, background: W.bgAlt, borderRadius: 10, marginBottom: 24, width: 'fit-content' }}>
          {[
            { mode: 'guided' as InputMode, label: 'Guided Questions', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg> },
            { mode: 'freeform' as InputMode, label: 'Freeform Notes', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg> },
          ].map(tab => (
            <button key={tab.mode} onClick={() => setInputMode(tab.mode)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8,
                fontSize: 13, fontWeight: inputMode === tab.mode ? 600 : 500, border: 'none', cursor: 'pointer',
                color: inputMode === tab.mode ? W.text : W.textSoft,
                background: inputMode === tab.mode ? W.bg : 'transparent',
                boxShadow: inputMode === tab.mode ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.2s',
              }}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* Guided Mode */}
        {inputMode === 'guided' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {filteredQuestions.map((q) => {
              const hintsOpen = expandedHints.has(q.id);
              return (
                <div key={q.id}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <label style={labelStyle}>{q.label}</label>
                    <button onClick={() => toggleHints(q.id)}
                      style={{
                        padding: 4, borderRadius: 6, border: 'none', cursor: 'pointer',
                        color: hintsOpen ? W.accent : W.textMuted,
                        background: hintsOpen ? `${W.accent}0D` : 'transparent',
                        transition: 'all 0.2s',
                      }} title="Suggested prompts">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                      </svg>
                    </button>
                  </div>

                  {hintsOpen && q.hints && q.hints.length > 0 && (
                    <div style={{
                      marginBottom: 8, padding: 12, background: `${W.accent}06`,
                      border: `1px solid ${W.accent}15`, borderRadius: 10,
                    }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: W.accent, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 6 }}>Consider addressing:</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {q.hints.map((hint: string, i: number) => (
                          <div key={i} style={{ fontSize: 12, color: W.textMid, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                            <span style={{ color: `${W.accent}80`, marginTop: 2, flexShrink: 0 }}>&#8226;</span>
                            {hint}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <textarea value={answers[q.id] || ''} onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    placeholder={q.placeholder} rows={3} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                </div>
              );
            })}
          </div>
        )}

        {/* Freeform Mode */}
        {inputMode === 'freeform' && (
          <div>
            <p style={{ fontSize: 13, color: W.textSoft, marginBottom: 12 }}>
              Paste your notes, commentary, or any context you want included in the report.
            </p>
            <textarea value={freeformNarrative} onChange={(e) => setFreeformNarrative(e.target.value)}
              placeholder="Paste your monthly notes here — property updates, market observations, investor talking points, action items, anything relevant to this period..."
              rows={14} style={{ ...inputStyle, lineHeight: 1.6 }} onFocus={onFocus} onBlur={onBlur} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <p style={{ fontSize: 11, color: W.textMuted }}>Tip: Include specific numbers, tenant names, or project details for a more accurate report.</p>
              <p style={{ fontSize: 11, color: W.textMuted }}>{freeformNarrative.length.toLocaleString()} characters</p>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderTop: `1px solid ${W.border}`, paddingTop: 24, marginTop: 24, paddingBottom: 32,
      }}>
        <button onClick={handleSave} disabled={saving}
          style={{
            padding: '11px 20px', fontSize: 13, fontWeight: 600, color: W.textMid,
            background: W.bg, border: `1.5px solid ${W.border}`, borderRadius: 10,
            cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1, transition: 'all 0.2s',
          }}>
          {saving ? 'Saving...' : 'Save Draft'}
        </button>
        <button onClick={handleGenerate} disabled={generating || !hasT12}
          style={{
            padding: '13px 40px', fontSize: 14, fontWeight: 700, borderRadius: 12, border: 'none',
            display: 'flex', alignItems: 'center', gap: 8,
            transition: 'all 0.25s',
            ...(hasT12 ? {
              color: '#fff', background: W.accent, cursor: generating ? 'not-allowed' : 'pointer',
              boxShadow: `0 4px 20px ${W.accent}35`, opacity: generating ? 0.6 : 1,
            } : {
              color: W.textMuted, background: W.bgAlt, cursor: 'not-allowed', boxShadow: 'none',
            }),
          }}>
          {generating ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="animate-spin">
                <circle opacity="0.25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path opacity="0.75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Preparing Report...
            </>
          ) : hasT12 ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              Generate Report
            </>
          ) : 'Upload T-12 to Generate'}
        </button>
      </div>
    </div>
  );
}

