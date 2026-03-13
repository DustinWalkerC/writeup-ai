// lib/chart-template-filler.ts

/**
 * PHASE 5 — Chart Template Filler (Option 2)
 *
 * Takes structured chart_data JSON from Claude and produces the EXACT same
 * HTML that Claude previously generated using the standard.ts templates.
 *
 * This is NOT a new renderer — it's a deterministic template filler that
 * replicates the existing chart HTML from standard.ts, but with validated
 * data instead of relying on Claude to fill templates correctly.
 *
 * BENEFITS:
 * - Claude outputs ~100-150 tokens of JSON instead of ~1,200+ tokens of HTML
 * - No more undefined labels, $NaN, or malformed bar widths
 * - Charts look identical to current output
 * - Template changes apply to all future reports automatically
 *
 * CHART TYPES (matching SECTION_CHART_MAP in generation-config.ts):
 *   report_header         → fillReportHeader()
 *   budget_variance_table → fillBudgetVarianceTable()
 *   revenue_waterfall     → fillRevenueWaterfall()
 *   expense_horizontal_bars → fillExpenseHorizontalBars()
 *   occupancy_gauge       → fillOccupancyGauge()
 *   noi_trend_bars        → fillNoiTrendBars()
 *   rent_roll_table       → fillRentRollTable()
 *   risk_cards            → fillRiskCards()
 *   move_in_out_bars      → fillMoveInOutBars()
 *   comparison_table      → fillComparisonTable()
 */

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
  green: string;
  red: string;
  amber: string;
}

const DEFAULT_COLORS: BrandColors = {
  primary: '#27272A',
  secondary: '#EFF6FF',
  accent: '#2563EB',
  green: '#059669',
  red: '#DC2626',
  amber: '#D97706',
};

// ── Chart data types (one per chart type) ──

export interface ReportHeaderData {
  chart_type: 'report_header';
  data: {
    property_name: string;
    units: number | null;
    period: string;
    location: string | null;
    asset_class: string | null;
    company_name: string | null;
    logo_url: string | null;
    kpis: Array<{
      label: string;
      value: string;
      change: string;
      favorable: boolean;
    }>;
  };
}

export interface BudgetVarianceTableData {
  chart_type: 'budget_variance_table';
  title: string;
  subtitle?: string;
  data: {
    rows: Array<{
      category: string;
      actual: number;
      budget: number;
      is_expense: boolean;
    }>;
    totals: {
      label: string;
      actual: number;
      budget: number;
      is_expense: boolean;
    };
  };
}

export interface RevenueWaterfallData {
  chart_type: 'revenue_waterfall';
  title: string;
  subtitle?: string;
  data: {
    bars: Array<{
      label: string;
      value: number;
      type: 'total' | 'deduction' | 'addition' | 'result';
    }>;
  };
}

export interface ExpenseHorizontalBarsData {
  chart_type: 'expense_horizontal_bars';
  title: string;
  subtitle?: string;
  data: {
    categories: Array<{
      label: string;
      actual: number;
      budget: number | null;
    }>;
  };
}

export interface OccupancyGaugeData {
  chart_type: 'occupancy_gauge';
  data: {
    physical: { value: number; change_bps: number | null };
    economic: { value: number; change_bps: number | null } | null;
  };
}

export interface NoiTrendBarsData {
  chart_type: 'noi_trend_bars';
  title: string;
  data: {
    months: Array<{
      label: string;
      noi: number;
      beat_budget: boolean | null;
    }>;
  };
}

export interface RentRollTableData {
  chart_type: 'rent_roll_table';
  title: string;
  subtitle?: string;
  data: {
    rows: Array<{
      floorplan: string;
      units: number;
      avg_rent: number | null;
      avg_sqft: number | null;
      rent_per_sqft: number | null;
      occupancy_pct: number | null;
    }>;
    totals: {
      units: number;
      avg_rent: number | null;
      avg_sqft: number | null;
      rent_per_sqft: number | null;
      occupancy_pct: number | null;
    };
  };
}

export interface RiskCardsData {
  chart_type: 'risk_cards';
  data: {
    items: Array<{
      title: string;
      severity: 'high' | 'medium' | 'low';
      description: string;
    }>;
  };
}

export interface MoveInOutBarsData {
  chart_type: 'move_in_out_bars';
  title: string;
  data: {
    move_ins: number;
    move_outs: number;
    renewals: number | null;
    notices_to_vacate: number | null;
    avg_new_lease: number | null;
    avg_renewal: number | null;
  };
}

export interface ComparisonTableData {
  chart_type: 'comparison_table';
  title: string;
  subtitle?: string;
  data: {
    headers: string[];
    rows: Array<{
      values: (string | number)[];
      is_total?: boolean;
      highlight?: boolean;
    }>;
  };
}

