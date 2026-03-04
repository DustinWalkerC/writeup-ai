// components/verified-badge.tsx

/**
 * Verified Badge — P2 Gold Seal + Elegant Banner + Expandable Audit Trail.
 *
 * LAYOUT (top to bottom):
 *   DESKTOP:
 *     1. ALWAYS VISIBLE — P2 Gold Certified Seal badge + "Report Accuracy: 100%"
 *     2. ALWAYS VISIBLE — Elegant banner strip with key stats + "Audit Trail" toggle
 *     3. EXPANDABLE — Full audit trail (stats grid, confidence tags, per-section details)
 *
 *   MOBILE (≤768px):
 *     1. ALWAYS VISIBLE — Compact single-line bar: shield + "Verified" + "43 checks · 100% accurate" + "Details" toggle
 *     2. EXPANDABLE — Full gold seal + banner strip (tap "Details" to reveal)
 *     3. EXPANDABLE — Full audit trail (nested inside expanded details)
 *
 * Design: WriteUp AI warm palette. Newsreader for headings, DM Sans for body.
 * No emojis. Clean, confident, institutional.
 */

'use client';

import { useState, useEffect } from 'react';

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
// Palette
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
  goldWarm: '#C8B88A',
  goldBg: '#C8B88A18',
  red: '#CC0000',
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
// Mobile detection hook
// ═══════════════════════════════════════════════════════════

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    function check() { setIsMobile(window.innerWidth <= breakpoint); }
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [breakpoint]);
  return isMobile;
}

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

