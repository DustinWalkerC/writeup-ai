'use client'

import { useState } from 'react'
import Link from 'next/link'
import { updateReport } from '@/app/actions/reports'

type Props = {
  reportId: string
  narrative: string | null
  propertyName: string
  month: string
  year: number
}

export function ReportViewer({ reportId, narrative, propertyName, month, year }: Props) {
  const [editedNarrative, setEditedNarrative] = useState(narrative || '')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateReport(reportId, { narrative: editedNarrative })
      setSaved(true)
      setIsEditing(false)
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('Save error:', error)
      alert('Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`px-3 py-1.5 rounded text-sm font-medium ${
              isEditing 
                ? 'bg-blue-100 text-blue-700'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {isEditing ? '📝 Editing' : '✏️ Edit'}
          </button>
          
          {isEditing && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-3 py-1.5 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : saved ? '✓ Saved' : 'Save Changes'}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Export buttons - placeholders for Day 8-9 */}
          <button 
            className="px-3 py-1.5 bg-slate-100 text-slate-400 rounded text-sm font-medium cursor-not-allowed"
            title="Coming soon"
          >
            📄 Export PDF
          </button>
          <button 
            className="px-3 py-1.5 bg-slate-100 text-slate-400 rounded text-sm font-medium cursor-not-allowed"
            title="Coming soon"
          >
            🌐 Export HTML
          </button>
        </div>
      </div>

      {/* Report Content */}
      <div className="p-8">
        {/* Report Header */}
        <div className="text-center mb-8 pb-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">
            Monthly Investor Report
          </h2>
          <p className="text-lg text-slate-600 mt-1">
            {propertyName}
          </p>
          <p className="text-slate-500">
            {month} {year}
          </p>
        </div>

        {/* Narrative */}
        {isEditing ? (
          <textarea
            value={editedNarrative}
            onChange={(e) => setEditedNarrative(e.target.value)}
            className="w-full min-h-[500px] p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-serif text-slate-800 leading-relaxed resize-none"
          />
        ) : (
          <div className="prose prose-slate max-w-none">
            <div className="whitespace-pre-wrap font-serif text-slate-800 leading-relaxed">
              {editedNarrative || 'No narrative generated yet.'}
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between p-4 border-t border-slate-200 bg-slate-50">
        <Link
          href={`/dashboard/reports/${reportId}/generate`}
          className="text-slate-600 hover:text-slate-900 text-sm"
        >
          🔄 Regenerate Report
        </Link>
        <Link
          href="/dashboard/reports"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          Done
        </Link>
      </div>
    </div>
  )
}
