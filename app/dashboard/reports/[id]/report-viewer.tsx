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
  generatePDF, generateStandaloneHTML, downloadHTML,
  copyRichHTMLToClipboard, generateFilename, generateFilenameFromTemplate,
} from '@/lib/export-utils'

// ── Month name → number mapping ──
const MONTH_NUMBERS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
}
function monthNameToNumber(name: string): number {
  return MONTH_NUMBERS[name.toLowerCase()] || 1
}

// ── Types ──
interface GeneratedSection {
  id: string; title: string; content: string; chart_html?: string
  metrics?: Array<{ label: string; value: string; change?: string; changeDirection?: string; vsbudget?: string }>
  included: boolean; skipReason: string | null
}

type Props = {
  reportId: string
  report: {
    id: string; month: string; year: number; narrative: string | null
    content: StructuredContent | Record<string, unknown> | null
    generated_sections?: GeneratedSection[] | null
    questionnaire: Record<string, unknown>; template_version: string
    updated_at: string; property?: Property
  }
  userSettings?: UserSettings | null
}

type ViewMode = 'formatted' | 'sections'

// ── Warm palette ──
const W = {
  accent: '#00B7DB',
  bg: '#FFFFFF', bgAlt: '#F7F5F1', bgWarm: '#FAF9F7',
  text: '#1A1A1A', textMid: '#4A4A4A', textSoft: '#7A7A7A', textMuted: '#A3A3A3',
  border: '#E8E5E0', borderL: '#F0EDE8',
  green: '#29581D', red: '#CC0000', gold: '#B8960F',
}

// ── Content Separation Utilities (unchanged) ──

function getDisplayContent(section: { content: string; chart_html?: string }): { narrative: string; chartHTML: string } {
  if (section.chart_html !== undefined && section.chart_html !== null) {
    return { narrative: stripNarrativeHTML(section.content || ''), chartHTML: section.chart_html || '' }
  }
  const separated = separateContentLegacy(section.content)
  return { narrative: stripNarrativeHTML(separated.narrative), chartHTML: separated.chartHTML }
}

function stripNarrativeHTML(text: string): string {
  if (!text) return ''
  let narrative = text
  narrative = narrative.replace(/<div\s+style=['"][^'"]*['"][\s\S]*?<\/div>/gi, '')
  narrative = narrative.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>\s*<p[^>]*>/gi, '\n\n').replace(/<p[^>]*>/gi, '').replace(/<\/p>/gi, '')
    .replace(/<strong>/gi, '**').replace(/<\/strong>/gi, '**').replace(/<em>/gi, '*').replace(/<\/em>/gi, '*')
    .replace(/<[^>]+>/g, '').replace(/\n{3,}/g, '\n\n').trim()
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

// ── Markdown → HTML converter (unchanged) ──

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

// ── Metric Card Renderer (unchanged — used in export) ──

function renderMetricCards(metrics: GeneratedSection['metrics'], accentColor?: string): string {
  if (!metrics || metrics.length === 0) return ''
  const primary = accentColor || '#27272A'
  const cellWidth = Math.floor(100 / metrics.length)
  const cells = metrics.map(m => `
    <td style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;width:${cellWidth}%;vertical-align:top;">
      <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">${m.label}</div>
      <div style="font-size:22px;font-weight:700;color:${primary};margin-bottom:4px;">${m.value}</div>
      ${m.change ? `<div style="font-size:12px;font-weight:500;color:${m.changeDirection === 'up' ? '#059669' : m.changeDirection === 'down' ? '#dc2626' : '#64748b'};">
        ${m.changeDirection === 'up' ? '&#9650;' : m.changeDirection === 'down' ? '&#9660;' : '&#8212;'} ${m.change}
        ${m.vsbudget ? `<span style="color:#64748b;margin-left:6px;">vs budget: ${m.vsbudget}</span>` : ''}
      </div>` : ''}
    </td>`).join('')
  return `<table role="presentation" cellpadding="0" cellspacing="8" border="0" data-metrics="true" style="width:100%;border-collapse:separate;margin:16px 0;table-layout:fixed;page-break-inside:avoid;"><tr>${cells}</tr></table>`
}

