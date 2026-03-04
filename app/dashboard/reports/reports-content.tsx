// app/dashboard/reports/reports-content.tsx
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  C, PipelineStage, PIPELINE_STAGES, STAGE_STAT_COLORS,
  formatReportPeriod, type PipelineReport,
} from '@/lib/report-pipeline-tokens';
import { PipelineIcons, getIcon } from '@/components/pipeline-icons';
import { PipelineCardGrid, PipelineCardList } from '@/components/report-pipeline-card';
import ReportFilterBar from '@/components/report-filter-bar';
import VersionStack from '@/components/version-stack';
import GeneratingCard from '@/components/generating-card';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

export type { PipelineReport } from '@/lib/report-pipeline-tokens';

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------
interface RawReport {
  id: string;
  property_id: string;
  user_id: string;
  pipeline_stage: string;
  selected_month: number;
  selected_year: number;
  updated_at: string;
  returned?: boolean;
  return_note?: string;
  generation_progress?: number | null;
  generation_status_text?: string | null;
  properties: {
    name: string;
    address?: string;
    city?: string;
    state?: string;
  };
}

type UIReport = {
  id: string;
  property_name: string;
  period: string;
  pipeline_stage: string;
  updated_at: string;
  returned?: boolean;
  return_note?: string;
  _property_id: string;
  _month: number;
  _year: number;
  generation_progress: number | null;
  generation_status_text: string | null;
};

interface ReportsContentProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialReports: any[];
}

// -------------------------------------------------------------------
// Helper: convert raw DB row to UIReport
// -------------------------------------------------------------------
function rawToUI(r: RawReport): UIReport {
  return {
    id: r.id,
    property_name: r.properties?.name || 'Unknown Property',
    period: formatReportPeriod(r.selected_month, r.selected_year),
    pipeline_stage: r.pipeline_stage || 'draft',
    updated_at: r.updated_at,
    returned: r.returned,
    return_note: r.return_note,
    _property_id: r.property_id,
    _month: r.selected_month || 1,
    _year: r.selected_year || new Date().getFullYear(),
    generation_progress: r.generation_progress ?? null,
    generation_status_text: r.generation_status_text ?? null,
  };
}

