// app/dashboard/reports/reports-content.tsx
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  C, PipelineStage, PIPELINE_STAGES, STAGE_STAT_COLORS,
  formatReportPeriod, type PipelineReport,
} from '@/lib/report-pipeline-tokens';
import { PipelineIcons, getIcon } from '@/components/pipeline-icons';
import { PipelineCardGrid, PipelineCardList } from '@/components/report-pipeline-card';
import ReportFilterBar from '@/components/report-filter-bar';
import VersionStack from '@/components/version-stack';

export type { PipelineReport } from '@/lib/report-pipeline-tokens';

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------
interface RawReport {
  id: string;
  property_id: string;
  user_id: string;
  pipeline_stage: PipelineStage;
  selected_month: number;
  selected_year: number;
  updated_at: string;
  returned?: boolean;
  return_note?: string;
  properties: {
    name: string;
    address?: string;
    city?: string;
    state?: string;
  };
}

interface ReportsContentProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialReports: any[];
}

// -------------------------------------------------------------------
// Stat Card
// -------------------------------------------------------------------
function StatCard({
  label, count, iconName, color, isActive, onClick,
}: {
  label: string; count: number; iconName: string; color: string; isActive: boolean; onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
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
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase' as const, color: isActive ? color : C.textSoft, marginBottom: 4 }}>
          {label}
        </div>
        <div style={{ fontFamily: "'Newsreader', serif", fontSize: 28, fontWeight: 500, color: isActive ? color : C.text, lineHeight: 1 }}>
          {count}
        </div>
      </div>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: isActive ? `${color}12` : C.bgAlt, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {getIcon(iconName, isActive ? color : C.textSoft, 16)}
      </div>
    </button>
  );
}

// -------------------------------------------------------------------
// Main Content
// -------------------------------------------------------------------
export default function ReportsContent({ initialReports }: ReportsContentProps) {
  const router = useRouter();
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reports: RawReport[] = initialReports.map((r: any) => ({
    id: r.id,
    property_id: r.property_id,
    user_id: r.user_id,
    pipeline_stage: r.pipeline_stage || 'draft',
    selected_month: r.selected_month || 1,
    selected_year: r.selected_year || new Date().getFullYear(),
    updated_at: r.updated_at,
    returned: r.returned,
    return_note: r.return_note,
    properties: r.properties || { name: 'Unknown Property' },
  }));

  const pipelineReports = reports.map(r => ({
    id: r.id,
    property_name: r.properties.name,
    period: formatReportPeriod(r.selected_month, r.selected_year),
    pipeline_stage: r.pipeline_stage as PipelineStage,
    updated_at: r.updated_at,
    returned: r.returned,
    return_note: r.return_note,
    _property_id: r.property_id,
    _month: r.selected_month,
    _year: r.selected_year,
  }));

  const refreshReports = useCallback(() => {
    router.refresh();
  }, [router]);

  const counts: Record<string, number> = {};
  PIPELINE_STAGES.forEach(s => {
    counts[s.key] = pipelineReports.filter(r => r.pipeline_stage === s.key).length;
  });

  const filtered = pipelineReports
    .filter(r => filter === 'all' || r.pipeline_stage === filter)
    .filter(r => !searchQuery || r.property_name.toLowerCase().includes(searchQuery.toLowerCase()));

  const groupReports = (list: typeof pipelineReports) => {
    const map = new Map<string, typeof pipelineReports>();
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
    { label: 'Ready to Send', count: counts.ready_to_send || 0, icon: 'check', color: STAGE_STAT_COLORS.ready_to_send, key: 'ready_to_send' },
    { label: 'Archive', count: counts.sent || 0, icon: 'send', color: STAGE_STAT_COLORS.sent, key: 'sent' },
  ];

  if (!hasReports) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: "'Newsreader', serif", fontSize: 28, fontWeight: 500, color: C.text, margin: 0 }}>Reports</h1>
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
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'Newsreader', serif", fontSize: 28, fontWeight: 500, color: C.text, margin: 0 }}>Reports</h1>
          <p style={{ fontSize: 15, color: C.textSoft, marginTop: 4 }}>Manage your investor reports</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', width: 220, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10 }}>
            <PipelineIcons.search color={C.textMuted} size={15} />
            <input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: C.text, fontFamily: 'inherit', width: '100%' }} />
          </div>
          <button onClick={() => router.push('/dashboard/reports/new')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', fontSize: 15, fontWeight: 600, color: '#fff', background: C.accent, border: 'none', borderRadius: 10, cursor: 'pointer', boxShadow: `0 2px 12px ${C.accent}30` }}>
            <PipelineIcons.plus color="#fff" size={16} /> New Report
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
        {stats.map(s => (
          <StatCard key={s.key} label={s.label} count={s.count} iconName={s.icon} color={s.color} isActive={filter === s.key} onClick={() => setFilter(filter === s.key ? 'all' : s.key)} />
        ))}
      </div>

      {/* Filter bar + view toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <ReportFilterBar active={filter} onFilter={setFilter} />
        </div>
        <div style={{ display: 'inline-flex', padding: 3, background: C.bg, border: `1px solid ${C.borderL}`, borderRadius: 10, opacity: isAllView ? 0.35 : 1, pointerEvents: isAllView ? 'none' : 'auto' }}>
          {([{ k: 'grid' as const, i: 'gv' }, { k: 'list' as const, i: 'lv' }]).map(v => (
            <button key={v.k} onClick={() => setViewMode(v.k)}
              style={{ width: 38, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, cursor: 'pointer', background: viewMode === v.k ? C.bgAlt : 'transparent', border: viewMode === v.k ? `1px solid ${C.borderL}` : '1px solid transparent' }}>
              {getIcon(v.i, viewMode === v.k ? C.accentAction : C.textMuted, 16)}
            </button>
          ))}
        </div>
      </div>

      {/* Report cards */}
      {effectiveView === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {grouped.map((group, i) => (
            <VersionStack
              key={i} reports={group} isGrid
              renderCard={(r, stk, ver) => (
                <PipelineCardGrid report={r} stackCount={stk} versionLabel={ver} onStageChange={refreshReports} />
              )}
              renderListCard={(r, stk, ver) => (
                <PipelineCardList report={r} stackCount={stk} versionLabel={ver} onStageChange={refreshReports} showHint={false} />
              )}
            />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {grouped.map((group, i) => (
            <VersionStack
              key={i} reports={group} isGrid={false}
              renderCard={(r, stk, ver) => (
                <PipelineCardList report={r} stackCount={stk} versionLabel={ver} onStageChange={refreshReports} showHint={!isAllView} />
              )}
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

