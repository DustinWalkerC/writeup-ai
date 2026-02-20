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

  if (error || !data) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <p style={{ color: '#CC0000', fontSize: 14 }}>{error || 'Failed to load dashboard'}</p>
        <button 
          onClick={fetchDashboardData}
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

  const firstName = userName.split(' ')[0] || 'there'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Header */}
      <div>
        <h1 style={{
          fontFamily: 'var(--font-display, Georgia, serif)',
          fontSize: 28, fontWeight: 500, color: '#1A1A1A',
          letterSpacing: '-0.015em',
        }}>
          Welcome back, {firstName}
        </h1>
        <p style={{ fontSize: 14, color: '#7A7A7A', marginTop: 4 }}>
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
          accentColor="#00B7DB"
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
          accentColor="#008A3E"
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
          accentColor={data.stats.pendingReports > 0 ? '#B8960F' : '#7A7A7A'}
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

