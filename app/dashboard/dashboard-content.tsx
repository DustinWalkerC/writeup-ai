
'use client'

import { useState, useEffect } from 'react'
import { StatsCard } from '@/components/stats-card'
import { RecentReports } from '@/components/recent-reports'
import { QuickActions } from '@/components/quick-actions'

type DashboardData = {
  stats: {
    totalProperties: number
    totalUnits: number
    reportsThisMonth: number
    completedReports: number
    pendingReports: number
    propertiesNeedingReports: number
  }
  properties: Array<{ id: string; name: string; address: string; units: number }>
  recentReports: Array<{
    id: string
    status: string
    month: string
    year: number
    updatedAt: string
    propertyName: string
  }>
  propertiesNeedingReports: Array<{ id: string; name: string }>
  currentPeriod: { month: string; year: number }
}

type Props = {
  userName: string
}

export function DashboardContent({ userName }: Props) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard')
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error || 'Failed to load dashboard')
      }
    } catch (err) {
      setError('Failed to load dashboard')
      console.error('Dashboard fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error || 'Failed to load dashboard'}</p>
        <button 
          onClick={fetchDashboardData}
          className="mt-4 text-cyan-600 hover:text-cyan-700 font-medium"
        >
          Try again
        </button>
      </div>
    )
  }

  const firstName = userName.split(' ')[0] || 'there'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back, {firstName}
        </h1>
        <p className="text-slate-500 mt-1">
          Here's what's happening with your portfolio
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Properties"
          value={data.stats.totalProperties}
          subtitle={`${data.stats.totalUnits.toLocaleString()} total units`}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />
        <StatsCard
          title="Reports This Month"
          value={data.stats.reportsThisMonth}
          subtitle={`${data.currentPeriod.month} ${data.currentPeriod.year}`}
          accentColor="#10b981"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />
        <StatsCard
          title="Completed"
          value={data.stats.completedReports}
          subtitle="All time"
          accentColor="#14b8a6"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatsCard
          title="Pending"
          value={data.stats.pendingReports}
          subtitle="In progress"
          accentColor={data.stats.pendingReports > 0 ? '#f59e0b' : '#64748b'}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Reports - 2 columns */}
        <div className="lg:col-span-2">
          <RecentReports reports={data.recentReports} />
        </div>

        {/* Quick Actions - 1 column */}
        <div>
          <QuickActions
            propertiesNeedingReports={data.propertiesNeedingReports}
            currentPeriod={data.currentPeriod}
          />
        </div>
      </div>
    </div>
  )
}

