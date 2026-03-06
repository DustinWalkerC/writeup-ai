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
import VerifiedBadge from '@/components/verified-badge'
import {
  generatePDF,
  generateStandaloneHTML,
  downloadHTML,
  copyRichHTMLToClipboard,
  generateFilenameFromTemplate,
  generateEmailHTML,
  downloadEmailHTML,
} from '@/lib/export-utils'
import { renderChart, ChartData } from '@/lib/chart-renderer'
import { fillChartTemplate, type ChartTemplateData } from '@/lib/chart-template-filler'

// ── Month name → number mapping ──
const MONTH_NUMBERS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
}
function monthNameToNumber(name: string): number {
  return MONTH_NUMBERS[name.toLowerCase()] || 1
}

function renderChartSafe(
  chartData: any,
  colors?: { primary?: string; secondary?: string; accent?: string }
): string {
  if (!chartData) return ''
  const filled = fillChartTemplate(chartData as ChartTemplateData, colors)
  if (filled) return filled
  return renderChart(chartData as ChartData)
}

// ── Types ──
interface GeneratedSection {
  id: string
  title: string
  content: string
  chart_html?: string
  chart_data?: ChartData
  metrics?: Array<{ label: string; value: string; change?: string; changeDirection?: string; vsbudget?: string }>
  included: boolean
  skipReason: string | null
}

type SectionMap = Record<
  string,
  { title: string; content: string; chart_html?: string; chart_data?: ChartData; order: number; metrics?: GeneratedSection['metrics'] }
>

type Props = {
  reportId: string
  report: {
    id: string
    month: string
    year: number
    narrative: string | null
    content: StructuredContent | Record<string, unknown> | null
    generated_sections?: GeneratedSection[] | null
    validation_log?: any | null
    questionnaire: Record<string, unknown>
    template_version: string
    updated_at: string
    property?: Property
  }
  userSettings?: UserSettings | null
}

type ViewMode = 'formatted' | 'sections'

// ── Warm palette ──
const W = {
  accent: '#00B7DB',
  bg: '#FFFFFF',
  bgAlt: '#F7F5F1',
  bgWarm: '#FAF9F7',
  text: '#1A1A1A',
  textMid: '#4A4A4A',
  textSoft: '#7A7A7A',
  textMuted: '#A3A3A3',
  border: '#E8E5E0',
  borderL: '#F0EDE8',
  green: '#29581D',
  red: '#CC0000',
  gold: '#B8960F',
}

/* ═══════════════════════════════════════════════════════════════════
   MOBILE CSS
   ═══════════════════════════════════════════════════════════════════ */
const VIEWER_MOBILE_CSS = `
@media (max-width: 768px) {
  /* ── Toolbar — single row: back + tabs + export ── */
  .rv-toolbar {
    flex-direction: row !important;
    gap: 8px !important;
    padding: 8px 10px !important;
    position: relative !important;
    align-items: center !important;
    justify-content: stretch !important;
  }
  .rv-toolbar-top-row {
    display: flex !important;
    flex: 1 !important;
    align-items: center !important;
    gap: 8px !important;
    min-width: 0 !important;
  }
  .rv-back-btn {
    width: 34px !important;
    height: 34px !important;
  }
  .rv-toolbar-tabs {
    flex: 1 !important;
    min-width: 0 !important;
  }
  .rv-toolbar-tabs button {
    flex: 1 !important;
    justify-content: center !important;
    padding: 6px 8px !important;
    font-size: 12px !important;
    gap: 4px !important;
  }
  /* Show short label, hide full label on mobile */
  .rv-tab-label-full { display: none !important; }
  .rv-tab-label-short { display: inline !important; }
  /* Export button: inline, no wrapping */
  .rv-export-wrap {
    flex-shrink: 0 !important;
    width: auto !important;
    position: relative !important;
  }
  /* Export dropdown menu: right-aligned, constrained */
  .rv-export-wrap > div[style*="position"] {
    right: 0 !important;
    left: auto !important;
    min-width: 240px !important;
  }

  /* ── Verified badge area ── */
  .rv-verified-row {
    padding: 8px 12px !important;
  }
  .rv-verified-row [data-metrics],
  .rv-verified-row table {
    display: block !important;
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch !important;
  }

  /* ── Content area ── */
  .rv-content-area {
    padding: 16px 0 !important;
  }

  /* ── FORMATTED VIEW: Scaled PDF preview ── */
  .rv-paper-scale-wrap {
    overflow: hidden !important;
    padding: 12px 8px !important;
  }
  .rv-paper {
    transform-origin: top left !important;
    border-radius: 8px !important;
    box-shadow: 0 2px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04) !important;
  }

  /* ── EDIT SECTIONS: scrollable metrics + charts ── */
  .rv-metrics-scroll {
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch !important;
    margin: 0 -16px !important;
    padding: 0 16px !important;
  }
  .rv-metrics-scroll table {
    min-width: 540px !important;
  }
  .rv-chart-scroll {
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch !important;
  }
  .rv-chart-scroll > div {
    min-width: 580px !important;
  }

  /* ── Section bars ── */
  .rv-section-bar {
    padding: 10px 12px !important;
    gap: 8px !important;
  }

  /* ── Section editor: regen panel mobile fix ── */
  .se-regen-panel {
    padding: 12px !important;
  }
  .se-regen-panel textarea {
    width: 100% !important;
    min-height: 60px !important;
    font-size: 14px !important;
  }
  .se-regen-actions {
    flex-wrap: wrap !important;
    gap: 8px !important;
  }
  .se-regen-actions > span {
    width: 100% !important;
    text-align: center !important;
    order: 3 !important;
    font-size: 11px !important;
  }
  .se-regen-actions button {
    flex: 1 !important;
    min-width: 0 !important;
    justify-content: center !important;
  }
  .se-toolbar {
    flex-wrap: wrap !important;
    gap: 6px !important;
    padding: 8px 12px !important;
  }
  .se-toolbar button {
    font-size: 12px !important;
    padding: 6px 10px !important;
  }

  /* ── Footer ── */
  .rv-footer {
    flex-direction: column !important;
    gap: 8px !important;
    padding: 12px 16px !important;
  }
  .rv-footer a,
  .rv-footer button {
    width: 100% !important;
    justify-content: center !important;
    text-align: center !important;
  }

  /* ── Email modal ── */
  .rv-email-modal-inner {
    border-radius: 14px 14px 0 0 !important;
    max-height: 95vh !important;
    margin-top: auto !important;
  }
  .rv-email-header {
    flex-wrap: wrap !important;
    gap: 8px !important;
    padding: 12px 16px !important;
  }
  .rv-email-actions {
    flex-wrap: wrap !important;
    gap: 6px !important;
  }
}

/* Desktop defaults: show full label, hide short */
.rv-tab-label-full { display: inline; }
.rv-tab-label-short { display: none; }
`

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
    if (!block.includes('display:') && !block.includes('grid') && !block.includes('border-radius') && block.length < 200)
      continue
    chartParts.push(block)
  }

  if (narrativeParts.length > 0) return { narrative: narrativeParts.join('\n'), chartHTML: chartParts.join('\n') }

  let narrative = content
  for (const chart of chartParts) narrative = narrative.replace(chart, '')
  narrative = narrative.replace(/^\s+|\s+$/g, '').replace(/<p[^>]*>\s*<\/p>/g, '')
  return { narrative: narrative.trim(), chartHTML: chartParts.join('\n') }
}

