// components/report-filter-bar.tsx
'use client';

import { C, PIPELINE_STAGES } from '@/lib/report-pipeline-tokens';

interface ReportFilterBarProps {
  active: string;
  onFilter: (stage: string) => void;
}

export default function ReportFilterBar({ active, onFilter }: ReportFilterBarProps) {
  const filters = [
    { key: 'all', label: 'All' },
    ...PIPELINE_STAGES.map(s => ({ key: s.key, label: s.filterLabel })),
  ];

  return (
    <div
      style={{
        display: 'flex', background: C.bg,
        border: `1px solid ${C.border}`, borderRadius: 14,
        padding: '5px 6px', gap: 4,
      }}
    >
      {filters.map(f => {
        const isActive = active === f.key;
        return (
          <button
            key={f.key}
            onClick={() => onFilter(f.key)}
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 10,
              cursor: 'pointer', fontSize: 14,
              fontWeight: isActive ? 600 : 500,
              color: isActive ? C.text : C.textSoft,
              background: isActive ? C.bgAlt : 'transparent',
              border: isActive ? `1px solid ${C.border}` : '1px solid transparent',
              boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.04)' : 'none',
              transition: 'all 0.2s', whiteSpace: 'nowrap',
            }}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}
