'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { SectionEditor } from './section-editor'
import { saveSection, regenerateSection } from '@/app/actions/ai'
import { REPORT_SECTIONS } from '@/lib/report-sections'
import { StructuredContent } from '@/lib/supabase'

type Props = {
  reportId: string
  narrative: string | null
  structuredContent: StructuredContent | Record<string, unknown> | null
  propertyName: string
  month: string
  year: number
}

type ViewMode = 'sections' | 'preview'

export function ReportViewer({
  reportId,
  narrative,
  structuredContent,
  propertyName,
  month,
  year,
}: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('sections')
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null)
  const [sections, setSections] = useState(() => parseStructuredContent(structuredContent, narrative))

  // Parse sections from either structured content or raw narrative
  function parseStructuredContent(
    content: StructuredContent | Record<string, unknown> | null,
    fallbackNarrative: string | null
  ): Record<string, { title: string; content: string; order: number }> {
    // Try to use structured content first
    if (content && typeof content === 'object' && 'sections' in content) {
      const structured = content as StructuredContent
      if (structured.sections && Object.keys(structured.sections).length > 0) {
        return structured.sections
      }
    }

    // Fall back to parsing narrative
    if (fallbackNarrative) {
      return parseNarrativeIntoSections(fallbackNarrative)
    }

    // Return empty sections
    return {}
  }

  function parseNarrativeIntoSections(
    narrative: string
  ): Record<string, { title: string; content: string; order: number }> {
    const sections: Record<string, { title: string; content: string; order: number }> = {}
    const sectionRegex = /## ([^\n]+)\n([\s\S]*?)(?=## |$)/g
    let match

    while ((match = sectionRegex.exec(narrative)) !== null) {
      const title = match[1].trim()
      const content = match[2].trim()
      const sectionId = mapTitleToSectionId(title)
      const def = REPORT_SECTIONS.find(s => s.id === sectionId)

      sections[sectionId] = {
        title,
        content,
        order: def?.order || 99,
      }
    }

    return sections
  }

  function mapTitleToSectionId(title: string): string {
    const lowerTitle = title.toLowerCase()
    if (lowerTitle.includes('executive') || lowerTitle.includes('summary')) return 'executive_summary'
    if (lowerTitle.includes('occupancy') || lowerTitle.includes('leasing')) return 'occupancy_leasing'
    if (lowerTitle.includes('financial') || lowerTitle.includes('performance')) return 'financial_performance'
    if (lowerTitle.includes('capital') || lowerTitle.includes('project')) return 'capital_projects'
    if (lowerTitle.includes('operation')) return 'operations'
    if (lowerTitle.includes('market') || lowerTitle.includes('outlook')) return 'market_outlook'
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '_')
  }

  const handleSaveSection = async (sectionId: string, content: string) => {
    const result = await saveSection(reportId, sectionId, content)
    if (result.success) {
      setSections(prev => ({
        ...prev,
        [sectionId]: {
          ...prev[sectionId],
          content,
        },
      }))
    } else {
      throw new Error(result.error)
    }
  }

  const handleRegenerateSection = async (sectionId: string) => {
    setRegeneratingSection(sectionId)
    try {
      const result = await regenerateSection(reportId, sectionId)
      if (result.success && result.content) {
        setSections(prev => ({
          ...prev,
          [sectionId]: {
            ...prev[sectionId],
            content: result.content!,
          },
        }))
      } else {
        alert(result.error || 'Failed to regenerate section')
      }
    } finally {
      setRegeneratingSection(null)
    }
  }

  // Order sections for display
  const orderedSections = useMemo(() => {
    return REPORT_SECTIONS
      .map(def => ({
        ...def,
        ...sections[def.id],
        content: sections[def.id]?.content || '',
      }))
      .sort((a, b) => a.order - b.order)
  }, [sections])

  // Build preview narrative
  const previewNarrative = useMemo(() => {
    return orderedSections
      .filter(s => s.content)
      .map(s => `## ${s.title}\n\n${s.content}`)
      .join('\n\n')
  }, [orderedSections])

  return (
    <div className="bg-white rounded-lg border border-slate-200">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('sections')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                viewMode === 'sections'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ✏️ Edit Sections
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                viewMode === 'preview'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              👁️ Preview
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Export buttons - placeholders for Day 8-9 */}
          <button
            className="px-3 py-1.5 bg-slate-100 text-slate-400 rounded text-sm font-medium cursor-not-allowed"
            title="Coming Day 9"
          >
            📄 Export PDF
          </button>
          <button
            className="px-3 py-1.5 bg-slate-100 text-slate-400 rounded text-sm font-medium cursor-not-allowed"
            title="Coming Day 9"
          >
            🌐 Export HTML
          </button>
        </div>
      </div>

      {/* Report Header */}
      <div className="text-center py-6 px-8 border-b border-slate-100">
        <h2 className="text-2xl font-bold text-slate-900">Monthly Investor Report</h2>
        <p className="text-lg text-slate-600 mt-1">{propertyName}</p>
        <p className="text-slate-500">{month} {year}</p>
      </div>

      {/* Content Area */}
      <div className="p-6">
        {viewMode === 'sections' ? (
          <div className="space-y-4">
            {orderedSections.map((section) => (
              <SectionEditor
                key={section.id}
                sectionId={section.id}
                title={section.title}
                content={section.content}
                order={section.order}
                onSave={handleSaveSection}
                onRegenerate={handleRegenerateSection}
                isRegenerating={regeneratingSection === section.id}
              />
            ))}
          </div>
        ) : (
          <div className="prose prose-slate max-w-none">
            {previewNarrative.split('\n').map((line, i) => {
              if (line.startsWith('## ')) {
                return (
                  <h3
                    key={i}
                    className="text-xl font-semibold text-slate-900 mt-8 mb-4 first:mt-0 pb-2 border-b border-slate-200"
                  >
                    {line.replace('## ', '')}
                  </h3>
                )
              }
              if (line.trim()) {
                return (
                  <p key={i} className="text-slate-700 mb-4 leading-relaxed">
                    {line}
                  </p>
                )
              }
              return null
            })}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between p-4 border-t border-slate-200 bg-slate-50">
        <Link
          href={`/dashboard/reports/${reportId}/generate`}
          className="text-slate-600 hover:text-slate-900 text-sm"
        >
          🔄 Regenerate Entire Report
        </Link>
        <Link
          href="/dashboard/reports"
          className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-sm font-medium"
        >
          Done
        </Link>
      </div>
    </div>
  )
}
