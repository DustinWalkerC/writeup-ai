'use client'

import { useState } from 'react'

type Props = {
  sectionId: string
  title: string
  content: string
  order: number
  onSave: (sectionId: string, content: string) => Promise<void>
  onRegenerate: (sectionId: string) => Promise<void>
  isRegenerating: boolean
}

export function SectionEditor({
  sectionId,
  title,
  content,
  order,
  onSave,
  onRegenerate,
  isRegenerating,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(content)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  const handleSave = async () => {
    if (editedContent === content) {
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    setSaveStatus('idle')

    try {
      await onSave(sectionId, editedContent)
      setSaveStatus('saved')
      setIsEditing(false)
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      console.error('Save error:', error)
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditedContent(content)
    setIsEditing(false)
  }

  const handleRegenerate = async () => {
    await onRegenerate(sectionId)
    // Content will be updated via parent component
  }

  // Update local content when prop changes (after regeneration)
  if (content !== editedContent && !isEditing) {
    setEditedContent(content)
  }

  const sectionIcons: Record<string, string> = {
    executive_summary: '📋',
    occupancy_leasing: '🏠',
    financial_performance: '💰',
    capital_projects: '🔨',
    operations: '⚙️',
    market_outlook: '📈',
  }

  const icon = sectionIcons[sectionId] || '📄'

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
      {/* Section Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">{icon}</span>
          <div className="text-left">
            <h3 className="font-semibold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-500">
              {content ? `${content.split(' ').length} words` : 'No content'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saveStatus === 'saved' && (
            <span className="text-sm text-green-600">✓ Saved</span>
          )}
          {saveStatus === 'error' && (
            <span className="text-sm text-red-600">Save failed</span>
          )}
          <span className="text-slate-400 text-xl">
            {isExpanded ? '−' : '+'}
          </span>
        </div>
      </button>

      {/* Section Content */}
      {isExpanded && (
        <div className="border-t border-slate-200">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center gap-2">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-1 text-sm bg-white border border-slate-300 rounded hover:bg-slate-50"
                >
                  ✏️ Edit
                </button>
              ) : (
                <>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : '💾 Save'}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="px-3 py-1 text-sm text-slate-600 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
            <button
              onClick={handleRegenerate}
              disabled={isRegenerating || isEditing}
              className="px-3 py-1 text-sm text-slate-600 hover:text-slate-900 disabled:opacity-50 flex items-center gap-1"
            >
              {isRegenerating ? (
                <>
                  <span className="animate-spin">⟳</span> Regenerating...
                </>
              ) : (
                <>🔄 Regenerate Section</>
              )}
            </button>
          </div>

          {/* Content Area */}
          <div className="p-4">
            {isEditing ? (
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="w-full min-h-[200px] p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none resize-y font-serif text-slate-800 leading-relaxed"
                placeholder="Enter section content..."
              />
            ) : (
              <div className="prose prose-slate max-w-none">
                {content ? (
                  content.split('\n').map((paragraph, i) =>
                    paragraph.trim() ? (
                      <p key={i} className="text-slate-700 leading-relaxed mb-3">
                        {paragraph}
                      </p>
                    ) : null
                  )
                ) : (
                  <p className="text-slate-400 italic">No content generated for this section.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