// ── Markdown → HTML converter ──

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

// ── Metric Card Renderer ──

function renderMetricCards(metrics: GeneratedSection['metrics'], accentColor?: string): string {
  if (!metrics || metrics.length === 0) return ''
  const primary = accentColor || '#27272A'
  const cellWidth = Math.floor(100 / metrics.length)
  const cells = metrics
    .map(
      (m) => `
    <td style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;width:${cellWidth}%;vertical-align:top;">
      <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;min-height:32px;display:flex;align-items:flex-end;">${m.label}</div>
      <div style="font-size:22px;font-weight:700;color:${primary};margin-bottom:4px;white-space:nowrap;">${m.value}</div>
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
    </td>`
    )
    .join('')
  return `<table role="presentation" cellpadding="0" cellspacing="8" border="0" data-metrics="true" style="width:100%;border-collapse:separate;margin:16px 0;table-layout:fixed;page-break-inside:avoid;"><tr>${cells}</tr></table>`
}

// ── Formatted Section Renderer (used in export) ──

function renderFormattedSections(
  orderedSections: Array<{
    id: string; title: string; content: string; chart_html?: string;
    chart_data?: ChartData; metrics?: GeneratedSection['metrics']
  }>,
  accentColor: string,
  disclaimer?: string | null,
  brandColors?: { primary?: string; secondary?: string; accent?: string }
): string {
  const activeSections = orderedSections.filter((s) => s.content)
  const sectionsHTML = activeSections
    .map((section, idx) => {
      const { narrative, chartHTML } = getDisplayContent(section)
      const finalChartHTML = chartHTML || (section.chart_data ? renderChartSafe(section.chart_data, brandColors) : '')

      let html = `<div data-section="${section.id}" style="margin-bottom:36px;">`
      if (finalChartHTML && idx === 0)
        html += `<div data-chart="header" style="margin-bottom:24px;width:100%;overflow:hidden;page-break-inside:avoid;">${finalChartHTML}</div>`
      html += `<h2 style="font-size:19px;font-weight:700;color:#0f172a;margin-bottom:14px;padding-bottom:8px;border-bottom:${
        idx === 0 ? 'none' : `2px solid ${accentColor}20`
      };display:flex;align-items:center;gap:10px;page-break-after:avoid;">
      <span style="display:inline-block;width:4px;height:20px;background:${accentColor};border-radius:2px;flex-shrink:0;"></span>${section.title}</h2>`
      if (idx !== 0 && section.metrics && section.metrics.length > 0) html += renderMetricCards(section.metrics, accentColor)
      if (narrative) html += `<div style="font-size:14px;line-height:1.7;color:#334155;">${renderNarrativeContent(narrative)}</div>`
      if (finalChartHTML && idx !== 0)
        html += `<div data-chart="${section.id}" style="margin-top:20px;width:100%;overflow:hidden;page-break-inside:avoid;">${finalChartHTML}</div>`
      html += '</div>'
      return html
    })
    .join('')

  let disclaimerHTML = ''
  if (disclaimer)
    disclaimerHTML = `<div style="margin-top:48px;padding-top:20px;border-top:1px solid #e2e8f0;"><p style="font-size:11px;color:#94a3b8;line-height:1.5;">${disclaimer}</p></div>`
  return sectionsHTML + disclaimerHTML
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function ReportViewer({ reportId, report, userSettings }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('formatted')
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null)
  const [sections, setSections] = useState<SectionMap>(() =>
    parseStructuredContent(report.content as StructuredContent, report.narrative, report.generated_sections)
  )
  const [isExporting, setIsExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState<string | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [exportTemplate, setExportTemplate] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState<string>(userSettings?.company_name || '')
  const [emailPreviewHTML, setEmailPreviewHTML] = useState<string | null>(null)
  const [emailPreviewLoading, setEmailPreviewLoading] = useState(false)
  const [emailPreviewSize, setEmailPreviewSize] = useState<number | null>(null)

  // Fullscreen report preview + scaled PDF state
  const [showFullscreen, setShowFullscreen] = useState(false)
  const scaleWrapRef = useRef<HTMLDivElement>(null)
  const paperRef = useRef<HTMLDivElement>(null)
  const [paperScale, setPaperScale] = useState(1)
  const [scaledHeight, setScaledHeight] = useState<number | null>(null)

  // ── Ref to always have current sections (avoids stale closures) ──
  const sectionsRef = useRef(sections)
  useEffect(() => { sectionsRef.current = sections }, [sections])

  // ── Calculate scale factor + height for PDF preview on mobile ──
  useEffect(() => {
    function calcScale() {
      if (!scaleWrapRef.current) return
      const el = scaleWrapRef.current
      const style = getComputedStyle(el)
      const padL = parseFloat(style.paddingLeft) || 0
      const padR = parseFloat(style.paddingRight) || 0
      const contentWidth = el.clientWidth - padL - padR
      const newScale = contentWidth < 960 ? contentWidth / 960 : 1
      setPaperScale(newScale)

      requestAnimationFrame(() => {
        if (paperRef.current && newScale < 1) {
          const realH = paperRef.current.getBoundingClientRect().height / newScale
          setScaledHeight(realH * newScale)
        } else {
          setScaledHeight(null)
        }
      })
    }
    calcScale()
    window.addEventListener('resize', calcScale)
    return () => window.removeEventListener('resize', calcScale)
  }, [viewMode, sections])

  useEffect(() => {
    async function fetchExportTemplate() {
      try {
        const res = await fetch('/api/settings')
        const data = await res.json()
        if (data.success && data.data) {
          if (data.data.export_name_template) setExportTemplate(data.data.export_name_template)
          if (data.data.company_name) setCompanyName(data.data.company_name)
        }
      } catch {
        /* fallback */
      }
    }
    fetchExportTemplate()
  }, [])

  // Lock body scroll when fullscreen overlay is open
  useEffect(() => {
    if (showFullscreen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [showFullscreen])

  const exportRef = useRef<HTMLDivElement>(null)
  const accentColor = userSettings?.accent_color || '#27272A'
  const chartBrandColors = useMemo(
    () => ({
      primary: userSettings?.accent_color || '#27272A',
      secondary: userSettings?.secondary_color || '#EFF6FF',
      accent: (userSettings as any)?.report_accent_color || userSettings?.accent_color || '#2563EB',
    }),
    [userSettings]
  )
  const hasGeneratedSections =
    report.generated_sections && Array.isArray(report.generated_sections) && report.generated_sections.length > 0

  // ── Parse content ──

  function parseStructuredContent(
    content: StructuredContent | null,
    fallbackNarrative: string | null,
    generatedSections?: GeneratedSection[] | null
  ): SectionMap {
    if (generatedSections && Array.isArray(generatedSections) && generatedSections.length > 0) {
      const result: SectionMap = {}
      generatedSections
        .filter((s) => s.included)
        .forEach((s, index) => {
          const legacyDef = REPORT_SECTIONS.find((rs) => rs.id === s.id)
          const newDef = ALL_SECTIONS[s.id as keyof typeof ALL_SECTIONS]
          result[s.id] = {
            title: s.title, content: s.content,
            chart_html: s.chart_html || undefined, chart_data: (s as any).chart_data || undefined,
            order: legacyDef?.order || (newDef ? index + 1 : index + 1), metrics: s.metrics,
          }
        })
      return result
    }
    if (content?.sections && Object.keys(content.sections).length > 0) return content.sections as any
    if (fallbackNarrative) return parseNarrativeIntoSections(fallbackNarrative)
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

  // ═══════════════════════════════════════════════════════════════
  // FIX: Sync local sections state → reports.generated_sections in DB
  // This is the root cause of "edits disappear after navigation"
  // ═══════════════════════════════════════════════════════════════
  const syncSectionsToDb = useCallback(
    async (updatedSections: SectionMap) => {
      try {
        const generated_sections = Object.entries(updatedSections)
          .filter(([, s]) => s.content)
          .sort(([, a], [, b]) => a.order - b.order)
          .map(([id, s]) => ({
            id,
            title: s.title,
            content: s.content,
            chart_html: s.chart_html || undefined,
            chart_data: s.chart_data || undefined,
            metrics: s.metrics || undefined,
            included: true,
            skipReason: null,
          }))

        const res = await fetch(`/api/reports/${reportId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ generated_sections }),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          console.error('[ReportViewer] Sync failed:', res.status, err)
        }
      } catch (err) {
        console.error('[ReportViewer] Failed to sync sections to DB:', err)
      }
    },
    [reportId]
  )

  // ── Section actions ──

  const handleSaveSection = useCallback(
    async (sectionId: string, content: string) => {
      const result = await saveSection(reportId, sectionId, content)
      if (result.success) {
        // Use ref to get current sections — avoids stale closure
        const current = sectionsRef.current
        const updated = { ...current, [sectionId]: { ...current[sectionId], content } }
        setSections(updated)
        // Persist full generated_sections array to reports table
        await syncSectionsToDb(updated)
      } else {
        throw new Error(result.error)
      }
    },
    [reportId, syncSectionsToDb]
  )

  const handleRegenerateSection = useCallback(
    async (sectionId: string, instructions?: string) => {
      setRegeneratingSection(sectionId)
      try {
        const result = await regenerateSection(reportId, sectionId, instructions)
        if (result.success && result.content) {
          const current = sectionsRef.current
          const updated = { ...current, [sectionId]: { ...current[sectionId], content: result.content } }
          setSections(updated)
          // Persist regenerated content to DB
          await syncSectionsToDb(updated)
        } else {
          alert(result.error || 'Failed to regenerate section')
        }
      } finally {
        setRegeneratingSection(null)
      }
    },
    [reportId, syncSectionsToDb]
  )

  // ── Computed ──

  const orderedSections = useMemo(() => {
    const result: Array<{
      id: string; title: string; content: string; chart_html?: string; chart_data?: ChartData;
      order: number; description: string; required: boolean; metrics?: GeneratedSection['metrics']
    }> = []
    for (const [id, section] of Object.entries(sections)) {
      const def = REPORT_SECTIONS.find((rs) => rs.id === id)
      result.push({
        id, title: section.title, content: section.content,
        chart_html: section.chart_html, chart_data: section.chart_data,
        order: section.order, description: def?.description || '',
        required: def?.required || false, metrics: section.metrics,
      })
    }
    for (const def of REPORT_SECTIONS) {
      if (!sections[def.id]) result.push({ ...def, content: '' } as any)
    }
    return result.sort((a, b) => a.order - b.order)
  }, [sections])

  const handleDragStart = useCallback((index: number) => setDraggedIndex(index), [])
  const handleDragOver = useCallback((e: React.DragEvent, index: number) => { e.preventDefault(); setDragOverIndex(index) }, [])

  const handleDrop = useCallback(
    async (targetIndex: number) => {
      if (draggedIndex === null || draggedIndex === targetIndex) { setDraggedIndex(null); setDragOverIndex(null); return }
      const activeSections = orderedSections.filter((s) => s.content)
      const newOrder = [...activeSections]
      const [moved] = newOrder.splice(draggedIndex, 1)
      newOrder.splice(targetIndex, 0, moved)
      const newSections = { ...sectionsRef.current }
      newOrder.forEach((s, i) => { if (newSections[s.id]) newSections[s.id] = { ...newSections[s.id], order: i + 1 } })
      setSections(newSections)
      setDraggedIndex(null)
      setDragOverIndex(null)
      await reorderSections(reportId, newOrder.map((s) => s.id))
      // Persist reorder to DB
      await syncSectionsToDb(newSections)
    },
    [draggedIndex, orderedSections, reportId, syncSectionsToDb]
  )

  const handleDragEnd = useCallback(() => { setDraggedIndex(null); setDragOverIndex(null) }, [])

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(sectionId)) next.delete(sectionId)
      else next.add(sectionId)
      return next
    })
  }, [])

  const handleRemoveSection = useCallback(async (sectionId: string) => {
    const current = sectionsRef.current
    const updated = { ...current }
    delete updated[sectionId]
    setSections(updated)
    await removeSection(reportId, sectionId)
    // Persist removal to DB
    await syncSectionsToDb(updated)
  }, [reportId, syncSectionsToDb])

  const handleAddSection = useCallback(async (sectionId: string, sectionTitle: string) => {
    const current = sectionsRef.current
    const maxOrder = Math.max(...Object.values(current).map((s) => s.order), 0)
    const updated = { ...current, [sectionId]: { title: sectionTitle, content: '', order: maxOrder + 1 } }
    setSections(updated)
    await addSection(reportId, sectionId, sectionTitle)
  }, [reportId])

  const previewNarrative = useMemo(
    () => orderedSections.filter((s) => s.content).map((s) => `## ${s.title}\n\n${s.content}`).join('\n\n'),
    [orderedSections]
  )

  const templateData = useMemo(
    () => extractReportTemplateData(
      { ...report, content: { sections } as StructuredContent, narrative: previewNarrative } as any,
      report.property, userSettings
    ),
    [report, sections, previewNarrative, userSettings]
  )

  // ── Export handlers ──

  const propertyName = report.property?.name || 'Property'
  const monthNum = monthNameToNumber(report.month)

  const getExportFilename = useCallback(
    (format: 'pdf' | 'html') => generateFilenameFromTemplate(exportTemplate, propertyName, monthNum, report.year, companyName, format),
    [exportTemplate, propertyName, monthNum, report.year, companyName]
  )

  const showStatus = (message: string | null) => {
    setExportStatus(message)
    if (message) setTimeout(() => setExportStatus(null), 3000)
  }

  const handleExportPDF = async () => {
    if (!exportRef.current) return
    setIsExporting(true); showStatus('Generating PDF...')
    try { const filename = getExportFilename('pdf'); await generatePDF(exportRef.current, filename); showStatus('PDF downloaded') }
    catch (error) { console.error('PDF export error:', error); showStatus('Export failed — check console') }
    finally { setIsExporting(false) }
  }

  const handleExportHTML = () => {
    if (!exportRef.current) return
    setIsExporting(true)
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

  const handleEmailPreview = async () => {
    setEmailPreviewLoading(true); showStatus('Building email preview...')
    try { const result = await generateEmailHTML(reportId); setEmailPreviewHTML(result.html); setEmailPreviewSize(result.estimatedSizeKB); showStatus(null) }
    catch (err) { console.error('Email preview failed:', err); showStatus('Email preview failed — check console') }
    finally { setEmailPreviewLoading(false) }
  }

  const handleDownloadEmailHTML = async () => {
    const filename = getExportFilename('html')
    await downloadEmailHTML(reportId, filename)
  }

  const handleCopyEmailHTML = async () => {
    if (!emailPreviewHTML) return
    try {
      const blob = new Blob([emailPreviewHTML], { type: 'text/html' })
      const clipboardItem = new ClipboardItem({
        'text/html': blob,
        'text/plain': new Blob([emailPreviewHTML], { type: 'text/plain' }),
      })
      await navigator.clipboard.write([clipboardItem])
      setExportStatus('Copied! Paste directly into your email.')
      setTimeout(() => setExportStatus(null), 3000)
    } catch {
      try {
        await navigator.clipboard.writeText(emailPreviewHTML)
        setExportStatus('Copied as text — paste into HTML source editor')
        setTimeout(() => setExportStatus(null), 3000)
      } catch {
        setExportStatus('Copy failed — try Download instead')
        setTimeout(() => setExportStatus(null), 3000)
      }
    }
  }

  const exportOptions = [
    { id: 'pdf', label: 'Download PDF', description: 'High-quality PDF for printing or sharing', icon: 'pdf', onClick: handleExportPDF },
    { id: 'html', label: 'Download HTML', description: 'Standalone web page file', icon: 'html', onClick: handleExportHTML },
    { id: 'email', label: 'Copy for Email', description: 'Quick paste into Gmail, Outlook, etc.', icon: 'email', onClick: handleCopyForEmail },
    { id: 'email-mjml', label: 'Export Email HTML', description: 'Optimized for IR software — preview first', icon: 'email', onClick: handleEmailPreview },
  ]

  const sectionCount = orderedSections.filter((s) => s.content).length

  const availableSectionsToAdd = useMemo(() => {
    const currentIds = new Set(Object.keys(sections))
    const tierCandidate = (TIER_SECTIONS as any)?.all
    const allSectionIds = (Array.isArray(tierCandidate) ? tierCandidate : Object.keys(ALL_SECTIONS)) as SectionId[]
    return allSectionIds
      .filter((id) => !currentIds.has(id))
      .map((id) => ({ id, title: ALL_SECTIONS[id].title, description: ALL_SECTIONS[id].description }))
  }, [sections])

  const [showAddMenu, setShowAddMenu] = useState(false)

  const exportHTML = useMemo(() => {
    if (hasGeneratedSections)
      return renderFormattedSections(orderedSections.filter((s) => s.content), accentColor, userSettings?.custom_disclaimer, chartBrandColors)
    return null
  }, [orderedSections, accentColor, userSettings?.custom_disclaimer, hasGeneratedSections, chartBrandColors])

  // ── Shared report content renderer (preview + fullscreen) ──
  const reportContentJSX = hasGeneratedSections ? (
    <div>
      {orderedSections
        .filter((s) => s.content)
        .map((section, idx) => {
          const { narrative } = getDisplayContent(section)
          return (
            <div key={section.id} data-section={section.id} style={{ marginBottom: '36px' }}>
              {idx === 0 ? (
                section.chart_html ? (
                  <div data-chart="header" style={{ marginBottom: '24px', width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
                    <div dangerouslySetInnerHTML={{ __html: section.chart_html }} />
                  </div>
                ) : section.chart_data ? (
                  <div data-chart="header" style={{ marginBottom: '24px', width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
                    <div dangerouslySetInnerHTML={{ __html: renderChartSafe(section.chart_data, chartBrandColors) }} />
                  </div>
                ) : null
              ) : null}

              <h2 style={{
                fontSize: '19px', fontWeight: 700, color: '#0f172a', marginBottom: '14px',
                paddingBottom: '8px', borderBottom: idx === 0 ? 'none' : `2px solid ${accentColor}20`,
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

              {idx !== 0 ? (
                section.chart_html ? (
                  <div data-chart={section.id} style={{ marginTop: '20px', width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
                    <div dangerouslySetInnerHTML={{ __html: section.chart_html }} />
                  </div>
                ) : section.chart_data ? (
                  <div data-chart={section.id} style={{ marginTop: '20px', width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
                    <div dangerouslySetInnerHTML={{ __html: renderChartSafe(section.chart_data, chartBrandColors) }} />
                  </div>
                ) : null
              ) : null}
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
  )

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div style={{ background: W.bg, border: `1px solid ${W.border}`, borderRadius: 14, overflow: 'hidden' }}>
      <style>{VIEWER_MOBILE_CSS}</style>

      {/* ── Toolbar ── */}
      <div
        className="rv-toolbar"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 16, borderBottom: `1px solid ${W.border}`, background: W.bgWarm,
          gap: 12,
        }}
      >
        <div className="rv-toolbar-top-row" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Back button */}
          <button
            className="rv-back-btn"
            onClick={() => window.history.back()}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 38, height: 38, borderRadius: 10,
              border: `1px solid ${W.border}`, background: W.bg,
              cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = W.bgAlt; e.currentTarget.style.borderColor = W.textMuted }}
            onMouseLeave={(e) => { e.currentTarget.style.background = W.bg; e.currentTarget.style.borderColor = W.border }}
            title="Go back"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={W.textMid} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="rv-toolbar-tabs" style={{ display: 'flex', background: W.bgAlt, borderRadius: 10, padding: 3 }}>
            {[
              {
                mode: 'formatted' as ViewMode, label: 'Formatted',
                icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>,
              },
              {
                mode: 'sections' as ViewMode, label: 'Edit Sections', mobileLabel: 'Edit',
                icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>,
              },
            ].map((tab) => (
              <button
                key={tab.mode}
                onClick={() => setViewMode(tab.mode)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: viewMode === tab.mode ? 600 : 500,
                  color: viewMode === tab.mode ? W.text : W.textSoft,
                  background: viewMode === tab.mode ? W.bg : 'transparent',
                  boxShadow: viewMode === tab.mode ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {tab.icon}
                <span className="rv-tab-label-full">{tab.label}</span>
                {(tab as any).mobileLabel && <span className="rv-tab-label-short">{(tab as any).mobileLabel}</span>}
                {!(tab as any).mobileLabel && <span className="rv-tab-label-short">{tab.label}</span>}
                {tab.mode === 'sections' && (
                  <span style={{
                    marginLeft: 4, padding: '2px 6px', fontSize: 11, fontWeight: 600,
                    background: viewMode === 'sections' ? W.bgAlt : W.borderL,
                    color: W.textSoft, borderRadius: 100,
                  }}>
                    {sectionCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="rv-export-wrap">
          <ExportDropdown options={exportOptions} isExporting={isExporting || emailPreviewLoading} exportStatus={exportStatus} />
        </div>
      </div>

      {/* ── Verified Badge ── */}
      {report.validation_log && (
        <div className="rv-verified-row" style={{ padding: '12px 16px', borderBottom: `1px solid ${W.border}`, background: W.bgWarm }}>
          <VerifiedBadge validationLog={report.validation_log} />
        </div>
      )}

      {/* ── Content Area ── */}
      <div className="rv-content-area" style={{ padding: '32px 0', background: W.bgAlt }}>

        {/* ═══ FORMATTED VIEW — scaled PDF preview on mobile ═══ */}
        {viewMode === 'formatted' && (
          <div
            ref={scaleWrapRef}
            className="rv-paper-scale-wrap"
            style={{ maxWidth: 960, margin: '0 auto', padding: '0 16px' }}
          >
            <div style={{ overflow: 'hidden', height: scaledHeight ?? 'auto', position: 'relative' }}>
              <div
                ref={paperRef}
                className="rv-paper"
                onClick={() => { if (paperScale < 0.95) setShowFullscreen(true) }}
                style={{
                  width: 960,
                  background: '#FFFFFF',
                  border: `1px solid ${W.border}`,
                  borderRadius: 6,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.03)',
                  padding: '48px 48px 40px',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  transform: `scale(${paperScale})`,
                  transformOrigin: 'top left',
                  cursor: paperScale < 0.95 ? 'pointer' : 'default',
                }}
              >
                {reportContentJSX}
              </div>
              {/* Gradient fade + "Tap to view" */}
              {paperScale < 0.95 && (
                <div
                  onClick={() => setShowFullscreen(true)}
                  style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    height: 80,
                    background: `linear-gradient(to top, ${W.bgAlt} 0%, ${W.bgAlt}00 100%)`,
                    display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 6,
                    paddingBottom: 14,
                    fontSize: 12, fontWeight: 600, color: W.accent,
                    cursor: 'pointer',
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={W.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                  </svg>
                  Tap to view full report
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ EDIT SECTIONS VIEW ═══ */}
        {viewMode === 'sections' && (
          <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {orderedSections
              .filter((s) => s.content)
              .map((section, index) => {
                const { narrative, chartHTML } = getDisplayContent(section)
                const isDragging = draggedIndex === index
                const isDragOver = dragOverIndex === index && draggedIndex !== index
                const isOpen = expandedSections.has(section.id)
                return (
                  <div
                    key={section.id} draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={() => handleDrop(index)}
                    onDragEnd={handleDragEnd}
                    style={{
                      background: W.bg, border: `1px solid ${isDragOver ? W.accent : W.border}`,
                      borderRadius: 14, overflow: 'hidden', opacity: isDragging ? 0.5 : 1,
                      transition: 'all 0.2s', boxShadow: isDragOver ? `0 0 0 2px ${W.accent}20` : 'none',
                    }}
                  >
                    {/* Section header bar */}
                    <div
                      className="rv-section-bar"
                      onClick={() => toggleSection(section.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                        background: isOpen ? W.bgWarm : W.bg,
                        borderBottom: isOpen ? `1px solid ${W.borderL}` : 'none',
                        cursor: 'pointer', transition: 'background 0.15s',
                      }}
                    >
                      <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} style={{ cursor: 'grab', flexShrink: 0 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                          <circle cx="9" cy="6" r="1.5" fill={W.textMuted} /><circle cx="15" cy="6" r="1.5" fill={W.textMuted} />
                          <circle cx="9" cy="12" r="1.5" fill={W.textMuted} /><circle cx="15" cy="12" r="1.5" fill={W.textMuted} />
                          <circle cx="9" cy="18" r="1.5" fill={W.textMuted} /><circle cx="15" cy="18" r="1.5" fill={W.textMuted} />
                        </svg>
                      </div>
                      <div style={{
                        width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                        background: isOpen ? `${W.accent}10` : W.bgAlt,
                        border: `1px solid ${isOpen ? `${W.accent}20` : W.borderL}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700, color: isOpen ? W.accent : W.textMuted, transition: 'all 0.2s',
                      }}>
                        {index + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: isOpen ? W.text : W.textMid }}>{section.title}</div>
                        <div style={{ fontSize: 11, color: W.textMuted, marginTop: 1 }}>
                          {(narrative || section.content).split(/\s+/).filter(Boolean).length} words
                          {section.metrics && section.metrics.length > 0 ? ` · ${section.metrics.length} metrics` : ''}
                          {chartHTML || section.chart_data ? ' · chart' : ''}
                        </div>
                      </div>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={W.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        style={{ transition: 'transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}>
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>

                    {/* Expanded content */}
                    {isOpen && (
                      <div>
                        {/* Metrics — horizontal scroll on mobile */}
                        {section.metrics && section.metrics.length > 0 && (
                          <div className="rv-metrics-scroll" style={{ padding: '12px 16px', borderBottom: `1px solid ${W.borderL}` }}>
                            <div dangerouslySetInnerHTML={{ __html: renderMetricCards(section.metrics, accentColor) }} />
                          </div>
                        )}

                        {/* Section editor */}
                        <SectionEditor
                          sectionId={section.id} title={section.title} content={narrative || section.content}
                          order={section.order} onSave={handleSaveSection} onRegenerate={handleRegenerateSection}
                          onRemove={handleRemoveSection} isRegenerating={regeneratingSection === section.id}
                          animationDelay={index} isDragging={isDragging}
                          dragHandleProps={{ onMouseDown: (e: React.MouseEvent) => e.stopPropagation() }}
                        />

                        {/* Chart — horizontal scroll on mobile */}
                        {(section.chart_html || section.chart_data) && (
                          <div style={{ padding: '0 16px 16px' }}>
                            <div className="rv-chart-scroll" style={{ borderRadius: 10, border: `1px solid ${W.borderL}`, overflow: 'hidden', background: W.bgWarm }}>
                              <div style={{ padding: 16, maxWidth: 960 }}>
                                {section.chart_html ? (
                                  <div dangerouslySetInnerHTML={{ __html: section.chart_html }} />
                                ) : section.chart_data ? (
                                  <div dangerouslySetInnerHTML={{ __html: renderChartSafe(section.chart_data, chartBrandColors) }} />
                                ) : null}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

            {/* Empty sections */}
            {orderedSections
              .filter((s) => s.content === '' && sections[s.id])
              .map((section) => (
                <div key={section.id} style={{
                  border: `1px dashed ${W.border}`, borderRadius: 14, padding: '14px 16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: W.bgWarm,
                }}>
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: W.textMid }}>{section.title}</h3>
                    <p style={{ fontSize: 12, color: W.textMuted, marginTop: 2 }}>No content yet</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button onClick={() => handleRegenerateSection(section.id)} disabled={regeneratingSection === section.id}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px',
                        fontSize: 13, fontWeight: 600, color: '#fff', background: W.accent,
                        border: 'none', borderRadius: 8, cursor: 'pointer',
                      }}>
                      {regeneratingSection === section.id ? (
                        <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                          <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>Generating...</>
                      ) : (
                        <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>Generate</>
                      )}
                    </button>
                    <button onClick={() => handleRemoveSection(section.id)}
                      style={{ padding: 6, border: 'none', background: 'none', cursor: 'pointer', color: W.textMuted, borderRadius: 6 }} title="Remove">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
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
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = W.border; e.currentTarget.style.color = W.textSoft }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Section
              </button>

              {showAddMenu && availableSectionsToAdd.length > 0 && (
                <div style={{
                  position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: 8,
                  background: W.bg, border: `1px solid ${W.border}`, borderRadius: 12,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.08)', maxHeight: 256, overflowY: 'auto', zIndex: 20, padding: 8,
                }}>
                  <p style={{ padding: '6px 12px', fontSize: 10, fontWeight: 700, color: W.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Available Sections</p>
                  {availableSectionsToAdd.map((s) => (
                    <button key={s.id} onClick={() => { handleAddSection(s.id, s.title); setShowAddMenu(false) }}
                      style={{ width: '100%', textAlign: 'left' as const, padding: '8px 12px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = W.bgAlt)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
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

      {/* ── Export Container (hidden) ── */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0, width: '800px', pointerEvents: 'none', background: '#ffffff' }} aria-hidden="true">
        <div ref={exportRef} style={{ width: '800px', boxSizing: 'border-box', padding: '0 16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', background: '#ffffff', color: '#1e293b' }}>
          {exportHTML ? <div dangerouslySetInnerHTML={{ __html: exportHTML }} /> : <ReportTemplate data={templateData} />}
        </div>
      </div>

      {/* ═══ FULLSCREEN REPORT — Reader Mode ═══ */}
      {showFullscreen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
          {/* Sticky top bar */}
          <div style={{
            flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 16px',
            background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(232,229,224,0.7)', zIndex: 101,
          }}>
            <button
              onClick={() => setShowFullscreen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: 'none', border: 'none', cursor: 'pointer',
                color: W.accent, fontSize: 15, fontWeight: 500, padding: 0,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={W.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Done
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, color: W.text, flex: 1, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 8px' }}>
              {propertyName}
            </span>
            <div className="rv-export-wrap">
              <ExportDropdown options={exportOptions} isExporting={isExporting || emailPreviewLoading} exportStatus={exportStatus} />
            </div>
          </div>

          {/* Scrollable reader content */}
          <div style={{ flex: 1, overflow: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {/* Report header band */}
            {hasGeneratedSections && (
              <div style={{
                background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`,
                padding: '20px 16px 16px', color: '#fff',
              }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{propertyName}</div>
                <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>{report.month} {report.year} — Monthly Asset Report</div>
              </div>
            )}

            {/* Sections — reflowed for mobile reading */}
            <div style={{ padding: '0 16px' }}>
              {hasGeneratedSections ? (
                orderedSections
                  .filter((s) => s.content)
                  .map((section, idx) => {
                    const { narrative, chartHTML } = getDisplayContent(section)
                    const finalChartHTML = chartHTML || (section.chart_data ? renderChartSafe(section.chart_data, chartBrandColors) : '')

                    return (
                      <div key={section.id} style={{
                        paddingTop: 20, paddingBottom: 20,
                        borderBottom: idx < orderedSections.filter(s => s.content).length - 1 ? `1px solid ${W.border}` : 'none',
                      }}>
                        {/* Section title */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                          <div style={{ width: 3, height: 18, background: accentColor, borderRadius: 2, flexShrink: 0 }} />
                          <div style={{ fontSize: 16, fontWeight: 700, color: W.text }}>{section.title}</div>
                        </div>

                        {/* Metrics — horizontal scroll */}
                        {section.metrics && section.metrics.length > 0 && (
                          <div style={{
                            overflowX: 'auto', WebkitOverflowScrolling: 'touch',
                            margin: '0 -16px', padding: '0 16px 8px',
                          }}>
                            <div dangerouslySetInnerHTML={{ __html: renderMetricCards(section.metrics, accentColor) }}
                              style={{ minWidth: section.metrics.length > 3 ? 540 : 'auto' }} />
                          </div>
                        )}

                        {/* Narrative text — reflowed to viewport width */}
                        {narrative && (
                          <div style={{ fontSize: 14, lineHeight: 1.7, color: '#334155' }}
                            dangerouslySetInnerHTML={{ __html: renderNarrativeContent(narrative) }} />
                        )}

                        {/* Chart — horizontal scroll */}
                        {finalChartHTML && (
                          <div style={{
                            overflowX: 'auto', WebkitOverflowScrolling: 'touch',
                            margin: '12px -16px 0', padding: '0 16px',
                          }}>
                            <div style={{ minWidth: 480 }}>
                              <div dangerouslySetInnerHTML={{ __html: finalChartHTML }} />
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
              ) : (
                <div style={{ padding: '24px 0' }}>
                  <ReportTemplate data={templateData} />
                </div>
              )}
            </div>

            {/* Disclaimer */}
            {userSettings?.custom_disclaimer && (
              <div style={{ padding: '16px 16px 24px', borderTop: `1px solid ${W.border}` }}>
                <p style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>{userSettings.custom_disclaimer}</p>
              </div>
            )}

            {/* Bottom spacer */}
            <div style={{ height: 40 }} />
          </div>
        </div>
      )}

      {/* ── Email Preview Modal ── */}
      {emailPreviewHTML && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={(e) => { if (e.target === e.currentTarget) setEmailPreviewHTML(null) }}>
          <div className="rv-email-modal-inner" style={{
            background: '#FFFFFF', borderRadius: 14, boxShadow: '0 24px 80px rgba(0,0,0,0.18)',
            maxWidth: 680, width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <div className="rv-email-header" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', borderBottom: `1px solid ${W.border}`, background: W.bgWarm,
            }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: W.text }}>Email Preview</div>
                <div style={{ fontSize: 11, color: W.textMuted, marginTop: 2 }}>
                  How your report will render in email clients
                  {emailPreviewSize && <span style={{ marginLeft: 8 }}> · {emailPreviewSize}KB</span>}
                  {emailPreviewSize && emailPreviewSize < 102 && (
                    <span style={{ marginLeft: 4, color: W.green, fontWeight: 600 }}> (under Gmail limit)</span>
                  )}
                </div>
              </div>
              <div className="rv-email-actions" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {exportStatus && (
                  <span style={{
                    fontSize: 12, fontWeight: 500, padding: '6px 12px', borderRadius: 100,
                    color: '#047857', background: '#ECFDF5',
                  }}>{exportStatus}</span>
                )}
                <button
                  onClick={handleCopyEmailHTML}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '8px 16px', fontSize: 13, fontWeight: 600,
                    color: '#fff', background: W.accent, border: 'none',
                    borderRadius: 8, cursor: 'pointer', transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  Copy HTML
                </button>
                <button
                  onClick={handleDownloadEmailHTML}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', fontSize: 13, fontWeight: 600,
                    color: W.textMid, background: W.bg, border: `1px solid ${W.border}`,
                    borderRadius: 8, cursor: 'pointer', transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = W.bgAlt)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = W.bg)}
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </button>
                <button onClick={() => setEmailPreviewHTML(null)}
                  style={{
                    width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: 'none', background: 'transparent', cursor: 'pointer', color: W.textMuted,
                    borderRadius: 8, transition: 'color 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = W.text)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = W.textMuted)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 20, background: '#E5E5E5' }}>
              <div style={{ maxWidth: 620, margin: '0 auto' }}>
                <iframe srcDoc={emailPreviewHTML}
                  style={{ width: '100%', minHeight: 600, border: `1px solid ${W.border}`, borderRadius: 6, background: '#FFFFFF', display: 'block' }}
                  sandbox="allow-same-origin" title="Email preview" />
              </div>
            </div>
            <div style={{
              padding: '10px 20px', borderTop: `1px solid ${W.border}`, background: W.bgAlt,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: W.textMuted,
            }}>
              <span>600px email container · Responsive mobile layout</span>
              <span>Optimized for Gmail, Outlook, Apple Mail</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <div className="rv-footer" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
        padding: 16, borderTop: `1px solid ${W.border}`, background: W.bgWarm,
      }}>
        <Link href={`/dashboard/reports/${reportId}/generate`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px',
            fontSize: 13, fontWeight: 600, color: '#fff', background: W.accent,
            borderRadius: 10, textDecoration: 'none', boxShadow: `0 2px 12px ${W.accent}30`, transition: 'all 0.25s',
          }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
          </svg>
          Regenerate Entire Report
        </Link>
        <button onClick={() => window.history.back()}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px',
            fontSize: 13, fontWeight: 600, color: '#fff', background: W.green,
            border: 'none', borderRadius: 10, cursor: 'pointer', textDecoration: 'none', transition: 'all 0.2s',
          }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Done
        </button>
      </div>
    </div>
  )
}
