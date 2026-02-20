'use client'

import { useState } from 'react'
import Link from 'next/link'

type Report = {
  id: string
  propertyName: string
  month: string
  year: number
  status: string
  reviewStatus?: string
  updatedAt: string
}

type Props = {
  report: Report
  onStatusChange?: (id: string, newStatus: string) => void
}

const statusStyles: Record<string, { color: string; bg: string; border: string; label: string; barColor: string }> = {
  complete:   { color: '#008A3E', bg: '#008A3E12', border: '#008A3E25', label: 'Complete', barColor: '#008A3E' },
  draft:      { color: '#00B7DB', bg: '#C8B88A18', border: '#C8B88A30', label: 'Draft', barColor: '#B8960F' },
  generating: { color: '#00B7DB', bg: '#00B7DB0D', border: '#00B7DB22', label: 'Generating', barColor: '#00B7DB' },
  error:      { color: '#CC0000', bg: '#CC000010', border: '#CC000020', label: 'Error', barColor: '#CC0000' },
}

const reviewSteps = ['under_review', 'ready_to_send', 'sent'] as const
const stepLabels: Record<string, string> = {
  under_review: 'Review',
  ready_to_send: 'Ready',
  sent: 'Sent',
}

function getReviewIndex(reviewStatus: string | undefined): number {
  switch (reviewStatus) {
    case 'sent': return 3
    case 'ready_to_send': return 2
    case 'under_review': return 1
    case 'review': return 1
    default: return 0
  }
}

function getProgressPct(reviewIndex: number): number {
  if (reviewIndex >= 3) return 100
  if (reviewIndex === 2) return 80
  if (reviewIndex === 1) return 50
  return 18
}

