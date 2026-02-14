'use client'

import { useState } from 'react'

type Props = {
  sectionId: string
  title: string
  content: string
  order: number
  onSave: (sectionId: string, content: string) => Promise<void>
  onRegenerate: (sectionId: string, instructions?: string) => Promise<void>
  onRemove?: (sectionId: string) => void
  isRegenerating: boolean
  animationDelay?: number
  isDragging?: boolean
  dragHandleProps?: Record<string, unknown>
}

export function SectionEditor({
  sectionId,
  title,
  content,
  order,
  onSave,
  onRegenerate,
  onRemove,
  isRegenerating,
  animationDelay = 0,
  isDragging,
  dragHandleProps,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(content)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [showRegenPanel, setShowRegenPanel] = useState(false)
  const [regenInstructions, setRegenInstructions] = useState('')

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
    await onRegenerate(sectionId, regenInstructions || undefined)
    setRegenInstructions('')
    setShowRegenPanel(false)
  }

  // Update local content when prop changes (after regeneration)
  if (content !== editedContent && !isEditing) {
    setEditedContent(content)
  }

  // Unique animation style per section based on order/delay
  const regenButtonStyle = {
    background: `linear-gradient(${135 + (animationDelay * 30)}deg, #0891b2, #0d9488, #06b6d4, #14b8a6, #0891b2)`,
    backgroundSize: '300% 300%',
    animation: `gradientShift ${3.5 + (animationDelay * 0.4)}s ease infinite`,
    animationDelay: `${animationDelay * 0.3}s`,
  }

  return (
    <div
      className={`border rounded-xl overflow-hidden bg-white transition-all ${
        isDragging ? 'border-cyan-400 shadow-lg shadow-cyan-100/50 opacity-90' : 'border-slate-200'
      }`}
    >
      {/* Section Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
              dragHandleProps ? 'bg-slate-100 hover:bg-slate-200 cursor-grab active:cursor-grabbing' : 'bg-slate-100'
            }`}
            {...(dragHandleProps || {})}
            onClick={(e) => {
              if (dragHandleProps) e.stopPropagation()
            }}
          >
            {dragHandleProps ? (
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
            )}
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-500">
              {content ? `${content.split(' ').length} words` : 'No content'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Saved
            </span>
          )}
          {saveStatus === 'error' && <span className="text-sm text-red-600">Save failed</span>}
          <svg
            className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Section Content */}
      {isExpanded && (
        <div className="border-t border-slate-200">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center gap-2">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                  </svg>
                  Edit
                </button>
              ) : (
                <>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={handleCancel} disabled={isSaving} className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
                    Cancel
                  </button>
                </>
              )}
            </div>

            <button
              onClick={() => setShowRegenPanel(!showRegenPanel)}
              disabled={isRegenerating || isEditing}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg disabled:opacity-50 transition-all ${
                showRegenPanel ? 'bg-cyan-50 text-cyan-700 border border-cyan-200' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              {isRegenerating ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Regenerating...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                  </svg>
                  Regenerate
                </>
              )}
            </button>

            {onRemove && (
              <button
                onClick={() => {
                  if (confirm('Remove this section from the report? You can add it back later.')) {
                    onRemove(sectionId)
                  }
                }}
                disabled={isEditing || isRegenerating}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-500 bg-white border border-slate-200 rounded-lg hover:bg-red-50 hover:border-red-200 disabled:opacity-50 transition-colors"
                title="Remove section"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Content Area */}
          <div className="p-4">
            {isEditing ? (
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="w-full min-h-[200px] p-4 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none resize-y text-slate-800 leading-relaxed"
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

          {/* Inline Regeneration Instructions Panel — below content */}
          {showRegenPanel && !isRegenerating && (
            <div className="px-4 py-3 bg-cyan-50/50 border-t border-cyan-100">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700 mb-2">Guide the regeneration</p>
                  <textarea
                    value={regenInstructions}
                    onChange={(e) => setRegenInstructions(e.target.value)}
                    placeholder="e.g. Make it shorter, focus more on revenue trends, less detail on maintenance..."
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none resize-none bg-white"
                    rows={2}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-slate-400">Leave empty to regenerate with default instructions</p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setShowRegenPanel(false)
                          setRegenInstructions('')
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleRegenerate}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-all shadow-sm hover:shadow-md"
                        style={regenButtonStyle}
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Regenerate Section
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Regenerating indicator */}
          {isRegenerating && (
            <div className="px-4 py-3 bg-cyan-50/50 border-t border-cyan-100">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-cyan-700 font-medium">Regenerating section with your instructions...</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}






































