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

interface GeneratedSection {
  id: string
  title: string
  content: string
  metrics?: Array<{
    label: string
    value: string
    change?: string
    changeDirection?: string
    vsbudget?: string
  }>
  included: boolean
  skipReason: string | null
}

type Props = {
  reportId: string
  report: {
    id: string
    month: string
    year: number
    narrative: string | null
    content: StructuredContent | Record<string, unknown> | null
    generated_sections?: GeneratedSection[] | null
    questionnaire: Record<string, unknown>
    template_version: string
    updated_at: string
    property?: Property
  }
  userSettings?: UserSettings | null
}

type ViewMode = 'formatted' | 'sections'

export function ReportViewer({ reportId, report, userSettings }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('formatted')
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null)
  const [sections, setSections] = useState(() =>
    parseStructuredContent(
      report.content as StructuredContent,
      report.narrative,
      report.generated_sections
    )
  )
  const [isExporting, setIsExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState<string | null>(null)

  const exportRef = useRef<HTMLDivElement>(null)

  function parseStructuredContent(
    content: StructuredContent | null,
    fallbackNarrative: string | null,
    generatedSections?: GeneratedSection[] | null
  ): Record<string, { title: string; content: string; order: number }> {
    if (generatedSections && Array.isArray(generatedSections) && generatedSections.length > 0) {
      const result: Record<string, { title: string; content: string; order: number }> = {}
      generatedSections
        .filter(s => s.included)
        .forEach((s, index) => {
          const def = REPORT_SECTIONS.find(rs => rs.id === s.id)
          result[s.id] = {
            title: s.title,
            content: s.content,
            order: def?.order || index + 1,
          }
        })
      return result
    }

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

  const handleRegenerateSection = async (sectionId: string, instructions?: string) => {
    setRegeneratingSection(sectionId)
    try {
      const result = await regenerateSection(reportId, sectionId, instructions)
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
    const result: Array<{ id: string; title: string; content: string; order: number; description: string; required: boolean }> = []

    for (const [id, section] of Object.entries(sections)) {
      const def = REPORT_SECTIONS.find(rs => rs.id === id)
      result.push({
        id,
        title: section.title,
        content: section.content,
        order: section.order,
        description: def?.description || '',
        required: def?.required || false,
      })
    }

    for (const def of REPORT_SECTIONS) {
      if (!sections[def.id]) {
        result.push({
          ...def,
          content: '',
        })
      }
    }

    return result.sort((a, b) => a.order - b.order)
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
      icon: 'pdf',
      onClick: handleExportPDF,
    },
    {
      id: 'html',
      label: 'Download HTML',
      description: 'Standalone web page file',
      icon: 'html',
      onClick: handleExportHTML,
    },
    {
      id: 'email',
      label: 'Copy for Email',
      description: 'Paste directly into Gmail, Outlook, etc.',
      icon: 'email',
      onClick: handleCopyForEmail,
    },
  ]

  const sectionCount = orderedSections.filter(s => s.content).length

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50/50">
        {/* View Mode Toggle */}
        <div className="flex bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('formatted')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              viewMode === 'formatted'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            Formatted
          </button>
          <button
            onClick={() => setViewMode('sections')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              viewMode === 'sections'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
            Edit Sections
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-slate-200 text-slate-600 rounded-full">{sectionCount}</span>
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
          <div className="space-y-3">
            {orderedSections
              .filter((s) => s.content)
              .map((section, index) => (
                <SectionEditor
                  key={section.id}
                  sectionId={section.id}
                  title={section.title}
                  content={section.content}
                  order={section.order}
                  onSave={handleSaveSection}
                  onRegenerate={handleRegenerateSection}
                  isRegenerating={regeneratingSection === section.id}
                  animationDelay={index}
                />
              ))}
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
      <div className="flex items-center justify-between p-4 border-t border-slate-200 bg-slate-50/50">
        <Link
          href={`/dashboard/reports/${reportId}/generate`}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white rounded-lg shadow-sm hover:shadow-md transition-all"
          style={{
            background: 'linear-gradient(225deg, #0891b2, #14b8a6, #06b6d4, #0d9488, #0891b2)',
            backgroundSize: '300% 300%',
            animation: 'gradientShift 5s ease infinite',
          }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
          </svg>
          Regenerate Entire Report
        </Link>
        <Link
          href="/dashboard/reports"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-sm font-medium transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Done
        </Link>
      </div>
    </div>
  )
}