// ── Formatted Section Renderer (unchanged — used in export) ──

function renderFormattedSections(
  orderedSections: Array<{ id: string; title: string; content: string; chart_html?: string; metrics?: GeneratedSection['metrics'] }>,
  accentColor: string, disclaimer?: string | null
): string {
  const activeSections = orderedSections.filter(s => s.content)
  const sectionsHTML = activeSections.map((section, idx) => {
    const { narrative, chartHTML } = getDisplayContent(section)
    let html = `<div data-section="${section.id}" style="margin-bottom:36px;">`
    if (chartHTML && idx === 0) html += `<div data-chart="header" style="margin-bottom:24px;width:100%;overflow:hidden;page-break-inside:avoid;">${chartHTML}</div>`
    html += `<h2 style="font-size:19px;font-weight:700;color:#0f172a;margin-bottom:14px;padding-bottom:8px;border-bottom:${idx === 0 ? 'none' : `2px solid ${accentColor}20`};display:flex;align-items:center;gap:10px;page-break-after:avoid;">
      <span style="display:inline-block;width:4px;height:20px;background:${accentColor};border-radius:2px;flex-shrink:0;"></span>${section.title}</h2>`
    if (idx !== 0 && section.metrics && section.metrics.length > 0) html += renderMetricCards(section.metrics, accentColor)
    if (narrative) html += `<div style="font-size:14px;line-height:1.7;color:#334155;">${renderNarrativeContent(narrative)}</div>`
    if (chartHTML && idx !== 0) html += `<div data-chart="${section.id}" style="margin-top:20px;width:100%;overflow:hidden;page-break-inside:avoid;">${chartHTML}</div>`
    html += '</div>'
    return html
  }).join('')
  let disclaimerHTML = ''
  if (disclaimer) disclaimerHTML = `<div style="margin-top:48px;padding-top:20px;border-top:1px solid #e2e8f0;"><p style="font-size:11px;color:#94a3b8;line-height:1.5;">${disclaimer}</p></div>`
  return sectionsHTML + disclaimerHTML
}

