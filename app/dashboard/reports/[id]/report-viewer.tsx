'use client'

import type React from 'react'
import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { SectionEditor } from './section-editor'
import { saveSection, regenerateSection, reorderSections, removeSection, addSection } from '@/app/actions/ai'
import { REPORT_SECTIONS } from '@/lib/report-sections'
import { ALL_SECTIONS, TIER_SECTIONS, SectionId } from '@/lib/section-definitions'
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
  generateFilenameFromTemplate,
} from '@/lib/export-utils'

// ── Month name → number mapping ──
const MONTH_NUMBERS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
}
function monthNameToNumber(name: string): number {
  return MONTH_NUMBERS[name.toLowerCase()] || 1
}

// ── Types ──────────────────────────────────────────────────────

interface GeneratedSection {
  id: string
  title: string
  content: string
  chart_html?: string
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

// ── Content Separation Utilities ───────────────────────────────

function getDisplayContent(section: {
  content: string
  chart_html?: string
}): { narrative: string; chartHTML: string } {
  if (section.chart_html !== undefined && section.chart_html !== null) {
    return {
      narrative: stripNarrativeHTML(section.content || ''),
      chartHTML: section.chart_html || '',
    }
  }
  const separated = separateContentLegacy(section.content)
  return {
    narrative: stripNarrativeHTML(separated.narrative),
    chartHTML: separated.chartHTML,
  }
}

function stripNarrativeHTML(text: string): string {
  if (!text) return ''
  let narrative = text
  narrative = narrative.replace(/<div\s+style=['"][^'"]*['"][\s\S]*?<\/div>/gi, '')
  narrative = narrative
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/p>/gi, '')
    .replace(/<strong>/gi, '**')
    .replace(/<\/strong>/gi, '**')
    .replace(/<em>/gi, '*')
    .replace(/<\/em>/gi, '*')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return narrative
}

function separateContentLegacy(content: string): { narrative: string; chartHTML: string } {
  if (!content) return { narrative: '', chartHTML: '' }
  if (!/<(?:div|table|svg)\s+style=/i.test(content)) return { narrative: content, chartHTML: '' }
  const narrativeParts: string[] = []
  const pRegex = /<p\b[^>]*>[\s\S]*?<\/p>/gi
  let pMatch
  while ((pMatch = pRegex.exec(content)) !== null) narrativeParts.push(pMatch[0])
  const chartParts: string[] = []
  const chartRegex = /<(?:div|table|svg)\s+style="[^"]*?"[\s\S]*?<\/(?:div|table|svg)>/gi
  let cMatch
  while ((cMatch = chartRegex.exec(content)) !== null) {
    const block = cMatch[0]
    if (!block.includes('display:') && !block.includes('grid') && !block.includes('border-radius') && block.length < 200) continue
    chartParts.push(block)
  }
  if (narrativeParts.length > 0) return { narrative: narrativeParts.join('\n'), chartHTML: chartParts.join('\n') }
  let narrative = content
  for (const chart of chartParts) narrative = narrative.replace(chart, '')
  narrative = narrative.replace(/^\s+|\s+$/g, '').replace(/<p[^>]*>\s*<\/p>/g, '')
  return { narrative: narrative.trim(), chartHTML: chartParts.join('\n') }
}

// ── Markdown → HTML converter ──────────────────────────────────

function renderNarrativeContent(text: string): string {
  if (!text || !text.trim()) return ''
  if (/^<p[\s>]/i.test(text.trim())) return text

  let html = text
    .replace(/^### (.+)$/gm, '<h3 style="font-size:16px;font-weight:600;color:#0f172a;margin:16px 0 8px;">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size:18px;font-weight:600;color:#0f172a;margin:20px 0 10px;">$1</h2>')
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^[-*] (.+)$/gm, '<li style="margin:4px 0;padding-left:4px;">$1</li>')
    .replace(/((?:<li[^>]*>.*?<\/li>\s*)+)/g, '<ul style="margin:8px 0;padding-left:20px;list-style:disc;">$1</ul>')
    .replace(/\n\n+/g, '</p><p style="margin:8px 0;line-height:1.7;color:#334155;">')
    .replace(/\n/g, '<br/>')

  if (!html.startsWith('<h') && !html.startsWith('<ul') && !html.startsWith('<p'))
    html = `<p style="margin:8px 0;line-height:1.7;color:#334155;">${html}</p>`
  return html
}

