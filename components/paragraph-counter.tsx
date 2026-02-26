// components/paragraph-counter.tsx

/**
 * Per-Section Paragraph Counter
 *
 * +/– stepper (min 1, max 8) with lightbulb icon showing recommended count per tier.
 * Stored on reports.section_config JSONB — per-report, not per-user.
 *
 * Props:
 *   sectionId       — e.g. 'executive_summary'
 *   sectionTitle    — display name
 *   value           — current paragraph count
 *   onChange         — (sectionId, newValue) => void
 *   recommended     — recommended count for this tier
 *   showRecommended — highlight the recommendation (controlled by parent)
 *   disabled        — tier-locked
 *   tier            — current tier name (for lock message)
 */

'use client';

import { useState } from 'react';

// ── Palette (matches globals.css warm tokens) ──
const C = {
  accent: '#00B7DB',
  accentBg: '#00B7DB0D',
  accentBorder: '#00B7DB22',
  amber: '#D97706',
  amberBg: '#FEF3C7',
  amberBorder: '#FDE68A',
  bg: '#FFFFFF',
  bgAlt: '#F7F5F1',
  bgWarm: '#FAF9F7',
  text: '#1A1A1A',
  textMid: '#4A4A4A',
  textSoft: '#7A7A7A',
  textMuted: '#A3A3A3',
  border: '#E8E5E0',
  borderL: '#F0EDE8',
  green: '#008A3E',
};

interface ParagraphCounterProps {
  sectionId: string;
  sectionTitle: string;
  value: number;
  onChange: (sectionId: string, value: number) => void;
  recommended: number;
  showRecommended?: boolean;
  disabled?: boolean;
  tier?: string;
}

export default function ParagraphCounter({
  sectionId,
  sectionTitle,
  value,
  onChange,
  recommended,
  showRecommended = false,
  disabled = false,
  tier,
}: ParagraphCounterProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isAtRecommended = value === recommended;
  const MIN = 1;
  const MAX = 8;

  const handleDecrement = () => {
    if (!disabled && value > MIN) onChange(sectionId, value - 1);
  };

  const handleIncrement = () => {
    if (!disabled && value < MAX) onChange(sectionId, value + 1);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        background: disabled ? C.bgWarm : C.bg,
        border: `1px solid ${showRecommended && !isAtRecommended ? C.amberBorder : C.borderL}`,
        borderRadius: 10,
        transition: 'all 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
        opacity: disabled ? 0.6 : 1,
        fontFamily: 'var(--font-body, "DM Sans", system-ui, sans-serif)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Left: Section name + recommendation */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: disabled ? C.textSoft : C.text }}>
            {sectionTitle}
          </span>
          {disabled && tier && (
            <span style={{
              fontSize: 10, fontWeight: 600, color: C.accent,
              padding: '2px 8px', background: C.accentBg,
              border: `1px solid ${C.accentBorder}`,
              borderRadius: 100,
            }}>
              {tier}+
            </span>
          )}
        </div>

        {/* Recommendation hint */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4, marginTop: 3,
        }}>
          <LightbulbIcon active={showRecommended || isHovered} />
          <span style={{
            fontSize: 11,
            color: showRecommended && !isAtRecommended ? C.amber : C.textMuted,
            fontWeight: showRecommended && !isAtRecommended ? 600 : 400,
            transition: 'color 0.2s',
          }}>
            Recommended: {recommended} {recommended === 1 ? 'paragraph' : 'paragraphs'}
          </span>
        </div>
      </div>

      {/* Right: Stepper */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 0,
        background: C.bgAlt, border: `1px solid ${C.borderL}`,
        borderRadius: 8, overflow: 'hidden',
      }}>
        <button
          onClick={handleDecrement}
          disabled={disabled || value <= MIN}
          style={{
            width: 32, height: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none', cursor: disabled || value <= MIN ? 'default' : 'pointer',
            color: disabled || value <= MIN ? C.borderL : C.textMid,
            fontSize: 16, fontWeight: 600,
            transition: 'color 0.15s',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 7H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        <div style={{
          width: 36, height: 32,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display, "Newsreader", Georgia, serif)',
          fontSize: 16, fontWeight: 500,
          color: isAtRecommended ? C.green : C.text,
          background: C.bg,
          borderLeft: `1px solid ${C.borderL}`,
          borderRight: `1px solid ${C.borderL}`,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {value}
        </div>

        <button
          onClick={handleIncrement}
          disabled={disabled || value >= MAX}
          style={{
            width: 32, height: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none', cursor: disabled || value >= MAX ? 'default' : 'pointer',
            color: disabled || value >= MAX ? C.borderL : C.textMid,
            fontSize: 16, fontWeight: 600,
            transition: 'color 0.15s',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 3V11M3 7H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Lightbulb SVG Icon ──
function LightbulbIcon({ active }: { active: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, transition: 'all 0.2s' }}>
      <path
        d="M7 1.5C4.79 1.5 3 3.29 3 5.5C3 7.04 3.85 8.37 5.1 9.03V10.5C5.1 10.78 5.32 11 5.6 11H8.4C8.68 11 8.9 10.78 8.9 10.5V9.03C10.15 8.37 11 7.04 11 5.5C11 3.29 9.21 1.5 7 1.5Z"
        fill={active ? '#FEF3C7' : 'transparent'}
        stroke={active ? '#D97706' : '#A3A3A3'}
        strokeWidth="1"
      />
      <path d="M5.5 12H8.5" stroke={active ? '#D97706' : '#A3A3A3'} strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}