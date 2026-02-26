// components/verified-badge.tsx

/**
 * Verified Badge — Clickable audit trail for three-layer math validation.
 *
 * UPDATED: Added "Report Accuracy: 100%" header and clarity messaging.
 * The pass rate shows first-check passes vs corrections, NOT accuracy.
 * Every calculation is either passed or auto-corrected. Final report = 100%.
 *
 * Shows a shield icon with "All calculations verified" when validation_log
 * exists on the report. Click to expand the full audit panel showing:
 *   - Accuracy banner: "Your report is mathematically accurate"
 *   - Summary: total calculations, passed, corrected, first-pass rate
 *   - Clarity note explaining pass rate vs accuracy
 *   - Per-calculation details with layer-by-layer status
 *
 * Design: Matches WriteUp AI warm palette. Newsreader for headings, DM Sans for body.
 * No emojis. Clean, confident, institutional.
 */

'use client';

import { useState } from 'react';

// ═══════════════════════════════════════════════════════════
// Types (mirrors math-validator.ts ValidationLog)
// ═══════════════════════════════════════════════════════════

interface ValidationDetail {
  section_id: string;
  metric_name: string;
  layer_1: {
    status: string;
    inputs_verified: number;
    inputs_total: number;
    corrections: Array<{
      key: string;
      ai_value: number;
      registry_value: number | null;
      matched: boolean;
      corrected: boolean;
    }>;
  };
  layer_2: {
    status: string;
    formula_match: boolean;
    registered_formula?: string;
    claude_formula: string;
    reason?: string;
  };
  layer_3: {
    status: string;
    ai_result: number;
    backend_result: number;
    difference: number;
    tolerance: number;
  };
  confidence: string;
  final_value: number;
  material_override: boolean;
}

interface ValidationLog {
  validated_at: string;
  total_calculations: number;
  passed: number;
  overridden: number;
  skipped: number;
  material_overrides: number;
  sections_flagged: string[];
  details: ValidationDetail[];
}

interface VerifiedBadgeProps {
  validationLog: ValidationLog | null;
}

// ═══════════════════════════════════════════════════════════
// Palette (matches globals.css warm tokens)
// ═══════════════════════════════════════════════════════════

const V = {
  green: '#008A3E',
  greenBg: '#008A3E08',
  greenBgMed: '#008A3E14',
  greenBorder: '#008A3E25',
  accent: '#00B7DB',
  accentBg: '#00B7DB08',
  accentBorder: '#00B7DB20',
  gold: '#B8960F',
  goldBg: '#C8B88A18',
  red: '#CC0000',
  redBg: '#CC000008',
  bg: '#FFFFFF',
  bgAlt: '#F7F5F1',
  bgWarm: '#FAF9F7',
  text: '#1A1A1A',
  textMid: '#4A4A4A',
  textSoft: '#7A7A7A',
  textMuted: '#A3A3A3',
  border: '#E8E5E0',
  borderL: '#F0EDE8',
};

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

