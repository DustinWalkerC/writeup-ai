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

  // Started = draft, generating, or error (report not yet complete)
  const startedReports = useMemo(() => {
    if (!data?.reports) return []
    return data.reports.filter(r => 
      r.status === 'draft' || r.status === 'generating' || r.status === 'error'
    )
  }, [data?.reports])

  // For Review = complete reports with reviewStatus of 'under_review' or 'review' or undefined/null
  // This is the default state after a report is generated
  const forReviewReports = useMemo(() => {
    if (!data?.reports) return []
    return data.reports.filter(r => 
      r.status === 'complete' && 
      (!r.reviewStatus || r.reviewStatus === 'under_review' || r.reviewStatus === 'review')
    )
  }, [data?.reports])

  // Ready to Send = complete reports marked as ready
  const readyToSendReports = useMemo(() => {
    if (!data?.reports) return []
    return data.reports.filter(r => 
      r.status === 'complete' && r.reviewStatus === 'ready_to_send'
    )
  }, [data?.reports])

  // Sent = complete reports marked as sent (visible here AND in sent archive)
  const sentReports = useMemo(() => {
    if (!data?.reports) return []
    return data.reports.filter(r => r.reviewStatus === 'sent')
  }, [data?.reports])

  // Group sent reports by month for archive view
  const sentReportsByMonth = useMemo(() => {
    const grouped: Record<string, Report[]> = {}
    sentReports.forEach(report => {
      const key = `${report.month} ${report.year}`
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(report)
    })
    return grouped
  }, [sentReports])

  // Get filtered reports based on active tab
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error}</p>
        <button onClick={fetchReports} className="mt-4 text-cyan-600 hover:text-cyan-700 font-medium">
          Try again
        </button>
      </div>
    )
  }

  const hasReports = data?.reports && data.reports.length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-slate-500 mt-1">Manage your investor reports</p>
        </div>
        <Link
          href="/dashboard/reports/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-lg hover:from-cyan-700 hover:to-teal-700 font-medium transition-all shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
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
              accentColor="#f59e0b"
              large
              icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
            />
            <StatsCard
              title="Ready to Send"
              value={readyToSendReports.length}
              accentColor="#10b981"
              large
              icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
            <StatsCard
              title="Sent"
              value={sentReports.length}
              accentColor="#94a3b8"
              large
              icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" /></svg>}
            />
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="max-w-md flex-1">
              <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search reports..." />
            </div>
            <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
              {statusTabs.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    statusFilter === tab.value
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${
                      statusFilter === tab.value ? 'bg-slate-100' : 'bg-slate-200'
                    }`}>{tab.count}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Reports Grid */}
          {statusFilter === 'sent' && filteredReports.length > 0 ? (
            // Sent tab: group by month
            <div className="space-y-6">
              {Object.entries(sentReportsByMonth)
                .filter(([, reports]) => 
                  !searchQuery || reports.some(r => 
                    r.propertyName.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                )
                .map(([monthYear, reports]) => (
                  <div key={monthYear}>
                    <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      {monthYear}
                      <span className="text-sm font-normal text-slate-400">({reports.length} reports)</span>
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
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <p className="text-slate-500">
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