// ── Metric Card Renderer (table-based for PDF + email) ──

function renderMetricCards(metrics: GeneratedSection['metrics'], accentColor?: string): string {
  if (!metrics || metrics.length === 0) return ''
  const primary = accentColor || '#27272A'
  const cellWidth = Math.floor(100 / metrics.length)

  const cells = metrics.map(m => `
    <td style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;width:${cellWidth}%;vertical-align:top;">
      <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">${m.label}</div>
      <div style="font-size:22px;font-weight:700;color:${primary};margin-bottom:4px;">${m.value}</div>
      ${m.change ? `<div style="font-size:12px;font-weight:500;color:${
        m.changeDirection === 'up' ? '#059669' : m.changeDirection === 'down' ? '#dc2626' : '#64748b'
      };">
        ${m.changeDirection === 'up' ? '&#9650;' : m.changeDirection === 'down' ? '&#9660;' : '&#8212;'} ${m.change}
        ${m.vsbudget ? `<span style="color:#64748b;margin-left:6px;">vs budget: ${m.vsbudget}</span>` : ''}
      </div>` : ''}
    </td>`
  ).join('')

  return `<table role="presentation" cellpadding="0" cellspacing="8" border="0" data-metrics="true" style="width:100%;border-collapse:separate;margin:16px 0;table-layout:fixed;page-break-inside:avoid;"><tr>${cells}</tr></table>`
}

// ── Formatted Section Renderer ─────────────────────────────────
// Inline page-break CSS + data attributes for the @media print rules

function renderFormattedSections(
  orderedSections: Array<{
    id: string; title: string; content: string; chart_html?: string;
    metrics?: GeneratedSection['metrics']
  }>,
  accentColor: string,
  disclaimer?: string | null
): string {
  const activeSections = orderedSections.filter(s => s.content)

  const sectionsHTML = activeSections.map((section, idx) => {
    const { narrative, chartHTML } = getDisplayContent(section)

    let html = `<div data-section="${section.id}" style="margin-bottom:36px;">`

    if (chartHTML && idx === 0) {
      html += `<div data-chart="header" style="margin-bottom:24px;width:100%;overflow:hidden;page-break-inside:avoid;">${chartHTML}</div>`
    }

    html += `<h2 style="font-size:19px;font-weight:700;color:#0f172a;margin-bottom:14px;padding-bottom:8px;border-bottom:${idx === 0 ? 'none' : `2px solid ${accentColor}20`};display:flex;align-items:center;gap:10px;page-break-after:avoid;">
      <span style="display:inline-block;width:4px;height:20px;background:${accentColor};border-radius:2px;flex-shrink:0;"></span>
      ${section.title}
    </h2>`

    if (idx !== 0 && section.metrics && section.metrics.length > 0) {
      html += renderMetricCards(section.metrics, accentColor)
    }

    if (narrative) {
      html += `<div style="font-size:14px;line-height:1.7;color:#334155;">${renderNarrativeContent(narrative)}</div>`
    }

    if (chartHTML && idx !== 0) {
      html += `<div data-chart="${section.id}" style="margin-top:20px;width:100%;overflow:hidden;page-break-inside:avoid;">${chartHTML}</div>`
    }

    html += '</div>'
    return html
  }).join('')

  let disclaimerHTML = ''
  if (disclaimer) {
    disclaimerHTML = `<div style="margin-top:48px;padding-top:20px;border-top:1px solid #e2e8f0;">
      <p style="font-size:11px;color:#94a3b8;line-height:1.5;">${disclaimer}</p>
    </div>`
  }

  return sectionsHTML + disclaimerHTML
}

// ── Main Component ─────────────────────────────────────────────