// ── Main Component ──

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
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [exportTemplate, setExportTemplate] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState<string>(userSettings?.company_name || '')

  useEffect(() => {
    async function fetchExportTemplate() {
      try {
        const res = await fetch('/api/settings'); const data = await res.json()
        if (data.success && data.data) {
          if (data.data.export_name_template) setExportTemplate(data.data.export_name_template)
          if (data.data.company_name) setCompanyName(data.data.company_name)
        }
      } catch { /* fallback */ }
    }
    fetchExportTemplate()
  }, [])

  const exportRef = useRef<HTMLDivElement>(null)
  const accentColor = userSettings?.accent_color || '#27272A'
  const hasGeneratedSections = report.generated_sections && Array.isArray(report.generated_sections) && report.generated_sections.length > 0

  // ── Parse content (unchanged) ──

  function parseStructuredContent(
    content: StructuredContent | null, fallbackNarrative: string | null, generatedSections?: GeneratedSection[] | null
  ): Record<string, { title: string; content: string; chart_html?: string; order: number; metrics?: GeneratedSection['metrics'] }> {
    if (generatedSections && Array.isArray(generatedSections) && generatedSections.length > 0) {
      const result: Record<string, { title: string; content: string; chart_html?: string; order: number; metrics?: GeneratedSection['metrics'] }> = {}
      generatedSections.filter(s => s.included).forEach((s, index) => {
        const legacyDef = REPORT_SECTIONS.find(rs => rs.id === s.id)
        const newDef = ALL_SECTIONS[s.id as keyof typeof ALL_SECTIONS]
        result[s.id] = { title: s.title, content: s.content, chart_html: s.chart_html || undefined, order: legacyDef?.order || (newDef ? index + 1 : index + 1), metrics: s.metrics }
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
      const title = match[1].trim(); const content = match[2].trim()
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

  // ── Section actions (unchanged) ──

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

  // ── Computed (unchanged) ──

  const orderedSections = useMemo(() => {
    const result: Array<{ id: string; title: string; content: string; chart_html?: string; order: number; description: string; required: boolean; metrics?: GeneratedSection['metrics'] }> = []
    for (const [id, section] of Object.entries(sections)) {
      const def = REPORT_SECTIONS.find(rs => rs.id === id)
      result.push({ id, title: section.title, content: section.content, chart_html: (section as any).chart_html, order: section.order, description: def?.description || '', required: def?.required || false, metrics: (section as any).metrics })
    }
    for (const def of REPORT_SECTIONS) { if (!sections[def.id]) result.push({ ...def, content: '' }) }
    return result.sort((a, b) => a.order - b.order)
  }, [sections])

  const handleDragStart = useCallback((index: number) => setDraggedIndex(index), [])
  const handleDragOver = useCallback((e: React.DragEvent, index: number) => { e.preventDefault(); setDragOverIndex(index) }, [])
  const handleDrop = useCallback(async (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) { setDraggedIndex(null); setDragOverIndex(null); return }
    const activeSections = orderedSections.filter(s => s.content)
    const newOrder = [...activeSections]; const [moved] = newOrder.splice(draggedIndex, 1); newOrder.splice(targetIndex, 0, moved)
    const newSections = { ...sections }
    newOrder.forEach((s, i) => { if (newSections[s.id]) newSections[s.id] = { ...newSections[s.id], order: i + 1 } })
    setSections(newSections); setDraggedIndex(null); setDragOverIndex(null)
    await reorderSections(reportId, newOrder.map(s => s.id))
  }, [draggedIndex, orderedSections, sections, reportId])
  const handleDragEnd = useCallback(() => { setDraggedIndex(null); setDragOverIndex(null) }, [])

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) next.delete(sectionId)
      else next.add(sectionId)
      return next
    })
  }, [])

  const handleRemoveSection = useCallback(async (sectionId: string) => {
    setSections(prev => { const u = { ...prev }; delete u[sectionId]; return u })
    await removeSection(reportId, sectionId)
  }, [reportId])

  const handleAddSection = useCallback(async (sectionId: string, sectionTitle: string) => {
    const maxOrder = Math.max(...Object.values(sections).map(s => s.order), 0)
    setSections(prev => ({ ...prev, [sectionId]: { title: sectionTitle, content: '', order: maxOrder + 1 } }))
    await addSection(reportId, sectionId, sectionTitle)
  }, [reportId, sections])

  const previewNarrative = useMemo(() => orderedSections.filter(s => s.content).map(s => `## ${s.title}\n\n${s.content}`).join('\n\n'), [orderedSections])

  const templateData = useMemo(() => extractReportTemplateData(
    { ...report, content: { sections } as StructuredContent, narrative: previewNarrative } as any, report.property, userSettings
  ), [report, sections, previewNarrative, userSettings])

  // ── Export (unchanged logic) ──

  const propertyName = report.property?.name || 'Property'
  const monthNum = monthNameToNumber(report.month)

  const getExportFilename = useCallback((format: 'pdf' | 'html') => {
    return generateFilenameFromTemplate(exportTemplate, propertyName, monthNum, report.year, companyName, format)
  }, [exportTemplate, propertyName, monthNum, report.year, companyName])

  const showStatus = (message: string) => { setExportStatus(message); setTimeout(() => setExportStatus(null), 3000) }

  const handleExportPDF = async () => {
    if (!exportRef.current) return; setIsExporting(true); showStatus('Generating PDF...')
    try { const filename = getExportFilename('pdf'); await generatePDF(exportRef.current, filename); showStatus('PDF downloaded') }
    catch (error) { console.error('PDF export error:', error); showStatus('Export failed — check console') }
    finally { setIsExporting(false) }
  }
  const handleExportHTML = () => {
    if (!exportRef.current) return; setIsExporting(true)
    try {
      const html = generateStandaloneHTML(exportRef.current.innerHTML, `${propertyName} - ${report.month} ${report.year} Report`)
      downloadHTML(html, getExportFilename('html')); showStatus('HTML downloaded')
    } catch (error) { console.error('HTML export error:', error); showStatus('Export failed') }
    finally { setIsExporting(false) }
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
    return allSectionIds.filter(id => !currentIds.has(id)).map(id => ({ id, title: ALL_SECTIONS[id].title, description: ALL_SECTIONS[id].description }))
  }, [sections])

  const [showAddMenu, setShowAddMenu] = useState(false)

  const exportHTML = useMemo(() => {
    if (hasGeneratedSections) return renderFormattedSections(orderedSections.filter(s => s.content), accentColor, userSettings?.custom_disclaimer)
    return null
  }, [orderedSections, accentColor, userSettings?.custom_disclaimer, hasGeneratedSections])

  // ── Render ──

  return (
      <div style={{ background: W.bg, border: `1px solid ${W.border}`, borderRadius: 14, overflow: 'hidden' }}>
      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 16, borderBottom: `1px solid ${W.border}`, background: W.bgWarm,
      }}>
        <div style={{ display: 'flex', background: W.bgAlt, borderRadius: 10, padding: 3 }}>
          {[
            { mode: 'formatted' as ViewMode, label: 'Formatted', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg> },
            { mode: 'sections' as ViewMode, label: 'Edit Sections', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"/><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"/></svg> },
          ].map(tab => (
            <button key={tab.mode} onClick={() => setViewMode(tab.mode)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: viewMode === tab.mode ? 600 : 500,
                color: viewMode === tab.mode ? W.text : W.textSoft,
                background: viewMode === tab.mode ? W.bg : 'transparent',
                boxShadow: viewMode === tab.mode ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.2s',
              }}>
              {tab.icon}
              {tab.label}
              {tab.mode === 'sections' && (
                <span style={{
                  marginLeft: 4, padding: '2px 6px', fontSize: 11, fontWeight: 600,
                  background: viewMode === 'sections' ? W.bgAlt : W.borderL,
                  color: W.textSoft, borderRadius: 100,
                }}>{sectionCount}</span>
              )}
            </button>
          ))}
        </div>
        <ExportDropdown options={exportOptions} isExporting={isExporting} exportStatus={exportStatus} />
      </div>

      {/* ── Content Area ── */}
      <div style={viewMode === 'sections'
        ? { padding: '32px 0', background: W.bgAlt }
        : { padding: '32px 0', background: W.bgAlt }
      }>
        {/* FORMATTED VIEW — paper container (report content fonts unchanged) */}
        {viewMode === 'formatted' && (
          <div style={{
            maxWidth: 960, margin: '0 auto',
            background: '#FFFFFF',
            border: `1px solid ${W.border}`,
            borderRadius: 6,
            boxShadow: '0 1px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.03)',
            padding: '48px 48px 40px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}>
            {hasGeneratedSections ? (
              <div>
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

        {/* EDIT SECTIONS VIEW */}
        {viewMode === 'sections' && (
          <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {orderedSections.filter(s => s.content).map((section, index) => {
              const { narrative, chartHTML } = getDisplayContent(section)
              const isDragging = draggedIndex === index
              const isDragOver = dragOverIndex === index && draggedIndex !== index
              const isOpen = expandedSections.has(section.id)
              return (
                <div key={section.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={() => handleDrop(index)}
                  onDragEnd={handleDragEnd}
                  style={{
                    background: W.bg,
                    border: `1px solid ${isDragOver ? W.accent : W.border}`,
                    borderRadius: 14,
                    overflow: 'hidden',
                    opacity: isDragging ? 0.5 : 1,
                    transition: 'all 0.2s',
                    boxShadow: isDragOver ? `0 0 0 2px ${W.accent}20` : 'none',
                  }}>
                  {/* Section header bar — always visible, clickable to expand */}
                  <div
                    onClick={() => toggleSection(section.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 16px',
                      background: isOpen ? W.bgWarm : W.bg,
                      borderBottom: isOpen ? `1px solid ${W.borderL}` : 'none',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                  >
                    {/* Drag grip */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      style={{ cursor: 'grab', flexShrink: 0 }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                        <circle cx="9" cy="6" r="1.5" fill={W.textMuted} />
                        <circle cx="15" cy="6" r="1.5" fill={W.textMuted} />
                        <circle cx="9" cy="12" r="1.5" fill={W.textMuted} />
                        <circle cx="15" cy="12" r="1.5" fill={W.textMuted} />
                        <circle cx="9" cy="18" r="1.5" fill={W.textMuted} />
                        <circle cx="15" cy="18" r="1.5" fill={W.textMuted} />
                      </svg>
                    </div>
                    {/* Number badge */}
                    <div style={{
                      width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                      background: isOpen ? `${W.accent}10` : W.bgAlt,
                      border: `1px solid ${isOpen ? `${W.accent}20` : W.borderL}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700,
                      color: isOpen ? W.accent : W.textMuted,
                      transition: 'all 0.2s',
                    }}>
                      {index + 1}
                    </div>
                    {/* Title + meta */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: isOpen ? W.text : W.textMid }}>{section.title}</div>
                      <div style={{ fontSize: 11, color: W.textMuted, marginTop: 1 }}>
                        {(narrative || section.content).split(/\s+/).filter(Boolean).length} words
                        {section.metrics && section.metrics.length > 0 ? ` · ${section.metrics.length} metrics` : ''}
                        {chartHTML ? ' · chart' : ''}
                      </div>
                    </div>
                    {/* Chevron */}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                      stroke={W.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      style={{
                        transition: 'transform 0.25s cubic-bezier(0.22,1,0.36,1)',
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        flexShrink: 0,
                      }}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>

                  {/* ── Expanded content: metrics + editor + chart ── */}
                  {isOpen && (
                    <div>
                      {/* Metrics */}
                      {section.metrics && section.metrics.length > 0 && (
                        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${W.borderL}` }}
                          dangerouslySetInnerHTML={{ __html: renderMetricCards(section.metrics, accentColor) }} />
                      )}

                      {/* Section editor */}
                      <SectionEditor
                        sectionId={section.id} title={section.title} content={narrative || section.content}
                        order={section.order} onSave={handleSaveSection} onRegenerate={handleRegenerateSection}
                        onRemove={handleRemoveSection} isRegenerating={regeneratingSection === section.id}
                        animationDelay={index} isDragging={isDragging}
                        dragHandleProps={{ onMouseDown: (e: React.MouseEvent) => e.stopPropagation() }}
                      />

                      {/* Chart */}
                      {chartHTML && (
                        <div style={{ padding: '0 16px 16px' }}>
                          <div style={{
                            borderRadius: 10, border: `1px solid ${W.borderL}`,
                            overflow: 'hidden', background: W.bgWarm,
                          }}>
                            <div style={{ padding: 16, maxWidth: 960 }} dangerouslySetInnerHTML={{ __html: chartHTML }} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Empty sections */}
            {orderedSections.filter(s => s.content === '' && sections[s.id]).map((section) => (
              <div key={section.id} style={{
                border: `1px dashed ${W.border}`, borderRadius: 14, padding: '14px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: W.bgWarm,
              }}>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: W.textMid }}>{section.title}</h3>
                  <p style={{ fontSize: 12, color: W.textMuted, marginTop: 2 }}>No content yet</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => handleRegenerateSection(section.id)} disabled={regeneratingSection === section.id}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '7px 14px', fontSize: 13, fontWeight: 600, color: '#fff',
                      background: W.accent, border: 'none', borderRadius: 8, cursor: 'pointer',
                    }}>
                    {regeneratingSection === section.id ? (
                      <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>Generating...</>
                    ) : (
                      <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>Generate</>
                    )}
                  </button>
                  <button onClick={() => handleRemoveSection(section.id)}
                    style={{ padding: 6, border: 'none', background: 'none', cursor: 'pointer', color: W.textMuted, borderRadius: 6 }} title="Remove">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              </div>
            ))}

            {/* Add Section */}
            <div style={{ position: 'relative', paddingTop: 4 }}>
              <button onClick={() => setShowAddMenu(!showAddMenu)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: 14, border: `2px dashed ${W.border}`, borderRadius: 14,
                  fontSize: 13, fontWeight: 600, color: W.textSoft, background: 'transparent',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${W.accent}50`; e.currentTarget.style.color = W.accent }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = W.border; e.currentTarget.style.color = W.textSoft }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Section
              </button>
              {showAddMenu && availableSectionsToAdd.length > 0 && (
                <div style={{
                  position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: 8,
                  background: W.bg, border: `1px solid ${W.border}`, borderRadius: 12,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.08)', maxHeight: 256, overflowY: 'auto', zIndex: 20, padding: 8,
                }}>
                  <p style={{ padding: '6px 12px', fontSize: 10, fontWeight: 700, color: W.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Available Sections</p>
                  {availableSectionsToAdd.map(s => (
                    <button key={s.id} onClick={() => { handleAddSection(s.id, s.title); setShowAddMenu(false) }}
                      style={{
                        width: '100%', textAlign: 'left' as const, padding: '8px 12px', borderRadius: 8,
                        border: 'none', background: 'transparent', cursor: 'pointer', transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = W.bgAlt}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                      <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: W.textMid }}>{s.title}</span>
                      <span style={{ display: 'block', fontSize: 11, color: W.textMuted }}>{s.description}</span>
                    </button>
                  ))}
                </div>
              )}
              {showAddMenu && availableSectionsToAdd.length === 0 && (
                <div style={{
                  position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: 8,
                  background: W.bg, border: `1px solid ${W.border}`, borderRadius: 12,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.08)', padding: 16, textAlign: 'center', zIndex: 20,
                }}>
                  <p style={{ fontSize: 13, color: W.textSoft }}>All available sections are already in the report.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Export Container (hidden, unchanged) ── */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0, width: '800px', pointerEvents: 'none', background: '#ffffff' }} aria-hidden="true">
        <div ref={exportRef} style={{ width: '800px', boxSizing: 'border-box', padding: '0 16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', background: '#ffffff', color: '#1e293b' }}>
          {exportHTML ? <div dangerouslySetInnerHTML={{ __html: exportHTML }} /> : <ReportTemplate data={templateData} />}
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 16, borderTop: `1px solid ${W.border}`, background: W.bgWarm,
      }}>
        <Link href={`/dashboard/reports/${reportId}/generate`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', fontSize: 13, fontWeight: 600, color: '#fff',
            background: W.accent, borderRadius: 10, textDecoration: 'none',
            boxShadow: `0 2px 12px ${W.accent}30`, transition: 'all 0.25s',
          }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"/></svg>
          Regenerate Entire Report
        </Link>
        <Link href="/dashboard/reports"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', fontSize: 13, fontWeight: 600, color: '#fff',
            background: W.text, borderRadius: 10, textDecoration: 'none',
            transition: 'all 0.2s',
          }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          Done
        </Link>
      </div>
    </div>
  )
}

