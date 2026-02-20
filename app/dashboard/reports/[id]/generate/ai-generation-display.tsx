'use client';
import { useState, useEffect, useRef } from 'react';
import { ReportStepper } from '@/components/report-stepper';

interface GeneratedSection {
  id: string; title: string; content: string;
  metrics: Array<{ label: string; value: string; change?: string; changeDirection?: string; vsbudget?: string }>;
  included: boolean; skipReason: string | null;
}

interface AIGenerationDisplayProps {
  status: 'idle' | 'generating' | 'completed' | 'error';
  streamText: string;
  sections: GeneratedSection[];
  error: string | null;
  usage: { inputTokens: number; outputTokens: number } | null;
  onRegenerateSection: (sectionId: string) => void;
  tier?: string;
}

interface AnalysisStage {
  id: string; label: string; detail: string; status: 'pending' | 'active' | 'complete';
}

// ── Warm Palette ──
const W = {
  accent: '#00B7DB', accentD: '#0EA5C7',
  bg: '#FFFFFF', bgAlt: '#F7F5F1', bgWarm: '#FAF9F7',
  text: '#1A1A1A', textMid: '#4A4A4A', textSoft: '#7A7A7A', textMuted: '#A3A3A3',
  border: '#E8E5E0', borderL: '#F0EDE8',
  green: '#29581D', greenBg: '#29581D08', greenBgMed: '#29581D14', greenBorder: '#29581D25',
  red: '#CC0000', gold: '#B8960F',
};

// ── Content Renderers (unchanged logic) ──

function renderGeneratedContent(content: string): string {
  if (!content) return '';
  let html = content.replace(/\\n/g, '\n');
  const hasInlineHTML = /<(?:div|table|svg|span|style|tr|td|th)\b/i.test(html);
  if (hasInlineHTML) {
    const parts = html.split(/(<(?:div|table|svg|style)[\s\S]*?<\/(?:div|table|svg|style)>)/gi);
    return parts.map((part) => /^<(?:div|table|svg|style)/i.test(part.trim()) ? part : convertTextToHTML(part)).join('');
  }
  return convertTextToHTML(html);
}

function convertTextToHTML(text: string): string {
  if (!text.trim()) return '';
  return text
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n\n+/g, '</p><p style="margin:8px 0;line-height:1.6;">')
    .replace(/\n/g, '<br/>')
    .replace(/^(.+)/, '<p style="margin:8px 0;line-height:1.6;">$1')
    .replace(/(.+)$/, '$1</p>');
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// ── Analysis Stages ──

const ANALYSIS_STAGES: Omit<AnalysisStage, 'status'>[] = [
  { id: 'parse', label: 'Parsing Financial Documents', detail: 'Extracting data from uploaded T-12, rent roll, and supporting files' },
  { id: 'validate', label: 'Validating Data Integrity', detail: 'Cross-referencing line items and verifying month alignment' },
  { id: 'kpi', label: 'Calculating Key Performance Indicators', detail: 'NOI, occupancy rates, revenue per unit, expense ratios' },
  { id: 'variance', label: 'Analyzing Budget Variance', detail: 'Comparing actuals to budget across all GL categories' },
  { id: 'trends', label: 'Evaluating Trends & Patterns', detail: 'Month-over-month changes, trailing averages, seasonality' },
  { id: 'narrative', label: 'Generating Investor Narrative', detail: 'Writing institutional-quality prose for each report section' },
  { id: 'compile', label: 'Compiling Final Report', detail: 'Assembling sections, metrics, and formatting output' },
];

// ── Main Component ──

