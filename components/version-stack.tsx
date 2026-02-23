// components/version-stack.tsx
'use client';

import { useState, ReactNode } from 'react';
import { C } from '@/lib/report-pipeline-tokens';
import { PipelineIcons } from '@/components/pipeline-icons';

interface VersionStackProps<T> {
  reports: T[];
  isGrid: boolean;
  renderCard: (report: T, stackCount?: number | null, versionLabel?: string | null) => ReactNode;
  renderListCard?: (report: T, stackCount?: number | null, versionLabel?: string | null) => ReactNode;
}

export default function VersionStack<T>({ reports, isGrid, renderCard, renderListCard }: VersionStackProps<T>) {
  const [expanded, setExpanded] = useState(false);

  // Single report — no stacking
  if (reports.length === 1) {
    return <>{renderCard(reports[0])}</>;
  }

  // Collapsed — show top card with depth effect
  if (!expanded) {
    return (
      <div
        style={{ position: 'relative', cursor: 'pointer', marginBottom: 8, marginRight: 6 }}
        onClick={() => setExpanded(true)}
      >
        {reports.length >= 3 && (
          <div
            style={{
              position: 'absolute', top: 8, left: 8, right: -8, bottom: -8,
              background: `${C.border}60`, borderRadius: isGrid ? 14 : 12, zIndex: 0,
            }}
          />
        )}
        <div
          style={{
            position: 'absolute', top: 4, left: 4, right: -4, bottom: -4,
            background: C.bg, border: `1px solid ${C.border}`,
            borderRadius: isGrid ? 14 : 12, zIndex: 1,
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}
        />
        <div style={{ position: 'relative', zIndex: 2 }}>
          {renderCard(reports[0], reports.length)}
        </div>
      </div>
    );
  }

  // Expanded — ALWAYS use scrollable list layout regardless of view mode
  const listRenderer = renderListCard || renderCard;
  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', gap: 0,
        padding: '12px 14px', background: `${C.accent}04`,
        border: `1px solid ${C.accent}15`, borderRadius: 14,
        gridColumn: '1 / -1',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px 10px' }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: C.textMid, display: 'flex', alignItems: 'center', gap: 6 }}>
          <PipelineIcons.layers color={C.accentText} size={14} /> {reports.length} versions
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
          style={{ fontSize: 14, fontWeight: 500, color: C.accentText, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Collapse
        </button>
      </div>
      {/* Scrollable list — max 5 visible, scroll for more */}
      <div
        style={{
          display: 'flex', flexDirection: 'column', gap: 6,
          maxHeight: 400, overflowY: 'auto',
          paddingRight: 4,
        }}
      >
        {reports.map((r, i) => (
          <div key={i}>{listRenderer(r, null, `V${reports.length - i}`)}</div>
        ))}
      </div>
    </div>
  );
}
