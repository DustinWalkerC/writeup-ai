'use client'

import Link from 'next/link'
import { Report } from '@/lib/supabase'
import { deleteReport } from '@/app/actions/reports'
import { useState } from 'react'

const statusStyles: Record<string, { color: string; bg: string; border: string }> = {
  draft:      { color: '#2E545C', bg: '#C8B88A18', border: '#C8B88A30' },
  generating: { color: '#1D98B1', bg: '#00B7DB0D', border: '#00B7DB22' },
  complete:   { color: '#008A3E', bg: '#008A3E12', border: '#008A3E25' },
  error:      { color: '#CC0000', bg: '#CC000010', border: '#CC000020' },
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

  const status = statusStyles[report.status] || statusStyles.draft

  return (
    <div
      className="group"
      style={{
        background: '#FFFFFF',
        border: '1px solid #E8E5E0',
        borderRadius: 14,
        padding: '20px',
        transition: 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.05)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Status + Date */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase' as const,
            color: status.color,
            background: status.bg,
            border: `1px solid ${status.border}`,
            borderRadius: 100,
            padding: '4px 11px',
          }}
        >
          {statusLabels[report.status] || 'Draft'}
        </span>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: 13, color: '#A3A3A3' }}>
            {new Date(report.updated_at || report.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
          {report.status === 'complete' && (
            <span style={{ display: 'block', fontSize: 10, color: '#A3A3A3', marginTop: 1 }}>
              {new Date(report.updated_at || report.created_at).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
          )}
        </div>
      </div>

      {/* Property name */}
      <h3
        style={{
          fontFamily: 'var(--font-display, Georgia, serif)',
          fontSize: 17,
          fontWeight: 500,
          color: '#1A1A1A',
          marginBottom: 3,
        }}
      >
        {report.property?.name || 'Unknown Property'}
      </h3>

      {/* Period */}
      <p style={{ fontSize: 13, color: '#7A7A7A', marginBottom: 16 }}>
        {report.month} {report.year}
      </p>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, paddingTop: 16, borderTop: '1px solid #F0EDE8' }}>
        {/* Primary action = accent (solid cyan) */}
        <Link
          href={
            report.status === 'draft'
              ? `/dashboard/reports/${report.id}/edit`
              : `/dashboard/reports/${report.id}`
          }
          style={{
            flex: 1,
            textAlign: 'center',
            padding: '10px 16px',
            fontSize: 13,
            fontWeight: 600,
            color: '#FFFFFF',
            background: '#00B7DB',
            border: 'none',
            borderRadius: 10,
            textDecoration: 'none',
            boxShadow: '0 2px 10px #00B7DB25',
            transition: 'all 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          {report.status === 'draft' ? 'Continue' : 'View Report'}
        </Link>

        {/* Delete = secondary danger */}
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          style={{
            padding: '10px 14px',
            fontSize: 13,
            fontWeight: 600,
            color: '#CC0000',
            background: '#CC000008',
            border: '1px solid #CC000015',
            borderRadius: 10,
            cursor: isDeleting ? 'not-allowed' : 'pointer',
            opacity: isDeleting ? 0.5 : 1,
            transition: 'all 0.25s',
          }}
        >
          {isDeleting ? '...' : 'Delete'}
        </button>
      </div>
    </div>
  )
}


