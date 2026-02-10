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
  }
  currentPeriod: { month: string; year: number }
}

type StatusFilter = 'all' | 'complete' | 'draft' | 'generating' | 'error'

export function ReportsContent() {
  const [data, setData] = useState<ReportsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

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
      console.error('Reports fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredReports = useMemo(() => {
    if (!data?.reports) return []
    
    let filtered = data.reports

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        r => r.propertyName.toLowerCase().includes(query) ||
             `${r.month} ${r.year}`.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [data?.reports, searchQuery, statusFilter])

  const statusTabs: { value: StatusFilter; label: string; count: number }[] = [
    { value: 'all', label: 'All', count: data?.stats.total || 0 },
    { value: 'complete', label: 'Complete', count: data?.stats.complete || 0 },
    { value: 'draft', label: 'Draft', count: data?.stats.draft || 0 },
    { value: 'generating', label: 'Generating', count: data?.stats.generating || 0 },
    { value: 'error', label: 'Error', count: data?.stats.error || 0 },
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
        <button 
          onClick={fetchReports}
          className="mt-4 text-cyan-600 hover:text-cyan-700 font-medium"
        >
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
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-lg hover:from-cyan-700 hover:to-teal-700 font-medium transition-colors"
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
              subtitle={data?.currentPeriod ? `${data.currentPeriod.month}` : ''}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
            />
            <StatsCard
              title="Complete"
              value={data?.stats.complete || 0}
              accentColor="#10b981"
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatsCard
              title="Draft"
              value={data?.stats.draft || 0}
              accentColor="#64748b"
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              }
            />
            <StatsCard
              title="Total"
              value={data?.stats.total || 0}
              accentColor="#14b8a6"
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
            />
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="max-w-md flex-1">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search reports..."
              />
            </div>
            
            {/* Status Tabs */}
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
                      statusFilter === tab.value
                        ? 'bg-slate-100 text-slate-700'
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Reports Grid */}
          {filteredReports.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredReports.map((report) => (
                <ReportCard key={report.id} report={report} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <p className="text-slate-500">No reports match your filters</p>
              <button
                onClick={() => {
                  setSearchQuery('')
                  setStatusFilter('all')
                }}
                className="mt-2 text-cyan-600 hover:text-cyan-700 font-medium"
              >
                Clear filters
              </button>
            </div>
          )}
        </>
      )}

      {!hasReports && (
        <EmptyState
          icon={
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
          title="No reports yet"
          description="Create your first investor report to get started"
          actionLabel="Create Report"
          actionHref="/dashboard/reports/new"
        />
      )}
    </div>
  )
}
