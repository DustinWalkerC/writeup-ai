// components/return-note-popover.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { C } from '@/lib/report-pipeline-tokens';
import { PipelineIcons } from '@/components/pipeline-icons';

interface ReturnNotePopoverProps {
  note: string;
}

export default function ReturnNotePopover({ note }: ReturnNotePopoverProps) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!show) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShow(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [show]);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        onClick={() => setShow(!show)}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '3px 8px', fontSize: 10, fontWeight: 600,
          letterSpacing: '0.04em', textTransform: 'uppercase',
          color: C.retOrg, background: `${C.retOrg}10`,
          border: `1px solid ${C.retOrg}22`, borderRadius: 100,
          cursor: 'pointer', lineHeight: '1.4', whiteSpace: 'nowrap',
        }}
      >
        <PipelineIcons.msg color={C.retOrg} size={10} /> Returned
      </button>
      {show && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', left: 0,
            zIndex: 50, width: 280, padding: '14px 16px',
            background: C.bg, borderRadius: 12,
            border: `1px solid ${C.border}`,
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            borderLeft: `3px solid ${C.retOrg}`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.retOrg }}>Review Note</span>
            <button
              onClick={() => setShow(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
            >
              <PipelineIcons.x color={C.textMuted} size={14} />
            </button>
          </div>
          <p style={{ fontSize: 14, color: C.textMid, lineHeight: 1.5, margin: 0 }}>{note}</p>
        </div>
      )}
    </div>
  );
}