export function ReportViewer({ reportId, report, userSettings }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('formatted')
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null)
  const [sections, setSections] = useState(() =>
    parseStructuredContent(report.content as StructuredContent, report.narrative, report.generated_sections)
  )
  const [isExporting, setIsExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState<string | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const [exportTemplate, setExportTemplate] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState<string>(userSettings?.company_name || '')

  useEffect(() => {
    async function fetchExportTemplate() {
      try {
        const res = await fetch('/api/settings')
        const data = await res.json()
        if (data.success && data.data) {
          if (data.data.export_name_template) setExportTemplate(data.data.export_name_template)
          if (data.data.company_name) setCompanyName(data.data.company_name)
        }
      } catch { /* fallback to defaults */ }
    }
    fetchExportTemplate()
  }, [])

  const exportRef = useRef<HTMLDivElement>(null)

  const accentColor = userSettings?.accent_color || '#27272A'
  const hasGeneratedSections = report.generated_sections && Array.isArray(report.generated_sections) && report.generated_sections.length > 0

  // ── Parse content ──────────────────────────────────────────

  function parseStructuredContent(
    content: StructuredContent | null,
    fallbackNarrative: string | null,
    generatedSections?: GeneratedSection[] | null
  ): Record<string, { title: string; content: string; chart_html?: string; order: number; metrics?: GeneratedSection['metrics'] }> {
    if (generatedSections && Array.isArray(generatedSections) && generatedSections.length > 0) {
      const result: Record<string, { title: string; content: string; chart_html?: string; order: number; metrics?: GeneratedSection['metrics'] }> = {}
      generatedSections.filter(s => s.included).forEach((s, index) => {
        const legacyDef = REPORT_SECTIONS.find(rs => rs.id === s.id)
        const newDef = ALL_SECTIONS[s.id as keyof typeof ALL_SECTIONS]
        result[s.id] = {
          title: s.title, content: s.content, chart_html: s.chart_html || undefined,
          order: legacyDef?.order || (newDef ? index + 1 : index + 1), metrics: s.metrics,
        }
      })
      return result
    }
    if (content?.sections && Object.keys(content.sections).length > 0) return content.sections
    if (fallbackNarrative) return parseNarrativeIntoSections(fallbackNarrative)
    return {}
  }

  function parseNarrativeIntoSections(narrative: string): Record<string, { title: string; content: string; order: number }> {
    const result: Record<string, { title: string; content: string; order: number }> = {}
    const sectionRegex = /## ([^\n]+)\n([\s\S]*?)(?=## |$)/g
    let match
    while ((match = sectionRegex.exec(narrative)) !== null) {
      const title = match[1].trim()
      const content = match[2].trim()
      const sectionId = mapTitleToSectionId(title)
      const def = REPORT_SECTIONS.find(s => s.id === sectionId)
      result[sectionId] = { title, content, order: def?.order || 99 }
    }
    return result
  }

  function mapTitleToSectionId(title: string): string {
    const t = title.toLowerCase()
    if (t.includes('executive') || t.includes('summary')) return 'executive_summary'
    if (t.includes('occupancy') || t.includes('leasing')) return 'occupancy_leasing'
    if (t.includes('revenue') && t.includes('summary')) return 'revenue_summary'
    if (t.includes('revenue')) return 'revenue_analysis'
    if (t.includes('expense') && t.includes('summary')) return 'expense_summary'
    if (t.includes('expense')) return 'expense_analysis'
    if (t.includes('noi') || t.includes('net operating')) return 'noi_performance'
    if (t.includes('rent roll') && t.includes('deep')) return 'rent_roll_deep_dive'
    if (t.includes('rent roll')) return 'rent_roll_insights'
    if (t.includes('budget')) return 'budget_vs_actual'
    if (t.includes('risk') && t.includes('matrix')) return 'risk_matrix'
    if (t.includes('risk')) return 'risk_watch_items'
    if (t.includes('capital') && t.includes('tracker')) return 'capital_improvements_tracker'
    if (t.includes('capital')) return 'capital_improvements'
    if (t.includes('investment thesis')) return 'investment_thesis_update'
    if (t.includes('lease expir')) return 'lease_expiration_rollover'
    if (t.includes('market') && t.includes('submarket')) return 'market_submarket_analysis'
    if (t.includes('market')) return 'market_positioning'
    if (t.includes('resident') || t.includes('operational')) return 'resident_operational_metrics'
    if (t.includes('regulatory') || t.includes('compliance')) return 'regulatory_compliance'
    if (t.includes('strategic outlook')) return 'asset_manager_strategic_outlook'
    if (t.includes('outlook')) return 'asset_manager_outlook'
    if (t.includes('financial') || t.includes('performance')) return 'financial_performance'
    if (t.includes('operation')) return 'operations'
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '_')
  }

  // ── Section actions ────────────────────────────────────────

  const handleSaveSection = useCallback(async (sectionId: string, content: string) => {
    const result = await saveSection(reportId, sectionId, content)
    if (result.success) setSections(prev => ({ ...prev, [sectionId]: { ...prev[sectionId], content } }))
    else throw new Error(result.error)
  }, [reportId])

  const handleRegenerateSection = useCallback(async (sectionId: string, instructions?: string) => {
    setRegeneratingSection(sectionId)
    try {
      const result = await regenerateSection(reportId, sectionId, instructions)
      if (result.success && result.content) setSections(prev => ({ ...prev, [sectionId]: { ...prev[sectionId], content: result.content! } }))
      else alert(result.error || 'Failed to regenerate section')
    } finally { setRegeneratingSection(null) }
  }, [reportId])

  // ── Computed ───────────────────────────────────────────────

  const orderedSections = useMemo(() => {
    const result: Array<{
      id: string; title: string; content: string; chart_html?: string;
      order: number; description: string; required: boolean; metrics?: GeneratedSection['metrics']
    }> = []
    for (const [id, section] of Object.entries(sections)) {
      const def = REPORT_SECTIONS.find(rs => rs.id === id)
      result.push({
        id, title: section.title, content: section.content,
        chart_html: (section as any).chart_html, order: section.order,
        description: def?.description || '', required: def?.required || false,
        metrics: (section as any).metrics,
      })
    }
    for (const def of REPORT_SECTIONS) {
      if (!sections[def.id]) result.push({ ...def, content: '' })
    }
    return result.sort((a, b) => a.order - b.order)
  }, [sections])

  const handleDragStart = useCallback((index: number) => setDraggedIndex(index), [])
  const handleDragOver = useCallback((e: React.DragEvent, index: number) => { e.preventDefault(); setDragOverIndex(index) }, [])
  const handleDrop = useCallback(async (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) { setDraggedIndex(null); setDragOverIndex(null); return }
    const activeSections = orderedSections.filter(s => s.content)
    const newOrder = [...activeSections]
    const [moved] = newOrder.splice(draggedIndex, 1)
    newOrder.splice(targetIndex, 0, moved)
    const newSections = { ...sections }
    newOrder.forEach((s, i) => { if (newSections[s.id]) newSections[s.id] = { ...newSections[s.id], order: i + 1 } })
    setSections(newSections)
    setDraggedIndex(null); setDragOverIndex(null)
    await reorderSections(reportId, newOrder.map(s => s.id))
  }, [draggedIndex, orderedSections, sections, reportId])
  const handleDragEnd = useCallback(() => { setDraggedIndex(null); setDragOverIndex(null) }, [])

  const handleRemoveSection = useCallback(async (sectionId: string) => {
    setSections(prev => { const u = { ...prev }; delete u[sectionId]; return u })
    await removeSection(reportId, sectionId)
  }, [reportId])

  const handleAddSection = useCallback(async (sectionId: string, sectionTitle: string) => {
    const maxOrder = Math.max(...Object.values(sections).map(s => s.order), 0)
    setSections(prev => ({ ...prev, [sectionId]: { title: sectionTitle, content: '', order: maxOrder + 1 } }))
    await addSection(reportId, sectionId, sectionTitle)
  }, [reportId, sections])

  const previewNarrative = useMemo(() => {
    return orderedSections.filter(s => s.content).map(s => `## ${s.title}\n\n${s.content}`).join('\n\n')
  }, [orderedSections])

  const templateData = useMemo(() => {
    return extractReportTemplateData(
      { ...report, content: { sections } as StructuredContent, narrative: previewNarrative } as any,
      report.property, userSettings
    )
  }, [report, sections, previewNarrative, userSettings])

  // ── Export filenames ───────────────────────────────────────

  const propertyName = report.property?.name || 'Property'
  const monthNum = monthNameToNumber(report.month)

  const getExportFilename = useCallback((format: 'pdf' | 'html') => {
    return generateFilenameFromTemplate(exportTemplate, propertyName, monthNum, report.year, companyName, format)
  }, [exportTemplate, propertyName, monthNum, report.year, companyName])

  const showStatus = (message: string) => {
    setExportStatus(message)
    setTimeout(() => setExportStatus(null), 3000)
  }

  const handleExportPDF = async () => {
    if (!exportRef.current) return
    setIsExporting(true)
    showStatus('Generating PDF...')
    try {
      const filename = getExportFilename('pdf')
      await generatePDF(exportRef.current, filename)
      showStatus('PDF downloaded')
    } catch (error) {
      console.error('PDF export error:', error)
      showStatus('Export failed — check console')
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
        `${propertyName} - ${report.month} ${report.year} Report`
      )
      const filename = getExportFilename('html')
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
    { id: 'pdf', label: 'Download PDF', description: 'High-quality PDF for printing or sharing', icon: 'pdf', onClick: handleExportPDF },
    { id: 'html', label: 'Download HTML', description: 'Standalone web page file', icon: 'html', onClick: handleExportHTML },
    { id: 'email', label: 'Copy for Email', description: 'Paste directly into Gmail, Outlook, etc.', icon: 'email', onClick: handleCopyForEmail },
  ]

  const sectionCount = orderedSections.filter(s => s.content).length

  const availableSectionsToAdd = useMemo(() => {
    const currentIds = new Set(Object.keys(sections))
    const tierCandidate = (TIER_SECTIONS as any)?.all
    const allSectionIds = (Array.isArray(tierCandidate) ? tierCandidate : Object.keys(ALL_SECTIONS)) as SectionId[]
    return allSectionIds
      .filter(id => !currentIds.has(id))
      .map(id => ({ id, title: ALL_SECTIONS[id].title, description: ALL_SECTIONS[id].description }))
  }, [sections])

  const [showAddMenu, setShowAddMenu] = useState(false)

  const exportHTML = useMemo(() => {
    if (hasGeneratedSections) {
      return renderFormattedSections(
        orderedSections.filter(s => s.content),
        accentColor,
        userSettings?.custom_disclaimer
      )
    }
    return null
  }, [orderedSections, accentColor, userSettings?.custom_disclaimer, hasGeneratedSections])

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50/50">
        <div className="flex bg-slate-100 rounded-lg p-1">
          <button onClick={() => setViewMode('formatted')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'formatted' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            Formatted
          </button>
          <button onClick={() => setViewMode('sections')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'sections' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
            Edit Sections
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-slate-200 text-slate-600 rounded-full">{sectionCount}</span>
          </button>
        </div>
        <ExportDropdown options={exportOptions} isExporting={isExporting} exportStatus={exportStatus} />
      </div>

      {/* Content Area */}
      <div className={viewMode === 'formatted' ? '' : 'p-6'}>
        {/* ════════ FORMATTED VIEW ════════ */}
        {viewMode === 'formatted' && (
          <div>
            {hasGeneratedSections ? (
              <div style={{ maxWidth: '816px', margin: '0 auto', padding: '40px 32px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                {orderedSections.filter(s => s.content).map((section, idx) => {
                  const { narrative, chartHTML } = getDisplayContent(section)
                  return (
                    <div key={section.id} data-section={section.id} style={{ marginBottom: '36px' }}>
                      {chartHTML && idx === 0 && (
                        <div data-chart="header" style={{ marginBottom: '24px', width: '100%', maxWidth: '100%', overflow: 'hidden' }}
                          dangerouslySetInnerHTML={{ __html: chartHTML }} />
                      )}
                      <h2 style={{
                        fontSize: '19px', fontWeight: 700, color: '#0f172a', marginBottom: '14px', paddingBottom: '8px',
                        borderBottom: idx === 0 ? 'none' : `2px solid ${accentColor}20`,
                        display: 'flex', alignItems: 'center', gap: '10px',
                      }}>
                        <span style={{ display: 'inline-block', width: '4px', height: '20px', background: accentColor, borderRadius: '2px' }} />
                        {section.title}
                      </h2>
                      {idx !== 0 && section.metrics && section.metrics.length > 0 && (
                        <div data-metrics={section.id} dangerouslySetInnerHTML={{ __html: renderMetricCards(section.metrics, accentColor) }} />
                      )}
                      {narrative && (
                        <div style={{ fontSize: '14px', lineHeight: '1.7', color: '#334155' }}
                          dangerouslySetInnerHTML={{ __html: renderNarrativeContent(narrative) }} />
                      )}
                      {chartHTML && idx !== 0 && (
                        <div data-chart={section.id} style={{ marginTop: '20px', width: '100%', maxWidth: '100%', overflow: 'hidden' }}
                          dangerouslySetInnerHTML={{ __html: chartHTML }} />
                      )}
                    </div>
                  )
                })}
                {userSettings?.custom_disclaimer && (
                  <div style={{ marginTop: '48px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
                    <p style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.5 }}>{userSettings.custom_disclaimer}</p>
                  </div>
                )}
              </div>
            ) : (
              <ReportTemplate data={templateData} />
            )}
          </div>
        )}

        {/* ════════ EDIT SECTIONS VIEW ════════ */}
        {viewMode === 'sections' && (
          <div className="space-y-1">
            {orderedSections.filter(s => s.content).map((section, index) => {
              const { narrative, chartHTML } = getDisplayContent(section)
              return (
                <div key={section.id} draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={() => handleDrop(index)}
                  onDragEnd={handleDragEnd}
                  className={`transition-all ${dragOverIndex === index && draggedIndex !== index ? 'border-t-2 border-cyan-400 pt-1' : ''}`}>
                  {section.metrics && section.metrics.length > 0 && (
                    <div className="mb-2 px-4" dangerouslySetInnerHTML={{ __html: renderMetricCards(section.metrics, accentColor) }} />
                  )}
                  <SectionEditor
                    sectionId={section.id} title={section.title} content={narrative || section.content}
                    order={section.order} onSave={handleSaveSection} onRegenerate={handleRegenerateSection}
                    onRemove={handleRemoveSection} isRegenerating={regeneratingSection === section.id}
                    animationDelay={index} isDragging={draggedIndex === index}
                    dragHandleProps={{ onMouseDown: (e: React.MouseEvent) => e.stopPropagation() }}
                  />
                  {chartHTML && (
                    <div className="mt-2 mb-4 px-4">
                      <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
                        <div className="p-4" style={{ maxWidth: '816px' }} dangerouslySetInnerHTML={{ __html: chartHTML }} />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            {orderedSections.filter(s => s.content === '' && sections[s.id]).map((section) => (
              <div key={section.id} className="border border-dashed border-slate-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-slate-700">{section.title}</h3>
                  <p className="text-sm text-slate-400">No content yet</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleRegenerateSection(section.id)} disabled={regeneratingSection === section.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white rounded-lg shadow-sm transition-all"
                    style={{ background: 'linear-gradient(135deg, #0891b2, #0d9488)' }}>
                    {regeneratingSection === section.id ? (
                      <><svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>Generating...</>
                    ) : (
                      <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>Generate</>
                    )}
                  </button>
                  <button onClick={() => handleRemoveSection(section.id)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors" title="Remove">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
            ))}
            <div className="relative pt-2">
              <button onClick={() => setShowAddMenu(!showAddMenu)}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm font-medium text-slate-500 hover:border-cyan-300 hover:text-cyan-600 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                Add Section
              </button>
              {showAddMenu && availableSectionsToAdd.length > 0 && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto z-20">
                  <div className="p-2">
                    <p className="px-3 py-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Available Sections</p>
                    {availableSectionsToAdd.map(s => (
                      <button key={s.id} onClick={() => { handleAddSection(s.id, s.title); setShowAddMenu(false) }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors">
                        <span className="block text-sm font-medium text-slate-700">{s.title}</span>
                        <span className="block text-xs text-slate-400">{s.description}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {showAddMenu && availableSectionsToAdd.length === 0 && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-slate-200 rounded-xl shadow-lg p-4 text-center z-20">
                  <p className="text-sm text-slate-500">All available sections are already in the report.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══ EXPORT CONTAINER ═══
          Hidden off-screen. Puppeteer doesn't need viewport tricks —
          we just read innerHTML and send it to the API route.
          Kept at 800px to match approximate letter printable width. */}
      <div
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: '800px',
          pointerEvents: 'none',
          background: '#ffffff',
        }}
        aria-hidden="true"
      >
        <div
          ref={exportRef}
          style={{
            width: '800px',
            boxSizing: 'border-box',
            padding: '0 16px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            background: '#ffffff',
            color: '#1e293b',
          }}
        >
          {exportHTML ? (
            <div dangerouslySetInnerHTML={{ __html: exportHTML }} />
          ) : (
            <ReportTemplate data={templateData} />
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-4 border-t border-slate-200 bg-slate-50/50">
        <Link href={`/dashboard/reports/${reportId}/generate`}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white rounded-lg shadow-sm hover:shadow-md transition-all"
          style={{ background: 'linear-gradient(225deg, #0891b2, #14b8a6, #06b6d4, #0d9488, #0891b2)', backgroundSize: '300% 300%', animation: 'gradientShift 5s ease infinite' }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
          </svg>
          Regenerate Entire Report
        </Link>
        <Link href="/dashboard/reports"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-sm font-medium transition-colors shadow-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Done
        </Link>
      </div>
    </div>
  )
}
