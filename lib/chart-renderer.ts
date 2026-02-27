// lib/chart-renderer.ts

/**
 * Phase 5: Deterministic Chart Renderer
 *
 * Converts structured chart_data (JSON) into HTML strings using templates.
 * Replaces the old approach where Claude generated full HTML for every chart.
 *
 * Token savings: ~85-90% per chart (1500 tokens -> 150 tokens for waterfall)
 *
 * NOTE: This renderer is currently in STANDBY mode. It will be activated
 * once Phase 5 (prompt + generator changes) is complete. Until then,
 * report-viewer.tsx should prefer chart_html over chart_data.
 *
 * Supported chart types:
 *   - waterfall         NOI bridge, variance analysis
 *   - horizontal_bar    Category comparisons, budget vs actual
 *   - vertical_bar      Time series, MoM trends
 *   - comparison_table  Multi-property, portfolio aggregates
 *   - metric_cards      KPI highlights, per-unit metrics
 *
 * Usage:
 *   import { renderChart } from '@/lib/chart-renderer';
 *   const html = renderChart(chartData);
 */

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

export interface WaterfallData {
  chart_type: 'waterfall';
  title?: string;
  data: {
    starting_value: number;
    ending_value: number;
    components: Array<{
      label: string;
      value: number;
      type: 'start' | 'increase' | 'decrease' | 'subtotal' | 'end';
    }>;
  };
}

export interface HorizontalBarData {
  chart_type: 'horizontal_bar';
  title?: string;
  data: {
    categories: Array<{
      label: string;
      actual: number;
      budget?: number;
      variance_pct?: number;
    }>;
    format?: 'currency' | 'percent' | 'number';
  };
}

export interface VerticalBarData {
  chart_type: 'vertical_bar';
  title?: string;
  data: {
    periods: Array<{
      label: string;
      value: number;
      comparison_value?: number;
    }>;
    format?: 'currency' | 'percent' | 'number';
    series_labels?: [string, string];
  };
}

export interface ComparisonTableData {
  chart_type: 'comparison_table';
  title?: string;
  data: {
    headers: string[];
    rows: Array<{
      label: string;
      values: Array<string | number>;
      is_total?: boolean;
      highlight?: boolean;
    }>;
  };
}

export interface MetricCardsData {
  chart_type: 'metric_cards';
  title?: string;
  data: {
    cards: Array<{
      label: string;
      value: string | number;
      change_pct?: number;
      format?: 'currency' | 'percent' | 'number';
      trend?: 'up' | 'down' | 'flat';
    }>;
  };
}

export type ChartData =
  | WaterfallData
  | HorizontalBarData
  | VerticalBarData
  | ComparisonTableData
  | MetricCardsData;

// ═══════════════════════════════════════════════════════════
// Design Tokens
// ═══════════════════════════════════════════════════════════

const C = {
  green: '#008A3E',
  greenBg: '#008A3E12',
  red: '#CC0000',
  redBg: '#CC000010',
  accent: '#00B7DB',
  accentBg: '#00B7DB10',
  text: '#1A1A1A',
  textMid: '#4A4A4A',
  textSoft: '#7A7A7A',
  textMuted: '#A3A3A3',
  bg: '#FFFFFF',
  bgAlt: '#F7F5F1',
  bgWarm: '#FAF9F7',
  border: '#E8E5E0',
  borderL: '#F0EDE8',
  gold: '#B8960F',
};

const FONT_DISPLAY = '"Newsreader", Georgia, serif';
const FONT_BODY = '"DM Sans", system-ui, sans-serif';

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════