export function ReportCard({ report, onStatusChange }: Props) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [currentReviewStatus, setCurrentReviewStatus] = useState(
    report.reviewStatus || 'under_review'
  )

  const st = statusStyles[report.status] || statusStyles.draft
  const reviewIndex = getReviewIndex(currentReviewStatus)
  const progressPct = getProgressPct(reviewIndex)
  const trackColor = reviewIndex >= 3 ? '#008A3E' : '#00B7DB'

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const handleReviewStatusChange = async (newStatus: string) => {
    if (currentReviewStatus === newStatus) return
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/reports/${report.id}/review-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_status: newStatus }),
      })
      const result = await response.json()
      if (result.success) {
        setCurrentReviewStatus(newStatus)
        onStatusChange?.(report.id, newStatus)
      }
    } catch (error) {
      console.error('Failed to update status:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    setShowDeleteConfirm(false)
    try {
      const response = await fetch(`/api/reports/${report.id}`, { method: 'DELETE' })
      const result = await response.json()
      if (result.success) {
        onStatusChange?.(report.id, 'deleted')
      } else {
        alert('Failed to delete report')
      }
    } catch (error) {
      console.error('Failed to delete:', error)
      alert('Failed to delete report')
    } finally {
      setIsDeleting(false)
    }
  }

  const getHref = () => {
    switch (report.status) {
      case 'complete': return `/dashboard/reports/${report.id}`
      case 'draft': return `/dashboard/reports/${report.id}/edit`
      case 'generating': return `/dashboard/reports/${report.id}/generate`
      case 'error': return `/dashboard/reports/${report.id}/generate`
      default: return `/dashboard/reports/${report.id}`
    }
  }

  const getCtaLabel = () => {
    switch (report.status) {
      case 'draft': return 'Continue'
      case 'generating': return 'View Progress'
      case 'error': return 'Retry'
      default: return 'View Report'
    }
  }

  const getCtaColor = () => {
    switch (report.status) {
      case 'draft': return '#00B7DB'
      case 'error': return '#CC0000'
      default: return '#00B7DB'
    }
  }

  const ctaColor = getCtaColor()

  return (
    <>
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E8E5E0',
          borderRadius: 14,
          overflow: 'hidden',
          transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
          opacity: isDeleting ? 0.5 : 1,
          pointerEvents: isDeleting ? 'none' : 'auto',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.06)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = 'none'
        }}
      >
        {/* ── Top accent bar ── */}
        <div style={{ height: 3, background: `linear-gradient(90deg, ${st.barColor}70, ${st.barColor}15)` }} />

        <div style={{ padding: '16px 20px 18px' }}>
          {/* ── Header ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
            <h3 style={{
              fontFamily: 'var(--font-display, Georgia, serif)',
              fontSize: 16, fontWeight: 500, color: '#1A1A1A',
              flex: 1, minWidth: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{report.propertyName}</h3>
            <span style={{
              fontSize: 10, fontWeight: 600, letterSpacing: '0.04em',
              textTransform: 'uppercase' as const,
              color: st.color, background: st.bg, border: `1px solid ${st.border}`,
              borderRadius: 100, padding: '4px 10px', flexShrink: 0, marginLeft: 12,
            }}>{st.label}</span>
          </div>

          {/* ── Meta row ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: 12, color: '#7A7A7A' }}>
            <span>{report.month} {report.year}</span>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#E8E5E0' }} />
            <span style={{ color: '#A3A3A3', display: 'flex', alignItems: 'center', gap: 3 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#A3A3A3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              {formatDate(report.updatedAt)}
            </span>
          </div>

          {/* ── Pipeline (complete only) ── */}
          {report.status === 'complete' && (
            <div style={{
              padding: '10px 12px 12px',
              background: '#FAF9F7', border: '1px solid #F0EDE8', borderRadius: 10,
              marginBottom: 16,
            }}>
              {/* Step labels with checkmarks */}
              <div style={{ display: 'flex', marginBottom: 8 }}>
                {reviewSteps.map((step, i) => {
                  const isDone = i < reviewIndex;
                  const isActive = i === reviewIndex && reviewIndex < 3;
                  const allDone = reviewIndex >= 3;
                  const color = isDone || allDone ? '#008A3E' : isActive ? '#00B7DB' : '#A3A3A3';
                  return (
                    <button
                      key={step}
                      onClick={() => handleReviewStatusChange(step)}
                      disabled={isUpdating}
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', gap: 5,
                        justifyContent: i === 0 ? 'flex-start' : i === 2 ? 'flex-end' : 'center',
                        background: 'none', border: 'none', padding: 0,
                        cursor: isUpdating ? 'not-allowed' : 'pointer',
                        opacity: isUpdating ? 0.6 : 1,
                        transition: 'opacity 0.2s',
                      }}
                    >
                      {/* Node */}
                      <div style={{
                        width: 16, height: 16, borderRadius: 5, flexShrink: 0,
                        background: isDone || allDone ? '#008A3E12' : isActive ? '#00B7DB0D' : '#F7F5F1',
                        border: `1.5px solid ${isDone || allDone ? '#008A3E35' : isActive ? '#00B7DB30' : '#F0EDE8'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.3s',
                      }}>
                        {isDone || allDone ? (
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#008A3E" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        ) : isActive ? (
                          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#00B7DB' }} />
                        ) : (
                          <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#E8E5E0' }} />
                        )}
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: isDone || isActive || allDone ? 600 : 500, color,
                        letterSpacing: '0.01em',
                      }}>{stepLabels[step]}</span>
                    </button>
                  );
                })}
              </div>

              {/* Progress bar */}
              <div style={{ height: 4, background: '#E8E5E060', borderRadius: 100, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 100, background: trackColor,
                  width: `${progressPct}%`,
                  transition: 'width 0.6s cubic-bezier(0.22,1,0.36,1), background 0.4s',
                  boxShadow: `0 0 8px ${trackColor}30`,
                }} />
              </div>
            </div>
          )}

          {/* ── Contextual banners ── */}
          {report.status === 'draft' && (
            <div style={{
              padding: '10px 12px', borderRadius: 10,
              background: '#C8B88A08', border: '1px solid #C8B88A20',
              marginBottom: 16, fontSize: 12, color: '#00B7DB',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00B7DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Report started — continue editing to generate
            </div>
          )}
          {report.status === 'generating' && (
            <div style={{
              padding: '10px 12px', borderRadius: 10,
              background: '#00B7DB06', border: '1px solid #00B7DB18',
              marginBottom: 16, fontSize: 12, color: '#1D98B1',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1D98B1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              AI is generating your report...
            </div>
          )}
          {report.status === 'error' && (
            <div style={{
              padding: '10px 12px', borderRadius: 10,
              background: '#CC000006', border: '1px solid #CC000018',
              marginBottom: 16, fontSize: 12, color: '#CC0000',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CC0000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              Generation failed — retry to fix
            </div>
          )}

          {/* ── Actions ── */}
          <div style={{ display: 'flex', gap: 8 }}>
            {/* Primary CTA */}
            <Link
              href={getHref()}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#fff',
                background: ctaColor, border: 'none', borderRadius: 10,
                textDecoration: 'none',
                boxShadow: `0 2px 10px ${ctaColor}25`,
                transition: 'all 0.25s',
              }}
            >
              {report.status === 'draft' && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              )}
              {(report.status === 'complete' || report.status === 'generating') && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              )}
              {report.status === 'error' && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              )}
              {getCtaLabel()}
            </Link>

            {/* Export icon */}
            {report.status === 'complete' && (
              <Link
                href={`/dashboard/reports/${report.id}`}
                title="Export report"
                style={{
                  width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'transparent', border: '1.5px solid #E8E5E0', borderRadius: 10,
                  textDecoration: 'none', transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#00B7DB60'; e.currentTarget.style.background = '#00B7DB06'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E8E5E0'; e.currentTarget.style.background = 'transparent'; }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7A7A7A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </Link>
            )}

            {/* Delete icon */}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              title="Delete report"
              style={{
                width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'transparent', border: '1.5px solid #E8E5E0', borderRadius: 10,
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#CC000040'; e.currentTarget.style.background = '#CC000006'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E8E5E0'; e.currentTarget.style.background = 'transparent'; }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#A3A3A3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── Delete Confirmation Modal ── */}
      {showDeleteConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 50, padding: 16,
        }}>
          <div style={{
            background: '#FFFFFF', borderRadius: 16,
            boxShadow: '0 24px 64px rgba(0,0,0,0.15)',
            maxWidth: 400, width: '100%', padding: 24,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: '#CC000010', border: '1px solid #CC000020',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#CC0000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              </div>
              <div>
                <h3 style={{
                  fontFamily: 'var(--font-display, Georgia, serif)',
                  fontSize: 18, fontWeight: 500, color: '#1A1A1A',
                }}>Delete Report</h3>
                <p style={{ fontSize: 13, color: '#7A7A7A', marginTop: 2 }}>This action cannot be undone.</p>
              </div>
            </div>

            <p style={{ fontSize: 14, color: '#4A4A4A', lineHeight: 1.5, marginBottom: 24 }}>
              Are you sure you want to delete the{' '}
              <span style={{ fontWeight: 600, color: '#1A1A1A' }}>{report.month} {report.year}</span>{' '}
              report for{' '}
              <span style={{ fontWeight: 600, color: '#1A1A1A' }}>{report.propertyName}</span>?
              The report and any uploaded files will be permanently removed.
            </p>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  flex: 1, padding: '11px 16px', fontSize: 14, fontWeight: 600,
                  color: '#4A4A4A', background: '#FFFFFF',
                  border: '1.5px solid #E8E5E0', borderRadius: 10,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                style={{
                  flex: 1, padding: '11px 16px', fontSize: 14, fontWeight: 600,
                  color: '#FFFFFF', background: '#CC0000',
                  border: 'none', borderRadius: 10,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  opacity: isDeleting ? 0.6 : 1,
                  transition: 'all 0.2s',
                }}
              >
                {isDeleting ? 'Deleting...' : 'Delete Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

