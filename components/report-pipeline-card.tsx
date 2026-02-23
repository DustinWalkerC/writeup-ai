// components/report-pipeline-card.tsx
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  C, PipelineStage, PipelineReport, PIPELINE_STAGES, STAGE_BADGE, STAGE_ACTIONS,
  getStageIndex, getStageProgress, formatTimeAgo,
} from '@/lib/report-pipeline-tokens';
import { PipelineIcons, getIcon } from '@/components/pipeline-icons';
import ReturnNotePopover from '@/components/return-note-popover';

interface CardProps {
  report: PipelineReport;
  stackCount?: number | null;
  versionLabel?: string | null;
  onStageChange: () => void;
}

function StagePill({ stage }: { stage: PipelineStage }) {
  const stg = PIPELINE_STAGES[getStageIndex(stage)];
  const badge = STAGE_BADGE[stage];
  return (
    <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' as const, color: badge.color, background: badge.bg, border: `1px solid ${badge.border}`, borderRadius: 100, padding: '3px 10px', lineHeight: '1.4', whiteSpace: 'nowrap' }}>
      {stg.label}
    </span>
  );
}

// --- API helpers ---
async function transitionStage(reportId: string, targetStage: PipelineStage, returnNote?: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/reports/${reportId}/pipeline`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetStage, returnNote }) });
    return res.ok;
  } catch { return false; }
}
async function forceChangeStage(reportId: string, targetStage: PipelineStage): Promise<boolean> {
  try {
    const res = await fetch(`/api/reports/${reportId}/pipeline`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetStage }) });
    return res.ok;
  } catch { return false; }
}
async function deleteReportApi(reportId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/reports/${reportId}`, { method: 'DELETE' });
    return res.ok;
  } catch { return false; }
}

const PRIMARY_TARGETS: Record<PipelineStage, PipelineStage | null> = {
  draft: 'in_review', in_review: 'final_review', final_review: 'ready_to_send', ready_to_send: 'sent', sent: null,
};

