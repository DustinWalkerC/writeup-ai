'use client';

/**
 * CORE — Live Template Preview (JLL/CBRE Institutional Style)
 *
 * Properly proportioned preview that matches the actual report output.
 * Uses inline styles to avoid Tailwind class conflicts with the
 * generated report HTML.
 */

interface TemplatePreviewProps {
  primary: string;
  secondary: string;
  accent: string;
  companyName?: string;
  logoUrl?: string | null;
}

export function TemplatePreview({ primary, secondary, accent, companyName, logoUrl }: TemplatePreviewProps) {
  const primaryIsLight = isLight(primary);
  const headerText = primaryIsLight ? '#1E293B' : '#FFFFFF';
  const headerSub = primaryIsLight ? '#64748B' : 'rgba(255,255,255,0.7)';

  return (
    <div style={{
      background: '#FFFFFF',
      borderRadius: '12px',
      overflow: 'hidden',
      border: '1px solid #E2E8F0',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif",
    }}>
      {/* ── Report Header (JLL: dark primary bar, accent underline) ── */}
      <div style={{
        background: primary,
        padding: '14px 16px',
        borderBottom: `3px solid ${accent}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {logoUrl ? (
            <img
              src={logoUrl}
              alt=""
              style={{
                height: '22px',
                width: 'auto',
                objectFit: 'contain',
                filter: primaryIsLight ? 'none' : 'brightness(0) invert(1)',
              }}
            />
          ) : null}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '13px',
              fontWeight: 700,
              color: headerText,
              letterSpacing: '-0.2px',
              lineHeight: 1.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap' as const,
            }}>
              {companyName || 'Your Company'}
            </div>
            <div style={{
              fontSize: '8px',
              color: headerSub,
              marginTop: '2px',
              letterSpacing: '0.4px',
              textTransform: 'uppercase' as const,
            }}>
              Monthly Investor Report &mdash; Nov 2025
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ padding: '14px 14px 16px' }}>

        {/* Section Title */}
        <div style={{
          fontSize: '8px',
          fontWeight: 700,
          color: primary,
          textTransform: 'uppercase' as const,
          letterSpacing: '1.2px',
          marginBottom: '10px',
          paddingBottom: '5px',
          borderBottom: `1.5px solid ${primary}`,
        }}>
          Executive Summary
        </div>

        {/* ── KPI Strip ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '5px',
          marginBottom: '12px',
        }}>
          {[
            { label: 'OCCUPANCY', value: '91.4%', change: '▼ –0.9%', good: false },
            { label: 'NOI', value: '$113.8K', change: '▲ +25.8%', good: true },
            { label: 'REVENUE', value: '$277.8K', change: '▼ –1.2%', good: false },
          ].map((kpi) => (
            <div key={kpi.label} style={{
              background: secondary,
              borderRadius: '6px',
              padding: '7px 7px 6px',
              borderLeft: `3px solid ${primary}`,
              minWidth: 0,
            }}>
              <div style={{
                fontSize: '6.5px',
                fontWeight: 700,
                color: '#94A3B8',
                letterSpacing: '0.5px',
                marginBottom: '2px',
              }}>{kpi.label}</div>
              <div style={{
                fontSize: '14px',
                fontWeight: 700,
                color: '#0F172A',
                lineHeight: 1.1,
                fontVariantNumeric: 'tabular-nums',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap' as const,
              }}>{kpi.value}</div>
              <div style={{
                fontSize: '7.5px',
                fontWeight: 600,
                color: kpi.good ? '#059669' : '#DC2626',
                marginTop: '2px',
              }}>
                {kpi.change}
                <span style={{ color: '#CBD5E1', fontWeight: 400, marginLeft: '2px' }}>MoM</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── Budget Table ── */}
        <div style={{
          borderRadius: '6px',
          overflow: 'hidden',
          border: '1px solid #E2E8F0',
          marginBottom: '10px',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontVariantNumeric: 'tabular-nums' }}>
            <thead>
              <tr style={{ background: primary }}>
                {['Category', 'Actual', 'Budget', 'Var %'].map((h, i) => (
                  <th key={h} style={{
                    padding: '5px 6px',
                    fontSize: '6.5px',
                    fontWeight: 700,
                    color: headerText,
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.5px',
                    textAlign: i === 0 ? 'left' : 'right',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { cat: 'Revenue', actual: '$277.8K', budget: '$285.0K', pct: '–2.5%', good: false },
                { cat: 'Expenses', actual: '$164.0K', budget: '$176.0K', pct: '+6.8%', good: true },
              ].map((row, i) => (
                <tr key={row.cat} style={{ background: i % 2 === 1 ? secondary : '#FFF' }}>
                  <td style={{ padding: '4px 6px', fontSize: '8.5px', color: '#334155', fontWeight: 500, borderBottom: '1px solid #F1F5F9' }}>{row.cat}</td>
                  <td style={{ padding: '4px 6px', fontSize: '8.5px', textAlign: 'right', color: '#334155', borderBottom: '1px solid #F1F5F9' }}>{row.actual}</td>
                  <td style={{ padding: '4px 6px', fontSize: '8.5px', textAlign: 'right', color: '#94A3B8', borderBottom: '1px solid #F1F5F9' }}>{row.budget}</td>
                  <td style={{ padding: '4px 6px', fontSize: '8.5px', textAlign: 'right', fontWeight: 600, color: row.good ? '#059669' : '#DC2626', borderBottom: '1px solid #F1F5F9' }}>{row.pct}</td>
                </tr>
              ))}
              <tr style={{ borderTop: `2px solid ${primary}` }}>
                <td style={{ padding: '5px 6px', fontSize: '8.5px', fontWeight: 700, color: '#0F172A' }}>NOI</td>
                <td style={{ padding: '5px 6px', fontSize: '8.5px', textAlign: 'right', fontWeight: 700, color: '#0F172A' }}>$113.8K</td>
                <td style={{ padding: '5px 6px', fontSize: '8.5px', textAlign: 'right', fontWeight: 700, color: '#94A3B8' }}>$109.0K</td>
                <td style={{ padding: '5px 6px', fontSize: '8.5px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>+4.4%</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Risk Card ── */}
        <div style={{
          borderRadius: '6px',
          border: '1px solid #E2E8F0',
          borderLeft: `3px solid #D97706`,
          padding: '7px 9px',
          background: '#FFFFFF',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
            <span style={{
              fontSize: '6px',
              fontWeight: 700,
              color: '#FFF',
              background: '#D97706',
              padding: '1px 4px',
              borderRadius: '2px',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.5px',
            }}>Med</span>
            <span style={{ fontSize: '8.5px', fontWeight: 700, color: '#0F172A' }}>Rising Bad Debt</span>
          </div>
          <p style={{ fontSize: '7.5px', color: '#64748B', lineHeight: 1.4, margin: '0 0 2px' }}>
            Bad debt reached 2.7% of GPR, third consecutive monthly increase.
          </p>
          <p style={{ fontSize: '7px', fontWeight: 600, color: accent, margin: 0 }}>
            Mitigation: Review collections procedures.
          </p>
        </div>
      </div>
    </div>
  );
}

function isLight(hex: string): boolean {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return false;
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}