export type ChartTemplateData =
  | ReportHeaderData
  | BudgetVarianceTableData
  | RevenueWaterfallData
  | ExpenseHorizontalBarsData
  | OccupancyGaugeData
  | NoiTrendBarsData
  | RentRollTableData
  | RiskCardsData
  | MoveInOutBarsData
  | ComparisonTableData;

// ═══════════════════════════════════════════════════════════
// MAIN DISPATCHER
// ═══════════════════════════════════════════════════════════

/**
 * Takes chart_data JSON from Claude's output and fills the corresponding
 * standard.ts template with the data, producing identical HTML.
 *
 * Returns empty string if chart_data is null/undefined or invalid.
 */
export function fillChartTemplate(
  chartData: ChartTemplateData | null | undefined,
  colors?: Partial<BrandColors>
): string {
  if (!chartData || !chartData.chart_type) return '';

  const c: BrandColors = { ...DEFAULT_COLORS, ...colors };

  try {
    switch (chartData.chart_type) {
      case 'report_header':
        return fillReportHeader(chartData as ReportHeaderData, c);
      case 'budget_variance_table':
        return fillBudgetVarianceTable(chartData as BudgetVarianceTableData, c);
      case 'revenue_waterfall':
        return fillRevenueWaterfall(chartData as RevenueWaterfallData, c);
      case 'expense_horizontal_bars':
        return fillExpenseHorizontalBars(chartData as ExpenseHorizontalBarsData, c);
      case 'occupancy_gauge':
        return fillOccupancyGauge(chartData as OccupancyGaugeData, c);
      case 'noi_trend_bars':
        return fillNoiTrendBars(chartData as NoiTrendBarsData, c);
      case 'rent_roll_table':
        return fillRentRollTable(chartData as RentRollTableData, c);
      case 'risk_cards':
        return fillRiskCards(chartData as RiskCardsData, c);
      case 'move_in_out_bars':
        return fillMoveInOutBars(chartData as MoveInOutBarsData, c);
      case 'comparison_table':
        return fillComparisonTable(chartData as ComparisonTableData, c);
      default:
        console.warn(`[ChartFiller] Unknown chart_type: ${(chartData as any).chart_type}`);
        return '';
    }
  } catch (err) {
    console.error(`[ChartFiller] Error filling ${chartData.chart_type}:`, err);
    return '';
  }
}

// ═══════════════════════════════════════════════════════════
// FORMATTING HELPERS
// ═══════════════════════════════════════════════════════════

function fmtDollar(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '$0';
  const abs = Math.abs(n);
  if (abs >= 1000) {
    return `${n < 0 ? '(' : ''}$${abs.toLocaleString('en-US')}${n < 0 ? ')' : ''}`;
  }
  return `${n < 0 ? '(' : ''}$${abs}${n < 0 ? ')' : ''}`;
}

function fmtDollarK(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '$0K';
  const abs = Math.abs(n);
  const k = Math.round(abs / 1000);
  if (n < 0) return `–$${k}K`;
  return `$${k}K`;
}

