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

export function ReportCard({ report, onStatusChange }: Props) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [currentReviewStatus, setCurrentReviewStatus] = useState(
    report.reviewStatus || 'under_review'
  )

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'complete':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'generating':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200'
      case 'draft':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'error':
        return 'bg-red-50 text-red-700 border-red-200'
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200'
    }
  }

  const getReviewStatusStyles = (status: string) => {
    switch (status) {
      case 'ready_to_send':
        return 'bg-emerald-50 text-emerald-700'
      case 'sent':
        return 'bg-slate-100 text-slate-500'
      default: // under_review
        return 'bg-amber-50 text-amber-700'
    }
  }

  const getReviewStatusLabel = (status: string) => {
    switch (status) {
      case 'ready_to_send':
        return 'Ready to Send'
      case 'sent':
        return 'Sent'
      default:
        return 'Under Review'
    }
  }

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

  const getActionButton = () => {
    switch (report.status) {
      case 'complete':
        return (
          <Link
            href={`/dashboard/reports/${report.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 text-white text-sm font-medium rounded-lg hover:from-cyan-700 hover:to-teal-700 transition-all shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            View Report
          </Link>
        )
      case 'draft':
        return (
          <Link
            href={`/dashboard/reports/${report.id}/edit`}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-all shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Continue Editing
          </Link>
        )
      case 'generating':
        return (
          <Link
            href={`/dashboard/reports/${report.id}/generate`}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border-2 border-cyan-300 text-cyan-700 text-sm font-medium rounded-lg hover:bg-cyan-50 transition-all"
          >
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            View Progress
          </Link>
        )
      case 'error':
        return (
          <Link
            href={`/dashboard/reports/${report.id}/generate`}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-all shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Retry
          </Link>
        )
      default:
        return null
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 truncate">{report.propertyName}</h3>
          <p className="text-sm text-slate-500">{report.month} {report.year}</p>
        </div>
        <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${getStatusStyles(report.status)}`}>
          {report.status}
        </span>
      </div>

      {/* Review Status Selector (only for complete reports) */}
      {report.status === 'complete' && (
        <div className="mb-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Review:</span>
            <div className="flex gap-1">
              {['under_review', 'ready_to_send', 'sent'].map((status) => (
                <button
                  key={status}
                  onClick={() => handleReviewStatusChange(status)}
                  disabled={isUpdating}
                  className={`px-2 py-0.5 text-xs font-medium rounded-md transition-all ${
                    currentReviewStatus === status
                      ? getReviewStatusStyles(status)
                      : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                  } ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {getReviewStatusLabel(status)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Updated Time (for non-complete) */}
      {report.status !== 'complete' && (
        <div className="mb-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-1.5 text-sm text-slate-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Updated {formatDate(report.updatedAt)}
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="flex items-center gap-2">
        {getActionButton()}
      </div>
    </div>
  )
}
