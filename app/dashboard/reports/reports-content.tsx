'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { StatsCard } from '@/components/stats-card'
import { SearchInput } from '@/components/search-input'
import { ReportCard } from '@/components/report-card'
import { EmptyState } from '@/components/empty-state'

type Report = {
  id: string
  propertyName: string
  month: string
  year: number
  status: string
  reviewStatus?: string
  updatedAt: string
}

type ReportsData = {
  reports: Report[]
  stats: {
    total: number
    complete: number
    draft: number
    generating: number
    error: number
    thisMonth: number
    sent: number
  }
  currentPeriod: { month: string; year: number }
}

type StatusFilter = 'started' | 'for_review' | 'ready_to_send' | 'sent'

export function ReportsContent() {
  const [data, setData] = useState<ReportsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('for_review')

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    try {
      const response = await fetch('/api/reports')
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error || 'Failed to load reports')
      }
    } catch (err) {
      setError('Failed to load reports')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusChange = (reportId: string, newStatus: string) => {
    fetchReports()
  }

  const startedReports = useMemo(() => {
    if (!data?.reports) return []
    return data.reports.filter(r => 
      r.status === 'draft' || r.status === 'generating' || r.status === 'error'
    )
  }, [data?.reports])

  const forReviewReports = useMemo(() => {
    if (!data?.reports) return []
    return data.reports.filter(r => 
      r.status === 'complete' && 
      (!r.reviewStatus || r.reviewStatus === 'under_review' || r.reviewStatus === 'review')
    )
  }, [data?.reports])

  const readyToSendReports = useMemo(() => {
    if (!data?.reports) return []
    return data.reports.filter(r => 
      r.status === 'complete' && r.reviewStatus === 'ready_to_send'
    )
  }, [data?.reports])

  const sentReports = useMemo(() => {
    if (!data?.reports) return []
    return data.reports.filter(r => r.reviewStatus === 'sent')
  }, [data?.reports])

  const sentReportsByMonth = useMemo(() => {
    const grouped: Record<string, Report[]> = {}
    sentReports.forEach(report => {
      const key = `${report.month} ${report.year}`
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(report)
    })
    return grouped
  }, [sentReports])

  const filteredReports = useMemo(() => {
    let filtered: Report[] = []

    switch (statusFilter) {
      case 'started':
        filtered = startedReports
        break
      case 'for_review':
        filtered = forReviewReports
        break
      case 'ready_to_send':
        filtered = readyToSendReports
        break
      case 'sent':
        filtered = sentReports
        break
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        r => r.propertyName.toLowerCase().includes(query) ||
             `${r.month} ${r.year}`.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [startedReports, forReviewReports, readyToSendReports, sentReports, searchQuery, statusFilter])

  const statusTabs: { value: StatusFilter; label: string; count: number }[] = [
    { value: 'started', label: 'Started', count: startedReports.length },
    { value: 'for_review', label: 'For Review', count: forReviewReports.length },
    { value: 'ready_to_send', label: 'Ready to Send', count: readyToSendReports.length },
    { value: 'sent', label: 'Sent', count: sentReports.length },
  ]

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          border: '2.5px solid #E8E5E0', borderTopColor: '#00B7DB',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <p style={{ color: '#CC0000', fontSize: 14 }}>{error}</p>
        <button
          onClick={fetchReports}
          style={{
            marginTop: 16, fontSize: 14, fontWeight: 600,
            color: '#00B7DB', background: 'none', border: 'none',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </div>
    )
  }

  const hasReports = data?.reports && data.reports.length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-display, Georgia, serif)',
            fontSize: 28, fontWeight: 500, color: '#1A1A1A',
            letterSpacing: '-0.015em',
          }}>Reports</h1>
          <p style={{ fontSize: 14, color: '#7A7A7A', marginTop: 4 }}>Manage your investor reports</p>
        </div>
        {/* New Report = ACCENT (primary action) — no gradient */}
        <Link
          href="/dashboard/reports/new"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '11px 22px', fontSize: 14, fontWeight: 600,
            color: '#FFFFFF', background: '#00B7DB',
            border: 'none', borderRadius: 10, textDecoration: 'none',
            boxShadow: '0 2px 12px #00B7DB30',
            transition: 'all 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Report
        </Link>
      </div>

      {hasReports && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatsCard
              title="This Month"
              value={data?.stats.thisMonth || 0}
              subtitle={data?.currentPeriod?.month || ''}
              large
              icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
            />
            <StatsCard
              title="For Review"
              value={forReviewReports.length}
              accentColor="#00B7DB"
              large
              icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
            />
            <StatsCard
              title="Ready to Send"
              value={readyToSendReports.length}
              accentColor="#008A3E"
              large
              icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
            <StatsCard
              title="Sent"
              value={sentReports.length}
              accentColor="#7A7A7A"
              large
              icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" /></svg>}
            />
          </div>

          {/* Search and Filters */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
            <div className="max-w-md flex-1">
              <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search reports..." />
            </div>
            {/* Filter tabs — warm style */}
            <div style={{
              display: 'inline-flex', gap: 4, padding: 4,
              background: '#FFFFFF', border: '1px solid #F0EDE8', borderRadius: 10,
            }}>
              {statusTabs.map((tab) => {
                const isActive = statusFilter === tab.value
                return (
                  <button
                    key={tab.value}
                    onClick={() => setStatusFilter(tab.value)}
                    style={{
                      padding: '7px 14px', borderRadius: 8,
                      fontSize: 13, fontWeight: isActive ? 600 : 500,
                      color: isActive ? '#1A1A1A' : '#7A7A7A',
                      background: isActive ? '#F7F5F1' : 'transparent',
                      border: isActive ? '1px solid #F0EDE8' : '1px solid transparent',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6,
                      transition: 'all 0.2s',
                    }}
                  >
                    {tab.label}
                    {tab.count > 0 && (
                      <span style={{
                        fontSize: 11, fontWeight: 600,
                        padding: '2px 7px', borderRadius: 100, minWidth: 22, textAlign: 'center',
                        color: isActive ? '#00B7DB' : '#A3A3A3',
                        background: isActive ? '#00B7DB10' : '#F7F5F1',
                      }}>{tab.count}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Reports Grid */}
          {statusFilter === 'sent' && filteredReports.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {Object.entries(sentReportsByMonth)
                .filter(([, reports]) => 
                  !searchQuery || reports.some(r => 
                    r.propertyName.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                )
                .map(([monthYear, reports]) => (
                  <div key={monthYear}>
                    <h3 style={{
                      fontFamily: 'var(--font-display, Georgia, serif)',
                      fontSize: 18, fontWeight: 500, color: '#1A1A1A',
                      marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A3A3A3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      {monthYear}
                      <span style={{ fontSize: 13, fontWeight: 400, color: '#A3A3A3' }}>({reports.length} reports)</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {reports
                        .filter(r => !searchQuery || r.propertyName.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((report) => (
                          <ReportCard key={report.id} report={report} onStatusChange={handleStatusChange} />
                        ))}
                    </div>
                  </div>
                ))}
            </div>
          ) : filteredReports.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredReports.map((report) => (
                <ReportCard key={report.id} report={report} onStatusChange={handleStatusChange} />
              ))}
            </div>
          ) : (
            <div style={{
              background: '#FFFFFF', border: '1px solid #E8E5E0', borderRadius: 14,
              padding: 32, textAlign: 'center',
            }}>
              <p style={{ color: '#7A7A7A', fontSize: 14 }}>
                {statusFilter === 'started' && 'No reports in progress'}
                {statusFilter === 'for_review' && 'No reports awaiting review'}
                {statusFilter === 'ready_to_send' && 'No reports ready to send'}
                {statusFilter === 'sent' && 'No sent reports yet'}
              </p>
            </div>
          )}
        </>
      )}

      {!hasReports && (
        <EmptyState
          icon={<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
          title="No reports yet"
          description="Create your first investor report to get started"
          actionLabel="Create Report"
          actionHref="/dashboard/reports/new"
        />
      )}
    </div>
  )
}

