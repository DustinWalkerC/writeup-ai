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

const W = {
  accent: '#00B7DB', accentD: '#0EA5C7',
  bg: '#FFFFFF', bgAlt: '#F7F5F1', bgWarm: '#FAF9F7',
  text: '#1A1A1A', textMid: '#4A4A4A', textSoft: '#7A7A7A', textMuted: '#A3A3A3',
  border: '#E8E5E0', borderL: '#F0EDE8',
  green: '#29581D', red: '#CC0000',
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
      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 16px',
        background: W.bgWarm,
        borderBottom: `1px solid ${W.borderL}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', fontSize: 12, fontWeight: 600,
                color: W.textMid, background: W.bg,
                border: `1.5px solid ${W.border}`, borderRadius: 8,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
              </svg>
              Edit Directly
            </button>
          ) : (
            <>
              <button
                onClick={handleSave}
                disabled={isSaving}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', fontSize: 12, fontWeight: 600,
                  color: '#fff', background: W.green,
                  border: 'none', borderRadius: 8,
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  opacity: isSaving ? 0.6 : 1, transition: 'all 0.15s',
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                style={{
                  padding: '6px 12px', fontSize: 12, fontWeight: 500,
                  color: W.textSoft, background: 'none', border: 'none',
                  cursor: 'pointer', transition: 'color 0.15s',
                }}
              >
                Cancel
              </button>
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => setShowRegenPanel(!showRegenPanel)}
            disabled={isRegenerating || isEditing}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', fontSize: 12, fontWeight: 600,
              color: showRegenPanel ? W.accent : W.textMid,
              background: showRegenPanel ? `${W.accent}08` : W.bg,
              border: `1.5px solid ${showRegenPanel ? `${W.accent}30` : W.border}`,
              borderRadius: 8,
              cursor: (isRegenerating || isEditing) ? 'not-allowed' : 'pointer',
              opacity: (isRegenerating || isEditing) ? 0.4 : 1,
              transition: 'all 0.15s',
            }}
          >
            {isRegenerating ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Regenerating...
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9.937 15.5A2 2 0 008.5 14.063l-6.135-1.582a.5.5 0 010-.962L8.5 9.936A2 2 0 009.937 8.5l1.582-6.135a.5.5 0 01.962 0L14.063 8.5A2 2 0 0015.5 9.937l6.135 1.582a.5.5 0 010 .962L15.5 14.063a2 2 0 00-1.437 1.437l-1.582 6.135a.5.5 0 01-.962 0z" />
                </svg>
                AI Regenerate
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
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 30, height: 30,
                color: W.textMuted, background: W.bg,
                border: `1.5px solid ${W.border}`, borderRadius: 8,
                cursor: (isEditing || isRegenerating) ? 'not-allowed' : 'pointer',
                opacity: (isEditing || isRegenerating) ? 0.4 : 1,
                transition: 'all 0.15s',
              }}
              title="Remove section"
              onMouseEnter={(e) => { if (!isEditing && !isRegenerating) { e.currentTarget.style.color = W.red; e.currentTarget.style.borderColor = `${W.red}40`; e.currentTarget.style.background = `${W.red}06` } }}
              onMouseLeave={(e) => { e.currentTarget.style.color = W.textMuted; e.currentTarget.style.borderColor = W.border; e.currentTarget.style.background = W.bg }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div style={{ padding: 16 }}>
        {isEditing ? (
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            style={{
              width: '100%', minHeight: 200, padding: 16,
              border: `1.5px solid ${W.border}`, borderRadius: 10,
              outline: 'none', resize: 'vertical',
              fontSize: 14, lineHeight: 1.7, color: W.text,
              fontFamily: 'inherit',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = W.accent }}
            onBlur={(e) => { e.currentTarget.style.borderColor = W.border }}
            placeholder="Enter section content..."
          />
        ) : (
          <div style={{ maxWidth: 'none' }}>
            {content ? (
              content.split('\n').map((paragraph, i) =>
                paragraph.trim() ? (
                  <p key={i} style={{
                    fontSize: 14, lineHeight: 1.7, color: W.textMid,
                    marginBottom: 12,
                  }}>
                    {paragraph}
                  </p>
                ) : null
              )
            ) : (
              <p style={{ fontSize: 14, color: W.textMuted, fontStyle: 'italic' }}>
                No content generated for this section.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── AI Regeneration Panel ── */}
      {showRegenPanel && !isRegenerating && (
        <div style={{
          margin: '0 16px 16px',
          padding: 16,
          background: `${W.accent}04`,
          border: `1px solid ${W.accent}15`,
          borderRadius: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: `${W.accent}10`, border: `1px solid ${W.accent}20`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={W.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9.937 15.5A2 2 0 008.5 14.063l-6.135-1.582a.5.5 0 010-.962L8.5 9.936A2 2 0 009.937 8.5l1.582-6.135a.5.5 0 01.962 0L14.063 8.5A2 2 0 0015.5 9.937l6.135 1.582a.5.5 0 010 .962L15.5 14.063a2 2 0 00-1.437 1.437l-1.582 6.135a.5.5 0 01-.962 0z" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: W.text, marginBottom: 8 }}>
                What would you like to adjust?
              </p>
              <textarea
                value={regenInstructions}
                onChange={(e) => setRegenInstructions(e.target.value)}
                placeholder="e.g. Make it shorter, focus more on revenue trends, add comparison to prior quarter..."
                style={{
                  width: '100%', padding: '10px 12px', fontSize: 13,
                  border: `1.5px solid ${W.border}`, borderRadius: 8,
                  outline: 'none', resize: 'none',
                  fontFamily: 'inherit', lineHeight: 1.5,
                  color: W.text, background: W.bg,
                  transition: 'border-color 0.2s',
                }}
                rows={2}
                onFocus={(e) => { e.currentTarget.style.borderColor = W.accent }}
                onBlur={(e) => { e.currentTarget.style.borderColor = W.border }}
              />
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginTop: 10,
              }}>
                <p style={{ fontSize: 11, color: W.textMuted }}>
                  Leave empty to regenerate with default settings
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => { setShowRegenPanel(false); setRegenInstructions('') }}
                    style={{
                      padding: '5px 10px', fontSize: 12, fontWeight: 500,
                      color: W.textSoft, background: 'none', border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRegenerate}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '7px 14px', fontSize: 12, fontWeight: 600,
                      color: '#fff', background: W.accent,
                      border: 'none', borderRadius: 8,
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9.937 15.5A2 2 0 008.5 14.063l-6.135-1.582a.5.5 0 010-.962L8.5 9.936A2 2 0 009.937 8.5l1.582-6.135a.5.5 0 01.962 0L14.063 8.5A2 2 0 0015.5 9.937l6.135 1.582a.5.5 0 010 .962L15.5 14.063a2 2 0 00-1.437 1.437l-1.582 6.135a.5.5 0 01-.962 0z" />
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
        <div style={{
          margin: '0 16px 16px',
          padding: '12px 16px',
          background: `${W.accent}04`,
          border: `1px solid ${W.accent}15`,
          borderRadius: 10,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 18, height: 18,
            border: `2px solid ${W.accent}`,
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: W.accent }}>
            Regenerating with AI...
          </p>
        </div>
      )}

      {saveStatus === 'saved' && (
        <div style={{
          margin: '0 16px 12px', padding: '8px 12px',
          background: `${W.green}08`, border: `1px solid ${W.green}20`,
          borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={W.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          <span style={{ fontSize: 12, fontWeight: 600, color: W.green }}>Changes saved</span>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}







































