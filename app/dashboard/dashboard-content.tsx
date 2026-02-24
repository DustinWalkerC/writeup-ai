'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { C, PIPELINE_STAGES, STAGE_BADGE, STAGE_STAT_COLORS, type PipelineStage } from '@/lib/report-pipeline-tokens'

/* ── Types ── */
type DashboardData = {
  stats: {
    totalProperties: number
    totalUnits: number
    reportsThisMonth: number
    inPipeline: number
    delivered: number
    pipelineCounts: Record<string, number>
  }
  recentReports: Array<{
    id: string
    status: string
    month: string
    year: number
    updatedAt: string
    pipelineStage: PipelineStage
    returned: boolean
    propertyName: string
  }>
  propertiesNeedingReports: Array<{ id: string; name: string }>
  currentPeriod: { month: string; year: number }
}

/* ── Icon Components ── */
function BuildingIcon({ color = C.textSoft, size = 18 }: { color?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22V12h6v10" /><path d="M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01" /></svg>
}
function DocIcon({ color = C.textSoft, size = 18 }: { color?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
}
function CheckIcon({ color = C.textSoft, size = 18 }: { color?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
}
function ClockIcon({ color = C.textSoft, size = 18 }: { color?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
}
function PlusIcon({ color = '#fff', size = 16 }: { color?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
}
function ArrowIcon({ color = C.accentText, size = 14 }: { color?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
}
function ChevronIcon({ color = C.textMuted, size = 16 }: { color?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
}

/* ── Stage Badge ── */
function StageBadge({ stage }: { stage: PipelineStage }) {
  const colors = STAGE_BADGE[stage]
  const info = PIPELINE_STAGES.find(s => s.key === stage)
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase',
      color: colors.color, background: colors.bg, border: `1px solid ${colors.border}`,
      borderRadius: 100, padding: '3px 10px', whiteSpace: 'nowrap',
    }}>
      {info?.label || stage}
    </span>
  )
}

/* ── Stage Hint ── */
const STAGE_HINTS: Record<PipelineStage, string> = {
  draft: 'Not yet generated',
  in_review: 'Reviewing content',
  final_review: 'Pending approval',
  ready_to_send: 'Ready for investors',
  sent: 'Delivered',
}

/* ── Progress Bar ── */
function ProgressBar({ stage }: { stage: PipelineStage }) {
  const pcts: Record<string, number> = { draft: 10, in_review: 35, final_review: 55, ready_to_send: 80, sent: 100 }
  const pct = pcts[stage] || 0
  const color = stage === 'sent' || stage === 'ready_to_send' ? C.green : C.accent
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: 100, height: 4, background: C.progressTrack, borderRadius: 100, overflow: 'hidden', marginBottom: 4 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 100, transition: 'width 0.5s' }} />
      </div>
      <div style={{ fontSize: 12, color: C.textMuted, whiteSpace: 'nowrap' }}>{STAGE_HINTS[stage]}</div>
    </div>
  )
}

/* ── Time Ago ── */
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

/* ── Report Row ── */
function ReportRow({ report }: { report: DashboardData['recentReports'][0] }) {
  const [hover, setHover] = useState(false)

  return (
    <Link
      href={`/dashboard/reports?highlight=${report.id}&stage=${report.pipelineStage}`}
      style={{ textDecoration: 'none', display: 'block', marginBottom: 6 }}
    >
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          background: hover ? C.bgWarm : C.bg,
          border: `1px solid ${hover ? `${C.accent}30` : C.border}`,
          borderRadius: 12, padding: '12px 16px',
          display: 'grid', gridTemplateColumns: '220px 130px auto 24px',
          alignItems: 'center', gap: 16,
          transition: 'all 0.2s ease', cursor: 'pointer',
        }}
      >
        {/* Property + period */}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-display, 'Newsreader', serif)", fontSize: 16, fontWeight: 500, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
            {report.propertyName}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: C.textSoft }}>
            <span>{report.month} {report.year}</span>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: C.border }} />
            <span style={{ color: C.textMuted }}>{timeAgo(report.updatedAt)}</span>
          </div>
        </div>

        {/* Progress bar — centered */}
        <ProgressBar stage={report.pipelineStage} />

        {/* Badge — right aligned */}
        <div style={{ justifySelf: 'end', display: 'flex', alignItems: 'center' }}>
          <StageBadge stage={report.pipelineStage} />
        </div>

        {/* Chevron */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s', transform: hover ? 'translateX(2px)' : 'none' }}>
          <ChevronIcon color={hover ? C.accentAction : C.textMuted} size={16} />
        </div>
      </div>
    </Link>
  )
}