// -------------------------------------------------------------------
// Injected CSS: highlight glow + mobile responsive overrides
// -------------------------------------------------------------------
const INJECTED_CSS = `
@keyframes reportHighlightGlow {
  0% { box-shadow: 0 0 0 0 rgba(0, 183, 219, 0); border-color: #E8E5E0; }
  12% { box-shadow: 0 0 20px 4px rgba(0, 183, 219, 0.25); border-color: rgba(0, 183, 219, 0.6); }
  40% { box-shadow: 0 0 0 0 rgba(0, 183, 219, 0); border-color: #E8E5E0; }
  55% { box-shadow: 0 0 20px 4px rgba(0, 183, 219, 0.2); border-color: rgba(0, 183, 219, 0.45); }
  100% { box-shadow: 0 0 0 0 rgba(0, 183, 219, 0); border-color: #E8E5E0; }
}
.report-highlight-glow {
  animation: reportHighlightGlow 3s ease-out forwards;
  border-radius: 14px;
  overflow: hidden;
}

/* ═══════════════════════════════════════════════════════════════
   MOBILE RESPONSIVE — 768px breakpoint
   ═══════════════════════════════════════════════════════════════ */
@media (max-width: 768px) {

  /* ── Page-level overflow lock ── */
  .reports-page-wrap {
    min-width: 0 !important;
    overflow-x: hidden !important;
    width: 100% !important;
  }

  /* ── Header: stack title above search+button ── */
  .reports-header {
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 12px !important;
  }
  .reports-header-actions {
    width: 100% !important;
    display: flex !important;
    flex-direction: row !important;
    gap: 8px !important;
  }
  .reports-search-box {
    flex: 1 !important;
    width: auto !important;
    min-width: 0 !important;
    box-sizing: border-box !important;
  }
  .reports-new-btn {
    white-space: nowrap !important;
    padding: 10px 16px !important;
    flex-shrink: 0 !important;
    font-size: 14px !important;
  }
  .reports-new-btn-label { display: none !important; }
  .reports-new-btn-label-short { display: inline !important; }

  /* ── Stat cards: 2-col grid with smaller sizing ── */
  .reports-stat-row {
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
    overflow-x: visible !important;
    gap: 8px !important;
    padding-bottom: 0 !important;
  }
  .reports-stat-card {
    min-width: 0 !important;
    padding: 12px 14px !important;
    border-radius: 12px !important;
  }
  .reports-stat-label {
    font-size: 10px !important;
    letter-spacing: 0.04em !important;
  }
  .reports-stat-count {
    font-size: 22px !important;
  }
  .reports-stat-icon {
    width: 28px !important;
    height: 28px !important;
    border-radius: 8px !important;
  }
  /* Last stat card spans full width on 2-col */
  .reports-stat-last {
    grid-column: 1 / -1 !important;
  }

  /* ── Filter tabs: edge-to-edge on mobile ── */
  .reports-filter-row {
    flex-direction: column !important;
    gap: 10px !important;
    align-items: stretch !important;
  }
  .reports-filter-scroll {
    margin-left: -16px !important;
    margin-right: -16px !important;
    padding-left: 16px !important;
    padding-right: 16px !important;
    overflow: visible !important;
  }
  .reports-view-toggle-row {
    display: flex !important;
    justify-content: center !important;
  }

  /* ── Report card grid: single column ── */
  .reports-grid {
    grid-template-columns: 1fr !important;
  }

  /* ── Report list items: constrain overflow ── */
  .reports-list-wrap {
    min-width: 0 !important;
  }
  .reports-list-wrap > div {
    min-width: 0 !important;
  }

  /* ── Page title sizing ── */
  .reports-page-title {
    font-size: 22px !important;
  }
}
`;