function fmtPct(n: number | null | undefined, showSign = false): string {
  if (n == null || isNaN(n)) return '0.0%';
  const sign = showSign && n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

function fmtVarianceDollar(actual: number, budget: number, isExpense: boolean): { text: string; favorable: boolean } {
  if (budget == null || isNaN(budget) || actual == null || isNaN(actual)) return { text: '—', favorable: true };
  const diff = isExpense ? budget - actual : actual - budget;
  const favorable = diff >= 0;
  const text = favorable ? fmtDollar(Math.abs(diff)) : `(${fmtDollar(Math.abs(diff)).replace(/[()]/g, '')})`;
  return { text: favorable ? text : `(${fmtDollar(Math.abs(diff)).replace(/[()]/g, '')})`, favorable };
}

function fmtVariancePct(actual: number, budget: number, isExpense: boolean): { text: string; favorable: boolean } {
  if (budget == null || isNaN(budget) || budget === 0 || actual == null || isNaN(actual)) return { text: 'N/A', favorable: true };
  const diff = isExpense ? budget - actual : actual - budget;
  const pct = (diff / budget) * 100;
  if (!isFinite(pct)) return { text: 'N/A', favorable: true };
  const favorable = pct >= 0;
  return { text: `${favorable ? '+' : ''}${pct.toFixed(1)}%`, favorable };
}

function escHtml(str: string | number | null | undefined): string {
  if (str == null) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ═══════════════════════════════════════════════════════════
// 1. REPORT HEADER — JLL/CBRE Institutional Style
// (Matches REPORT_HEADER_EXAMPLE in standard.ts)
// ═══════════════════════════════════════════════════════════

function fillReportHeader(chart: ReportHeaderData, c: BrandColors): string {
  const d = chart.data;
  if (!d) return '';

  const propertyLine = `${escHtml(d.property_name)}${d.units ? ` · ${d.units} Units` : ''}`;
  const locationLine = [d.location, d.asset_class].filter(Boolean).join(' · ');
  const headerLabel = d.company_name || 'Asset Performance Report';

  const logoHtml = d.logo_url
    ? `<img src="${escHtml(d.logo_url)}" alt="" style="max-height:28px;filter:brightness(10);margin-right:8px;" />`
    : '';

  const kpis = Array.isArray(d.kpis) ? d.kpis.slice(0, 5) : [];

  const kpiCells = kpis.map((kpi, i) => {
    const changeColor = kpi.favorable ? c.green : c.red;
    const borderRight = i < kpis.length - 1 ? `border-right:1px solid #E8E8E8;` : '';
    return `<div style="padding:14px 16px;${borderRight}">
      <div style="font-size:9px;color:#999;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:5px;">${escHtml(kpi.label)}</div>
      <div style="font-size:20px;font-weight:700;color:${c.primary};font-variant-numeric:tabular-nums;">${escHtml(kpi.value)}</div>
      <div style="font-size:11px;font-weight:600;color:${changeColor};margin-top:3px;">${escHtml(kpi.change)}</div>
    </div>`;
  }).join('\n    ');

  return `<div style="max-width:100%;margin:0 auto;padding:0 0 24px 0;">
  <div style="background:${c.primary};padding:20px 28px;border-radius:8px 8px 0 0;display:flex;justify-content:space-between;align-items:center;">
    <div>
      ${logoHtml}<div style="font-size:10px;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:2px;font-weight:600;">${escHtml(headerLabel)}</div>
      <div style="font-size:22px;font-weight:700;color:#FFFFFF;margin-top:4px;">${escHtml(propertyLine)}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:20px;font-weight:700;color:#FFFFFF;">${escHtml(d.period)}</div>
      ${locationLine ? `<div style="font-size:11px;color:rgba(255,255,255,0.4);">${escHtml(locationLine)}</div>` : ''}
    </div>
  </div>
  <div style="height:3px;background:${c.accent};"></div>
  <div style="display:grid;grid-template-columns:repeat(${kpis.length},1fr);background:#FFFFFF;border:1px solid #E8E8E8;border-top:none;border-radius:0 0 8px 8px;">
    ${kpiCells}
  </div>
</div>`;
}

// ═══════════════════════════════════════════════════════════
// 2. BUDGET VARIANCE TABLE — JLL/CBRE Style
// (Matches BUDGET_VARIANCE_TABLE_EXAMPLE in standard.ts)
// ═══════════════════════════════════════════════════════════

function fillBudgetVarianceTable(chart: BudgetVarianceTableData, c: BrandColors): string {
  const d = chart.data;
  if (!d || !Array.isArray(d.rows) || d.rows.length === 0) return '';

  const title = chart.title || 'Budget vs. Actual';
  const subtitle = chart.subtitle || '';

  // Find max variance pct for bar scaling
  const variancePcts = d.rows.map(r => {
    if (r.budget === 0) return 0;
    return Math.abs(((r.budget - r.actual) / r.budget) * 100);
  });
  const maxVariancePct = Math.max(...variancePcts, 1);

  const dataRows = d.rows.map(row => {
    const varDollar = fmtVarianceDollar(row.actual, row.budget, row.is_expense);
    const varPct = fmtVariancePct(row.actual, row.budget, row.is_expense);
    const barColor = varPct.favorable ? c.green : c.red;
    const barWidth = row.budget === 0 ? 0 : Math.round((Math.abs((row.budget - row.actual) / row.budget * 100) / maxVariancePct) * 100);
    const barAlign = varPct.favorable ? '' : 'display:flex;justify-content:flex-end;';

    return `<tr style="border-bottom:1px solid #F0F0F0;">
        <td style="padding:9px 8px;font-size:12px;color:#333;font-weight:500;">${escHtml(row.category)}</td>
        <td style="padding:9px 8px;text-align:right;font-size:12px;font-weight:600;color:${c.primary};">${fmtDollar(row.actual)}</td>
        <td style="padding:9px 8px;text-align:right;font-size:12px;color:#999;">${fmtDollar(row.budget)}</td>
        <td style="padding:9px 8px;text-align:right;font-size:12px;font-weight:600;color:${barColor};">${varDollar.text}</td>
        <td style="padding:9px 8px;text-align:right;font-size:11px;color:${barColor};">${varPct.text}</td>
        <td style="padding:9px 8px;width:70px;">
          <div style="${barAlign}">
            <div style="height:7px;width:${Math.max(barWidth, 4)}%;border-radius:2px;background:${barColor};opacity:0.65;"></div>
          </div>
        </td>
      </tr>`;
  }).join('\n      ');

  // Totals row
  let totalsRow = '';
  if (d.totals) {
    const t = d.totals;
    const tVarDollar = fmtVarianceDollar(t.actual, t.budget, t.is_expense);
    const tVarPct = fmtVariancePct(t.actual, t.budget, t.is_expense);
    const tColor = tVarPct.favorable ? c.green : c.red;

    totalsRow = `<tr style="border-top:2px solid ${c.primary};background:#F7F7F7;">
        <td style="padding:9px 8px;font-size:12px;font-weight:700;color:${c.primary};">${escHtml(t.label)}</td>
        <td style="padding:9px 8px;text-align:right;font-size:12px;font-weight:700;color:${c.primary};">${fmtDollar(t.actual)}</td>
        <td style="padding:9px 8px;text-align:right;font-size:12px;font-weight:600;color:#999;">${fmtDollar(t.budget)}</td>
        <td style="padding:9px 8px;text-align:right;font-size:12px;font-weight:700;color:${tColor};">${tVarDollar.text}</td>
        <td style="padding:9px 8px;text-align:right;font-size:11px;font-weight:600;color:${tColor};">${tVarPct.text}</td>
        <td></td>
      </tr>`;
  }

  const thStyle = `text-align:right;padding:8px;font-size:9px;font-weight:700;color:${c.primary};text-transform:uppercase;letter-spacing:0.8px;`;

  return `<div style="width:100%;overflow-x:auto;">
  <div style="font-size:14px;font-weight:700;color:${c.primary};margin-bottom:3px;">${escHtml(title)}</div>
  ${subtitle ? `<div style="font-size:11px;color:#999;margin-bottom:14px;">${escHtml(subtitle)}</div>` : '<div style="margin-bottom:14px;"></div>'}
  <table style="width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums;">
    <thead>
      <tr style="border-bottom:2px solid ${c.primary};">
        <th style="text-align:left;padding:8px;font-size:9px;font-weight:700;color:${c.primary};text-transform:uppercase;letter-spacing:0.8px;">Category</th>
        <th style="${thStyle}">Actual</th>
        <th style="${thStyle}">Budget</th>
        <th style="${thStyle}">Var ($)</th>
        <th style="${thStyle}">Var (%)</th>
        <th style="padding:8px;width:70px;"></th>
      </tr>
    </thead>
    <tbody>
      ${dataRows}
      ${totalsRow}
    </tbody>
  </table>
</div>`;
}

// ═══════════════════════════════════════════════════════════
// 3. REVENUE WATERFALL — McKinsey Style
// (Matches REVENUE_WATERFALL_EXAMPLE in standard.ts)
// ═══════════════════════════════════════════════════════════

function fillRevenueWaterfall(chart: RevenueWaterfallData, c: BrandColors): string {
  const d = chart.data;
  if (!d || !Array.isArray(d.bars) || d.bars.length === 0) return '';

  const title = chart.title || 'P&L Waterfall';
  const subtitle = chart.subtitle || '';

  // Calculate bar positions
  const maxValue = Math.max(...d.bars.map(b => Math.abs(b.value)));
  const maxHeight = 200; // px
  let cumulativeBase = 0;
  const startValue = d.bars[0]?.value || 0;

  const barDivs = d.bars.map((bar) => {
    const absValue = Math.abs(bar.value);
    const barHeight = Math.max(Math.round((absValue / maxValue) * maxHeight), 4);
    let bottom = 32;
    let barColor = c.primary;
    const labelText = fmtDollarK(bar.value);

    if (bar.type === 'total' || bar.type === 'result') {
      // Full bar from bottom
      bottom = 32;
      barColor = bar.type === 'result' ? c.green : c.primary;
      cumulativeBase = absValue;
    } else if (bar.type === 'deduction') {
      // Floating bar showing decrease
      cumulativeBase -= absValue;
      bottom = 32 + Math.round((cumulativeBase / maxValue) * maxHeight);
      barColor = c.red;
    } else if (bar.type === 'addition') {
      bottom = 32 + Math.round((cumulativeBase / maxValue) * maxHeight);
      cumulativeBase += absValue;
      barColor = c.green;
    }

    const labelBottom = bottom + barHeight + 4;

    return `<div style="flex:1;position:relative;height:100%;">
      <div style="position:absolute;bottom:${bottom}px;width:80%;left:10%;height:${barHeight}px;background:${barColor};border-radius:2px;opacity:0.8;"></div>
      <div style="position:absolute;bottom:8px;width:100%;text-align:center;font-size:8px;color:#888;">${escHtml(bar.label)}</div>
      <div style="position:absolute;bottom:${labelBottom}px;width:100%;text-align:center;font-size:9px;font-weight:600;color:${barColor};">${escHtml(labelText)}</div>
    </div>`;
  }).join('\n    ');

  return `<div style="width:100%;">
  <div style="font-size:14px;font-weight:700;color:${c.primary};margin-bottom:3px;">${escHtml(title)}</div>
  ${subtitle ? `<div style="font-size:11px;color:#999;margin-bottom:20px;">${escHtml(subtitle)}</div>` : '<div style="margin-bottom:20px;"></div>'}
  <div style="display:flex;align-items:flex-end;gap:4px;height:240px;padding-bottom:32px;position:relative;">
    ${barDivs}
  </div>
</div>`;
}

// ═══════════════════════════════════════════════════════════
// 4. EXPENSE HORIZONTAL BARS
// (Matches EXPENSE_BARS_EXAMPLE in standard.ts)
// ═══════════════════════════════════════════════════════════

function fillExpenseHorizontalBars(chart: ExpenseHorizontalBarsData, c: BrandColors): string {
  const d = chart.data;
  if (!d || !Array.isArray(d.categories) || d.categories.length === 0) return '';

  const title = chart.title || 'Expense Breakdown by Category';
  const subtitle = chart.subtitle || '';

  // Sort largest first
  const sorted = [...d.categories].sort((a, b) => b.actual - a.actual);
  const maxValue = Math.max(...sorted.map(cat => Math.max(cat.actual, cat.budget || 0)));

  const rows = sorted.map(cat => {
    const barWidth = maxValue > 0 ? Math.round((cat.actual / maxValue) * 100) : 0;
    const budgetPos = cat.budget != null && maxValue > 0 ? Math.round((cat.budget / maxValue) * 100) : null;

    let varianceText = '';
    let varianceColor = c.green;
    if (cat.budget != null && cat.budget > 0) {
      const pct = ((cat.budget - cat.actual) / cat.budget) * 100;
      varianceColor = pct >= 0 ? c.green : c.red;
      varianceText = `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
    }

    const budgetMarker = budgetPos != null
      ? `<div style="position:absolute;top:0;bottom:0;left:${budgetPos}%;width:2px;background:${c.accent};opacity:0.5;" title="Budget"></div>`
      : '';

    return `<div style="display:grid;grid-template-columns:130px 1fr 80px;align-items:center;gap:8px;margin-bottom:10px;">
    <span style="font-size:12px;color:#555;font-weight:500;">${escHtml(cat.label)}</span>
    <div style="position:relative;height:22px;background:#F3F4F6;border-radius:4px;overflow:hidden;">
      <div style="height:100%;width:${barWidth}%;background:${c.primary};border-radius:4px;opacity:0.75;"></div>
      ${budgetMarker}
    </div>
    <div style="text-align:right;">
      <div style="font-size:12px;font-weight:600;color:${c.primary};font-variant-numeric:tabular-nums;">${fmtDollar(cat.actual)}</div>
      ${varianceText ? `<div style="font-size:10px;color:${varianceColor};font-weight:500;">${varianceText}</div>` : ''}
    </div>
  </div>`;
  }).join('\n  ');

  return `<div style="width:100%;">
  <div style="font-size:14px;font-weight:700;color:${c.primary};margin-bottom:3px;">${escHtml(title)}</div>
  ${subtitle ? `<div style="font-size:11px;color:#999;margin-bottom:16px;">${escHtml(subtitle)}</div>` : '<div style="margin-bottom:16px;"></div>'}
  ${rows}
  <div style="display:flex;gap:16px;margin-top:12px;font-size:10px;color:#999;">
    <span style="display:flex;align-items:center;gap:4px;"><span style="width:12px;height:7px;background:${c.primary};border-radius:2px;opacity:0.75;"></span> Actual</span>
    <span style="display:flex;align-items:center;gap:4px;"><span style="width:12px;height:2px;background:${c.accent};opacity:0.5;"></span> Budget</span>
  </div>
</div>`;
}

// ═══════════════════════════════════════════════════════════
// 5. OCCUPANCY GAUGE — SVG Arc
// (Matches OCCUPANCY_GAUGE_EXAMPLE in standard.ts)
// ═══════════════════════════════════════════════════════════

function fillOccupancyGauge(chart: OccupancyGaugeData, c: BrandColors): string {
  const d = chart.data;
  if (!d || !d.physical) return '';

  const arcLength = 157;

  function gaugeCard(
    label: string,
    value: number,
    changeBps: number | null,
    strokeColor: string
  ): string {
    const offset = Math.max(0, arcLength * (1 - value / 100));
    const changeText = changeBps != null
      ? `<div style="font-size:11px;color:${changeBps >= 0 ? c.green : c.red};font-weight:600;margin-top:4px;">${changeBps >= 0 ? '+' : ''}${changeBps} bps MoM</div>`
      : '';

    return `<div style="background:#FAFAFA;border-radius:10px;padding:20px;text-align:center;border:1px solid #E8E8E8;">
    <svg width="120" height="70" viewBox="0 0 120 70" style="display:block;margin:0 auto;">
      <path d="M 10 65 A 50 50 0 0 1 110 65" stroke="#E8E8E8" stroke-width="8" fill="none" stroke-linecap="round"/>
      <path d="M 10 65 A 50 50 0 0 1 110 65" stroke="${strokeColor}" stroke-width="8" fill="none" stroke-linecap="round"
            stroke-dasharray="${arcLength}" stroke-dashoffset="${offset.toFixed(1)}"/>
    </svg>
    <div style="font-size:28px;font-weight:700;color:${c.primary};margin-top:8px;">${value.toFixed(1)}%</div>
    <div style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.5px;">${escHtml(label)}</div>
    ${changeText}
  </div>`;
  }

  const physicalCard = gaugeCard('Physical', d.physical.value, d.physical.change_bps, c.primary);

  if (d.economic) {
    const economicCard = gaugeCard('Economic', d.economic.value, d.economic.change_bps, c.accent);
    return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;width:100%;">
  ${physicalCard}
  ${economicCard}
</div>`;
  }

  return `<div style="display:grid;grid-template-columns:1fr;gap:16px;width:100%;max-width:300px;">
  ${physicalCard}
</div>`;
}

// ═══════════════════════════════════════════════════════════
// 6. NOI TREND BARS — JLL Style
// (Matches NOI_TREND_BARS_EXAMPLE in standard.ts)
// ═══════════════════════════════════════════════════════════

function fillNoiTrendBars(chart: NoiTrendBarsData, c: BrandColors): string {
  const d = chart.data;
  if (!d || !Array.isArray(d.months) || d.months.length === 0) return '';

  const title = chart.title || 'NOI — Trailing 6 Months';
  const maxNoi = Math.max(...d.months.map(m => m.noi));
  const maxBarHeight = 140;
  const lastIdx = d.months.length - 1;

  const bars = d.months.map((month, idx) => {
    const barHeight = maxNoi > 0 ? Math.max(Math.round((month.noi / maxNoi) * maxBarHeight), 4) : 4;
    const isLast = idx === lastIdx;
    const opacity = isLast ? '0.85' : '0.35';
    const barColor = month.beat_budget === false ? c.red : c.primary;
    const labelColor = isLast ? c.primary : '#888';
    const monthColor = isLast ? c.primary : '#AAA';
    const monthWeight = isLast ? 'font-weight:600;' : '';
    const labelWeight = isLast ? `color:${c.primary};` : 'color:#888;';

    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;">
      <div style="font-size:9px;font-weight:600;${labelWeight}">${fmtDollarK(month.noi)}</div>
      <div style="width:100%;height:${barHeight}px;background:${barColor};border-radius:3px 3px 0 0;opacity:${opacity};"></div>
      <div style="font-size:8px;color:${monthColor};${monthWeight}">${escHtml(month.label)}</div>
    </div>`;
  }).join('\n    ');

  return `<div style="width:100%;">
  <div style="font-size:14px;font-weight:700;color:${c.primary};margin-bottom:3px;">${escHtml(title)}</div>
  <div style="font-size:11px;color:#999;margin-bottom:16px;">Color: beat budget = primary, missed = red</div>
  <div style="display:flex;align-items:flex-end;gap:6px;height:180px;padding-bottom:28px;border-bottom:1px solid #E8E8E8;">
    ${bars}
  </div>
  <div style="display:flex;gap:12px;margin-top:8px;font-size:10px;color:#888;">
    <span style="display:flex;align-items:center;gap:4px;"><span style="width:10px;height:7px;background:${c.primary};border-radius:2px;opacity:0.5;"></span> Beat budget</span>
    <span style="display:flex;align-items:center;gap:4px;"><span style="width:10px;height:7px;background:${c.red};border-radius:2px;opacity:0.5;"></span> Missed budget</span>
  </div>
</div>`;
}

// ═══════════════════════════════════════════════════════════
// 7. RENT ROLL TABLE
// (Matches RENT_ROLL_TABLE_EXAMPLE in standard.ts)
// ═══════════════════════════════════════════════════════════

function fillRentRollTable(chart: RentRollTableData, c: BrandColors): string {
  const d = chart.data;
  if (!d || !Array.isArray(d.rows) || d.rows.length === 0) return '';

  const title = chart.title || 'Unit Mix Summary';
  const subtitle = chart.subtitle || 'By floorplan';

  const thStyle = `text-align:right;padding:8px;font-size:9px;font-weight:700;color:${c.primary};text-transform:uppercase;letter-spacing:0.8px;`;

  function occColor(pct: number | null): string {
    if (pct == null) return '#999';
    if (pct >= 95) return c.green;
    if (pct >= 90) return c.primary;
    return c.red;
  }

  const dataRows = d.rows.map(row => {
    return `<tr style="border-bottom:1px solid #F0F0F0;">
        <td style="padding:9px 8px;font-size:12px;color:#333;font-weight:500;">${escHtml(row.floorplan)}</td>
        <td style="padding:9px 8px;text-align:right;font-size:12px;color:#333;">${row.units}</td>
        <td style="padding:9px 8px;text-align:right;font-size:12px;font-weight:600;color:${c.primary};">${row.avg_rent != null ? fmtDollar(row.avg_rent) : '—'}</td>
        <td style="padding:9px 8px;text-align:right;font-size:12px;color:#999;">${row.avg_sqft != null ? row.avg_sqft.toLocaleString('en-US') : '—'}</td>
        <td style="padding:9px 8px;text-align:right;font-size:12px;color:#999;">${row.rent_per_sqft != null ? `$${row.rent_per_sqft.toFixed(2)}` : '—'}</td>
        <td style="padding:9px 8px;text-align:right;font-size:12px;font-weight:600;color:${occColor(row.occupancy_pct)};">${row.occupancy_pct != null ? `${row.occupancy_pct.toFixed(1)}%` : '—'}</td>
      </tr>`;
  }).join('\n      ');

  let totalsRow = '';
  if (d.totals) {
    const t = d.totals;
    totalsRow = `<tr style="border-top:2px solid ${c.primary};background:#F7F7F7;">
        <td style="padding:9px 8px;font-size:12px;font-weight:700;color:${c.primary};">Total / Avg</td>
        <td style="padding:9px 8px;text-align:right;font-size:12px;font-weight:700;color:${c.primary};">${t.units}</td>
        <td style="padding:9px 8px;text-align:right;font-size:12px;font-weight:700;color:${c.primary};">${t.avg_rent != null ? fmtDollar(t.avg_rent) : '—'}</td>
        <td style="padding:9px 8px;text-align:right;font-size:12px;font-weight:600;color:#999;">${t.avg_sqft != null ? t.avg_sqft.toLocaleString('en-US') : '—'}</td>
        <td style="padding:9px 8px;text-align:right;font-size:12px;font-weight:600;color:#999;">${t.rent_per_sqft != null ? `$${t.rent_per_sqft.toFixed(2)}` : '—'}</td>
        <td style="padding:9px 8px;text-align:right;font-size:12px;font-weight:700;color:${c.primary};">${t.occupancy_pct != null ? `${t.occupancy_pct.toFixed(1)}%` : '—'}</td>
      </tr>`;
  }

  return `<div style="width:100%;overflow-x:auto;">
  <div style="font-size:14px;font-weight:700;color:${c.primary};margin-bottom:3px;">${escHtml(title)}</div>
  <div style="font-size:11px;color:#999;margin-bottom:14px;">${escHtml(subtitle)}</div>
  <table style="width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums;">
    <thead>
      <tr style="border-bottom:2px solid ${c.primary};">
        <th style="text-align:left;padding:8px;font-size:9px;font-weight:700;color:${c.primary};text-transform:uppercase;letter-spacing:0.8px;">Floorplan</th>
        <th style="${thStyle}">Units</th>
        <th style="${thStyle}">Avg Rent</th>
        <th style="${thStyle}">Avg SF</th>
        <th style="${thStyle}">$/SF</th>
        <th style="${thStyle}">Occ %</th>
      </tr>
    </thead>
    <tbody>
      ${dataRows}
      ${totalsRow}
    </tbody>
  </table>
</div>`;
}

// ═══════════════════════════════════════════════════════════
// 8. RISK CARDS
// (Matches RISK_CARDS_EXAMPLE in standard.ts)
// ═══════════════════════════════════════════════════════════

function fillRiskCards(chart: RiskCardsData, c: BrandColors): string {
  const d = chart.data;
  if (!d || !Array.isArray(d.items) || d.items.length === 0) return '';

  const severityConfig: Record<string, { color: string; bg: string; label: string }> = {
    high: { color: c.red, bg: '#FEF2F2', label: 'HIGH' },
    medium: { color: c.amber, bg: '#FFFBEB', label: 'MEDIUM' },
    low: { color: c.green, bg: '#F0FDF4', label: 'LOW' },
  };

  const cards = d.items.map(item => {
    const sev = severityConfig[item.severity] || severityConfig.medium;
    return `<div style="background:#FFF;border:1px solid #E8E8E8;border-left:4px solid ${sev.color};border-radius:8px;padding:14px 16px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <span style="font-size:13px;font-weight:700;color:#1E293B;">${escHtml(item.title)}</span>
      <span style="font-size:10px;font-weight:700;color:${sev.color};background:${sev.bg};padding:2px 8px;border-radius:4px;text-transform:uppercase;letter-spacing:0.5px;">${sev.label}</span>
    </div>
    <p style="font-size:12px;color:#64748B;line-height:1.5;margin:0;">${escHtml(item.description)}</p>
  </div>`;
  }).join('\n  ');

  return `<div style="display:grid;gap:12px;width:100%;">
  ${cards}
</div>`;
}

// ═══════════════════════════════════════════════════════════
// 9. MOVE IN/OUT BARS
// (Matches MOVE_IN_OUT_BARS_EXAMPLE in standard.ts)
// ═══════════════════════════════════════════════════════════

function fillMoveInOutBars(chart: MoveInOutBarsData, c: BrandColors): string {
  const d = chart.data;
  if (!d) return '';

  const title = chart.title || 'Leasing Activity';
  const netAbsorption = d.move_ins - d.move_outs;
  const netColor = netAbsorption >= 0 ? c.green : c.red;
  const netText = netAbsorption >= 0 ? `+${netAbsorption} units` : `${netAbsorption} units`;

  const cards: Array<{ value: number | null; label: string; color: string }> = [
    { value: d.move_ins, label: 'Move-Ins', color: c.green },
    { value: d.move_outs, label: 'Move-Outs', color: c.red },
  ];
  if (d.renewals != null) cards.push({ value: d.renewals, label: 'Renewals', color: c.primary });
  if (d.notices_to_vacate != null) cards.push({ value: d.notices_to_vacate, label: 'NTV', color: c.amber });

  const gridCols = `repeat(${cards.length},1fr)`;

  const cardDivs = cards.map(card => {
    return `<div style="text-align:center;padding:14px;background:#FAFAFA;border-radius:8px;border:1px solid #E8E8E8;">
      <div style="font-size:24px;font-weight:700;color:${card.color};">${card.value ?? '—'}</div>
      <div style="font-size:10px;color:#999;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">${escHtml(card.label)}</div>
    </div>`;
  }).join('\n    ');

  let footerParts = [`Net absorption: <strong style="color:${netColor};">${netText}</strong>`];
  if (d.avg_new_lease != null) footerParts.push(`Avg new lease: $${d.avg_new_lease.toLocaleString('en-US')}/mo`);
  if (d.avg_renewal != null) footerParts.push(`Avg renewal: $${d.avg_renewal.toLocaleString('en-US')}/mo`);

  return `<div style="width:100%;">
  <div style="font-size:14px;font-weight:700;color:${c.primary};margin-bottom:14px;">${escHtml(title)}</div>
  <div style="display:grid;grid-template-columns:${gridCols};gap:12px;">
    ${cardDivs}
  </div>
  <div style="margin-top:10px;font-size:11px;color:#64748B;">
    ${footerParts.join(' · ')}
  </div>
</div>`;
}

// ═══════════════════════════════════════════════════════════
// 10. COMPARISON TABLE (Institutional tier)
// (Matches COMPARISON_TABLE_EXAMPLE in standard.ts)
// ═══════════════════════════════════════════════════════════

function fillComparisonTable(chart: ComparisonTableData, c: BrandColors): string {
  const d = chart.data;
  if (!d || !Array.isArray(d.headers) || !Array.isArray(d.rows)) return '';

  const title = chart.title || 'Comparison';
  const subtitle = chart.subtitle || '';

  const thStyle = `text-align:right;padding:8px;font-size:9px;font-weight:700;color:${c.primary};text-transform:uppercase;letter-spacing:0.8px;`;

  const headerCells = d.headers.map((h, i) => {
    const align = i === 0 ? 'text-align:left;' : 'text-align:right;';
    return `<th style="${align}padding:8px;font-size:9px;font-weight:700;color:${c.primary};text-transform:uppercase;letter-spacing:0.8px;">${escHtml(h)}</th>`;
  }).join('\n        ');

  const dataRows = d.rows.map(row => {
    const borderStyle = row.is_total
      ? `border-top:2px solid ${c.primary};background:#F7F7F7;`
      : 'border-bottom:1px solid #F0F0F0;';

    const cells = row.values.map((val, i) => {
      if (i === 0) {
        const weight = row.is_total ? 'font-weight:700;' : 'font-weight:500;';
        const color = row.is_total ? `color:${c.primary};` : 'color:#333;';
        return `<td style="padding:9px 8px;font-size:12px;${weight}${color}">${escHtml(val)}</td>`;
      }
      const valStr = String(val);
      const isPositive = valStr.startsWith('+');
      const isNegative = valStr.startsWith('-') || valStr.startsWith('(');
      let color = '#333';
      let weight = '';
      if (isPositive) { color = c.green; weight = 'font-weight:600;'; }
      if (isNegative) { color = c.red; weight = 'font-weight:600;'; }
      if (row.is_total) { color = c.primary; weight = 'font-weight:700;'; }
      if (valStr.startsWith('$') && !isPositive && !isNegative && !row.is_total) { color = c.primary; weight = 'font-weight:600;'; }
      if (!valStr.startsWith('$') && !isPositive && !isNegative && !row.is_total) { color = '#999'; }

      return `<td style="padding:9px 8px;text-align:right;font-size:12px;${weight}color:${color};">${escHtml(val)}</td>`;
    }).join('\n        ');

    return `<tr style="${borderStyle}">
        ${cells}
      </tr>`;
  }).join('\n      ');

  return `<div style="width:100%;overflow-x:auto;">
  <div style="font-size:14px;font-weight:700;color:${c.primary};margin-bottom:3px;">${escHtml(title)}</div>
  ${subtitle ? `<div style="font-size:11px;color:#999;margin-bottom:14px;">${escHtml(subtitle)}</div>` : '<div style="margin-bottom:14px;"></div>'}
  <table style="width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums;">
    <thead>
      <tr style="border-bottom:2px solid ${c.primary};">
        ${headerCells}
      </tr>
    </thead>
    <tbody>
      ${dataRows}
    </tbody>
  </table>
</div>`;
}
