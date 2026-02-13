'use client'

import { useState, useMemo, useRef, useCallback } from 'react'
import Link from 'next/link'
import { SectionEditor } from './section-editor'
import { saveSection, regenerateSection } from '@/app/actions/ai'
import { REPORT_SECTIONS } from '@/lib/report-sections'
import { ALL_SECTIONS } from '@/lib/section-definitions'
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

// ── Types ──────────────────────────────────────────────────────

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

// ── Content Rendering Utility ──────────────────────────────────
// Claude generates section content that may contain:
// 1. Pure markdown (narrative text)
// 2. Inline HTML (SVG charts, HTML tables, styled KPI cards)
// 3. A mix of both
//
// This function converts everything into safe, renderable HTML.

function renderSectionContent(content: string): string {
  if (!content) return ''

  // Detect if content has inline HTML from Claude (charts, tables, SVGs)
  const hasInlineHTML = /<(?:div|table|svg|span|style|tr|td|th)\b/i.test(content)

  if (hasInlineHTML) {
    // Content has inline HTML — preserve it, convert markdown formatting around it
    // Split on HTML blocks to avoid mangling them
    const parts = content.split(/(<(?:div|table|svg|style)[\s\S]*?<\/(?:div|table|svg|style)>)/gi)

    return parts
      .map((part) => {
        // If this part is an HTML block, leave it untouched
        if (/^<(?:div|table|svg|style)/i.test(part.trim())) {
          return part
        }
        // Otherwise, apply markdown conversion to the text parts
        return convertMarkdownToHTML(part)
      })
      .join('')
  }

  // Pure markdown content — full conversion
  return convertMarkdownToHTML(content)
}

function convertMarkdownToHTML(text: string): string {
  if (!text.trim()) return ''

  let html = text
    // Headers
    .replace(/^### (.+)$/gm, '<h3 style="font-size:16px;font-weight:600;color:#0f172a;margin:16px 0 8px;">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size:18px;font-weight:600;color:#0f172a;margin:20px 0 10px;">$1</h2>')
    // Bold and italic
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Bullet lists
    .replace(/^[-*] (.+)$/gm, '<li style="margin:4px 0;padding-left:4px;">$1</li>')
    // Wrap consecutive <li> in <ul>
    .replace(/((?:<li[^>]*>.*?<\/li>\s*)+)/g, '<ul style="margin:8px 0;padding-left:20px;list-style:disc;">$1</ul>')
    // Paragraphs — double newlines
    .replace(/\n\n+/g, '</p><p style="margin:8px 0;line-height:1.6;color:#334155;">')
    // Single newlines to <br>
    .replace(/\n/g, '<br/>')

  // Wrap in paragraph if not already wrapped
  if (!html.startsWith('<h') && !html.startsWith('<ul') && !html.startsWith('<p')) {
    html = `<p style="margin:8px 0;line-height:1.6;color:#334155;">${html}</p>`
  }

  return html
}

// ── Metric Card Renderer ───────────────────────────────────────
// Renders KPI metric cards from the metrics array (used by all tiers)

function renderMetricCards(
  metrics: GeneratedSection['metrics'],
  accentColor?: string
): string {
  if (!metrics || metrics.length === 0) return ''

  const primary = accentColor || '#27272A'

  const cards = metrics
    .map(
      (m) => `
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;min-width:140px;flex:1;">
      <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">${m.label}</div>
      <div style="font-size:22px;font-weight:700;color:${primary};margin-bottom:4px;">${m.value}</div>
      ${
        m.change
          ? `<div style="font-size:12px;font-weight:500;color:${
              m.changeDirection === 'up' ? '#059669' : m.changeDirection === 'down' ? '#dc2626' : '#64748b'
            };">
          ${m.changeDirection === 'up' ? '&#9650;' : m.changeDirection === 'down' ? '&#9660;' : '&#8212;'} ${m.change}
          ${m.vsbudget ? `<span style="color:#64748b;margin-left:6px;">vs budget: ${m.vsbudget}</span>` : ''}
        </div>`
          : ''
      }
    </div>`
    )
    .join('')

  return `<div style="display:flex;gap:12px;flex-wrap:wrap;margin:16px 0;">${cards}</div>`
}