// -------------------------------------------------------------------
// MoreMenu — portal dropdown anchored to button
// -------------------------------------------------------------------
function MoreMenu({ report, onStageChange, onReturn }: { report: PipelineReport; onStageChange: () => void; onReturn?: () => void }) {
  const router = useRouter();
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'main' | 'status' | 'delete'>('main');
  const [loading, setLoading] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  const isFR = report.pipeline_stage === 'final_review';
  const isDl = report.pipeline_stage === 'ready_to_send' || report.pipeline_stage === 'sent';

  useEffect(() => { setMounted(true); }, []);

  // Position the dropdown
  const updatePosition = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 6, left: rect.right });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, updatePosition]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) && btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOpen(false); setView('main');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); setView('main'); } };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const close = () => { setOpen(false); setView('main'); };

  const handleDelete = async () => {
    setLoading(true);
    const ok = await deleteReportApi(report.id);
    setLoading(false);
    if (ok) { close(); onStageChange(); }
  };

  const handleStatusChange = async (stage: PipelineStage) => {
    setLoading(true);
    const ok = await forceChangeStage(report.id, stage);
    setLoading(false);
    if (ok) { close(); onStageChange(); }
  };

  const itemStyle: React.CSSProperties = {
    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
    padding: '9px 14px', fontSize: 14, color: C.text, background: 'none',
    border: 'none', cursor: 'pointer', borderRadius: 8, textAlign: 'left',
    whiteSpace: 'nowrap', transition: 'background 0.15s',
  };

  const dropdown = open && mounted ? createPortal(
    <div
      ref={menuRef}
      style={{
        position: 'fixed', top: pos.top, left: pos.left,
        transform: 'translateX(-100%)',
        zIndex: 99999, minWidth: 220,
        background: C.bg, borderRadius: 14,
        border: `1px solid ${C.border}`,
        boxShadow: '0 12px 40px rgba(0,0,0,0.14)',
        overflow: 'hidden',
      }}
    >
      {/* Main menu */}
      {view === 'main' && (
        <div style={{ padding: 6 }}>
          <button onClick={() => { close(); router.push(`/dashboard/reports/${report.id}`); }} style={itemStyle}
            onMouseEnter={e => (e.currentTarget.style.background = C.bgAlt)} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
            <PipelineIcons.eye color={C.textSoft} size={16} /> View Report
          </button>
          {isDl && (
            <button onClick={() => { close(); window.open(`/api/reports/${report.id}/export?format=pdf`, '_blank'); }} style={itemStyle}
              onMouseEnter={e => (e.currentTarget.style.background = C.bgAlt)} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
              <PipelineIcons.dl color={C.textSoft} size={16} /> Download PDF
            </button>
          )}
          {isFR && onReturn && (
            <button onClick={() => { close(); onReturn(); }} style={{ ...itemStyle, color: C.retOrg }}
              onMouseEnter={e => (e.currentTarget.style.background = `${C.retOrg}06`)} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
              <PipelineIcons.ret color={C.retOrg} size={16} /> Return to Reviewer
            </button>
          )}
          <div style={{ height: 1, background: C.borderL, margin: '4px 8px' }} />
          <button onClick={() => setView('status')} style={itemStyle}
            onMouseEnter={e => (e.currentTarget.style.background = C.bgAlt)} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
            <PipelineIcons.shuffle color={C.textSoft} size={16} /> Change Status
            <span style={{ marginLeft: 'auto', fontSize: 12, color: C.textMuted }}>▸</span>
          </button>
          <div style={{ height: 1, background: C.borderL, margin: '4px 8px' }} />
          <button onClick={() => setView('delete')} style={{ ...itemStyle, color: '#DC2626' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#FEF2F2')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
            <PipelineIcons.trash color="#DC2626" size={16} /> Delete Report
          </button>
        </div>
      )}

      {/* Status picker */}
      {view === 'status' && (
        <div style={{ padding: 6 }}>
          <button onClick={() => setView('main')} style={{ ...itemStyle, fontSize: 13, color: C.textMuted, padding: '8px 14px', gap: 6 }}>
            ← Back
          </button>
          <div style={{ padding: '4px 14px 6px', fontSize: 11, fontWeight: 600, color: C.textSoft, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Move to:</div>
          {PIPELINE_STAGES.map(s => {
            const isCurrent = s.key === report.pipeline_stage;
            const badge = STAGE_BADGE[s.key];
            return (
              <button key={s.key} disabled={isCurrent || loading} onClick={() => handleStatusChange(s.key)}
                style={{ ...itemStyle, gap: 10, opacity: isCurrent ? 0.4 : 1, cursor: isCurrent ? 'default' : 'pointer' }}
                onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = C.bgAlt; }}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: badge.color }} />
                {s.label}
                {isCurrent && <span style={{ marginLeft: 'auto', fontSize: 11, color: C.textMuted, fontStyle: 'italic' }}>current</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Delete confirmation */}
      {view === 'delete' && (
        <div style={{ padding: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <PipelineIcons.trash color="#DC2626" size={20} />
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: C.text, textAlign: 'center', marginBottom: 6 }}>Delete this report?</h3>
          <p style={{ fontSize: 13, color: C.textSoft, textAlign: 'center', lineHeight: 1.5, marginBottom: 14 }}>
            This will permanently delete &ldquo;{report.property_name}&rdquo; ({report.period}). Cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setView('main')}
              style={{ flex: 1, padding: '8px 14px', fontSize: 13, fontWeight: 500, color: C.textMid, background: C.bgAlt, border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={handleDelete} disabled={loading}
              style={{ flex: 1, padding: '8px 14px', fontSize: 13, fontWeight: 600, color: '#fff', background: '#DC2626', border: 'none', borderRadius: 8, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body
  ) : null;

  return (
    <>
      <button
        ref={btnRef}
        onClick={(e) => { e.stopPropagation(); setOpen(!open); setView('main'); }}
        style={{
          width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: open ? C.bgAlt : 'transparent', border: open ? `1px solid ${C.borderL}` : 'none',
          cursor: 'pointer', borderRadius: 8, flexShrink: 0,
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = C.bgAlt; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent'; }}
      >
        <PipelineIcons.more color={C.textMuted} size={16} />
      </button>
      {dropdown}
    </>
  );
}

// -------------------------------------------------------------------
// GRID CARD
// -------------------------------------------------------------------
export function PipelineCardGrid({ report: r, stackCount, versionLabel, onStageChange }: CardProps) {
  const router = useRouter();
  const [hover, setHover] = useState(false);
  const [actionHover, setActionHover] = useState(false);
  const [viewHover, setViewHover] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [returnNote, setReturnNote] = useState('');
  const [loading, setLoading] = useState(false);

  const idx = getStageIndex(r.pipeline_stage);
  const stg = PIPELINE_STAGES[idx];
  const act = STAGE_ACTIONS[r.pipeline_stage];
  const pct = getStageProgress(r.pipeline_stage);

  const handlePrimary = async () => {
    if (r.pipeline_stage === 'draft') { router.push(`/dashboard/reports/${r.id}/edit`); return; }
    const target = PRIMARY_TARGETS[r.pipeline_stage];
    if (!target) return;
    setLoading(true);
    const ok = await transitionStage(r.id, target);
    setLoading(false);
    if (ok) onStageChange();
  };

  const handleReturn = async () => {
    setLoading(true);
    const ok = await transitionStage(r.id, 'in_review', returnNote);
    setLoading(false);
    if (ok) { setShowReturn(false); setReturnNote(''); onStageChange(); }
  };

  return (
    <div
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14,
        overflow: 'visible', minWidth: 300,
        transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
        transform: hover ? 'translateY(-2px)' : 'none',
        boxShadow: hover ? '0 8px 32px rgba(0,0,0,0.06)' : 'none',
      }}
    >
      <div style={{ padding: '18px 20px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <h3 style={{ fontFamily: "'Newsreader', serif", fontSize: 17, fontWeight: 500, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3, margin: 0 }}>{r.property_name}</h3>
            {versionLabel && <span style={{ fontSize: 10, fontWeight: 700, color: C.accentText, background: `${C.accentAction}10`, borderRadius: 4, padding: '2px 6px' }}>{versionLabel}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 10 }}>
            {r.returned && r.return_note && <ReturnNotePopover note={r.return_note} />}
            <StagePill stage={r.pipeline_stage} />
            {stackCount && <span style={{ fontSize: 10, fontWeight: 700, color: C.accentText, background: `${C.accentAction}10`, borderRadius: 100, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 3 }}><PipelineIcons.layers color={C.accentText} size={10} /> {stackCount}</span>}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: C.textSoft, marginBottom: 14 }}>
          <span>{r.period}</span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: C.border }} />
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: C.textMuted }}><PipelineIcons.clock color={C.textMuted} size={13} /> {formatTimeAgo(r.updated_at)}</span>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ height: 4, background: C.progressTrack, borderRadius: 100, overflow: 'hidden', marginBottom: 8 }}>
            <div style={{ height: '100%', borderRadius: 100, background: idx >= 4 ? C.green : C.accent, width: `${pct}%`, transition: 'width 0.5s' }} />
          </div>
          <div style={{ fontSize: 14, color: C.textMuted, textAlign: 'center' as const }}>{stg.hint}</div>
        </div>

        {showReturn && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, padding: '10px 12px', background: C.bgAlt, borderRadius: 10, border: `1px solid ${C.border}` }}>
            <input value={returnNote} onChange={e => setReturnNote(e.target.value)} placeholder="Add a note..." style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 14, color: C.text, fontFamily: 'inherit' }} />
            <button onClick={handleReturn} disabled={loading} style={{ padding: '6px 12px', fontSize: 14, fontWeight: 600, color: '#fff', background: C.retOrg, border: 'none', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap', opacity: loading ? 0.6 : 1 }}>{loading ? 'Returning...' : 'Return'}</button>
            <button onClick={() => { setShowReturn(false); setReturnNote(''); }} style={{ padding: '6px 10px', fontSize: 14, color: C.textSoft, background: 'transparent', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>Cancel</button>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'nowrap' }}>
          {act ? (
            <button onClick={handlePrimary} disabled={loading} onMouseEnter={() => setActionHover(true)} onMouseLeave={() => setActionHover(false)}
              style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 16px', fontSize: 14, fontWeight: 600, color: '#fff', background: actionHover ? C.accentHover : C.accentAction, border: 'none', borderRadius: 10, cursor: 'pointer', boxShadow: `0 2px 10px ${C.accentAction}25`, transition: 'background 0.25s', whiteSpace: 'nowrap', opacity: loading ? 0.6 : 1 }}>
              {getIcon(act.icon, '#fff', 15)} {act.label}
            </button>
          ) : (
            <div style={{ flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 16px', fontSize: 14, fontWeight: 600, color: C.greenBtn, background: `${C.greenBtn}08`, borderRadius: 10, border: `1px solid ${C.greenBtn}18`, whiteSpace: 'nowrap' }}>
              <PipelineIcons.check color={C.greenBtn} size={15} /> Delivered
            </div>
          )}
          <button onClick={() => router.push(`/dashboard/reports/${r.id}`)} onMouseEnter={() => setViewHover(true)} onMouseLeave={() => setViewHover(false)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 14px', fontSize: 14, fontWeight: 500, color: viewHover ? C.accentAction : C.textMid, background: viewHover ? `${C.accentAction}08` : C.bgAlt, border: `1px solid ${viewHover ? `${C.accentAction}30` : C.borderL}`, borderRadius: 10, cursor: 'pointer', transition: 'background 0.2s, color 0.2s, border-color 0.2s', flexShrink: 0, whiteSpace: 'nowrap' }}>
            <PipelineIcons.eye color={viewHover ? C.accentAction : C.textSoft} size={15} /> View
          </button>
          <MoreMenu report={r} onStageChange={onStageChange} onReturn={r.pipeline_stage === 'final_review' ? () => setShowReturn(true) : undefined} />
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------
// LIST CARD
// -------------------------------------------------------------------
export function PipelineCardList({ report: r, stackCount, versionLabel, onStageChange, showHint = true }: CardProps & { showHint?: boolean }) {
  const router = useRouter();
  const [actionHover, setActionHover] = useState(false);
  const [viewHover, setViewHover] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [returnNote, setReturnNote] = useState('');
  const [loading, setLoading] = useState(false);

  const idx = getStageIndex(r.pipeline_stage);
  const stg = PIPELINE_STAGES[idx];
  const act = STAGE_ACTIONS[r.pipeline_stage];
  const pct = getStageProgress(r.pipeline_stage);

  const handlePrimary = async () => {
    if (r.pipeline_stage === 'draft') { router.push(`/dashboard/reports/${r.id}/edit`); return; }
    const target = PRIMARY_TARGETS[r.pipeline_stage];
    if (!target) return;
    setLoading(true);
    const ok = await transitionStage(r.id, target);
    setLoading(false);
    if (ok) onStageChange();
  };

  const handleReturn = async () => {
    setLoading(true);
    const ok = await transitionStage(r.id, 'in_review', returnNote);
    setLoading(false);
    if (ok) { setShowReturn(false); setReturnNote(''); onStageChange(); }
  };

  return (
    <div>
      <style>{`.pipeline-list-row:hover { background: ${C.bgWarm} !important; }`}</style>
      <div
        className="pipeline-list-row"
        style={{
          background: C.bg,
          border: `1px solid ${C.border}`, borderRadius: 12,
          padding: '12px 16px', display: 'grid',
          gridTemplateColumns: '240px 120px auto 190px 36px 36px',
          alignItems: 'center', gap: 12,
          transition: 'background 0.2s',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <h3 style={{ fontFamily: "'Newsreader', serif", fontSize: 16, fontWeight: 500, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3, margin: 0 }}>{r.property_name}</h3>
            {versionLabel && <span style={{ fontSize: 10, fontWeight: 700, color: C.accentText, background: `${C.accentAction}10`, borderRadius: 4, padding: '1px 5px' }}>{versionLabel}</span>}
            {stackCount && <span style={{ fontSize: 10, fontWeight: 700, color: C.accentText, background: `${C.accentAction}10`, borderRadius: 100, padding: '2px 7px', display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer' }}><PipelineIcons.layers color={C.accentText} size={9} /> {stackCount}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: C.textSoft }}>
            <span>{r.period}</span>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: C.border }} />
            <span style={{ color: C.textMuted }}>{formatTimeAgo(r.updated_at)}</span>
          </div>
        </div>

        <div>
          <div style={{ height: 4, background: C.progressTrack, borderRadius: 100, overflow: 'hidden', marginBottom: showHint ? 4 : 0 }}>
            <div style={{ height: '100%', borderRadius: 100, background: idx >= 4 ? C.green : C.accent, width: `${pct}%`, transition: 'width 0.5s' }} />
          </div>
          {showHint && <div style={{ fontSize: 13, color: C.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stg.hint}</div>}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifySelf: 'end' }}>
          {r.returned && r.return_note && <ReturnNotePopover note={r.return_note} />}
          <StagePill stage={r.pipeline_stage} />
        </div>

        <div>
          {act ? (
            <button onClick={handlePrimary} disabled={loading} onMouseEnter={() => setActionHover(true)} onMouseLeave={() => setActionHover(false)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 12px', fontSize: 14, fontWeight: 600, color: '#fff', background: actionHover ? C.accentHover : C.accentAction, border: 'none', borderRadius: 8, cursor: 'pointer', transition: 'background 0.25s', whiteSpace: 'nowrap', opacity: loading ? 0.6 : 1 }}>
              {getIcon(act.icon, '#fff', 14)} {act.label}
            </button>
          ) : (
            <span style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 12px', fontSize: 14, fontWeight: 600, color: C.greenBtn, background: `${C.greenBtn}08`, borderRadius: 8, border: `1px solid ${C.greenBtn}18`, whiteSpace: 'nowrap' }}>
              <PipelineIcons.check color={C.greenBtn} size={14} /> Delivered
            </span>
          )}
        </div>

        <button onClick={() => router.push(`/dashboard/reports/${r.id}`)} onMouseEnter={() => setViewHover(true)} onMouseLeave={() => setViewHover(false)} title="View Report"
          style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: viewHover ? `${C.accentAction}08` : C.bgAlt, border: `1px solid ${viewHover ? `${C.accentAction}30` : C.borderL}`, borderRadius: 8, cursor: 'pointer', transition: 'background 0.2s, border-color 0.2s' }}>
          <PipelineIcons.eye color={viewHover ? C.accentAction : C.textSoft} size={16} />
        </button>

        <MoreMenu report={r} onStageChange={onStageChange} onReturn={r.pipeline_stage === 'final_review' ? () => setShowReturn(true) : undefined} />
      </div>

      {showReturn && (
        <div style={{ display: 'flex', gap: 8, marginTop: -1, padding: '10px 20px', background: C.bgAlt, border: `1px solid ${C.border}`, borderTop: 'none', borderRadius: '0 0 12px 12px' }}>
          <input value={returnNote} onChange={e => setReturnNote(e.target.value)} placeholder="Add a note for the reviewer..." style={{ flex: 1, border: `1px solid ${C.border}`, background: C.bg, borderRadius: 8, padding: '8px 12px', outline: 'none', fontSize: 14, color: C.text, fontFamily: 'inherit' }} />
          <button onClick={handleReturn} disabled={loading} style={{ padding: '8px 16px', fontSize: 14, fontWeight: 600, color: '#fff', background: C.retOrg, border: 'none', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap', opacity: loading ? 0.6 : 1 }}>{loading ? 'Returning...' : 'Return'}</button>
          <button onClick={() => { setShowReturn(false); setReturnNote(''); }} style={{ padding: '8px 12px', fontSize: 14, color: C.textSoft, background: 'transparent', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>Cancel</button>
        </div>
      )}
    </div>
  );
}
