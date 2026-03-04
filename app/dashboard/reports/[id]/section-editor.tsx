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

  return (
    <div>
      {/* ── Toolbar: Edit / Regenerate / Remove ── */}
      <div
        className="se-toolbar"
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 16px',
          borderBottom: '1px solid #F0EDE8',
        }}
      >
        {/* Edit Directly */}
        <button
          onClick={() => {
            if (isEditing) { handleSave() }
            else { setIsEditing(true); setShowRegenPanel(false) }
          }}
          disabled={isSaving}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', fontSize: 13, fontWeight: 500,
            color: isEditing ? '#fff' : '#4A4A4A',
            background: isEditing ? '#00B7DB' : '#fff',
            border: `1px solid ${isEditing ? '#00B7DB' : '#E8E5E0'}`,
            borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
          </svg>
          {isEditing ? (isSaving ? 'Saving...' : 'Save') : 'Edit Directly'}
        </button>

        {isEditing && (
          <button
            onClick={handleCancel}
            style={{
              padding: '7px 14px', fontSize: 13, fontWeight: 500,
              color: '#7A7A7A', background: '#fff',
              border: '1px solid #E8E5E0', borderRadius: 8, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        )}

        {!isEditing && (
          <button
            onClick={() => { setShowRegenPanel(!showRegenPanel); setIsEditing(false) }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', fontSize: 13, fontWeight: 500,
              color: showRegenPanel ? '#fff' : '#4A4A4A',
              background: showRegenPanel ? '#0891b2' : '#fff',
              border: `1px solid ${showRegenPanel ? '#0891b2' : '#E8E5E0'}`,
              borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            AI Regenerate
          </button>
        )}

        {/* Remove button */}
        {onRemove && !isEditing && (
          <button
            onClick={() => {
              if (confirm('Remove this section from the report?')) onRemove(sectionId)
            }}
            style={{
              marginLeft: 'auto', width: 30, height: 30,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: 'none', background: 'none', cursor: 'pointer',
              color: '#A3A3A3', borderRadius: 6,
            }}
            title="Remove section"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}

        {/* Save status */}
        {saveStatus === 'saved' && (
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#059669', fontWeight: 500 }}>Saved</span>
        )}
        {saveStatus === 'error' && (
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#dc2626', fontWeight: 500 }}>Save failed</span>
        )}
      </div>

      {/* ── Inline Regen Instructions Panel ── */}
      {showRegenPanel && !isRegenerating && (
        <div className="se-regen-panel" style={{
          padding: '14px 16px', background: '#F0FDFA', borderBottom: '1px solid #CCFBF1',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0891b2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#134e4a' }}>What would you like to adjust?</span>
          </div>

          <textarea
            value={regenInstructions}
            onChange={(e) => setRegenInstructions(e.target.value)}
            placeholder="e.g. Make it shorter, focus more on revenue trends, add comparison to prior quarter..."
            style={{
              width: '100%', minHeight: 64, padding: '10px 12px',
              fontSize: 13, lineHeight: 1.5, color: '#334155',
              border: '1px solid #99F6E4', borderRadius: 8,
              background: '#fff', resize: 'vertical',
              outline: 'none', fontFamily: 'inherit',
            }}
          />

          <div className="se-regen-actions" style={{
            display: 'flex', alignItems: 'center', gap: 10, marginTop: 10,
          }}>
            <span style={{ fontSize: 11, color: '#7A7A7A', flex: '0 0 auto' }}>
              Leave empty for default
            </span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button
                onClick={() => { setShowRegenPanel(false); setRegenInstructions('') }}
                style={{
                  padding: '8px 16px', fontSize: 13, fontWeight: 500,
                  color: '#7A7A7A', background: '#fff',
                  border: '1px solid #E8E5E0', borderRadius: 8, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRegenerate}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', fontSize: 13, fontWeight: 600,
                  color: '#fff', background: '#00B7DB',
                  border: 'none', borderRadius: 8, cursor: 'pointer',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Regenerate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Regenerating indicator ── */}
      {isRegenerating && (
        <div style={{ padding: '12px 16px', background: '#F0FDFA', borderBottom: '1px solid #CCFBF1' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 18, height: 18, border: '2px solid #0891b2', borderTopColor: 'transparent',
              borderRadius: '50%', animation: 'spin 1s linear infinite',
            }} />
            <span style={{ fontSize: 13, color: '#0891b2', fontWeight: 500 }}>Regenerating section...</span>
          </div>
        </div>
      )}

      {/* ── Content area ── */}
      <div style={{ padding: '12px 16px' }}>
        {isEditing ? (
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            style={{
              width: '100%', minHeight: 200, padding: '12px 14px',
              fontSize: 14, lineHeight: 1.7, color: '#334155',
              border: '1px solid #E8E5E0', borderRadius: 10,
              background: '#FAFAF9', resize: 'vertical',
              outline: 'none', fontFamily: 'inherit',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#00B7DB')}
            onBlur={(e) => (e.target.style.borderColor = '#E8E5E0')}
          />
        ) : (
          <div style={{ fontSize: 14, lineHeight: 1.7, color: '#334155' }}>
            {content.split('\n').map((paragraph, i) => (
              <p key={i} style={{ margin: '8px 0' }}>
                {paragraph.split(/(\*\*.*?\*\*)/).map((part, j) =>
                  part.startsWith('**') && part.endsWith('**') ? (
                    <strong key={j}>{part.slice(2, -2)}</strong>
                  ) : (
                    <span key={j}>{part}</span>
                  )
                )}
              </p>
            ))}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
