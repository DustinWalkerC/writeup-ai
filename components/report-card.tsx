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
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
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

  const getReviewStatusStyles = (status: string, isActive: boolean) => {
    if (!isActive) {
      return 'bg-slate-50 text-slate-400 hover:bg-slate-100'
    }
    switch (status) {
      case 'ready_to_send':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      case 'sent':
        return 'bg-slate-200 text-slate-600 border border-slate-300'
      default:
        return 'bg-amber-50 text-amber-700 border border-amber-200'
    }
  }

  const getReviewStatusLabel = (status: string) => {
    switch (status) {
      case 'ready_to_send':
        return 'Ready'
      case 'sent':
        return 'Sent'
      default:
        return 'Review'
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
      const response = await fetch(`/api/reports/${report.id}`, {
        method: 'DELETE',
      })
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
    <>
      <div className={`bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow relative group ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 truncate">{report.propertyName}</h3>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1 text-slate-300 hover:text-red-500 rounded-md hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"
                title="Delete report"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-slate-500">{report.month} {report.year}</p>
          </div>
          <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${getStatusStyles(report.status)}`}>
            {report.status}
          </span>
        </div>

        {/* Status Selector (only for complete reports) */}
        {report.status === 'complete' && (
          <div className="mb-4 pb-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Status:</span>
                <div className="flex gap-1">
                  {(['under_review', 'ready_to_send', 'sent'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => handleReviewStatusChange(status)}
                      disabled={isUpdating}
                      className={`px-2 py-0.5 text-xs font-medium rounded-md transition-all ${
                        getReviewStatusStyles(status, currentReviewStatus === status)
                      } ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      {getReviewStatusLabel(status)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatDate(report.updatedAt)}
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

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {getActionButton()}

          {/* Export Button (only for complete reports) */}
          {report.status === 'complete' && (
            <Link
              href={`/dashboard/reports/${report.id}`}
              className="p-2 border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 hover:text-slate-700 transition-all"
              title="Export report"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </Link>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Delete Report</h3>
                <p className="text-sm text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-6">
              Are you sure you want to delete the <span className="font-semibold text-slate-900">{report.month} {report.year}</span> report for <span className="font-semibold text-slate-900">{report.propertyName}</span>? The report and any uploaded files will be permanently removed.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all disabled:opacity-50"
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