/* ═══ MAIN ═══ */
export function DashboardContent({ userName }: { userName: string }) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const res = await fetch('/api/dashboard')
      const result = await res.json()
      if (result.success) setData(result.data)
      else setError(result.error || 'Failed to load')
    } catch { setError('Failed to load dashboard') }
    finally { setIsLoading(false) }
  }

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: `2.5px solid ${C.border}`, borderTopColor: C.accent, animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  if (error || !data) return (
    <div style={{ textAlign: 'center', padding: '48px 0' }}>
      <p style={{ color: '#CC0000', fontSize: 14 }}>{error || 'Failed to load'}</p>
      <button onClick={fetchData} style={{ marginTop: 16, fontSize: 14, fontWeight: 600, color: C.accent, background: 'none', border: 'none', cursor: 'pointer' }}>Try again</button>
    </div>
  )

  const firstName = userName.split(' ')[0] || 'there'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontFamily: "var(--font-display, 'Newsreader', serif)", fontSize: 28, fontWeight: 500, color: C.text, letterSpacing: '-0.015em' }}>
          Welcome back, {firstName}
        </h1>
        <p style={{ fontSize: 15, color: C.textSoft, marginTop: 4 }}>Here&#39;s what&#39;s happening with your portfolio</p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase', color: C.textSoft, marginBottom: 4 }}>PROPERTIES</div>
            <div style={{ fontFamily: "var(--font-display, 'Newsreader', serif)", fontSize: 28, fontWeight: 500, color: C.text, lineHeight: 1 }}>{data.stats.totalProperties}</div>
            <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>{data.stats.totalUnits.toLocaleString()} total units</div>
          </div>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: C.bgAlt, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BuildingIcon color={C.textSoft} size={18} />
          </div>
        </div>
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase', color: C.textSoft, marginBottom: 4 }}>REPORTS THIS MONTH</div>
            <div style={{ fontFamily: "var(--font-display, 'Newsreader', serif)", fontSize: 28, fontWeight: 500, color: C.accent, lineHeight: 1 }}>{data.stats.reportsThisMonth}</div>
            <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>{data.currentPeriod.month} {data.currentPeriod.year}</div>
          </div>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: C.bgAlt, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DocIcon color={C.textSoft} size={18} />
          </div>
        </div>
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase', color: C.textSoft, marginBottom: 4 }}>IN PIPELINE</div>
            <div style={{ fontFamily: "var(--font-display, 'Newsreader', serif)", fontSize: 28, fontWeight: 500, color: '#B45309', lineHeight: 1 }}>{data.stats.inPipeline}</div>
            <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>Across all stages</div>
          </div>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: C.bgAlt, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ClockIcon color={C.textSoft} size={18} />
          </div>
        </div>
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase', color: C.textSoft, marginBottom: 4 }}>DELIVERED</div>
            <div style={{ fontFamily: "var(--font-display, 'Newsreader', serif)", fontSize: 28, fontWeight: 500, color: C.green, lineHeight: 1 }}>{data.stats.delivered}</div>
            <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>All time</div>
          </div>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: C.bgAlt, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckIcon color={C.textSoft} size={18} />
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
        {/* Recent Reports */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontFamily: "var(--font-display, 'Newsreader', serif)", fontSize: 18, fontWeight: 500, color: C.text, margin: 0 }}>Recent Reports</h2>
            <Link href="/dashboard/reports" style={{ fontSize: 14, color: C.accentText, textDecoration: 'none', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
              View all <ArrowIcon color={C.accentText} size={14} />
            </Link>
          </div>
          {data.recentReports.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: C.textMuted, fontSize: 14, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14 }}>
              No reports yet. Create your first one!
            </div>
          ) : (
            data.recentReports.map((r) => <ReportRow key={r.id} report={r} />)
          )}
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Quick Actions */}
          <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
            <h3 style={{ fontFamily: "var(--font-display, 'Newsreader', serif)", fontSize: 16, fontWeight: 500, color: C.text, marginBottom: 14 }}>Quick Actions</h3>
            <Link href="/dashboard/reports/new" style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '12px 20px', fontSize: 15, fontWeight: 600, color: '#fff',
              background: C.accentAction, border: 'none', borderRadius: 10, cursor: 'pointer',
              boxShadow: `0 2px 10px ${C.accentAction}25`, marginBottom: 10, textDecoration: 'none',
            }}>
              <PlusIcon color="#fff" size={16} /> Create New Report
            </Link>
            <Link href="/dashboard/properties/new" style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '11px 16px', fontSize: 14, fontWeight: 500, color: C.textMid,
              background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, cursor: 'pointer',
              textDecoration: 'none',
            }}>
              <BuildingIcon color={C.textSoft} size={16} /> Add Property
            </Link>
          </div>

          {/* Pipeline Summary */}
          <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
            <h3 style={{ fontFamily: "var(--font-display, 'Newsreader', serif)", fontSize: 16, fontWeight: 500, color: C.text, marginBottom: 14 }}>Pipeline</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {PIPELINE_STAGES.map((stage) => {
                const count = data.stats.pipelineCounts[stage.key] || 0
                const dotColor = STAGE_STAT_COLORS[stage.key]
                const active = count > 0
                return (
                  <Link key={stage.key} href="/dashboard/reports" style={{ textDecoration: 'none' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
                      background: active ? `${dotColor}06` : 'transparent',
                      border: `1px solid ${active ? `${dotColor}15` : 'transparent'}`,
                      transition: 'background 0.15s',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: active ? dotColor : C.textMuted, opacity: active ? 1 : 0.3 }} />
                        <span style={{ fontSize: 14, color: active ? C.textMid : C.textMuted }}>{stage.label}</span>
                      </div>
                      <span style={{ fontFamily: "var(--font-display, 'Newsreader', serif)", fontSize: 16, fontWeight: 500, color: active ? dotColor : C.textMuted }}>{count}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Needs Report */}
          {data.propertiesNeedingReports.length > 0 && (
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: C.textSoft, marginBottom: 12 }}>
                NEEDS {data.currentPeriod.month.toUpperCase()} REPORT:
              </div>
              {data.propertiesNeedingReports.map((p, i) => (
                <div key={p.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0', borderTop: i > 0 ? `1px solid ${C.borderL}` : 'none',
                }}>
                  <span style={{ fontFamily: "var(--font-display, 'Newsreader', serif)", fontSize: 14, fontWeight: 500, color: C.text }}>{p.name}</span>
                  <Link href={`/dashboard/reports/new?property=${p.id}`} style={{ fontSize: 13, fontWeight: 600, color: C.accentText, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                    Create <ArrowIcon color={C.accentText} size={12} />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
