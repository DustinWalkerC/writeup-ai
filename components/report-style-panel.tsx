// components/report-style-panel.tsx

/**
 * Report Style Panel — AI Preferences with Tier Gating + Info Popups
 *
 * UPDATED: Added beautiful info popups with real examples for each setting.
 * Each control has an (i) icon that opens a contextual popup showing:
 *   - Writing Tone: side-by-side example of Formal vs Professional vs Direct
 *   - Analysis Depth: example of Summary vs Standard vs Comprehensive
 *   - Terminology Level: example of Standard CRE vs Institutional PE
 *   - Variance Threshold: example of what gets flagged at different thresholds
 *   - Risk Severity Labels: example of Monitor/Action vs Low/Med/High
 *   - Cross-Section Insights: example of cross-section analysis
 *   - Forward Outlook: example of what forward outlook adds
 *
 * Controls:
 *   Writing Tone       — Formal / Professional / Direct          (all tiers)
 *   Analysis Depth     — Summary / Standard / Comprehensive      (all tiers)
 *   Terminology Level  — Standard CRE / Institutional PE         (Professional+)
 *   Variance Threshold — 1–15% slider                            (Professional+)
 *   Negative Format    — Parenthetical ($X) / Dash -$X           (all tiers)
 *   Risk Severity      — Monitor/Action vs Low/Med/High          (Institutional)
 *   Cross-Section      — Toggle on/off                           (Institutional)
 *   Forward Outlook    — Toggle on/off                           (all tiers)
 *
 * Values stored in user_settings.ai_preferences (JSONB).
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

// ── Palette ──
const P = {
  accent: '#00B7DB',
  accentBg: '#00B7DB0D',
  accentBorder: '#00B7DB22',
  accentSolid: '#00B7DB',
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
  greenBg: '#008A3E08',
  greenBorder: '#008A3E25',
};

// ── Types ──
export interface AIPreferences {
  writing_tone: 'formal' | 'professional' | 'direct';
  analysis_depth: 'summary' | 'standard' | 'comprehensive';
  terminology_level: 'standard_cre' | 'institutional_pe';
  variance_threshold: number; // 1-15
  negative_format: 'parenthetical' | 'dash';
  risk_severity_labels: 'monitor_action' | 'low_med_high';
  cross_section_insights: boolean;
  include_forward_outlook: boolean;
}

export const DEFAULT_AI_PREFERENCES: AIPreferences = {
  writing_tone: 'professional',
  analysis_depth: 'standard',
  terminology_level: 'standard_cre',
  variance_threshold: 5,
  negative_format: 'parenthetical',
  risk_severity_labels: 'monitor_action',
  cross_section_insights: false,
  include_forward_outlook: true,
};

type TierLevel = 'foundational' | 'professional' | 'institutional';

interface ReportStylePanelProps {
  preferences: AIPreferences;
  onChange: (prefs: AIPreferences) => void;
  tier: TierLevel;
  onSave?: () => void;
  isSaving?: boolean;
}

// ── Tier hierarchy for gating ──
const TIER_RANK: Record<TierLevel, number> = {
  foundational: 1,
  professional: 2,
  institutional: 3,
};

// ═══════════════════════════════════════════════════════════
// Info Popup Content — Real examples for each setting
// ═══════════════════════════════════════════════════════════

interface InfoContent {
  title: string;
  description: string;
  examples: Array<{
    label: string;
    text: string;
    highlight?: boolean;
  }>;
}

const INFO_CONTENT: Record<string, InfoContent> = {
  writing_tone: {
    title: 'Writing Tone',
    description: 'Controls the voice and style of your report narrative. Here is how the same data point reads in each tone:',
    examples: [
      {
        label: 'Formal',
        text: 'The property experienced a revenue decline of 1.2% month-over-month, attributable to a net reduction in occupied units. Management has initiated a comprehensive leasing strategy to address current vacancy levels.',
      },
      {
        label: 'Professional',
        text: 'Revenue dipped 1.2% month-over-month, driven by two move-outs. The leasing team has adjusted pricing on available units and is running a targeted renewal campaign to stabilize occupancy.',
        highlight: true,
      },
      {
        label: 'Direct',
        text: 'Revenue down 1.2% MoM. Two move-outs caused the dip. Leasing has repriced available units and launched renewal campaigns.',
      },
    ],
  },
  analysis_depth: {
    title: 'Analysis Depth',
    description: 'Determines how much detail the AI provides when analyzing financial metrics:',
    examples: [
      {
        label: 'Summary',
        text: 'NOI increased 4.4% month-over-month to $113.8K, driven by revenue growth outpacing expense increases.',
      },
      {
        label: 'Standard',
        text: 'NOI increased 4.4% month-over-month to $113.8K ($109.0K budget). Revenue grew 2.5% while operating expenses rose 1.8%, creating favorable NOI leverage. The $4.8K budget surplus reflects strong expense management in R&M and administrative categories.',
        highlight: true,
      },
      {
        label: 'Comprehensive',
        text: 'NOI increased 4.4% month-over-month to $113.8K, exceeding the $109.0K budget by $4.8K (+4.4%). Revenue grew 2.5% driven by 3 new move-ins at $1,285 average rent vs $1,195 trailing average \u2014 a $90/unit premium. Operating expenses rose only 1.8% despite a $2.1K spike in R&M (HVAC seasonal prep), offset by $3.4K savings in administrative and marketing. The resulting 40.9% operating margin is 180bps above trailing 3-month average.',
      },
    ],
  },
  terminology_level: {
    title: 'Terminology Level',
    description: 'Adjusts the financial vocabulary used in your reports:',
    examples: [
      {
        label: 'Standard CRE',
        text: 'Total revenue was $277.8K with operating expenses of $164.0K, resulting in NOI of $113.8K. Occupancy held steady at 91.4% with average rent of $1,285 per unit.',
        highlight: true,
      },
      {
        label: 'Institutional PE',
        text: 'GPR of $301.2K was offset by concessions and loss-to-lease of $23.4K, yielding EGI of $277.8K. After controllable OpEx of $118.2K and non-controllable charges of $45.8K, the property generated NOI of $113.8K on a T-12 basis. Same-store revenue growth of 2.5% contributed to 180bps margin expansion.',
      },
    ],
  },
  variance_threshold: {
    title: 'Variance Threshold',
    description: 'Sets the percentage at which budget-vs-actual variances get flagged for analysis. Lower = more sensitive:',
    examples: [
      {
        label: '3% Threshold',
        text: 'At 3%, the report flags: R&M (+6.8%), Admin (-4.2%), Marketing (+3.5%), and Utilities (+3.1%). You get detailed analysis on 4 line items.',
      },
      {
        label: '5% Threshold (default)',
        text: 'At 5%, the report flags: R&M (+6.8%) and Admin (-4.2%). Only the 2 most significant variances get called out \u2014 keeps the report focused.',
        highlight: true,
      },
      {
        label: '10% Threshold',
        text: 'At 10%, nothing gets flagged in this example since no category exceeded 10%. Best for stabilized properties where small swings are expected.',
      },
    ],
  },
  risk_severity_labels: {
    title: 'Risk Severity Labels',
    description: 'Controls how risk items are labeled in your report. Choose the framework your investors expect:',
    examples: [
      {
        label: 'Monitor / Action Required',
        text: 'MONITOR \u2014 Bad debt reached 2.7% of GPR, third consecutive monthly increase. Review collection procedures.\n\nACTION REQUIRED \u2014 Occupancy below 88% threshold. Recommend concession strategy for Q2 lease-ups.',
        highlight: true,
      },
      {
        label: 'Low / Medium / High',
        text: 'LOW RISK \u2014 Insurance renewal due in 60 days, carrier has indicated 3-5% increase.\n\nHIGH RISK \u2014 Occupancy below 88% threshold. Concession strategy recommended for Q2 lease-ups.',
      },
    ],
  },
  cross_section_insights: {
    title: 'Cross-Section Insights',
    description: 'When enabled, the AI connects patterns across different report sections \u2014 showing how one metric impacts another:',
    examples: [
      {
        label: 'Without Cross-Section',
        text: 'Revenue Section: "Revenue decreased 1.2% month-over-month."\n\nExpense Section: "R&M expenses increased 6.8% above budget."',
      },
      {
        label: 'With Cross-Section',
        text: 'Revenue Section: "Revenue decreased 1.2% month-over-month."\n\nExpense Section: "R&M expenses increased 6.8% above budget, partially offset by the 2-unit vacancy reducing per-unit utility costs by $45/unit. Net impact to NOI from the combined revenue decline and R&M spike: ($4,200)."',
        highlight: true,
      },
    ],
  },
  include_forward_outlook: {
    title: 'Forward Outlook',
    description: 'Adds a forward-looking analysis paragraph to relevant sections, projecting trends and recommending actions:',
    examples: [
      {
        label: 'Without Outlook',
        text: 'NOI of $113.8K exceeded budget by $4.8K (+4.4%), reflecting strong expense control across controllable categories.',
      },
      {
        label: 'With Outlook',
        text: 'NOI of $113.8K exceeded budget by $4.8K (+4.4%), reflecting strong expense control across controllable categories. At current trajectory, the property is positioned to exceed annual NOI projections by approximately $28K-$35K. However, seasonal R&M increases in Q3 may compress margins 50-75bps if preventive maintenance is deferred.',
        highlight: true,
      },
    ],
  },
};

// ═══════════════════════════════════════════════════════════
// Info Popup Component
// ═══════════════════════════════════════════════════════════

function InfoPopup({ contentKey, isOpen, onClose }: { contentKey: string; isOpen: boolean; onClose: () => void }) {
  const popupRef = useRef<HTMLDivElement>(null);
  const content = INFO_CONTENT[contentKey];

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !content) return null;

  return (
    <>
      {/* Backdrop */}
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(26, 26, 26, 0.3)',
        backdropFilter: 'blur(2px)', zIndex: 1000,
        animation: 'popupFadeIn 0.15s ease-out both',
      }} />

      {/* Popup */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1001,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}>
        <div
          ref={popupRef}
          style={{
            background: P.bg,
            border: `1px solid ${P.border}`,
            borderRadius: 16,
            boxShadow: '0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)',
            width: '100%',
            maxWidth: 520,
            maxHeight: 'calc(100vh - 80px)',
            overflowY: 'auto',
            animation: 'popupSlideUp 0.25s cubic-bezier(0.22, 1, 0.36, 1) both',
            fontFamily: 'var(--font-body, "DM Sans", system-ui, sans-serif)',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '18px 22px 14px',
            borderBottom: `1px solid ${P.borderL}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          }}>
            <div style={{ flex: 1 }}>
              <h4 style={{
                fontFamily: 'var(--font-display, "Newsreader", Georgia, serif)',
                fontSize: 17, fontWeight: 600, color: P.text, margin: 0,
                letterSpacing: '-0.01em',
              }}>
                {content.title}
              </h4>
              <p style={{ fontSize: 12, color: P.textSoft, margin: '4px 0 0', lineHeight: 1.5 }}>
                {content.description}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 28, height: 28, borderRadius: 8,
                border: `1px solid ${P.borderL}`, background: P.bgWarm,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginLeft: 16, transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = P.bgAlt; e.currentTarget.style.borderColor = P.border; }}
              onMouseLeave={e => { e.currentTarget.style.background = P.bgWarm; e.currentTarget.style.borderColor = P.borderL; }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M9 3L3 9M3 3L9 9" stroke={P.textSoft} strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Examples */}
          <div style={{ padding: '14px 22px 20px' }}>
            {content.examples.map((ex, idx) => (
              <div
                key={idx}
                style={{
                  marginBottom: idx < content.examples.length - 1 ? 12 : 0,
                  padding: '14px 16px',
                  background: ex.highlight ? P.accentBg : P.bgWarm,
                  border: `1px solid ${ex.highlight ? P.accentBorder : P.borderL}`,
                  borderRadius: 10,
                  transition: 'all 0.15s',
                }}
              >
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
                }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: ex.highlight ? P.accent : P.textSoft,
                  }}>
                    {ex.label}
                  </span>
                  {ex.highlight && (
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '1px 7px',
                      background: `${P.accent}14`, color: P.accent,
                      borderRadius: 100, border: `1px solid ${P.accentBorder}`,
                    }}>
                      Current
                    </span>
                  )}
                </div>
                <div style={{
                  fontSize: 12.5, lineHeight: 1.65, color: P.textMid,
                  whiteSpace: 'pre-line',
                }}>
                  {ex.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes popupFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes popupSlideUp {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// Info Button Component
// ═══════════════════════════════════════════════════════════

function InfoButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{
        width: 20, height: 20, borderRadius: '50%',
        border: `1px solid ${P.border}`, background: P.bgWarm,
        cursor: 'pointer', display: 'inline-flex',
        alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s', flexShrink: 0,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = P.accentBg;
        e.currentTarget.style.borderColor = P.accentBorder;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = P.bgWarm;
        e.currentTarget.style.borderColor = P.border;
      }}
      title="See examples"
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M5 4.5V7" stroke={P.textSoft} strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="5" cy="3" r="0.6" fill={P.textSoft} />
      </svg>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════

export default function ReportStylePanel({
  preferences,
  onChange,
  tier,
  onSave,
  isSaving = false,
}: ReportStylePanelProps) {
  const [activePopup, setActivePopup] = useState<string | null>(null);

  const update = useCallback(
    <K extends keyof AIPreferences>(key: K, value: AIPreferences[K]) => {
      onChange({ ...preferences, [key]: value });
    },
    [preferences, onChange],
  );

  const isLocked = (requiredTier: TierLevel): boolean =>
    TIER_RANK[tier] < TIER_RANK[requiredTier];

  return (
    <div style={{ fontFamily: 'var(--font-body, "DM Sans", system-ui, sans-serif)' }}>
      {/* Section header */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{
          fontFamily: 'var(--font-display, "Newsreader", Georgia, serif)',
          fontSize: 18, fontWeight: 500, color: P.text, marginBottom: 4,
        }}>
          Report Style
        </h3>
        <p style={{ fontSize: 13, color: P.textSoft, margin: 0 }}>
          Configure how the AI writes and analyzes your reports
        </p>
      </div>

      {/* Controls container */}
      <div style={{
        background: P.bg, border: `1px solid ${P.border}`,
        borderRadius: 14, overflow: 'hidden',
      }}>
        {/* ── Writing Tone ── */}
        <ControlSection
          label="Writing Tone"
          sublabel="The voice and style of your report narrative"
          onInfoClick={() => setActivePopup('writing_tone')}
        >
          <OptionGrid
            options={[
              { value: 'formal', label: 'Formal', desc: 'Conservative, third-person, institutional voice' },
              { value: 'professional', label: 'Professional', desc: 'Clear and direct with professional tone' },
              { value: 'direct', label: 'Direct', desc: 'Concise, action-oriented, minimal filler' },
            ]}
            selected={preferences.writing_tone}
            onChange={(v) => update('writing_tone', v as AIPreferences['writing_tone'])}
          />
        </ControlSection>

        <Divider />

        {/* ── Analysis Depth ── */}
        <ControlSection
          label="Analysis Depth"
          sublabel="How detailed the AI commentary should be"
          onInfoClick={() => setActivePopup('analysis_depth')}
        >
          <OptionGrid
            options={[
              { value: 'summary', label: 'Summary', desc: 'Key metrics only, minimal narrative' },
              { value: 'standard', label: 'Standard', desc: 'Balanced analysis with context' },
              { value: 'comprehensive', label: 'Comprehensive', desc: 'Deep analysis with comparisons' },
            ]}
            selected={preferences.analysis_depth}
            onChange={(v) => update('analysis_depth', v as AIPreferences['analysis_depth'])}
          />
        </ControlSection>

        <Divider />

        {/* ── Terminology Level ── */}
        <ControlSection
          label="Terminology Level"
          sublabel="Financial vocabulary in your reports"
          locked={isLocked('professional')}
          requiredTier="Professional"
          onInfoClick={() => setActivePopup('terminology_level')}
        >
          <OptionGrid
            options={[
              { value: 'standard_cre', label: 'Standard CRE', desc: 'Revenue, NOI, occupancy' },
              { value: 'institutional_pe', label: 'Institutional PE', desc: 'GPR, EGI, T-12, same-store' },
            ]}
            selected={preferences.terminology_level}
            onChange={(v) => update('terminology_level', v as AIPreferences['terminology_level'])}
            disabled={isLocked('professional')}
          />
        </ControlSection>

        <Divider />

        {/* ── Variance Threshold ── */}
        <ControlSection
          label="Variance Threshold"
          sublabel={`Flag variances above ${preferences.variance_threshold}%`}
          locked={isLocked('professional')}
          requiredTier="Professional"
          onInfoClick={() => setActivePopup('variance_threshold')}
        >
          <div style={{ opacity: isLocked('professional') ? 0.4 : 1, pointerEvents: isLocked('professional') ? 'none' : 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <input
                type="range"
                min={1} max={15} step={1}
                value={preferences.variance_threshold}
                onChange={(e) => update('variance_threshold', Number(e.target.value))}
                style={{
                  flex: 1, height: 4, appearance: 'none',
                  background: `linear-gradient(to right, ${P.accent} 0%, ${P.accent} ${((preferences.variance_threshold - 1) / 14) * 100}%, ${P.borderL} ${((preferences.variance_threshold - 1) / 14) * 100}%, ${P.borderL} 100%)`,
                  borderRadius: 4, outline: 'none', cursor: 'pointer',
                }}
              />
              <span style={{
                fontSize: 15, fontWeight: 700, color: P.accent, minWidth: 40, textAlign: 'right',
                fontFamily: 'var(--font-display, "Newsreader", Georgia, serif)',
              }}>
                {preferences.variance_threshold}%
              </span>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', marginTop: 6,
              fontSize: 10, color: P.textMuted,
            }}>
              <span>1% (more sensitive)</span>
              <span>15% (less sensitive)</span>
            </div>
          </div>
        </ControlSection>

        <Divider />

        {/* ── Negative Format ── */}
        <ControlSection
          label="Negative Number Format"
          sublabel="How negative values appear in your report"
        >
          <OptionGrid
            options={[
              { value: 'parenthetical', label: 'Parenthetical', desc: '($12,500)' },
              { value: 'dash', label: 'Dash', desc: '-$12,500' },
            ]}
            selected={preferences.negative_format}
            onChange={(v) => update('negative_format', v as AIPreferences['negative_format'])}
          />
        </ControlSection>

        <Divider />

        {/* ── Risk Severity Labels ── */}
        <ControlSection
          label="Risk Severity Labels"
          sublabel="Framework for risk categorization"
          locked={isLocked('institutional')}
          requiredTier="Institutional"
          onInfoClick={() => setActivePopup('risk_severity_labels')}
        >
          <OptionGrid
            options={[
              { value: 'monitor_action', label: 'Monitor / Action', desc: 'Monitor or Action Required' },
              { value: 'low_med_high', label: 'Low / Med / High', desc: 'Low, Medium, High risk' },
            ]}
            selected={preferences.risk_severity_labels}
            onChange={(v) => update('risk_severity_labels', v as AIPreferences['risk_severity_labels'])}
            disabled={isLocked('institutional')}
          />
        </ControlSection>

        <Divider />

        {/* ── Cross-Section Insights ── */}
        <ControlSection
          label="Cross-Section Insights"
          sublabel="Connect patterns across report sections"
          locked={isLocked('institutional')}
          requiredTier="Institutional"
          onInfoClick={() => setActivePopup('cross_section_insights')}
        >
          <ToggleSwitch
            checked={preferences.cross_section_insights}
            onChange={(v) => update('cross_section_insights', v)}
            disabled={isLocked('institutional')}
            label={preferences.cross_section_insights ? 'Enabled' : 'Disabled'}
          />
        </ControlSection>

        <Divider />

        {/* ── Forward Outlook ── */}
        <ControlSection
          label="Include Forward Outlook"
          sublabel="Add forward-looking projections to analysis"
          onInfoClick={() => setActivePopup('include_forward_outlook')}
        >
          <ToggleSwitch
            checked={preferences.include_forward_outlook}
            onChange={(v) => update('include_forward_outlook', v)}
            label={preferences.include_forward_outlook ? 'Enabled' : 'Disabled'}
          />
        </ControlSection>
      </div>

      {/* Save button */}
      {onSave && (
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onSave}
            disabled={isSaving}
            style={{
              padding: '10px 24px', fontSize: 13, fontWeight: 600,
              color: '#fff', background: isSaving ? P.textMuted : P.accent,
              border: 'none', borderRadius: 10, cursor: isSaving ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {isSaving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      )}

      {/* ── Info Popup Portal ── */}
      {activePopup && (
        <InfoPopup
          contentKey={activePopup}
          isOpen={true}
          onClose={() => setActivePopup(null)}
        />
      )}

      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 18px; height: 18px;
          border-radius: 50%;
          background: ${P.accent};
          border: 3px solid #fff;
          box-shadow: 0 1px 4px rgba(0,0,0,0.15);
          cursor: pointer;
        }
        input[type="range"]::-moz-range-thumb {
          width: 18px; height: 18px;
          border-radius: 50%;
          background: ${P.accent};
          border: 3px solid #fff;
          box-shadow: 0 1px 4px rgba(0,0,0,0.15);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════

function ControlSection({
  label,
  sublabel,
  children,
  locked = false,
  requiredTier,
  onInfoClick,
}: {
  label: string;
  sublabel: string;
  children: React.ReactNode;
  locked?: boolean;
  requiredTier?: string;
  onInfoClick?: () => void;
}) {
  return (
    <div style={{
      padding: '18px 22px',
      opacity: locked ? 0.55 : 1,
      position: 'relative',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginBottom: 4,
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: P.text }}>
          {label}
        </span>
        {onInfoClick && <InfoButton onClick={onInfoClick} />}
        {locked && requiredTier && (
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '2px 8px',
            borderRadius: 100, background: P.bgAlt,
            border: `1px solid ${P.borderL}`, color: P.textMuted,
          }}>
            {requiredTier}+
          </span>
        )}
      </div>
      <p style={{ fontSize: 12, color: P.textSoft, margin: '0 0 12px' }}>{sublabel}</p>
      <div style={{ pointerEvents: locked ? 'none' : 'auto' }}>
        {children}
      </div>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: P.borderL, margin: '0 22px' }} />;
}

function OptionGrid({
  options,
  selected,
  onChange,
  disabled = false,
}: {
  options: Array<{ value: string; label: string; desc: string }>;
  selected: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: options.length <= 2 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
      gap: 8,
    }}>
      {options.map(opt => {
        const isSelected = selected === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => !disabled && onChange(opt.value)}
            disabled={disabled}
            style={{
              padding: '12px 14px', textAlign: 'left',
              background: isSelected ? P.accentBg : P.bgWarm,
              border: `1.5px solid ${isSelected ? P.accentBorder : P.borderL}`,
              borderRadius: 10, cursor: disabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { if (!disabled && !isSelected) e.currentTarget.style.borderColor = P.border; }}
            onMouseLeave={e => { if (!disabled && !isSelected) e.currentTarget.style.borderColor = P.borderL; }}
          >
            <div style={{
              fontSize: 13, fontWeight: 600,
              color: isSelected ? P.accent : P.text,
              marginBottom: 2,
            }}>
              {opt.label}
            </div>
            <div style={{ fontSize: 11, color: P.textSoft, lineHeight: 1.4 }}>
              {opt.desc}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <button
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        style={{
          width: 44, height: 24, borderRadius: 12, border: 'none',
          background: checked ? P.accent : P.borderL,
          cursor: disabled ? 'not-allowed' : 'pointer',
          position: 'relative', transition: 'background 0.2s',
          flexShrink: 0,
        }}
      >
        <div style={{
          width: 18, height: 18, borderRadius: '50%',
          background: '#fff', position: 'absolute', top: 3,
          left: checked ? 23 : 3,
          transition: 'left 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
        }} />
      </button>
      <span style={{ fontSize: 13, color: checked ? P.text : P.textSoft, fontWeight: 500 }}>
        {label}
      </span>
    </div>
  );
}