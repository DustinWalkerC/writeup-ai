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
  accent: '#00B7DB', accentD: '#1D98B1',
  bg: '#FFFFFF', bgAlt: '#F7F5F1', bgWarm: '#FAF9F7',
  text: '#1A1A1A', textMid: '#4A4A4A', textSoft: '#5A5A5A', textMuted: '#6B6B6B',
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
  fontFamily: 'var(--font-display, Georgia, serif)', fontSize: 18, fontWeight: 500, color: W.text, marginBottom: 4,
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
  const answeredCount = filteredQuestions.filter(q => (answers[q.id] || '').trim().length > 0).length;

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

      {/* ═══ FILE UPLOAD ═══ */}
      <div style={cardStyle}>
        <FileUploader reportId={report.id as string} existingFiles={files} onFilesChanged={setFiles} tier={activeTier} />
      </div>

      {/* ═══ DISTRIBUTION UPDATE ═══ */}
      <div style={cardStyle}>
        <h3 style={sectionHeading}>Distribution Update</h3>
        <p style={{ fontSize: 13, color: W.textSoft, marginBottom: 16, lineHeight: 1.5 }}>
          If applicable, include a distribution status for your investors.
        </p>

        <div style={{ marginBottom: 12 }}>
          <label style={{ ...labelStyle, marginBottom: 10 }}>Status</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { v: 'none', l: 'No Update' },
              { v: 'distributing', l: 'Distributing' },
              { v: 'accruing', l: 'Accruing' },
              { v: 'paused', l: 'Paused' },
            ].map(o => {
              const isActive = distStatus === o.v;
              return (
                <button key={o.v}
                  onClick={() => setDistStatus(o.v)}
                  style={{
                    padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.22,1,0.36,1)',
                    border: isActive ? 'none' : `1px solid ${W.border}`,
                    background: isActive ? W.accent : W.bg,
                    color: isActive ? '#fff' : W.textMid,
                    boxShadow: isActive ? `0 2px 8px ${W.accent}30` : 'none',
                  }}>
                  {o.l}
                </button>
              );
            })}
          </div>
        </div>

        {distStatus !== 'none' && (
          <div style={{ marginTop: 16 }}>
            <label style={labelStyle}>Distribution Note (optional)</label>
            <textarea
              value={distNote}
              onChange={e => setDistNote(e.target.value)}
              placeholder="Enter distribution narrative for investors..."
              rows={3} maxLength={500}
              style={inputStyle}
              onFocus={onFocus} onBlur={onBlur}
            />
            <p style={{ fontSize: 11, color: W.textMuted, marginTop: 4 }}>{distNote.length}/500</p>
          </div>
        )}
      </div>

      {/* ═══ ASSET MANAGER NOTES ═══ */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h3 style={sectionHeading}>Asset Manager Notes</h3>
          {inputMode === 'guided' && (
            <span style={{ fontSize: 12, fontWeight: 500, color: W.textMuted }}>
              {answeredCount}/{filteredQuestions.length} answered
            </span>
          )}
        </div>
        <p style={{ fontSize: 13, color: W.textSoft, marginBottom: 20, lineHeight: 1.5 }}>
          Fill in what you know — leave blank to let the analysis engine extract from your files.
          {enabledSections && (
            <span style={{ color: W.textMuted }}> Showing {filteredQuestions.length} questions based on your report sections.</span>
          )}
        </p>

        {/* Input mode toggle */}
        <div style={{
          display: 'inline-flex', gap: 2, padding: 3, background: W.bgAlt, borderRadius: 10, marginBottom: 24,
        }}>
          {(['guided', 'freeform'] as InputMode[]).map(mode => {
            const isActive = inputMode === mode;
            return (
              <button key={mode} onClick={() => setInputMode(mode)}
                style={{
                  padding: '7px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  border: 'none', cursor: 'pointer',
                  background: isActive ? W.bg : 'transparent',
                  color: isActive ? W.text : W.textMuted,
                  boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.2s cubic-bezier(0.22,1,0.36,1)',
                }}>
                {mode === 'guided' ? 'Guided Questions' : 'Freeform Notes'}
              </button>
            );
          })}
        </div>

        {/* ─── GUIDED QUESTIONS ─── */}
        {inputMode === 'guided' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {filteredQuestions.map(q => {
              const hintsOpen = expandedHints.has(q.id);
              const hasHints = q.hints && q.hints.length > 0;
              const hasAnswer = (answers[q.id] || '').trim().length > 0;

              return (
                <div key={q.id}>
                  {/* Question label + lightbulb */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: W.textMid, flex: 1 }}>
                      {q.label}
                    </label>
                    {hasAnswer && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={W.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                    {hasHints && (
                      <button
                        onClick={() => toggleHints(q.id)}
                        title="Show writing prompts"
                        style={{
                          flexShrink: 0, padding: 4, borderRadius: 6, border: 'none', cursor: 'pointer',
                          background: hintsOpen ? '#FEF3C720' : 'transparent',
                          color: hintsOpen ? '#D97706' : '#D4A043',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.2s',
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Expandable hints panel */}
                  {hintsOpen && hasHints && (
                    <div style={{
                      marginBottom: 8, padding: '10px 14px',
                      background: `linear-gradient(135deg, ${W.accent}06, ${W.bgAlt})`,
                      border: `1px solid ${W.accent}18`,
                      borderRadius: 10,
                    }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: W.textSoft, marginBottom: 6 }}>Consider mentioning:</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {q.hints.map((hint: string, i: number) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, color: W.textMid, lineHeight: 1.5 }}>
                            <span style={{ color: W.accent, marginTop: 2, flexShrink: 0 }}>
                              <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor"><circle cx="4" cy="4" r="3" /></svg>
                            </span>
                            {hint}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Textarea */}
                  <textarea
                    value={answers[q.id] || ''}
                    onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                    placeholder={q.placeholder}
                    rows={3}
                    style={inputStyle}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  />
                </div>
              );
            })}

            {filteredQuestions.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: W.textMuted, fontSize: 13 }}>
                No questions available. Configure your report sections in Settings to see relevant questions.
              </div>
            )}
          </div>
        )}

        {/* ─── FREEFORM NOTES ─── */}
        {inputMode === 'freeform' && (
          <div>
            <p style={{ fontSize: 12, color: W.textMuted, marginBottom: 8 }}>
              Write your asset manager commentary in your own words. The analysis engine will incorporate your notes into the relevant sections.
            </p>
            <textarea
              value={freeformNarrative}
              onChange={(e) => setFreeformNarrative(e.target.value)}
              placeholder="Share any context about this month's performance — leasing updates, capital projects, market conditions, operational changes, distribution plans..."
              rows={14}
              style={inputStyle}
              onFocus={onFocus}
              onBlur={onBlur}
            />
            <p style={{ fontSize: 11, color: W.textMuted, marginTop: 4 }}>{freeformNarrative.length} characters</p>
          </div>
        )}
      </div>

      {/* ═══ ACTION BUTTONS ═══ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 40 }}>
        <button onClick={handleSave} disabled={saving}
          style={{
            padding: '10px 24px', fontSize: 14, fontWeight: 600,
            color: W.textMid, background: W.bg, border: `1.5px solid ${W.border}`,
            borderRadius: 10, cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.6 : 1,
            transition: 'all 0.25s cubic-bezier(0.22,1,0.36,1)',
          }}
          onMouseEnter={e => { if (!saving) { e.currentTarget.style.borderColor = `${W.accent}50`; e.currentTarget.style.background = `${W.accent}06`; } }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = W.border; e.currentTarget.style.background = W.bg; }}>
          {saving ? 'Saving...' : 'Save Draft'}
        </button>

        <button onClick={handleGenerate} disabled={!hasT12 || generating}
          style={{
            padding: '12px 32px', fontSize: 14, fontWeight: 700,
            color: '#fff',
            background: (!hasT12 || generating) ? W.textMuted : W.accent,
            border: 'none', borderRadius: 10,
            cursor: (!hasT12 || generating) ? 'not-allowed' : 'pointer',
            boxShadow: (!hasT12 || generating) ? 'none' : `0 2px 12px ${W.accent}30`,
            transition: 'all 0.25s cubic-bezier(0.22,1,0.36,1)',
          }}
          onMouseEnter={e => { if (hasT12 && !generating) e.currentTarget.style.background = W.accentD; }}
          onMouseLeave={e => { if (hasT12 && !generating) e.currentTarget.style.background = W.accent; }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {generating ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Preparing Report...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Generate Report
              </>
            )}
          </span>
        </button>
      </div>

      {!hasT12 && (
        <p style={{ textAlign: 'center', fontSize: 12, color: W.gold, marginTop: -24, marginBottom: 32 }}>
          Upload a T-12 Operating Statement to enable report generation.
        </p>
      )}
    </div>
  );
}
