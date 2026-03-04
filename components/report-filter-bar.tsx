// components/report-filter-bar.tsx
'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { C, PIPELINE_STAGES } from '@/lib/report-pipeline-tokens';

/* ═══════════════════════════════════════════════════════════════
   Apple-style segmented filter bar
   - Sliding pill indicator with spring-curve animation
   - Horizontal scroll with edge fade affordance
   - Auto-centers active tab on selection
   - Tap-highlight suppressed for native feel
   ═══════════════════════════════════════════════════════════════ */

const FILTER_CSS = `
.rfb-scroll::-webkit-scrollbar { display: none !important; }
.rfb-tab { -webkit-tap-highlight-color: transparent; }
`;

interface Props {
  active: string;
  onFilter: (key: string) => void;
}

const TABS = [
  { key: 'all', label: 'All' },
  ...PIPELINE_STAGES.map(s => ({ key: s.key, label: s.label })),
];

export default function ReportFilterBar({ active, onFilter }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [pill, setPill] = useState({ left: 0, width: 0 });
  const [mounted, setMounted] = useState(false);

  // ── Measure active tab and position pill ──
  const updatePill = useCallback(() => {
    const inner = innerRef.current;
    const tab = tabRefs.current[active];
    if (!inner || !tab) return;

    const innerRect = inner.getBoundingClientRect();
    const tabRect = tab.getBoundingClientRect();

    setPill({
      left: tabRect.left - innerRect.left,
      width: tabRect.width,
    });
  }, [active]);

  useEffect(() => {
    updatePill();
    const t = setTimeout(() => { setMounted(true); updatePill(); }, 60);
    return () => clearTimeout(t);
  }, [active, updatePill]);

  // ── Auto-scroll active tab toward center ──
  useEffect(() => {
    const container = scrollRef.current;
    const tab = tabRefs.current[active];
    if (!container || !tab) return;

    const containerRect = container.getBoundingClientRect();
    const tabRect = tab.getBoundingClientRect();

    if (tabRect.left < containerRect.left + 36 || tabRect.right > containerRect.right - 36) {
      const scrollTarget = tab.offsetLeft - container.clientWidth / 2 + tab.clientWidth / 2;
      container.scrollTo({ left: scrollTarget, behavior: 'smooth' });
    }
  }, [active]);

  // ── Recalc on resize ──
  useEffect(() => {
    const handleResize = () => updatePill();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updatePill]);

  return (
    <div style={{ position: 'relative' }}>
      <style>{FILTER_CSS}</style>

      {/* Left edge fade */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 20, zIndex: 2,
        background: `linear-gradient(to right, ${C.bgAlt}, transparent)`,
        pointerEvents: 'none', borderRadius: '10px 0 0 10px',
      }} />

      {/* Right edge fade */}
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: 20, zIndex: 2,
        background: `linear-gradient(to left, ${C.bgAlt}, transparent)`,
        pointerEvents: 'none', borderRadius: '0 10px 10px 0',
      }} />

      {/* Scrollable container */}
      <div
        ref={scrollRef}
        className="rfb-scroll"
        style={{
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <div
          ref={innerRef}
          style={{
            display: 'inline-flex',
            position: 'relative',
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: 3,
          }}
        >
          {/* Sliding pill */}
          <div style={{
            position: 'absolute',
            top: 3,
            left: 3,
            height: 'calc(100% - 6px)',
            width: pill.width,
            transform: `translateX(${pill.left}px)`,
            background: C.bgAlt,
            border: `1px solid ${C.borderL}`,
            borderRadius: 8,
            transition: mounted
              ? 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              : 'none',
            zIndex: 0,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }} />

          {/* Tab buttons */}
          {TABS.map(t => {
            const isActive = active === t.key;
            return (
              <button
                key={t.key}
                ref={el => { tabRefs.current[t.key] = el; }}
                className="rfb-tab"
                onClick={() => onFilter(t.key)}
                style={{
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? C.text : C.textSoft,
                  background: 'transparent',
                  border: '1px solid transparent',
                  borderRadius: 8,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.25s ease',
                  position: 'relative',
                  zIndex: 1,
                  fontFamily: 'inherit',
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