function fmt(n: number, format?: string): string {
  if (typeof n !== 'number' || isNaN(n)) return '-';
  if (format === 'percent') return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
  if (format === 'number') return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  // Default: currency
  const abs = Math.abs(n);
  const formatted = abs >= 1000
    ? `$${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}K`
    : `$${abs.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  return n < 0 ? `(${formatted})` : formatted;
}

function fmtFull(n: number): string {
  if (typeof n !== 'number' || isNaN(n)) return '-';
  const abs = Math.abs(n);
  const formatted = `$${abs.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  return n < 0 ? `(${formatted})` : formatted;
}

function varColor(n: number): string {
  if (typeof n !== 'number' || isNaN(n)) return C.textMid;
  if (n > 0) return C.green;
  if (n < 0) return C.red;
  return C.textMid;
}

function chartWrapper(title: string | undefined, inner: string): string {
  const titleHtml = title
    ? `<div style="font-family:${FONT_DISPLAY};font-size:14px;font-weight:600;color:${C.text};margin-bottom:14px;letter-spacing:-0.01em">${title}</div>`
    : '';
  return `<div style="font-family:${FONT_BODY};padding:18px 20px;background:${C.bg};border:1px solid ${C.border};border-radius:12px">${titleHtml}${inner}</div>`;
}

// ═══════════════════════════════════════════════════════════
// Main Renderer
// ═══════════════════════════════════════════════════════════

export function renderChart(chartData: ChartData): string {
  // Top-level null safety — gracefully return empty for any malformed input
  if (!chartData) return '';
  if (typeof chartData !== 'object') return '';
  if (!chartData.chart_type) return '';
  if (!chartData.data || typeof chartData.data !== 'object') return '';

  try {
    switch (chartData.chart_type) {
      case 'waterfall':
        return renderWaterfall(chartData);
      case 'horizontal_bar':
        return renderHorizontalBar(chartData);
      case 'vertical_bar':
        return renderVerticalBar(chartData);
      case 'comparison_table':
        return renderComparisonTable(chartData);
      case 'metric_cards':
        return renderMetricCards(chartData);
      default:
        return '';
    }
  } catch (err) {
    // If any renderer throws, return empty string instead of crashing
    console.error('Chart renderer error:', err);
    return '';
  }
}

// ═══════════════════════════════════════════════════════════
// Waterfall Chart
// ═══════════════════════════════════════════════════════════

function renderWaterfall(chart: WaterfallData): string {
  const { components } = chart.data || {};
  if (!components || !Array.isArray(components) || !components.length) return '';

  const maxVal = Math.max(...components.map(c => Math.abs(c.value || 0)));
  const barMax = 180; // max bar width px

  const rows = components.map(comp => {
    if (!comp || !comp.label) return '';
    const val = comp.value || 0;
    const barW = maxVal > 0 ? Math.max(4, Math.round((Math.abs(val) / maxVal) * barMax)) : 4;
    const isEndpoint = comp.type === 'start' || comp.type === 'end' || comp.type === 'subtotal';
    const barColor = isEndpoint ? C.accent : val >= 0 ? C.green : C.red;
    const valueColor = isEndpoint ? C.accent : val >= 0 ? C.green : C.red;
    const labelWeight = isEndpoint ? '600' : '400';

    return `
      <div style="display:flex;align-items:center;gap:12px;padding:6px 0;border-bottom:1px solid ${C.borderL}">
        <div style="width:140px;flex-shrink:0;font-size:12px;font-weight:${labelWeight};color:${C.text};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${comp.label}</div>
        <div style="flex:1;display:flex;align-items:center">
          <div style="height:22px;width:${barW}px;background:${barColor};border-radius:4px;transition:width 0.3s"></div>
        </div>
        <div style="width:80px;text-align:right;font-size:12px;font-weight:600;color:${valueColor};font-family:${FONT_DISPLAY}">${fmtFull(val)}</div>
      </div>`;
  }).join('');

  return chartWrapper(chart.title, rows);
}

// ═══════════════════════════════════════════════════════════
// Horizontal Bar Chart
// ═══════════════════════════════════════════════════════════

function renderHorizontalBar(chart: HorizontalBarData): string {
  const { categories, format } = chart.data || {};
  if (!categories || !Array.isArray(categories) || !categories.length) return '';

  const maxVal = Math.max(...categories.map(c => Math.max(c.actual || 0, c.budget || 0)));
  const barMax = 160;
  const hasBudget = categories.some(c => c.budget !== undefined);

  // Header
  let header = `<div style="display:flex;align-items:center;padding:0 0 8px;border-bottom:1px solid ${C.border};margin-bottom:6px">`;
  header += `<div style="width:120px;font-size:10px;font-weight:700;color:${C.textMuted};text-transform:uppercase;letter-spacing:0.05em">Category</div>`;
  header += `<div style="flex:1"></div>`;
  header += `<div style="width:70px;text-align:right;font-size:10px;font-weight:700;color:${C.textMuted};text-transform:uppercase;letter-spacing:0.05em">Actual</div>`;
  if (hasBudget) {
    header += `<div style="width:70px;text-align:right;font-size:10px;font-weight:700;color:${C.textMuted};text-transform:uppercase;letter-spacing:0.05em">Budget</div>`;
    header += `<div style="width:60px;text-align:right;font-size:10px;font-weight:700;color:${C.textMuted};text-transform:uppercase;letter-spacing:0.05em">Var %</div>`;
  }
  header += `</div>`;

  const rows = categories.map(cat => {
    if (!cat || !cat.label) return '';
    const actual = cat.actual || 0;
    const barW = maxVal > 0 ? Math.max(4, Math.round((actual / maxVal) * barMax)) : 4;
    const budgetBarW = cat.budget && maxVal > 0 ? Math.max(2, Math.round((cat.budget / maxVal) * barMax)) : 0;
    const varPct = cat.variance_pct;
    const vColor = varPct !== undefined ? varColor(varPct) : C.textMid;

    let row = `<div style="display:flex;align-items:center;gap:0;padding:5px 0;border-bottom:1px solid ${C.borderL}">`;
    row += `<div style="width:120px;flex-shrink:0;font-size:12px;color:${C.text};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${cat.label}</div>`;
    row += `<div style="flex:1;position:relative;height:20px">`;
    if (budgetBarW > 0) {
      row += `<div style="position:absolute;top:4px;left:0;height:12px;width:${budgetBarW}px;background:${C.borderL};border-radius:3px"></div>`;
    }
    row += `<div style="position:absolute;top:2px;left:0;height:16px;width:${barW}px;background:${C.accent};border-radius:4px;opacity:0.85"></div>`;
    row += `</div>`;
    row += `<div style="width:70px;text-align:right;font-size:12px;font-weight:500;color:${C.text}">${fmt(actual, format)}</div>`;
    if (hasBudget) {
      row += `<div style="width:70px;text-align:right;font-size:12px;color:${C.textSoft}">${cat.budget !== undefined ? fmt(cat.budget, format) : '-'}</div>`;
      row += `<div style="width:60px;text-align:right;font-size:12px;font-weight:600;color:${vColor}">${varPct !== undefined ? (varPct >= 0 ? '+' : '') + varPct.toFixed(1) + '%' : '-'}</div>`;
    }
    row += `</div>`;
    return row;
  }).join('');

  return chartWrapper(chart.title, header + rows);
}

// ═══════════════════════════════════════════════════════════
// Vertical Bar Chart
// ═══════════════════════════════════════════════════════════

function renderVerticalBar(chart: VerticalBarData): string {
  const { periods, format, series_labels } = chart.data || {};
  if (!periods || !Array.isArray(periods) || !periods.length) return '';

  const allVals = periods.flatMap(p => [p.value, p.comparison_value].filter((v): v is number => typeof v === 'number' && !isNaN(v)));
  const maxVal = Math.max(...allVals, 1);
  const barMaxH = 120;
  const hasComparison = periods.some(p => p.comparison_value !== undefined);

  // Legend
  let legend = '';
  if (hasComparison && series_labels) {
    legend = `<div style="display:flex;gap:16px;margin-bottom:12px">`;
    legend += `<div style="display:flex;align-items:center;gap:6px"><div style="width:10px;height:10px;border-radius:3px;background:${C.accent}"></div><span style="font-size:11px;color:${C.textSoft}">${series_labels[0]}</span></div>`;
    legend += `<div style="display:flex;align-items:center;gap:6px"><div style="width:10px;height:10px;border-radius:3px;background:${C.borderL}"></div><span style="font-size:11px;color:${C.textSoft}">${series_labels[1]}</span></div>`;
    legend += `</div>`;
  }

  // Bars
  let bars = `<div style="display:flex;align-items:flex-end;gap:${periods.length > 6 ? 6 : 12}px;height:${barMaxH + 30}px;border-bottom:1px solid ${C.border};padding-bottom:8px">`;
  for (const period of periods) {
    if (!period) continue;
    const val = period.value || 0;
    const h = Math.max(4, Math.round((val / maxVal) * barMaxH));
    const compH = (period.comparison_value !== undefined && typeof period.comparison_value === 'number')
      ? Math.max(4, Math.round((period.comparison_value / maxVal) * barMaxH)) : 0;
    const barWidth = hasComparison ? 20 : 32;

    bars += `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">`;
    bars += `<div style="font-size:10px;font-weight:600;color:${C.textMid};margin-bottom:2px">${fmt(val, format)}</div>`;
    bars += `<div style="display:flex;align-items:flex-end;gap:3px">`;
    if (hasComparison && compH > 0) {
      bars += `<div style="width:${barWidth - 4}px;height:${compH}px;background:${C.borderL};border-radius:3px 3px 0 0"></div>`;
    }
    bars += `<div style="width:${barWidth}px;height:${h}px;background:${C.accent};border-radius:4px 4px 0 0"></div>`;
    bars += `</div>`;
    bars += `</div>`;
  }
  bars += `</div>`;

  // X-axis labels
  let labels = `<div style="display:flex;gap:${periods.length > 6 ? 6 : 12}px;margin-top:6px">`;
  for (const period of periods) {
    if (!period) continue;
    labels += `<div style="flex:1;text-align:center;font-size:10px;color:${C.textSoft}">${period.label || ''}</div>`;
  }
  labels += `</div>`;

  return chartWrapper(chart.title, legend + bars + labels);
}

// ═══════════════════════════════════════════════════════════
// Comparison Table
// ═══════════════════════════════════════════════════════════

function renderComparisonTable(chart: ComparisonTableData): string {
  const { headers, rows } = chart.data || {};
  if (!headers || !rows || !Array.isArray(headers) || !Array.isArray(rows) || !headers.length || !rows.length) return '';

  // Header row
  let thead = `<div style="display:flex;padding:8px 12px;background:${C.accent};border-radius:8px 8px 0 0">`;
  for (let i = 0; i < headers.length; i++) {
    const isFirst = i === 0;
    thead += `<div style="flex:${isFirst ? 1.5 : 1};font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:0.04em;text-align:${isFirst ? 'left' : 'right'}">${headers[i] || ''}</div>`;
  }
  thead += `</div>`;

  // Data rows
  const tbody = rows.map((row, rowIdx) => {
    if (!row || !row.label) return '';
    const bg = row.is_total ? C.bgAlt : row.highlight ? C.accentBg : rowIdx % 2 === 0 ? C.bg : C.bgWarm;
    const weight = row.is_total ? '700' : '400';
    const topBorder = row.is_total ? `border-top:2px solid ${C.border};` : '';

    let r = `<div style="display:flex;padding:8px 12px;background:${bg};${topBorder}${rowIdx === rows.length - 1 ? 'border-radius:0 0 8px 8px' : ''}">`;
    // Label
    r += `<div style="flex:1.5;font-size:12px;font-weight:${row.is_total ? '700' : '500'};color:${C.text}">${row.label}</div>`;
    // Values
    const values = row.values || [];
    for (let i = 1; i < headers.length; i++) {
      const val = values[i - 1];
      const isVariance = (headers[i] || '').toLowerCase().includes('var');
      const numVal = typeof val === 'number' ? val : parseFloat(String(val));
      const color = isVariance && !isNaN(numVal) ? varColor(numVal) : C.text;
      r += `<div style="flex:1;text-align:right;font-size:12px;font-weight:${weight};color:${color}">${val !== undefined && val !== null ? val : '-'}</div>`;
    }
    r += `</div>`;
    return r;
  }).join('');

  return chartWrapper(chart.title, `<div style="border:1px solid ${C.border};border-radius:8px;overflow:hidden">${thead}${tbody}</div>`);
}

// ═══════════════════════════════════════════════════════════
// Metric Cards
// ═══════════════════════════════════════════════════════════

function renderMetricCards(chart: MetricCardsData): string {
  const { cards } = chart.data || {};
  if (!cards || !Array.isArray(cards) || !cards.length) return '';

  const cols = cards.length <= 3 ? cards.length : cards.length === 4 ? 4 : 3;

  const cardHtml = cards.map(card => {
    if (!card || !card.label) return '';
    const trendColor = card.trend === 'up' ? C.green : card.trend === 'down' ? C.red : C.textMid;
    const trendIcon = card.trend === 'up' ? '&#x25B2;' : card.trend === 'down' ? '&#x25BC;' : '';
    const changePct = card.change_pct !== undefined && typeof card.change_pct === 'number' && !isNaN(card.change_pct)
      ? `<span style="font-size:11px;font-weight:600;color:${trendColor}">${trendIcon} ${card.change_pct >= 0 ? '+' : ''}${card.change_pct.toFixed(1)}%</span>`
      : '';

    const displayValue = typeof card.value === 'number' ? fmt(card.value, card.format) : (card.value || '-');

    return `
      <div style="padding:14px 16px;background:${C.bgWarm};border:1px solid ${C.borderL};border-radius:10px;text-align:center">
        <div style="font-size:10px;font-weight:600;color:${C.textMuted};text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px">${card.label}</div>
        <div style="font-family:${FONT_DISPLAY};font-size:22px;font-weight:700;color:${C.text};letter-spacing:-0.02em">${displayValue}</div>
        ${changePct ? `<div style="margin-top:4px">${changePct}</div>` : ''}
      </div>`;
  }).join('');

  const grid = `<div style="display:grid;grid-template-columns:repeat(${cols}, 1fr);gap:10px">${cardHtml}</div>`;
  return chartWrapper(chart.title, grid);
}
