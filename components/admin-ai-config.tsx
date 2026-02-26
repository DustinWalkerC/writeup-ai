// components/admin-ai-config.tsx

/**
 * Admin AI Configuration Panel
 *
 * Reads/writes to system_config table. Controls:
 *   - Model selection per tier (extraction, narrative)
 *   - Token limits per tier per call type
 *   - Default AI preferences (writing tone, analysis depth)
 *   - Concurrent generation limit
 *   - Feature flags (validation enabled, charts enabled)
 *
 * This component is admin-only. Route should be gated by Clerk role check.
 * Reads from: GET /api/admin/config
 * Writes to:  PATCH /api/admin/config
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

// ── Palette ──
const A = {
  accent: '#00B7DB',
  accentBg: '#00B7DB0D',
  accentBorder: '#00B7DB22',
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
  red: '#CC0000',
  redBg: '#CC000008',
  gold: '#B8960F',
  navy: '#002D5F',
};

// ── Config Types ──
export interface SystemAIConfig {
  models: {
    extraction: Record<string, string>;  // tier → model
    narrative: Record<string, string>;    // tier → model
  };
  token_limits: {
    extraction: Record<string, number>;   // tier → max tokens
    narrative: Record<string, number>;     // tier → max tokens
  };
  defaults: {
    writing_tone: string;
    analysis_depth: string;
    variance_threshold: number;
  };
  features: {
    validation_enabled: boolean;
    charts_enabled: boolean;
    concurrent_limit: number;
  };
}

const DEFAULT_CONFIG: SystemAIConfig = {
  models: {
    extraction: {
      foundational: 'claude-sonnet-4-5-20250929',
      professional: 'claude-sonnet-4-5-20250929',
      institutional: 'claude-sonnet-4-5-20250929',
    },
    narrative: {
      foundational: 'claude-sonnet-4-5-20250929',
      professional: 'claude-sonnet-4-5-20250929',
      institutional: 'claude-opus-4-5-20250918',
    },
  },
  token_limits: {
    extraction: { foundational: 4096, professional: 4096, institutional: 8192 },
    narrative: { foundational: 12000, professional: 20000, institutional: 32000 },
  },
  defaults: {
    writing_tone: 'professional',
    analysis_depth: 'standard',
    variance_threshold: 5,
  },
  features: {
    validation_enabled: true,
    charts_enabled: true,
    concurrent_limit: 3,
  },
};

const AVAILABLE_MODELS = [
  { value: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5' },
  { value: 'claude-opus-4-5-20250918', label: 'Claude Opus 4.5' },
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
];

const TIERS = ['foundational', 'professional', 'institutional'] as const;

interface AdminAIConfigProps {
  initialConfig?: SystemAIConfig;
}

export default function AdminAIConfig({ initialConfig }: AdminAIConfigProps) {
  const [config, setConfig] = useState<SystemAIConfig>(initialConfig || DEFAULT_CONFIG);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'models' | 'tokens' | 'defaults' | 'features'>('models');

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setSaveStatus('Saved');
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        setSaveStatus('Failed to save');
      }
    } catch {
      setSaveStatus('Network error');
    } finally {
      setIsSaving(false);
    }
  }, [config]);

  const updateModel = (callType: 'extraction' | 'narrative', tier: string, model: string) => {
    setConfig(prev => ({
      ...prev,
      models: { ...prev.models, [callType]: { ...prev.models[callType], [tier]: model } },
    }));
  };

  const updateTokenLimit = (callType: 'extraction' | 'narrative', tier: string, limit: number) => {
    setConfig(prev => ({
      ...prev,
      token_limits: { ...prev.token_limits, [callType]: { ...prev.token_limits[callType], [tier]: limit } },
    }));
  };

  const updateDefault = (key: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      defaults: { ...prev.defaults, [key]: value },
    }));
  };

  const updateFeature = (key: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      features: { ...prev.features, [key]: value },
    }));
  };

  const tabs = [
    { id: 'models' as const, label: 'Models', icon: ModelIcon },
    { id: 'tokens' as const, label: 'Token Limits', icon: TokenIcon },
    { id: 'defaults' as const, label: 'Defaults', icon: DefaultsIcon },
    { id: 'features' as const, label: 'Features', icon: FeaturesIcon },
  ];

  return (
    <div style={{
      fontFamily: 'var(--font-body, "DM Sans", system-ui, sans-serif)',
      background: A.bg,
      border: `1px solid ${A.border}`,
      borderRadius: 14,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '20px 24px',
        borderBottom: `1px solid ${A.border}`,
        background: A.bgWarm,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <h2 style={{
            fontFamily: 'var(--font-display, "Newsreader", Georgia, serif)',
            fontSize: 20, fontWeight: 500, color: A.text, marginBottom: 4,
          }}>
            AI Configuration
          </h2>
          <p style={{ fontSize: 13, color: A.textSoft }}>
            System-wide AI model settings and generation parameters
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {saveStatus && (
            <span style={{
              fontSize: 12, fontWeight: 600,
              padding: '4px 12px', borderRadius: 100,
              color: saveStatus === 'Saved' ? A.green : A.red,
              background: saveStatus === 'Saved' ? A.greenBg : A.redBg,
              border: `1px solid ${saveStatus === 'Saved' ? A.greenBorder : '#CC000020'}`,
            }}>
              {saveStatus}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              padding: '9px 20px', fontSize: 13, fontWeight: 600,
              color: '#fff', background: A.accent,
              border: 'none', borderRadius: 10, cursor: 'pointer',
              boxShadow: `0 2px 12px ${A.accent}30`,
              opacity: isSaving ? 0.6 : 1,
            }}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Tab nav */}
      <div style={{
        display: 'flex', gap: 0,
        borderBottom: `1px solid ${A.borderL}`,
        background: A.bgAlt,
        padding: '0 16px',
      }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '12px 16px',
                border: 'none', background: 'transparent',
                cursor: 'pointer',
                fontSize: 13, fontWeight: isActive ? 600 : 500,
                color: isActive ? A.accent : A.textSoft,
                borderBottom: isActive ? `2px solid ${A.accent}` : '2px solid transparent',
                transition: 'all 0.2s',
              }}
            >
              <Icon active={isActive} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ padding: 24 }}>
        {/* Models Tab */}
        {activeTab === 'models' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {(['extraction', 'narrative'] as const).map(callType => (
              <div key={callType}>
                <h4 style={{
                  fontSize: 14, fontWeight: 600, color: A.text,
                  textTransform: 'capitalize' as const, marginBottom: 10,
                }}>
                  {callType === 'extraction' ? 'Data Extraction Model' : 'Report Narrative Model'}
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {TIERS.map(tier => (
                    <div key={tier} style={{
                      padding: '12px 14px',
                      background: A.bgWarm,
                      border: `1px solid ${A.borderL}`,
                      borderRadius: 10,
                    }}>
                      <label style={{
                        display: 'block', fontSize: 11, fontWeight: 700,
                        color: A.textMuted, textTransform: 'uppercase' as const,
                        letterSpacing: '0.06em', marginBottom: 6,
                      }}>
                        {tier}
                      </label>
                      <select
                        value={config.models[callType][tier]}
                        onChange={e => updateModel(callType, tier, e.target.value)}
                        style={{
                          width: '100%', padding: '8px 10px',
                          fontSize: 12, fontWeight: 500, color: A.text,
                          background: A.bg, border: `1px solid ${A.border}`,
                          borderRadius: 8, outline: 'none',
                        }}
                      >
                        {AVAILABLE_MODELS.map(m => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Token Limits Tab */}
        {activeTab === 'tokens' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {(['extraction', 'narrative'] as const).map(callType => (
              <div key={callType}>
                <h4 style={{
                  fontSize: 14, fontWeight: 600, color: A.text,
                  textTransform: 'capitalize' as const, marginBottom: 10,
                }}>
                  {callType === 'extraction' ? 'Extraction Max Tokens' : 'Narrative Max Tokens'}
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {TIERS.map(tier => (
                    <div key={tier} style={{
                      padding: '12px 14px',
                      background: A.bgWarm,
                      border: `1px solid ${A.borderL}`,
                      borderRadius: 10,
                    }}>
                      <label style={{
                        display: 'block', fontSize: 11, fontWeight: 700,
                        color: A.textMuted, textTransform: 'uppercase' as const,
                        letterSpacing: '0.06em', marginBottom: 6,
                      }}>
                        {tier}
                      </label>
                      <input
                        type="number"
                        value={config.token_limits[callType][tier]}
                        onChange={e => updateTokenLimit(callType, tier, Number(e.target.value))}
                        min={1024}
                        max={100000}
                        step={1024}
                        style={{
                          width: '100%', padding: '8px 10px',
                          fontSize: 13, fontWeight: 600, color: A.text,
                          fontVariantNumeric: 'tabular-nums',
                          background: A.bg, border: `1px solid ${A.border}`,
                          borderRadius: 8, outline: 'none',
                          fontFamily: 'var(--font-display, "Newsreader", Georgia, serif)',
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <p style={{ fontSize: 11, color: A.textMuted, marginTop: 4 }}>
              Token limits control the maximum output length per API call. Higher limits = more detailed reports, higher cost.
            </p>
          </div>
        )}

        {/* Defaults Tab */}
        {activeTab === 'defaults' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <ConfigSelect
              label="Default Writing Tone"
              value={config.defaults.writing_tone}
              onChange={v => updateDefault('writing_tone', v)}
              options={[
                { value: 'formal', label: 'Formal' },
                { value: 'professional', label: 'Professional' },
                { value: 'direct', label: 'Direct' },
              ]}
            />
            <ConfigSelect
              label="Default Analysis Depth"
              value={config.defaults.analysis_depth}
              onChange={v => updateDefault('analysis_depth', v)}
              options={[
                { value: 'summary', label: 'Summary' },
                { value: 'standard', label: 'Standard' },
                { value: 'comprehensive', label: 'Comprehensive' },
              ]}
            />
            <div style={{
              padding: '14px 18px',
              background: A.bgWarm,
              border: `1px solid ${A.borderL}`,
              borderRadius: 10,
            }}>
              <label style={{
                display: 'block', fontSize: 13, fontWeight: 600,
                color: A.text, marginBottom: 8,
              }}>
                Default Variance Threshold
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input
                  type="range" min={1} max={15}
                  value={config.defaults.variance_threshold}
                  onChange={e => updateDefault('variance_threshold', Number(e.target.value))}
                  style={{ flex: 1, accentColor: A.accent }}
                />
                <span style={{
                  fontSize: 14, fontWeight: 600, color: A.text,
                  fontVariantNumeric: 'tabular-nums', minWidth: 36,
                  textAlign: 'center' as const,
                }}>
                  {config.defaults.variance_threshold}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Features Tab */}
        {activeTab === 'features' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <FeatureToggle
              label="Math Validation"
              description="Three-layer formula + arithmetic validation on every generated report"
              checked={config.features.validation_enabled}
              onChange={v => updateFeature('validation_enabled', v)}
            />
            <FeatureToggle
              label="Chart Generation"
              description="AI generates data visualizations alongside narrative content"
              checked={config.features.charts_enabled}
              onChange={v => updateFeature('charts_enabled', v)}
            />
            <div style={{
              padding: '14px 18px',
              background: A.bgWarm,
              border: `1px solid ${A.borderL}`,
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: A.text }}>
                  Concurrent Generation Limit
                </div>
                <div style={{ fontSize: 12, color: A.textMuted, marginTop: 2 }}>
                  Maximum simultaneous report generation jobs
                </div>
              </div>
              <input
                type="number"
                value={config.features.concurrent_limit}
                onChange={e => updateFeature('concurrent_limit', Math.max(1, Number(e.target.value)))}
                min={1} max={10}
                style={{
                  width: 64, padding: '8px 10px',
                  fontSize: 16, fontWeight: 600, color: A.text,
                  textAlign: 'center' as const,
                  fontFamily: 'var(--font-display, "Newsreader", Georgia, serif)',
                  background: A.bg, border: `1px solid ${A.border}`,
                  borderRadius: 8, outline: 'none',
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Small Sub-components
// ═══════════════════════════════════════════════════════════

function ConfigSelect({ label, value, onChange, options }: {
  label: string; value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div style={{
      padding: '14px 18px',
      background: A.bgWarm,
      border: `1px solid ${A.borderL}`,
      borderRadius: 10,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: A.text }}>{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          padding: '7px 12px', fontSize: 13, fontWeight: 500,
          color: A.text, background: A.bg,
          border: `1px solid ${A.border}`, borderRadius: 8,
          outline: 'none',
        }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function FeatureToggle({ label, description, checked, onChange }: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div style={{
      padding: '14px 18px',
      background: A.bgWarm,
      border: `1px solid ${A.borderL}`,
      borderRadius: 10,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: A.text }}>{label}</div>
        <div style={{ fontSize: 12, color: A.textMuted, marginTop: 2 }}>{description}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: 44, height: 24, flexShrink: 0, marginLeft: 16,
          borderRadius: 12, border: 'none', cursor: 'pointer',
          background: checked ? A.green : A.border,
          position: 'relative' as const,
          transition: 'background 0.2s',
        }}
      >
        <div style={{
          width: 18, height: 18, borderRadius: '50%',
          background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
          position: 'absolute' as const, top: 3,
          left: checked ? 23 : 3,
          transition: 'left 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
        }} />
      </button>
    </div>
  );
}

// ── Tab Icons ──
function ModelIcon({ active }: { active: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1L1.5 4V10L7 13L12.5 10V4L7 1Z" stroke={active ? A.accent : A.textMuted} strokeWidth="1.2" fill="none" />
      <path d="M7 5.5V8.5" stroke={active ? A.accent : A.textMuted} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
function TokenIcon({ active }: { active: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="2" y="3" width="10" height="8" rx="1.5" stroke={active ? A.accent : A.textMuted} strokeWidth="1.2" />
      <path d="M5 6H9M5 8.5H7.5" stroke={active ? A.accent : A.textMuted} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
function DefaultsIcon({ active }: { active: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5" stroke={active ? A.accent : A.textMuted} strokeWidth="1.2" />
      <path d="M7 4.5V7L9 8.5" stroke={active ? A.accent : A.textMuted} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
function FeaturesIcon({ active }: { active: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M3 7L5.5 9.5L11 4" stroke={active ? A.accent : A.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