// -------------------------------------------------------------------
// Stat Card (mobile-aware class names)
// -------------------------------------------------------------------
function StatCard({
  label, count, iconName, color, isActive, onClick, isLast,
}: {
  label: string; count: number; iconName: string; color: string; isActive: boolean; onClick: () => void; isLast?: boolean;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      className={`reports-stat-card${isLast ? ' reports-stat-last' : ''}`}
      onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        flex: 1, minWidth: 140, padding: '16px 18px',
        background: isActive ? `${color}08` : C.bg,
        border: `1px solid ${isActive ? `${color}30` : C.border}`,
        borderRadius: 14, cursor: 'pointer', transition: 'all 0.25s',
        transform: hover ? 'translateY(-1px)' : 'none',
        boxShadow: hover ? '0 4px 16px rgba(0,0,0,0.04)' : 'none',
        textAlign: 'left' as const, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div className="reports-stat-label" style={{ fontSize: 14, fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase' as const, color: isActive ? color : C.textSoft, marginBottom: 4 }}>
          {label}
        </div>
        <div className="reports-stat-count" style={{ fontFamily: "'Newsreader', serif", fontSize: 28, fontWeight: 500, color: isActive ? color : C.text, lineHeight: 1 }}>
          {count}
        </div>
      </div>
      <div className="reports-stat-icon" style={{ width: 36, height: 36, borderRadius: 10, background: isActive ? `${color}12` : C.bgAlt, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {getIcon(iconName, isActive ? color : C.textSoft, 16)}
      </div>
    </button>
  );
}

// -------------------------------------------------------------------
// Helper: cast UIReport to PipelineReport for card components
// -------------------------------------------------------------------
function asPipelineReport(r: UIReport): PipelineReport {
  return {
    id: r.id,
    property_name: r.property_name,
    period: r.period,
    pipeline_stage: r.pipeline_stage as PipelineStage,
    updated_at: r.updated_at,
    returned: r.returned,
    return_note: r.return_note,
  };
}

// -------------------------------------------------------------------
// Main Content
// -------------------------------------------------------------------
export default function ReportsContent({ initialReports }: ReportsContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const supabaseRef = useRef(getSupabaseBrowserClient());

  const [reports, setReports] = useState<UIReport[]>(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawReports: RawReport[] = initialReports.map((r: any) => ({
      id: r.id,
      property_id: r.property_id,
      user_id: r.user_id,
      pipeline_stage: r.pipeline_stage || 'draft',
      selected_month: r.selected_month || 1,
      selected_year: r.selected_year || new Date().getFullYear(),
      updated_at: r.updated_at,
      returned: r.returned,
      return_note: r.return_note,
      generation_progress: r.generation_progress,
      generation_status_text: r.generation_status_text,
      properties: r.properties || { name: 'Unknown Property' },
    }));

    return rawReports.map((r) => ({
      id: r.id,
      property_name: r.properties.name,
      period: formatReportPeriod(r.selected_month, r.selected_year),
      pipeline_stage: r.pipeline_stage,
      updated_at: r.updated_at,
      returned: r.returned,
      return_note: r.return_note,
      _property_id: r.property_id,
      _month: r.selected_month,
      _year: r.selected_year,
      generation_progress: r.generation_progress ?? null,
      generation_status_text: r.generation_status_text ?? null,
    }));
  });

  const initialReportsRef = useRef(initialReports);
  useEffect(() => {
    if (initialReportsRef.current === initialReports) return;
    initialReportsRef.current = initialReports;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fresh: RawReport[] = initialReports.map((r: any) => ({
      id: r.id,
      property_id: r.property_id,
      user_id: r.user_id,
      pipeline_stage: r.pipeline_stage || 'draft',
      selected_month: r.selected_month || 1,
      selected_year: r.selected_year || new Date().getFullYear(),
      updated_at: r.updated_at,
      returned: r.returned,
      return_note: r.return_note,
      generation_progress: r.generation_progress,
      generation_status_text: r.generation_status_text,
      properties: r.properties || { name: 'Unknown Property' },
    }));

    setReports(fresh.map(rawToUI));
  }, [initialReports]);

  useEffect(() => {
    const hid = searchParams.get('highlight');
    const stage = searchParams.get('stage');
    if (hid) {
      if (stage && PIPELINE_STAGES.some(s => s.key === stage)) {
        setFilter(stage);
        setViewMode('grid');
      }
      setHighlightId(hid);
      window.history.replaceState({}, '', '/dashboard/reports');
      setTimeout(() => {
        const el = document.getElementById(`report-${hid}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('report-highlight-glow');
          setTimeout(() => {
            el.classList.remove('report-highlight-glow');
            setHighlightId(null);
          }, 3000);
        }
      }, 300);
    }
  }, [searchParams]);

  useEffect(() => {
    const generatingIds = reports
      .filter(r => r.pipeline_stage === 'generating')
      .map(r => r.id);
    if (!generatingIds.length) return;

    const reconcile = async () => {
      const { data } = await supabaseRef.current
        .from('reports')
        .select('id, pipeline_stage, generation_progress, generation_status_text, updated_at')
        .in('id', generatingIds);

      if (!data?.length) return;

      setReports(prev => prev.map(r => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fresh = data.find((d: any) => d.id === r.id);
        if (!fresh) return r;
        return {
          ...r,
          pipeline_stage: fresh.pipeline_stage,
          generation_progress: fresh.generation_progress ?? r.generation_progress,
          generation_status_text: fresh.generation_status_text ?? r.generation_status_text,
          updated_at: fresh.updated_at ?? r.updated_at,
        };
      }));
    };

    const timer = setTimeout(reconcile, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const sb = supabaseRef.current;

    const channel = sb
      .channel('reports-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reports',
        },
        (payload) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const row = payload.new as any;
          if (!row?.id) return;

          setReports(prev => {
            const exists = prev.some(r => r.id === row.id);

            if (exists) {
              return prev.map(r =>
                r.id === row.id
                  ? {
                    ...r,
                    pipeline_stage: row.pipeline_stage ?? r.pipeline_stage,
                    generation_progress: row.generation_progress ?? r.generation_progress ?? null,
                    generation_status_text: row.generation_status_text ?? r.generation_status_text ?? null,
                    updated_at: row.updated_at ?? r.updated_at,
                    returned: row.returned ?? r.returned,
                    return_note: row.return_note ?? r.return_note,
                  }
                  : r
              );
            }

            if (row.pipeline_stage === 'generating' || row.pipeline_stage === 'in_review') {
              const placeholder: UIReport = {
                id: row.id,
                property_name: 'Loading...',
                period: formatReportPeriod(row.selected_month, row.selected_year),
                pipeline_stage: row.pipeline_stage,
                updated_at: row.updated_at || new Date().toISOString(),
                returned: row.returned,
                return_note: row.return_note,
                _property_id: row.property_id || '',
                _month: row.selected_month || 1,
                _year: row.selected_year || new Date().getFullYear(),
                generation_progress: row.generation_progress ?? null,
                generation_status_text: row.generation_status_text ?? null,
              };

              sb.from('reports')
                .select('id, property_id, selected_month, selected_year, pipeline_stage, updated_at, returned, return_note, generation_progress, generation_status_text, properties(name)')
                .eq('id', row.id)
                .single()
                .then(({ data: fullRow }) => {
                  if (!fullRow) return;
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const typed = fullRow as any;
                  setReports(p => p.map(rep =>
                    rep.id === typed.id
                      ? {
                        ...rep,
                        property_name: typed.properties?.name || 'Unknown Property',
                        period: formatReportPeriod(typed.selected_month, typed.selected_year),
                        pipeline_stage: typed.pipeline_stage,
                        _property_id: typed.property_id,
                        _month: typed.selected_month,
                        _year: typed.selected_year,
                        generation_progress: typed.generation_progress ?? rep.generation_progress,
                        generation_status_text: typed.generation_status_text ?? rep.generation_status_text,
                      }
                      : rep
                  ));
                });

              return [placeholder, ...prev];
            }

            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, []);

  const refreshReports = useCallback(() => {
    router.refresh();
  }, [router]);

  const counts: Record<string, number> = {};
  PIPELINE_STAGES.forEach(s => {
    counts[s.key] = reports.filter(r => r.pipeline_stage === s.key).length;
  });

  const filtered = reports
    .filter(r => filter === 'all' || r.pipeline_stage === filter)
    .filter(r => !searchQuery || r.property_name.toLowerCase().includes(searchQuery.toLowerCase()));

  const groupReports = (list: UIReport[]) => {
    const map = new Map<string, UIReport[]>();
    const keys: string[] = [];
    list.forEach(r => {
      const k = `${r._property_id}|||${r._month}|||${r._year}`;
      if (!map.has(k)) { map.set(k, []); keys.push(k); }
      map.get(k)!.push(r);
    });
    return keys.map(k => map.get(k)!);
  };

  const grouped = groupReports(filtered);
  const isAllView = filter === 'all';
  const effectiveView = isAllView ? 'list' : viewMode;
  const hasReports = reports.length > 0;

  const stats = [
    { label: 'Draft', count: counts.draft || 0, icon: 'edit', color: STAGE_STAT_COLORS.draft, key: 'draft' },
    { label: 'In Review', count: counts.in_review || 0, icon: 'eye', color: STAGE_STAT_COLORS.in_review, key: 'in_review' },
    { label: 'Final Review', count: counts.final_review || 0, icon: 'user', color: STAGE_STAT_COLORS.final_review, key: 'final_review' },
    { label: 'Ready', count: counts.ready_to_send || 0, icon: 'check', color: STAGE_STAT_COLORS.ready_to_send, key: 'ready_to_send' },
    { label: 'Archive', count: counts.sent || 0, icon: 'send', color: STAGE_STAT_COLORS.sent, key: 'sent' },
  ];

  const isGenerating = (r: UIReport) => r.pipeline_stage === 'generating';

  const renderGeneratingCard = (report: UIReport) => (
    <GeneratingCard
      compact
      reportId={report.id}
      propertyName={report.property_name}
      reportPeriod={report.period}
      progress={{
        displayProgress: report.generation_progress || 0,
        phase: 'generating',
        statusText: report.generation_status_text || 'Generating...',
        sectionsCompleted: 0,
        sectionsTotal: 10,
        estimatedSecondsRemaining: null,
        validationPassed: false,
        errorMessage: null,
      }}
      onClick={() => router.push(`/dashboard/reports/${report.id}/generate`)}
    />
  );

  if (!hasReports) {
    return (
      <div className="reports-page-wrap">
        <style>{INJECTED_CSS}</style>
        <div className="reports-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 className="reports-page-title" style={{ fontFamily: "'Newsreader', serif", fontSize: 28, fontWeight: 500, color: C.text, margin: 0 }}>Reports</h1>
            <p style={{ fontSize: 15, color: C.textSoft, marginTop: 4 }}>Manage your investor reports</p>
          </div>
        </div>
        <div style={{ padding: '64px 32px', textAlign: 'center', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: C.bgAlt, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <PipelineIcons.edit color={C.textMuted} size={24} />
          </div>
          <h3 style={{ fontFamily: "'Newsreader', serif", fontSize: 20, fontWeight: 500, color: C.text, marginBottom: 8 }}>No reports yet</h3>
          <p style={{ fontSize: 15, color: C.textSoft, marginBottom: 20 }}>Create your first investor report to get started</p>
          <button onClick={() => router.push('/dashboard/reports/new')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 28px', fontSize: 15, fontWeight: 600, color: '#fff', background: C.accent, border: 'none', borderRadius: 10, cursor: 'pointer', boxShadow: `0 2px 12px ${C.accent}30` }}>
            <PipelineIcons.plus color="#fff" size={16} /> Create Report
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="reports-page-wrap" style={{ minWidth: 0 }}>
      <style>{INJECTED_CSS}</style>

      {/* Header — stacks vertically on mobile */}
      <div className="reports-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ minWidth: 0 }}>
          <h1 className="reports-page-title" style={{ fontFamily: "'Newsreader', serif", fontSize: 28, fontWeight: 500, color: C.text, margin: 0 }}>Reports</h1>
          <p style={{ fontSize: 15, color: C.textSoft, marginTop: 4 }}>Manage your investor reports</p>
        </div>
        <div className="reports-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div className="reports-search-box" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', width: 220, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, boxSizing: 'border-box' as const }}>
            <PipelineIcons.search color={C.textMuted} size={15} />
            <input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: C.text, fontFamily: 'inherit', width: '100%', minWidth: 0 }} />
          </div>
          <button className="reports-new-btn" onClick={() => router.push('/dashboard/reports/new')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', fontSize: 15, fontWeight: 600, color: '#fff', background: C.accent, border: 'none', borderRadius: 10, cursor: 'pointer', boxShadow: `0 2px 12px ${C.accent}30`, whiteSpace: 'nowrap' }}>
            <PipelineIcons.plus color="#fff" size={16} />
            <span className="reports-new-btn-label">New Report</span>
            <span className="reports-new-btn-label-short" style={{ display: 'none' }}>New</span>
          </button>
        </div>
      </div>

      {/* Stat cards — 2-col grid on mobile, last spans full */}
      <div className="reports-stat-row" style={{ display: 'flex', gap: 12, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
        {stats.map((s, idx) => (
          <StatCard key={s.key} label={s.label} count={s.count} iconName={s.icon} color={s.color} isActive={filter === s.key} onClick={() => setFilter(filter === s.key ? 'all' : s.key)} isLast={idx === stats.length - 1} />
        ))}
      </div>

      {/* Filter bar + view toggle — filter scrolls horizontally on mobile */}
      <div className="reports-filter-row" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div className="reports-filter-scroll" style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
          <ReportFilterBar active={filter} onFilter={setFilter} />
        </div>
        <div className="reports-view-toggle-row" style={{ display: 'inline-flex', padding: 3, background: C.bg, border: `1px solid ${C.borderL}`, borderRadius: 10, opacity: isAllView ? 0.35 : 1, pointerEvents: isAllView ? 'none' : 'auto', flexShrink: 0 }}>
          {([{ k: 'grid' as const, i: 'gv' }, { k: 'list' as const, i: 'lv' }]).map(v => (
            <button key={v.k} onClick={() => setViewMode(v.k)}
              style={{ width: 38, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, cursor: 'pointer', background: viewMode === v.k ? C.bgAlt : 'transparent', border: viewMode === v.k ? `1px solid ${C.borderL}` : '1px solid transparent' }}>
              {getIcon(v.i, viewMode === v.k ? C.accentAction : C.textMuted, 16)}
            </button>
          ))}
        </div>
      </div>

      {/* Report cards — single column on mobile */}
      {effectiveView === 'grid' ? (
        <div className="reports-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {grouped.map((group, i) => (
            <VersionStack
              key={i} reports={group.map(asPipelineReport)} isGrid
              renderCard={(report, stk, ver) => {
                const uiReport = group.find(r => r.id === report.id)!;
                return (
                  <div id={`report-${report.id}`}>
                    {isGenerating(uiReport) ? (
                      renderGeneratingCard(uiReport)
                    ) : (
                      <PipelineCardGrid report={report} stackCount={stk} versionLabel={ver} onStageChange={refreshReports} />
                    )}
                  </div>
                );
              }}
              renderListCard={(report, stk, ver) => {
                const uiReport = group.find(r => r.id === report.id)!;
                return (
                  <div id={`report-${report.id}`}>
                    {isGenerating(uiReport) ? (
                      renderGeneratingCard(uiReport)
                    ) : (
                      <PipelineCardList report={report} stackCount={stk} versionLabel={ver} onStageChange={refreshReports} showHint={false} />
                    )}
                  </div>
                );
              }}
            />
          ))}
        </div>
      ) : (
        <div className="reports-list-wrap" style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
          {grouped.map((group, i) => (
            <VersionStack
              key={i} reports={group.map(asPipelineReport)} isGrid={false}
              renderCard={(report, stk, ver) => {
                const uiReport = group.find(r => r.id === report.id)!;
                return (
                  <div id={`report-${report.id}`} style={{ minWidth: 0 }}>
                    {isGenerating(uiReport) ? (
                      renderGeneratingCard(uiReport)
                    ) : (
                      <PipelineCardList report={report} stackCount={stk} versionLabel={ver} onStageChange={refreshReports} showHint={!isAllView} />
                    )}
                  </div>
                );
              }}
            />
          ))}
        </div>
      )}

      {/* Empty filter state */}
      {filtered.length === 0 && hasReports && (
        <div style={{ padding: '64px 32px', textAlign: 'center', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14 }}>
          <h3 style={{ fontFamily: "'Newsreader', serif", fontSize: 18, fontWeight: 500, color: C.text, marginBottom: 8 }}>No reports in this stage</h3>
          <p style={{ fontSize: 14, color: C.textSoft }}>Reports will appear here once they reach this stage.</p>
        </div>
      )}
    </div>
  );
}