// ── Main Component ─────────────────────────────────────────────

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

  // Accent color for KPI cards
  const accentColor = userSettings?.accent_color || '#27272A'

  // ── Parse content from multiple formats ────────────────────

  function parseStructuredContent(
    content: StructuredContent | null,
    fallbackNarrative: string | null,
    generatedSections?: GeneratedSection[] | null
  ): Record<string, { title: string; content: string; order: number; metrics?: GeneratedSection['metrics'] }> {
    // Priority 1: New pipeline generated_sections (Day 17+)
    if (generatedSections && Array.isArray(generatedSections) && generatedSections.length > 0) {
      const result: Record<string, { title: string; content: string; order: number; metrics?: GeneratedSection['metrics'] }> = {}
      generatedSections
        .filter((s) => s.included)
        .forEach((s, index) => {
          // Look up order from legacy sections first, then new section definitions
          const legacyDef = REPORT_SECTIONS.find((rs) => rs.id === s.id)
          const newDef = ALL_SECTIONS[s.id as keyof typeof ALL_SECTIONS]
          result[s.id] = {
            title: s.title,
            content: s.content,
            order: legacyDef?.order || (newDef ? index + 1 : index + 1),
            metrics: s.metrics,
          }
        })
      return result
    }

    // Priority 2: Legacy structured content
    if (content?.sections && Object.keys(content.sections).length > 0) {
      return content.sections
    }

    // Priority 3: Raw narrative fallback
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
    if (lowerTitle.includes('revenue') && lowerTitle.includes('summary')) return 'revenue_summary'
    if (lowerTitle.includes('revenue')) return 'revenue_analysis'
    if (lowerTitle.includes('expense') && lowerTitle.includes('summary')) return 'expense_summary'
    if (lowerTitle.includes('expense')) return 'expense_analysis'
    if (lowerTitle.includes('noi') || lowerTitle.includes('net operating')) return 'noi_performance'
    if (lowerTitle.includes('rent roll') && lowerTitle.includes('deep')) return 'rent_roll_deep_dive'
    if (lowerTitle.includes('rent roll')) return 'rent_roll_insights'
    if (lowerTitle.includes('budget')) return 'budget_vs_actual'
    if (lowerTitle.includes('risk') && lowerTitle.includes('matrix')) return 'risk_matrix'
    if (lowerTitle.includes('risk')) return 'risk_watch_items'
    if (lowerTitle.includes('capital') && lowerTitle.includes('tracker')) return 'capital_improvements_tracker'
    if (lowerTitle.includes('capital')) return 'capital_improvements'
    if (lowerTitle.includes('investment thesis')) return 'investment_thesis_update'
    if (lowerTitle.includes('lease expir')) return 'lease_expiration_rollover'
    if (lowerTitle.includes('market') && lowerTitle.includes('submarket')) return 'market_submarket_analysis'
    if (lowerTitle.includes('market')) return 'market_positioning'
    if (lowerTitle.includes('resident') || lowerTitle.includes('operational')) return 'resident_operational_metrics'
    if (lowerTitle.includes('regulatory') || lowerTitle.includes('compliance')) return 'regulatory_compliance'
    if (lowerTitle.includes('strategic outlook')) return 'asset_manager_strategic_outlook'
    if (lowerTitle.includes('outlook')) return 'asset_manager_outlook'
    if (lowerTitle.includes('financial') || lowerTitle.includes('performance')) return 'financial_performance'
    if (lowerTitle.includes('operation')) return 'operations'
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '_')
  }

  // ── Section actions ────────────────────────────────────────

  const handleSaveSection = useCallback(
    async (sectionId: string, content: string) => {
      const result = await saveSection(reportId, sectionId, content)
      if (result.success) {
        setSections((prev) => ({
          ...prev,
          [sectionId]: { ...prev[sectionId], content },
        }))
      } else {
        throw new Error(result.error)
      }
    },
    [reportId]
  )

  const handleRegenerateSection = useCallback(
    async (sectionId: string, instructions?: string) => {
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
    },
    [reportId]
  )

  // ── Computed data ──────────────────────────────────────────

  const orderedSections = useMemo(() => {
    const result: Array<{
      id: string
      title: string
      content: string
      order: number
      description: string
      required: boolean
      metrics?: GeneratedSection['metrics']
    }> = []

    for (const [id, section] of Object.entries(sections)) {
      const def = REPORT_SECTIONS.find((rs) => rs.id === id)
      result.push({
        id,
        title: section.title,
        content: section.content,
        order: section.order,
        description: def?.description || '',
        required: def?.required || false,
        metrics: (section as any).metrics,
      })
    }

    // Add empty entries for legacy sections not yet generated
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

  // ── Export handlers ────────────────────────────────────────

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

  const sectionCount = orderedSections.filter((s) => s.content).length

  // ── Render ─────────────────────────────────────────────────

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
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-slate-200 text-slate-600 rounded-full">
              {sectionCount}
            </span>
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

            {/* Render sections with inline HTML charts if ReportTemplate doesn't handle them */}
            {/* This is a fallback — if ReportTemplate already renders generated_sections, remove this block */}
            {report.generated_sections &&
              Array.isArray(report.generated_sections) &&
              report.generated_sections.length > 0 &&
              !templateData && (
                <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 24px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                  {orderedSections
                    .filter((s) => s.content)
                    .map((section) => (
                      <div key={section.id} style={{ marginBottom: '32px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginBottom: '12px', borderBottom: `2px solid ${accentColor}`, paddingBottom: '8px' }}>
                          {section.title}
                        </h2>
                        {/* KPI Metric Cards */}
                        {section.metrics && section.metrics.length > 0 && (
                          <div dangerouslySetInnerHTML={{ __html: renderMetricCards(section.metrics, accentColor) }} />
                        )}
                        {/* Section content with inline HTML charts */}
                        <div dangerouslySetInnerHTML={{ __html: renderSectionContent(section.content) }} />
                      </div>
                    ))}
                </div>
              )}
          </div>
        )}

        {viewMode === 'sections' && (
          <div className="space-y-3">
            {orderedSections
              .filter((s) => s.content)
              .map((section, index) => (
                <div key={section.id}>
                  {/* KPI cards above the editor for this section */}
                  {section.metrics && section.metrics.length > 0 && (
                    <div
                      className="mb-2 px-4"
                      dangerouslySetInnerHTML={{ __html: renderMetricCards(section.metrics, accentColor) }}
                    />
                  )}
                  <SectionEditor
                    sectionId={section.id}
                    title={section.title}
                    content={section.content}
                    order={section.order}
                    onSave={handleSaveSection}
                    onRegenerate={handleRegenerateSection}
                    isRegenerating={regeneratingSection === section.id}
                    animationDelay={index}
                  />
                  {/* Render inline HTML visualizations below the editor */}
                  {/<(?:div|table|svg|style)\b/i.test(section.content) && (
                    <div className="mt-2 mb-4 px-4">
                      <div className="rounded-lg border border-slate-200 overflow-hidden">
                        <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200">
                          <span className="text-xs font-medium text-slate-500">Chart Preview</span>
                        </div>
                        <div
                          className="p-4"
                          dangerouslySetInnerHTML={{
                            __html: extractHTMLBlocks(section.content),
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
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

// ── Helper: Extract only HTML blocks from mixed content ──────
// Used in Edit Sections view to show chart previews separately

function extractHTMLBlocks(content: string): string {
  const htmlBlocks: string[] = []
  const regex = /<(?:div|table|svg|style)[\s\S]*?<\/(?:div|table|svg|style)>/gi
  let match

  while ((match = regex.exec(content)) !== null) {
    htmlBlocks.push(match[0])
  }

  return htmlBlocks.join('')
}
