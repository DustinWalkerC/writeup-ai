'use client'

import { useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import { SectionEditor } from './section-editor'
import { saveSection, regenerateSection } from '@/app/actions/ai'
import { REPORT_SECTIONS } from '@/lib/report-sections'
import { StructuredContent, Property, UserSettings } from '@/lib/supabase'
import { ReportTemplate } from '@/components/report-template'
import { ExportDropdown } from '@/components/export-dropdown'
import { extractReportTemplateData } from '@/lib/report-data-extractor'
import {
  generatePDF,
  generateStandaloneHTML,
  downloadHTML,
  copyRichHTMLToClipboard,
  generateFilename,
} from '@/lib/export-utils'

type Props = {
  reportId: string
  report: {
    id: string
    month: string
    year: number
    narrative: string | null
    content: StructuredContent | Record<string, unknown> | null
    questionnaire: Record<string, unknown>
    template_version: string
    updated_at: string
    property?: Property
  }
  userSettings?: UserSettings | null
}

type ViewMode = 'formatted' | 'sections' | 'preview'

export function ReportViewer({ reportId, report, userSettings }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('formatted')
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null)
  const [sections, setSections] = useState(() =>
    parseStructuredContent(report.content as StructuredContent, report.narrative)
  )
  const [isExporting, setIsExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState<string | null>(null)

  const exportRef = useRef<HTMLDivElement>(null)

  function parseStructuredContent(
    content: StructuredContent | null,
    fallbackNarrative: string | null
  ): Record<string, { title: string; content: string; order: number }> {
    if (content?.sections && Object.keys(content.sections).length > 0) {
      return content.sections
    }
    if (fallbackNarrative) {
      return parseNarrativeIntoSections(fallbackNarrative)
    }
    return {}
  }

  function parseNarrativeIntoSections(
    narrative: string
  ): Record<string, { title: string; content: string; order: number }> {
    const result: Record<string, { title: string; content: string; order: number }> = {}
    const sectionRegex = /## ([^\n]+)\n([\s\S]*?)(?=## |$)/g
    let match

    while ((match = sectionRegex.exec(narrative)) !== null) {
      const title = match[1].trim()
      const content = match[2].trim()
      const sectionId = mapTitleToSectionId(title)
      const def = REPORT_SECTIONS.find((s) => s.id === sectionId)

      result[sectionId] = {
        title,
        content,
        order: def?.order || 99,
      }
    }

    return result
  }

  function mapTitleToSectionId(title: string): string {
    const lowerTitle = title.toLowerCase()
    if (lowerTitle.includes('executive') || lowerTitle.includes('summary')) return 'executive_summary'
    if (lowerTitle.includes('occupancy') || lowerTitle.includes('leasing')) return 'occupancy_leasing'
    if (lowerTitle.includes('financial') || lowerTitle.includes('performance'))
      return 'financial_performance'
    if (lowerTitle.includes('capital') || lowerTitle.includes('project')) return 'capital_projects'
    if (lowerTitle.includes('operation')) return 'operations'
    if (lowerTitle.includes('market') || lowerTitle.includes('outlook')) return 'market_outlook'
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '_')
  }

  const handleSaveSection = async (sectionId: string, content: string) => {
    const result = await saveSection(reportId, sectionId, content)
    if (result.success) {
      setSections((prev) => ({
        ...prev,
        [sectionId]: { ...prev[sectionId], content },
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
        setSections((prev) => ({
          ...prev,
          [sectionId]: { ...prev[sectionId], content: result.content! },
        }))
      } else {
        alert(result.error || 'Failed to regenerate section')
      }
    } finally {
      setRegeneratingSection(null)
    }
  }

  const orderedSections = useMemo(() => {
    return REPORT_SECTIONS.map((def) => ({
      ...def,
      ...sections[def.id],
      content: sections[def.id]?.content || '',
    })).sort((a, b) => a.order - b.order)
  }, [sections])

  const previewNarrative = useMemo(() => {
    return orderedSections
      .filter((s) => s.content)
      .map((s) => `## ${s.title}\n\n${s.content}`)
      .join('\n\n')
  }, [orderedSections])

  const templateData = useMemo(() => {
    return extractReportTemplateData(
      {
        ...report,
        content: { sections } as StructuredContent,
        narrative: previewNarrative,
      } as any,
      report.property,
      userSettings
    )
  }, [report, sections, previewNarrative, userSettings])

  // Export handlers
  const showStatus = (message: string) => {
    setExportStatus(message)
    setTimeout(() => setExportStatus(null), 3000)
  }

  const handleExportPDF = async () => {
    if (!exportRef.current) return
    setIsExporting(true)
    showStatus('Generating PDF...')

    try {
      const filename = generateFilename(
        report.property?.name || 'property',
        report.month,
        report.year,
        'pdf'
      )
      await generatePDF(exportRef.current, filename)
      showStatus('PDF downloaded')
    } catch (error) {
      console.error('PDF export error:', error)
      showStatus('Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportHTML = () => {
    if (!exportRef.current) return
    setIsExporting(true)

    try {
      const html = generateStandaloneHTML(
        exportRef.current.innerHTML,
        `${report.property?.name || 'Property'} - ${report.month} ${report.year} Report`
      )
      const filename = generateFilename(
        report.property?.name || 'property',
        report.month,
        report.year,
        'html'
      )
      downloadHTML(html, filename)
      showStatus('HTML downloaded')
    } catch (error) {
      console.error('HTML export error:', error)
      showStatus('Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  const handleCopyForEmail = async () => {
    if (!exportRef.current) return

    const success = await copyRichHTMLToClipboard(exportRef.current)
    showStatus(success ? 'Copied! Paste into your email' : 'Copy failed')
  }

  const exportOptions = [
    {
      id: 'pdf',
      label: 'Download PDF',
      description: 'High-quality PDF for printing or sharing',
      icon: '📄',
      onClick: handleExportPDF,
    },
    {
      id: 'html',
      label: 'Download HTML',
      description: 'Standalone web page file',
      icon: '🌐',
      onClick: handleExportHTML,
    },
    {
      id: 'email',
      label: 'Copy for Email',
      description: 'Paste directly into Gmail, Outlook, etc.',
      icon: '📧',
      onClick: handleCopyForEmail,
    },
  ]

  return (
    <div className="bg-white rounded-lg border border-slate-200">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        {/* View Mode Toggle */}
        <div className="flex bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('formatted')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              viewMode === 'formatted'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Formatted
          </button>
          <button
            onClick={() => setViewMode('sections')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              viewMode === 'sections'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Edit Sections
          </button>
          <button
            onClick={() => setViewMode('preview')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              viewMode === 'preview'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Raw Text
          </button>
        </div>

        {/* Export Dropdown */}
        <ExportDropdown
          options={exportOptions}
          isExporting={isExporting}
          exportStatus={exportStatus}
        />
      </div>

      {/* Content Area */}
      <div className={viewMode === 'formatted' ? '' : 'p-6'}>
        {viewMode === 'formatted' && (
          <div ref={exportRef}>
            <ReportTemplate data={templateData} />
          </div>
        )}

        {viewMode === 'sections' && (
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
        )}

        {viewMode === 'preview' && (
          <div className="prose prose-slate max-w-none">
            <pre className="whitespace-pre-wrap font-mono text-sm bg-slate-50 p-4 rounded-lg">
              {previewNarrative}
            </pre>
          </div>
        )}
      </div>

      {/* Hidden export container for non-formatted views */}
      {viewMode !== 'formatted' && (
        <div className="hidden">
          <div ref={exportRef}>
            <ReportTemplate data={templateData} />
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex items-center justify-between p-4 border-t border-slate-200 bg-slate-50">
        <Link
          href={`/dashboard/reports/${reportId}/generate`}
          className="text-slate-600 hover:text-slate-900 text-sm"
        >
          Regenerate Entire Report
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