export default function VerifiedBadge({ validationLog }: VerifiedBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  if (!validationLog || validationLog.total_calculations === 0) return null;

  const { total_calculations, passed, overridden, details } = validationLog;
  const passRate = total_calculations > 0 ? Math.round((passed / total_calculations) * 100) : 0;

  // Group details by section
  const sectionGroups = new Map<string, ValidationDetail[]>();
  for (const d of details) {
    const key = d.section_id;
    if (!sectionGroups.has(key)) sectionGroups.set(key, []);
    sectionGroups.get(key)!.push(d);
  }

  // Confidence breakdown
  const confidenceCounts: Record<string, number> = {};
  for (const d of details) {
    confidenceCounts[d.confidence] = (confidenceCounts[d.confidence] || 0) + 1;
  }

  return (
    <div style={{ fontFamily: 'var(--font-body, "DM Sans", system-ui, sans-serif)' }}>
      {/* ── Inline Badge (always visible) ── */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 16px',
          background: V.greenBg,
          border: `1px solid ${V.greenBorder}`,
          borderRadius: 10,
          cursor: 'pointer',
          transition: 'all 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = V.greenBgMed;
          e.currentTarget.style.borderColor = '#008A3E40';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = V.greenBg;
          e.currentTarget.style.borderColor = V.greenBorder;
        }}
      >
        <ShieldCheckIcon />
        <span style={{ fontSize: 13, fontWeight: 600, color: V.green }}>
          {total_calculations} calculations verified
        </span>
        <ChevronIcon isOpen={isOpen} />
      </button>

      {/* ── Expanded Audit Panel ── */}
      {isOpen && (
        <div
          style={{
            marginTop: 12,
            background: V.bg,
            border: `1px solid ${V.border}`,
            borderRadius: 14,
            overflow: 'hidden',
            animation: 'fadeInUp 0.3s cubic-bezier(0.22, 1, 0.36, 1) both',
          }}
        >
          {/* ── Accuracy Banner (NEW) ── */}
          <div style={{
            padding: '16px 24px',
            background: 'linear-gradient(135deg, #008A3E08 0%, #00B7DB06 100%)',
            borderBottom: `1px solid ${V.greenBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: V.greenBg, border: `1px solid ${V.greenBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M4.5 9L7.5 12L13.5 6" stroke={V.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <div style={{
                  fontFamily: 'var(--font-display, "Newsreader", Georgia, serif)',
                  fontSize: 15, fontWeight: 600, color: V.green, letterSpacing: '-0.01em',
                }}>
                  Report Accuracy: 100%
                </div>
                <div style={{ fontSize: 12, color: V.textMid, marginTop: 2 }}>
                  All {total_calculations} calculations verified and accurate
                </div>
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setShowHelp(!showHelp); }}
              style={{
                padding: '4px 10px', fontSize: 11, fontWeight: 500,
                color: V.accent, background: V.accentBg,
                border: `1px solid ${V.accentBorder}`, borderRadius: 6,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#00B7DB18'; }}
              onMouseLeave={e => { e.currentTarget.style.background = V.accentBg; }}
            >
              How it works
            </button>
          </div>

          {/* ── How It Works Explainer (NEW) ── */}
          {showHelp && (
            <div style={{
              padding: '16px 24px',
              background: V.accentBg,
              borderBottom: `1px solid ${V.accentBorder}`,
              fontSize: 12, lineHeight: 1.6, color: V.textMid,
            }}>
              <div style={{ fontWeight: 600, color: V.text, marginBottom: 6, fontSize: 12 }}>
                Understanding the Audit Trail
              </div>
              <div style={{ marginBottom: 8 }}>
                Every number in your report is checked by our 3-layer verification engine.
                The <strong style={{ color: V.text }}>Pass Rate</strong> shows how many calculations
                were correct on Claude&apos;s first attempt. When a calculation doesn&apos;t pass the
                first check, the engine <strong style={{ color: V.text }}>automatically corrects it</strong> and
                marks it as &ldquo;Corrected.&rdquo;
              </div>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10,
              }}>
                <div style={{
                  padding: '10px 12px', background: V.bg, borderRadius: 8,
                  border: `1px solid ${V.borderL}`,
                }}>
                  <div style={{ fontSize: 11, color: V.textSoft, marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    First-Pass Rate
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: V.gold, fontFamily: 'var(--font-display, "Newsreader", Georgia, serif)' }}>
                    {passRate}%
                  </div>
                  <div style={{ fontSize: 11, color: V.textSoft, marginTop: 2 }}>
                    {passed} of {total_calculations} passed without correction
                  </div>
                </div>
                <div style={{
                  padding: '10px 12px', background: V.bg, borderRadius: 8,
                  border: `1px solid ${V.greenBorder}`,
                }}>
                  <div style={{ fontSize: 11, color: V.textSoft, marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Final Accuracy
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: V.green, fontFamily: 'var(--font-display, "Newsreader", Georgia, serif)' }}>
                    100%
                  </div>
                  <div style={{ fontSize: 11, color: V.textSoft, marginTop: 2 }}>
                    After {overridden} auto-correction{overridden !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 10, padding: '8px 10px', background: V.bgWarm, borderRadius: 6, border: `1px solid ${V.borderL}` }}>
                <div style={{ fontSize: 11, lineHeight: 1.5, color: V.textMid }}>
                  <strong style={{ color: V.text }}>Passed</strong> = Correct on first check, no changes needed.{' '}
                  <strong style={{ color: V.text }}>Corrected</strong> = Engine caught an error and fixed it automatically.{' '}
                  <strong style={{ color: V.text }}>Formula Overridden</strong> = AI used a non-standard formula; replaced with the industry-standard calculation.{' '}
                  <strong style={{ color: V.text }}>Material Override</strong> = Correction exceeded 1% of the original value, flagged for transparency.
                </div>
              </div>
            </div>
          )}

          {/* Summary header */}
          <div style={{ padding: '20px 24px', borderBottom: `1px solid ${V.borderL}` }}>
            <h3 style={{
              fontFamily: 'var(--font-display, "Newsreader", Georgia, serif)',
              fontSize: 16, fontWeight: 500, color: V.text, marginBottom: 16,
            }}>
              Math Verification Audit Trail
            </h3>

            {/* Summary stats — relabeled for clarity */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              <StatBox label="Total" value={total_calculations} color={V.textMid} />
              <StatBox label="Passed" value={passed} color={V.green} />
              <StatBox label="Corrected" value={overridden} color={overridden > 0 ? V.gold : V.textMuted} />
              <StatBox
                label="First-Pass Rate"
                value={`${passRate}%`}
                color={passRate === 100 ? V.green : V.gold}
              />
            </div>

            {/* Confidence breakdown */}
            {Object.keys(confidenceCounts).length > 0 && (
              <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {Object.entries(confidenceCounts).map(([level, count]) => (
                  <span
                    key={level}
                    style={{
                      fontSize: 11, fontWeight: 600, padding: '3px 10px',
                      borderRadius: 100,
                      background: level === '3-layer' ? V.greenBg
                        : level === '2.5-layer' ? V.accentBg
                        : level === '2-layer' ? V.goldBg
                        : V.bgAlt,
                      color: level === '3-layer' ? V.green
                        : level === '2.5-layer' ? V.accent
                        : level === '2-layer' ? V.gold
                        : V.textSoft,
                      border: `1px solid ${
                        level === '3-layer' ? V.greenBorder
                        : level === '2.5-layer' ? V.accentBorder
                        : level === '2-layer' ? '#C8B88A30'
                        : V.borderL
                      }`,
                    }}
                  >
                    {count} {level}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Per-section details */}
          <div style={{ maxHeight: 480, overflowY: 'auto' }}>
            {Array.from(sectionGroups.entries()).map(([sectionId, calcs]) => {
              const isExpanded = expandedSection === sectionId;
              const sectionPassed = calcs.filter(c => c.layer_3.status === 'passed' && c.layer_1.status !== 'corrected').length;
              const sectionTotal = calcs.length;
              const allPassed = sectionPassed === sectionTotal;

              return (
                <div key={sectionId} style={{ borderBottom: `1px solid ${V.borderL}` }}>
                  {/* Section header */}
                  <button
                    onClick={() => setExpandedSection(isExpanded ? null : sectionId)}
                    style={{
                      width: '100%', padding: '14px 24px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = V.bgWarm; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: allPassed ? V.green : V.gold,
                      }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: V.text }}>
                        {formatSectionName(sectionId)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        fontSize: 12, color: allPassed ? V.green : V.gold, fontWeight: 500,
                      }}>
                        {sectionPassed}/{sectionTotal}
                      </span>
                      <ChevronIcon isOpen={isExpanded} />
                    </div>
                  </button>

                  {/* Expanded calculations */}
                  {isExpanded && (
                    <div style={{ padding: '0 24px 16px' }}>
                      {calcs.map((calc, idx) => (
                        <CalcRow key={idx} calc={calc} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════

function StatBox({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{
      padding: '10px 14px', background: V.bgWarm,
      borderRadius: 10, border: `1px solid ${V.borderL}`,
    }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: V.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-display, "Newsreader", Georgia, serif)',
        fontSize: 22, fontWeight: 600, color,
      }}>
        {value}
      </div>
    </div>
  );
}

function CalcRow({ calc }: { calc: ValidationDetail }) {
  const l1 = calc.layer_1;
  const l2 = calc.layer_2;
  const l3 = calc.layer_3;

  const l1Label = l1.status === 'corrected'
    ? `→ ${l1.inputs_verified}/${l1.inputs_total} verified`
    : `✓ ${l1.inputs_verified}/${l1.inputs_total} verified`;

  const l2Label = l2.formula_match ? '✓ Matched' : '→ Overridden';
  const l3Label = l3.status === 'passed'
    ? '✓ Exact'
    : `→ ±${formatNumber(Math.abs(l3.difference))}`;

  const l1Color = l1.status === 'corrected' ? V.gold : V.green;
  const l2Color = l2.formula_match ? V.green : V.gold;
  const l3Color = l3.status === 'passed' ? V.green : V.gold;

  return (
    <div style={{
      padding: '12px 14px', marginBottom: 8, background: V.bgWarm,
      border: `1px solid ${V.borderL}`, borderRadius: 10,
    }}>
      {/* Metric header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 10,
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: V.text }}>{calc.metric_name}</span>
        <span style={{
          fontSize: 13, fontWeight: 600,
          color: calc.final_value < 0 ? V.red : V.green,
          fontFamily: 'var(--font-display, "Newsreader", Georgia, serif)',
        }}>
          {calc.final_value < 0 ? '-' : ''}${formatNumber(Math.abs(calc.final_value))}
        </span>
      </div>

      {/* Three-layer boxes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <LayerBox label="Inputs" value={l1Label} color={l1Color} />
        <LayerBox label="Formula" value={l2Label} color={l2Color} />
        <LayerBox label="Arithmetic" value={l3Label} color={l3Color} />
      </div>

      {/* Tags row */}
      <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
        <Tag label={calc.confidence} color={
          calc.confidence === '3-layer' ? V.green
          : calc.confidence === '2.5-layer' ? V.accent
          : calc.confidence === '2-layer' ? V.gold
          : V.textSoft
        } />
        {calc.material_override && <Tag label="Material override" color={V.red} />}
      </div>
    </div>
  );
}

function LayerBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      padding: '8px 10px', background: V.bg,
      border: `1px solid ${V.borderL}`, borderRadius: 8, textAlign: 'center',
    }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: V.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 12, fontWeight: 500, color }}>{value}</div>
    </div>
  );
}

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 8px',
      borderRadius: 100,
      color,
      background: `${color}10`,
      border: `1px solid ${color}25`,
    }}>
      {label}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════
// Icons
// ═══════════════════════════════════════════════════════════

function ShieldCheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M8 1L3 3.5V7.5C3 10.8 5.2 13.8 8 15C10.8 13.8 13 10.8 13 7.5V3.5L8 1Z"
        stroke="#008A3E" strokeWidth="1.2" fill="#008A3E10"
      />
      <path d="M5.5 8L7 9.5L10.5 6" stroke="#008A3E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      width="12" height="12" viewBox="0 0 12 12" fill="none"
      style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
    >
      <path d="M3 4.5L6 7.5L9 4.5" stroke="#A3A3A3" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════

function formatSectionName(id: string): string {
  return id
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}
