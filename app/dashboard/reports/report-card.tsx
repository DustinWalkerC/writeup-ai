'use client'

import Link from 'next/link'
import { Report } from '@/lib/supabase'
import { deleteReport } from '@/app/actions/reports'
import { useState } from 'react'

const statusColors: Record<string, string> = {
  draft: 'bg-amber-50 text-amber-700 border border-amber-200',
  generating: 'bg-cyan-50 text-cyan-700 border border-cyan-200',
  complete: 'bg-green-50 text-green-700 border border-green-200',
  error: 'bg-red-50 text-red-700 border border-red-200',
}

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  generating: 'Generating...',
  complete: 'Complete',
  error: 'Error',
}

export function ReportCard({ report }: { report: Report & { property?: { name: string } } }) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this report?')) return
    setIsDeleting(true)
    try {
      await deleteReport(report.id)
    } catch (error) {
      console.error('Failed to delete:', error)
      alert('Failed to delete report')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
      {/* Status badge */}
      <div className="flex items-center justify-between mb-3">
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[report.status] || statusColors.draft}`}>
          {statusLabels[report.status] || 'Draft'}
        </span>
        <span className="text-sm text-slate-400">
          {new Date(report.created_at).toLocaleDateString()}
        </span>
      </div>

      {/* Property name */}
      <h3 className="font-semibold text-lg text-slate-900 mb-1">
        {report.property?.name || 'Unknown Property'}
      </h3>

      {/* Period */}
      <p className="text-slate-500 text-sm mb-4">
        {report.month} {report.year}
      </p>

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t border-slate-100">
        <Link
          href={
            report.status === 'draft'
              ? `/dashboard/reports/${report.id}/edit`
              : `/dashboard/reports/${report.id}`
          }
          className="flex-1 text-center px-3 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 text-white text-sm font-medium rounded-lg hover:from-cyan-700 hover:to-teal-700 transition-all shadow-sm"
        >
          {report.status === 'draft' ? 'Continue' : 'View'}
        </Link>

        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="px-3 py-2 text-red-600 text-sm rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
        >
          {isDeleting ? '...' : 'Delete'}
        </button>
      </div>
    </div>
  )
}