export default function AIGenerationDisplay({ status, streamText, sections, error, usage, onRegenerateSection, tier }: AIGenerationDisplayProps) {
  const [stages, setStages] = useState<AnalysisStage[]>(
    ANALYSIS_STAGES.map(s => ({ ...s, status: 'pending' as const }))
  );
  const [liveStats, setLiveStats] = useState({ dataPoints: 0, lineItems: 0, sectionsBuilt: 0, elapsedSeconds: 0 });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Drive stage progression based on stream text length
  useEffect(() => {
    if (status !== 'generating') return;
    const len = streamText.length;
    const thresholds = [
      { min: 0, stageIndex: 0 }, { min: 50, stageIndex: 1 }, { min: 200, stageIndex: 2 },
      { min: 800, stageIndex: 3 }, { min: 2000, stageIndex: 4 }, { min: 4000, stageIndex: 5 },
      { min: 7000, stageIndex: 6 },
    ];
    let activeIndex = 0;
    for (const t of thresholds) { if (len >= t.min) activeIndex = t.stageIndex; }
    setStages(prev => prev.map((s, i) => ({
      ...s, status: i < activeIndex ? 'complete' : i === activeIndex ? 'active' : 'pending',
    })));
    setLiveStats(prev => ({
      ...prev,
      dataPoints: Math.min(Math.floor(len * 0.8), 12000),
      lineItems: Math.min(Math.floor(len * 0.15), 2400),
      sectionsBuilt: Math.min(Math.floor(activeIndex * 1.5), tier === 'institutional' ? 15 : tier === 'professional' ? 10 : 4),
    }));
  }, [streamText, status, tier]);

  // Elapsed timer
  useEffect(() => {
    if (status === 'generating' && !startTimeRef.current) {
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        if (startTimeRef.current) setLiveStats(prev => ({ ...prev, elapsedSeconds: Math.floor((Date.now() - startTimeRef.current!) / 1000) }));
      }, 1000);
    }
    if (status === 'completed' || status === 'error') { if (timerRef.current) clearInterval(timerRef.current); }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status]);

  // Mark all complete
  useEffect(() => {
    if (status === 'completed') setStages(prev => prev.map(s => ({ ...s, status: 'complete' as const })));
  }, [status]);

  // ════════════════════════════════════════
  // IDLE STATE
  // ════════════════════════════════════════
  if (status === 'idle') {
    return (
      <div style={{ textAlign: 'center', padding: '64px 24px' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16, margin: '0 auto 16px',
          background: `${W.accent}08`, border: `1px solid ${W.accent}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={W.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p style={{ fontFamily: 'var(--font-display, Georgia, serif)', fontSize: 18, fontWeight: 500, color: W.text }}>Ready to generate your report</p>
        <p style={{ fontSize: 13, color: W.textMuted, marginTop: 4 }}>Click "Generate Report" to start the analysis engine</p>
      </div>
    );
  }

  // ════════════════════════════════════════
  // ERROR STATE
  // ════════════════════════════════════════
  if (status === 'error') {
    return (
      <div style={{
        padding: 24, background: `${W.red}06`, border: `1px solid ${W.red}20`,
        borderRadius: 14, display: 'flex', alignItems: 'flex-start', gap: 14,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, background: `${W.red}10`, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={W.red} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: W.red }}>Generation Error</h3>
          <p style={{ fontSize: 13, color: `${W.red}CC`, marginTop: 4 }}>{error}</p>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════
  // GENERATING STATE — Variation C Layout
  // ════════════════════════════════════════
  if (status === 'generating') {
    const completedCount = stages.filter(s => s.status === 'complete').length;
    const progress = Math.round((completedCount / stages.length) * 100);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <ReportStepper currentStep={3} />
        {/* ── Hero Card with progress ── */}
        <div style={{
          background: W.bg, border: `1px solid ${W.border}`, borderRadius: 16,
          padding: '28px 32px',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%', background: W.accent,
                boxShadow: `0 0 0 3px ${W.accent}20`,
                animation: 'pulse 1.4s ease-in-out infinite',
              }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: W.accent, textTransform: 'uppercase' as const, letterSpacing: '0.07em' }}>
                Processing
              </span>
            </div>
            <div style={{ textAlign: 'right' as const }}>
              <div style={{
                fontFamily: 'var(--font-display, Georgia, serif)',
                fontSize: 38, fontWeight: 500, color: W.accent,
                fontVariantNumeric: 'tabular-nums', lineHeight: 1,
              }}>
                {progress}%
              </div>
              <div style={{ fontSize: 11, color: W.textMuted, marginTop: 3 }}>{formatTime(liveStats.elapsedSeconds)} elapsed</div>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ height: 5, background: W.borderL, borderRadius: 100, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 100, background: W.accent,
              width: `${Math.max(progress, 3)}%`,
              transition: 'width 0.7s ease-out',
            }} />
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {[
            { label: 'Data Points', value: liveStats.dataPoints.toLocaleString() },
            { label: 'Line Items', value: liveStats.lineItems.toLocaleString() },
            { label: 'Sections', value: `${liveStats.sectionsBuilt}` },
            { label: 'Time Elapsed', value: formatTime(liveStats.elapsedSeconds) },
          ].map(s => (
            <div key={s.label} style={{ background: W.bg, border: `1px solid ${W.border}`, borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: W.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontFamily: 'var(--font-display, Georgia, serif)', fontSize: 21, fontWeight: 500, color: W.text, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* ── Vertical Timeline ── */}
        <div style={{ background: W.bg, border: `1px solid ${W.border}`, borderRadius: 16, padding: '24px 28px 20px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: W.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 16 }}>Pipeline</div>

          <div style={{ position: 'relative' }}>
            {/* Vertical connecting line */}
            <div style={{ position: 'absolute', left: 15, top: 16, bottom: 16, width: 2, background: W.borderL, borderRadius: 100 }}>
              <div style={{
                width: '100%', borderRadius: 100, background: W.green,
                height: `${Math.min((completedCount / (stages.length - 1)) * 100, 100)}%`,
                transition: 'height 0.5s ease',
              }} />
            </div>

            {stages.map((stage, i) => {
              const isDone = stage.status === 'complete';
              const isActive = stage.status === 'active';
              return (
                <div key={stage.id} style={{ position: 'relative', display: 'flex', gap: 16, paddingBottom: i < stages.length - 1 ? 4 : 0 }}>
                  {/* Node */}
                  <div style={{
                    width: 32, height: 32, borderRadius: 10, flexShrink: 0, zIndex: 1,
                    background: isDone ? W.green : isActive ? W.accent : W.bg,
                    border: isDone || isActive ? 'none' : `2px solid ${W.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: isActive ? `0 0 0 4px ${W.accent}18` : isDone ? `0 2px 6px ${W.green}18` : 'none',
                    transition: 'all 0.3s',
                  }}>
                    {isDone ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    ) : isActive ? (
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />
                    ) : (
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: W.border }} />
                    )}
                  </div>

                  {/* Content */}
                  <div style={{
                    flex: 1, paddingBottom: 18,
                    borderBottom: i < stages.length - 1 ? `1px solid ${W.borderL}` : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <h3 style={{
                        fontSize: 13, fontWeight: 600,
                        color: isDone ? W.green : isActive ? W.text : W.textMuted,
                        transition: 'color 0.3s',
                      }}>{stage.label}</h3>
                      {isDone && <span style={{ fontSize: 11, fontWeight: 600, color: W.green }}>Done</span>}
                      {isActive && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: W.accent, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: W.accent, animation: 'pulse 1.4s infinite' }} />
                          Active
                        </span>
                      )}
                    </div>
                    {(isActive || isDone) && (
                      <p style={{ fontSize: 12, color: W.textSoft, lineHeight: 1.5, marginTop: 4 }}>{stage.detail}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.35 } }`}</style>
      </div>
    );
  }

  // ════════════════════════════════════════
  // COMPLETED STATE
  // ════════════════════════════════════════
  const includedSections = sections.filter(s => s.included);
  const skippedSections = sections.filter(s => !s.included);
  const totalMetrics = includedSections.reduce((sum, s) => sum + (s.metrics?.length || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <ReportStepper currentStep={4} />
      {/* Completion Banner */}
      <div style={{
        padding: 24, background: W.greenBg, border: `1px solid ${W.greenBorder}`,
        borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: W.greenBgMed, border: `1px solid ${W.greenBorder}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={W.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display, Georgia, serif)', fontSize: 16, fontWeight: 500, color: W.green }}>
              Report Generated Successfully
            </h2>
            <p style={{ fontSize: 12, color: W.textSoft, marginTop: 2 }}>
              {includedSections.length} sections with {totalMetrics} key metrics
            </p>
          </div>
        </div>
        {usage && (
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: W.textMuted }}>
            <span>In: {usage.inputTokens.toLocaleString()}</span>
            <span>Out: {usage.outputTokens.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Generated Sections */}
      {includedSections.map(section => (
        <div key={section.id} style={{ background: W.bg, border: `1px solid ${W.border}`, borderRadius: 14, overflow: 'hidden' }}>
          {/* Section header */}
          <div style={{
            padding: '16px 24px', borderBottom: `1px solid ${W.borderL}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: W.text }}>{section.title}</h3>
            <button onClick={() => onRegenerateSection(section.id)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 13, fontWeight: 600, color: W.accent,
                background: 'none', border: 'none', cursor: 'pointer',
                transition: 'opacity 0.2s',
              }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Regenerate
            </button>
          </div>

          {/* Metrics */}
          {section.metrics?.length > 0 && (
            <div style={{
              padding: '16px 24px', background: W.bgWarm,
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10,
            }}>
              {section.metrics.map((m, i) => (
                <div key={i} style={{
                  background: W.bg, border: `1px solid ${W.borderL}`, borderRadius: 10, padding: 12,
                }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: W.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{m.label}</p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: W.text, fontVariantNumeric: 'tabular-nums', marginTop: 4 }}>{m.value}</p>
                  {m.change && (
                    <p style={{
                      fontSize: 11, marginTop: 3, fontWeight: 600,
                      color: m.changeDirection === 'up' ? W.green : m.changeDirection === 'down' ? W.red : W.textMuted,
                    }}>
                      {m.changeDirection === 'up' ? '▲' : m.changeDirection === 'down' ? '▼' : '—'} {m.change}
                      {m.vsbudget && <span style={{ color: W.textMuted, marginLeft: 6, fontWeight: 500 }}>vs budget: {m.vsbudget}</span>}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Section content */}
          <div style={{ padding: '20px 24px', fontSize: 14, lineHeight: 1.65, color: W.textMid }}
            dangerouslySetInnerHTML={{ __html: renderGeneratedContent(section.content) }} />
        </div>
      ))}

      {/* Skipped sections */}
      {skippedSections.length > 0 && (
        <div style={{
          background: W.bgWarm, border: `1px solid ${W.border}`, borderRadius: 14, padding: 20,
        }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: W.textSoft, marginBottom: 8 }}>Sections skipped (insufficient data):</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {skippedSections.map(s => (
              <p key={s.id} style={{ fontSize: 13, color: W.textMuted }}>
                {s.title}{s.skipReason ? `: ${s.skipReason}` : ''}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}