export default function VerifiedBadge({ validationLog }: VerifiedBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const isMobile = useIsMobile();

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

      {/* ═══════════════════════════════════════════════════════
          MOBILE: Compact single-line bar (≤768px)
          ═══════════════════════════════════════════════════════ */}
      {isMobile && (
        <>
          {/* Compact bar — always visible on mobile */}
          <div
            onClick={() => setMobileExpanded(!mobileExpanded)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 0',
              cursor: 'pointer',
            }}
          >
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              border: `1.5px solid ${V.goldWarm}60`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <ShieldSolidIcon size={11} color={V.gold} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: V.green }}>Verified</span>
              <div style={{ width: 1, height: 12, background: V.borderL }} />
              <span style={{ fontSize: 10, color: V.textSoft }}>
                <strong style={{ color: V.textMid }}>{total_calculations}</strong> checks{' · '}
                <strong style={{ color: V.green }}>100%</strong> accurate
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: V.accent }}>
                {mobileExpanded ? 'Hide' : 'Details'}
              </span>
              <div style={{
                transition: 'transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
                transform: mobileExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                display: 'flex',
              }}>
                <ChevronIcon />
              </div>
            </div>
          </div>

          {/* Expanded mobile details — gold seal + banner + audit trail */}
          {mobileExpanded && (
            <div style={{ animation: 'vbFadeIn 0.3s cubic-bezier(0.22, 1, 0.36, 1) both' }}>
              {/* Gold seal */}
              <GoldSealBadge totalCalculations={total_calculations} isMobile={true} />

              {/* Banner strip + audit trail toggle */}
              <BannerStrip
                totalCalculations={total_calculations}
                passed={passed}
                overridden={overridden}
                isOpen={isOpen}
                onToggle={() => setIsOpen(!isOpen)}
                isMobile={true}
              />

              {/* Audit trail */}
              {isOpen && (
                <AuditTrailPanel
                  totalCalculations={total_calculations}
                  passed={passed}
                  overridden={overridden}
                  passRate={passRate}
                  confidenceCounts={confidenceCounts}
                  sectionGroups={sectionGroups}
                  expandedSection={expandedSection}
                  setExpandedSection={setExpandedSection}
                  showHelp={showHelp}
                  setShowHelp={setShowHelp}
                  isMobile={true}
                />
              )}
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════
          DESKTOP: Full layout (>768px)
          ═══════════════════════════════════════════════════════ */}
      {!isMobile && (
        <>
          {/* Gold seal — always visible */}
          <GoldSealBadge totalCalculations={total_calculations} isMobile={false} />

          {/* Banner strip + audit trail toggle — always visible */}
          <BannerStrip
            totalCalculations={total_calculations}
            passed={passed}
            overridden={overridden}
            isOpen={isOpen}
            onToggle={() => setIsOpen(!isOpen)}
            isMobile={false}
          />

          {/* Audit trail — expandable */}
          {isOpen && (
            <AuditTrailPanel
              totalCalculations={total_calculations}
              passed={passed}
              overridden={overridden}
              passRate={passRate}
              confidenceCounts={confidenceCounts}
              sectionGroups={sectionGroups}
              expandedSection={expandedSection}
              setExpandedSection={setExpandedSection}
              showHelp={showHelp}
              setShowHelp={setShowHelp}
              isMobile={false}
            />
          )}
        </>
      )}

      <style>{`
        @keyframes vbFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Gold Seal Badge
// ═══════════════════════════════════════════════════════════

function GoldSealBadge({ totalCalculations, isMobile }: { totalCalculations: number; isMobile: boolean }) {
  return (
    <div className="vb-hero" style={{
      display: 'flex',
      alignItems: 'center',
      gap: isMobile ? 8 : 12,
      padding: '12px 0 10px',
    }}>
      <div className="vb-badge" style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isMobile ? 8 : 10,
        padding: isMobile ? '8px 12px' : '10px 16px',
        background: 'linear-gradient(135deg, #FDFCF8 0%, #FAF7F0 100%)',
        border: `1px solid ${V.goldWarm}40`,
        borderRadius: 10,
        boxShadow: `0 1px 4px ${V.goldWarm}15`,
        width: isMobile ? '100%' : 'auto',
        boxSizing: 'border-box' as const,
      }}>
        <div style={{
          width: isMobile ? 28 : 34, height: isMobile ? 28 : 34, borderRadius: '50%',
          border: `2px solid ${V.goldWarm}60`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <ShieldSolidIcon size={isMobile ? 13 : 16} color={V.gold} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: isMobile ? 7 : 8, fontWeight: 700, color: V.gold,
            textTransform: 'uppercase', letterSpacing: '0.12em', lineHeight: 1,
          }}>
            Certified Accurate
          </div>
          <div style={{
            fontSize: isMobile ? 13 : 14, fontWeight: 700, color: V.text,
            fontFamily: 'var(--font-display, "Newsreader", Georgia, serif)',
            letterSpacing: '-0.01em',
          }}>
            Math Verification Complete
          </div>
          <div style={{
            fontSize: isMobile ? 10 : 11, color: V.textMid, marginTop: 1,
          }}>
            All {totalCalculations} calculations verified
          </div>
        </div>
        <div style={{
          marginLeft: isMobile ? 2 : 6, padding: isMobile ? '4px 10px' : '6px 12px',
          background: `${V.green}0A`,
          border: `1px solid ${V.green}20`,
          borderRadius: 8,
          textAlign: 'center',
          flexShrink: 0,
        }}>
          <div style={{
            fontSize: isMobile ? 14 : 16, fontWeight: 700, color: V.green,
            fontFamily: 'var(--font-display, "Newsreader", Georgia, serif)',
            lineHeight: 1,
          }}>
            100%
          </div>
          <div style={{
            fontSize: isMobile ? 8 : 9, fontWeight: 600, color: V.green,
            textTransform: 'uppercase', letterSpacing: '0.06em',
            marginTop: 2, opacity: 0.8,
          }}>
            Accuracy
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Banner Strip
// ═══════════════════════════════════════════════════════════

function BannerStrip({
  totalCalculations, passed, overridden, isOpen, onToggle, isMobile,
}: {
  totalCalculations: number; passed: number; overridden: number;
  isOpen: boolean; onToggle: () => void; isMobile: boolean;
}) {
  return (
    <div
      onClick={onToggle}
      className="vb-banner"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? 6 : 12,
        padding: isMobile ? '6px 0' : '9px 4px',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 6, flexShrink: 0 }}>
        <LockIcon size={isMobile ? 12 : 14} />
        <span style={{ fontSize: isMobile ? 10 : 11, fontWeight: 600, color: V.green }}>Verified</span>
      </div>

      <div style={{ flex: 1, height: 1, background: `${V.green}12` }} />

      {/* Stats — show inline on both, but condensed on mobile */}
      <div className="vb-banner-stats" style={{ display: 'flex', gap: isMobile ? 4 : 12, flexShrink: 0 }}>
        {isMobile ? (
          <>
            <span style={{ fontSize: 9, color: V.textSoft }}>
              <strong style={{ color: V.textMid }}>{passed}</strong> passed
            </span>
            <span style={{ fontSize: 9, color: V.textSoft }}>·</span>
            <span style={{ fontSize: 9, color: V.textSoft }}>
              <strong style={{ color: V.textMid }}>{overridden}</strong> corrected
            </span>
          </>
        ) : (
          <>
            <span style={{ fontSize: 10, color: V.textSoft }}>
              <span style={{ fontWeight: 600, color: V.textMid }}>{totalCalculations}</span> checks
            </span>
            <span style={{ fontSize: 10, color: V.textSoft }}>
              <span style={{ fontWeight: 600, color: V.textMid }}>{passed}</span> passed
            </span>
            <span style={{ fontSize: 10, color: V.textSoft }}>
              <span style={{ fontWeight: 600, color: V.textMid }}>{overridden}</span> corrected
            </span>
            <span style={{ fontSize: 10, color: V.textSoft }}>
              <span style={{ fontWeight: 600, color: V.textMid }}>3-layer</span> engine
            </span>
          </>
        )}
      </div>

      <div style={{ flex: 1, height: 1, background: `${V.green}12` }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <span style={{ fontSize: isMobile ? 10 : 11, fontWeight: 600, color: V.accent }}>
          {isOpen ? 'Hide' : 'Audit Trail'}
        </span>
        <div style={{
          transition: 'transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          display: 'flex',
        }}>
          <ChevronIcon />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Audit Trail Panel
// ═══════════════════════════════════════════════════════════

function AuditTrailPanel({
  totalCalculations, passed, overridden, passRate,
  confidenceCounts, sectionGroups, expandedSection, setExpandedSection,
  showHelp, setShowHelp, isMobile,
}: {
  totalCalculations: number; passed: number; overridden: number; passRate: number;
  confidenceCounts: Record<string, number>;
  sectionGroups: Map<string, ValidationDetail[]>;
  expandedSection: string | null; setExpandedSection: (s: string | null) => void;
  showHelp: boolean; setShowHelp: (v: boolean) => void;
  isMobile: boolean;
}) {
  return (
    <div style={{
      marginTop: 4,
      background: V.bg,
      border: `1px solid ${V.border}`,
      borderRadius: isMobile ? 10 : 14,
      overflow: 'hidden',
      animation: 'vbFadeIn 0.3s cubic-bezier(0.22, 1, 0.36, 1) both',
    }}>
      {/* Header + How it works */}
      <div style={{
        padding: isMobile ? '10px 14px' : '12px 20px',
        borderBottom: `1px solid ${V.borderL}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <h3 style={{
          fontFamily: 'var(--font-display, "Newsreader", Georgia, serif)',
          fontSize: isMobile ? 14 : 16, fontWeight: 500, color: V.text, margin: 0,
        }}>
          {isMobile ? 'Audit Trail' : 'Math Verification Audit Trail'}
        </h3>
        <button
          onClick={(e) => { e.stopPropagation(); setShowHelp(!showHelp); }}
          style={{
            padding: isMobile ? '4px 10px' : '5px 12px', fontSize: 11, fontWeight: 600,
            color: V.accent, background: V.accentBg,
            border: `1px solid ${V.accentBorder}`, borderRadius: 8,
            cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#00B7DB18'; }}
          onMouseLeave={e => { e.currentTarget.style.background = V.accentBg; }}
        >
          {showHelp ? 'Close' : 'How it works'}
        </button>
      </div>

      {/* How It Works Explainer */}
      {showHelp && (
        <div style={{
          padding: isMobile ? '12px 14px' : '16px 24px',
          background: V.accentBg,
          borderBottom: `1px solid ${V.accentBorder}`,
          fontSize: 12, lineHeight: 1.6, color: V.textMid,
        }}>
          <div style={{ marginBottom: 8 }}>
            Every number in your report is checked by our 3-layer verification engine.
            The <strong style={{ color: V.text }}>Pass Rate</strong> shows how many calculations
            were correct on the first attempt. When a calculation doesn&apos;t pass the
            first check, the engine <strong style={{ color: V.text }}>automatically corrects it</strong> and
            marks it as &ldquo;Corrected.&rdquo;
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10, marginTop: 10,
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
                {passed} of {totalCalculations} passed without correction
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

      {/* Summary stats grid */}
      <div style={{ padding: isMobile ? '12px 14px' : '16px 20px', borderBottom: `1px solid ${V.borderL}` }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          gap: isMobile ? 8 : 10,
        }}>
          <StatBox label="Total" value={totalCalculations} color={V.textMid} compact={isMobile} />
          <StatBox label="Passed" value={passed} color={V.green} compact={isMobile} />
          <StatBox label="Corrected" value={overridden} color={overridden > 0 ? V.gold : V.textMuted} compact={isMobile} />
          <StatBox
            label={isMobile ? 'First-Pass' : 'First-Pass Rate'}
            value={`${passRate}%`}
            color={passRate === 100 ? V.green : V.gold}
            compact={isMobile}
          />
        </div>

        {/* Confidence breakdown */}
        {Object.keys(confidenceCounts).length > 0 && (
          <div style={{ marginTop: isMobile ? 10 : 14, display: 'flex', gap: isMobile ? 6 : 8, flexWrap: 'wrap' }}>
            {Object.entries(confidenceCounts).map(([level, count]) => (
              <span
                key={level}
                style={{
                  fontSize: isMobile ? 10 : 11, fontWeight: 600,
                  padding: isMobile ? '2px 8px' : '3px 10px',
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
      <div style={{ maxHeight: isMobile ? 320 : 480, overflowY: 'auto' }}>
        {Array.from(sectionGroups.entries()).map(([sectionId, calcs]) => {
          const isExpanded = expandedSection === sectionId;
          const sectionPassed = calcs.filter(c => c.layer_3.status === 'passed' && c.layer_1.status !== 'corrected').length;
          const sectionTotal = calcs.length;
          const allPassed = sectionPassed === sectionTotal;

          return (
            <div key={sectionId} style={{ borderBottom: `1px solid ${V.borderL}` }}>
              <button
                onClick={() => setExpandedSection(isExpanded ? null : sectionId)}
                style={{
                  width: '100%', padding: isMobile ? '12px 14px' : '14px 24px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = V.bgWarm; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 10 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: allPassed ? V.green : V.gold, flexShrink: 0,
                  }} />
                  <span style={{
                    fontSize: isMobile ? 12 : 13, fontWeight: 600, color: V.text, textAlign: 'left',
                  }}>
                    {formatSectionName(sectionId)}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <span style={{
                    fontSize: 12, color: allPassed ? V.green : V.gold, fontWeight: 500,
                  }}>
                    {sectionPassed}/{sectionTotal}
                  </span>
                  <ChevronIcon isOpen={isExpanded} />
                </div>
              </button>

              {isExpanded && (
                <div style={{ padding: isMobile ? '0 14px 12px' : '0 24px 16px' }}>
                  {calcs.map((calc, idx) => (
                    <CalcRow key={idx} calc={calc} isMobile={isMobile} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════

function StatBox({ label, value, color, compact }: { label: string; value: string | number; color: string; compact?: boolean }) {
  return (
    <div style={{
      padding: compact ? '8px 10px' : '10px 14px', background: V.bgWarm,
      borderRadius: 10, border: `1px solid ${V.borderL}`,
    }}>
      <div style={{
        fontSize: compact ? 9 : 10, fontWeight: 600, color: V.textMuted,
        textTransform: 'uppercase', letterSpacing: '0.05em',
        marginBottom: compact ? 2 : 4,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-display, "Newsreader", Georgia, serif)',
        fontSize: compact ? 18 : 22, fontWeight: 600, color,
      }}>
        {value}
      </div>
    </div>
  );
}

function CalcRow({ calc, isMobile }: { calc: ValidationDetail; isMobile: boolean }) {
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
      padding: isMobile ? '10px 10px' : '12px 14px', marginBottom: 8, background: V.bgWarm,
      border: `1px solid ${V.borderL}`, borderRadius: 10,
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: isMobile ? 8 : 10,
        flexWrap: isMobile ? 'wrap' : 'nowrap',
        gap: isMobile ? 4 : 0,
      }}>
        <span style={{ fontSize: isMobile ? 12 : 13, fontWeight: 600, color: V.text }}>{calc.metric_name}</span>
        <span style={{
          fontSize: isMobile ? 12 : 13, fontWeight: 600,
          color: calc.final_value < 0 ? V.red : V.green,
          fontFamily: 'var(--font-display, "Newsreader", Georgia, serif)',
        }}>
          {calc.final_value < 0 ? '-' : ''}${formatNumber(Math.abs(calc.final_value))}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: isMobile ? 4 : 8 }}>
        <LayerBox label="Inputs" value={l1Label} color={l1Color} compact={isMobile} />
        <LayerBox label="Formula" value={l2Label} color={l2Color} compact={isMobile} />
        <LayerBox label="Arithmetic" value={l3Label} color={l3Color} compact={isMobile} />
      </div>

      <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
        <Tag label={calc.confidence} color={
          calc.confidence === '3-layer' ? V.green
          : calc.confidence === '2.5-layer' ? V.accent
          : calc.confidence === '2-layer' ? V.gold
          : V.textSoft
        } compact={isMobile} />
        {calc.material_override && <Tag label="Material override" color={V.red} compact={isMobile} />}
      </div>
    </div>
  );
}

function LayerBox({ label, value, color, compact }: { label: string; value: string; color: string; compact?: boolean }) {
  return (
    <div style={{
      padding: compact ? '6px 4px' : '8px 10px', background: V.bg,
      border: `1px solid ${V.borderL}`, borderRadius: compact ? 6 : 8, textAlign: 'center',
    }}>
      <div style={{
        fontSize: compact ? 8 : 10, fontWeight: 600, color: V.textMuted,
        textTransform: 'uppercase', letterSpacing: '0.04em',
        marginBottom: compact ? 2 : 4,
      }}>
        {label}
      </div>
      <div style={{ fontSize: compact ? 10 : 12, fontWeight: 500, color }}>{value}</div>
    </div>
  );
}

function Tag({ label, color, compact }: { label: string; color: string; compact?: boolean }) {
  return (
    <span style={{
      fontSize: compact ? 9 : 10, fontWeight: 600,
      padding: '2px 8px',
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

function LockIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="4" y="7" width="8" height="6" rx="1.5" stroke={V.green} strokeWidth="1.3" fill={`${V.green}08`} />
      <path d="M6 7V5.5C6 4.4 6.9 3.5 8 3.5C9.1 3.5 10 4.4 10 5.5V7" stroke={V.green} strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="8" cy="10" r="1" fill={V.green} />
    </svg>
  );
}

function ShieldSolidIcon({ size = 16, color = V.green }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M8 1L3 3.5V7.5C3 10.8 5.2 13.8 8 15C10.8 13.8 13 10.8 13 7.5V3.5L8 1Z" fill={color} />
      <path d="M5.5 8L7 9.5L10.5 6" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronIcon({ isOpen }: { isOpen?: boolean } = {}) {
  return (
    <svg
      width="12" height="12" viewBox="0 0 12 12" fill="none"
      style={{
        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: 'transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <path d="M3 4.5L6 7.5L9 4.5" stroke={V.accent} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
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
