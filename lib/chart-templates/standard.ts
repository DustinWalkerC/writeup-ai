// lib/chart-templates/standard.ts

/**
 * CORE — Standard Template Set (JLL/CBRE + McKinsey Hybrid)
 *
 * Each constant is an HTML example injected into the system prompt.
 * Claude uses these as structural references, replacing data values
 * with real extracted data and {{COLOR}} tokens with brand colors.
 *
 * DESIGN LANGUAGE:
 * - Tables: JLL/CBRE institutional (2px primary header, clean rows, variance bars)
 * - Waterfall: McKinsey (absolute bars, parenthetical negatives)
 * - Trend/bars: JLL (color-coded budget performance)
 * - Typography: tabular-nums for all numbers, 9px uppercase headers
 * - Negative values: ($X,XXX) in tables, –$X in narrative
 * - All charts: max-width 100%, inline styles, no JS
 */

// ═══════════════════════════════════════════════════════════
// 1. KPI STRIP — Rendered by the VIEWER, not by Claude.
//    This example is kept for reference only.
//    Claude should NOT generate kpi_strip HTML.
// ═══════════════════════════════════════════════════════════

export const KPI_STRIP_EXAMPLE = `
<!-- KPI metrics are rendered by the viewer component from the "metrics" array.
     Do NOT generate KPI card HTML in chart_html. Just populate the "metrics" array. -->
`;

// ═══════════════════════════════════════════════════════════
// 1b. REPORT HEADER — JLL/CBRE Institutional Style
// ═══════════════════════════════════════════════════════════

export const REPORT_HEADER_EXAMPLE = `
<example_output>
<div style="max-width:816px;margin:0 auto;padding:0 0 24px 0;">
  <div style="background:{{PRIMARY}};padding:20px 28px;border-radius:8px 8px 0 0;display:flex;justify-content:space-between;align-items:center;">
    <div>
      <div style="font-size:10px;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:2px;font-weight:600;">Asset Performance Report</div>
      <div style="font-size:22px;font-weight:700;color:#FFFFFF;margin-top:4px;">Hill at Woodway · 234 Units</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:20px;font-weight:700;color:#FFFFFF;">November 2025</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.4);">San Antonio, TX · Class B Multifamily</div>
    </div>
  </div>
  <div style="height:3px;background:{{ACCENT}};"></div>
  <div style="display:grid;grid-template-columns:repeat(5,1fr);background:#FFFFFF;border:1px solid #E8E8E8;border-top:none;border-radius:0 0 8px 8px;">
    <div style="padding:14px 16px;border-right:1px solid #E8E8E8;">
      <div style="font-size:9px;color:#999;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:5px;">NOI</div>
      <div style="font-size:20px;font-weight:700;color:{{PRIMARY}};font-variant-numeric:tabular-nums;">$113,848</div>
      <div style="font-size:11px;font-weight:600;color:{{GREEN}};margin-top:3px;">+25.8% MoM</div>
    </div>
    <div style="padding:14px 16px;border-right:1px solid #E8E8E8;">
      <div style="font-size:9px;color:#999;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:5px;">Revenue</div>
      <div style="font-size:20px;font-weight:700;color:{{PRIMARY}};font-variant-numeric:tabular-nums;">$277,826</div>
      <div style="font-size:11px;font-weight:600;color:{{RED}};margin-top:3px;">–1.2% MoM</div>
    </div>
    <div style="padding:14px 16px;border-right:1px solid #E8E8E8;">
      <div style="font-size:9px;color:#999;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:5px;">Expenses</div>
      <div style="font-size:20px;font-weight:700;color:{{PRIMARY}};font-variant-numeric:tabular-nums;">$163,978</div>
      <div style="font-size:11px;font-weight:600;color:{{GREEN}};margin-top:3px;">–14.0% MoM</div>
    </div>
    <div style="padding:14px 16px;border-right:1px solid #E8E8E8;">
      <div style="font-size:9px;color:#999;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:5px;">NOI Margin</div>
      <div style="font-size:20px;font-weight:700;color:{{PRIMARY}};font-variant-numeric:tabular-nums;">41.0%</div>
      <div style="font-size:11px;font-weight:600;color:{{GREEN}};margin-top:3px;">+880 bps MoM</div>
    </div>
    <div style="padding:14px 16px;">
      <div style="font-size:9px;color:#999;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:5px;">Occupancy</div>
      <div style="font-size:20px;font-weight:700;color:{{PRIMARY}};font-variant-numeric:tabular-nums;">91.4%</div>
      <div style="font-size:11px;font-weight:600;color:{{RED}};margin-top:3px;">–90 bps MoM</div>
    </div>
  </div>
</div>
</example_output>
Replace property name, units, location, period, and all 5 KPI values with real extracted data.
The 5 KPI slots: NOI, Revenue, Expenses, NOI Margin, and Occupancy (or best available).
Use {{GREEN}} for favorable MoM changes, {{RED}} for unfavorable. Occupancy changes in basis points.
The accent stripe uses {{ACCENT}} — this is the user's chosen accent color from settings.
If company logo URL is provided, add an <img> before "Asset Performance Report" (max-height 28px, filter:brightness(10) for white).
If company name is provided, replace "Asset Performance Report" with the company name on the first line.
`;

// ═══════════════════════════════════════════════════════════
// 2. BUDGET VARIANCE TABLE — JLL/CBRE Style
// ═══════════════════════════════════════════════════════════

export const BUDGET_VARIANCE_TABLE_EXAMPLE = `
<example_output>
<div style="width:100%;overflow-x:auto;">
  <div style="font-size:14px;font-weight:700;color:{{PRIMARY}};margin-bottom:3px;">Budget vs. Actual — Operating Expenses</div>
  <div style="font-size:11px;color:#999;margin-bottom:14px;">November 2025 · Favorable variance in green</div>
  <table style="width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums;">
    <thead>
      <tr style="border-bottom:2px solid {{PRIMARY}};">
        <th style="text-align:left;padding:8px;font-size:9px;font-weight:700;color:{{PRIMARY}};text-transform:uppercase;letter-spacing:0.8px;">Category</th>
        <th style="text-align:right;padding:8px;font-size:9px;font-weight:700;color:{{PRIMARY}};text-transform:uppercase;letter-spacing:0.8px;">Actual</th>
        <th style="text-align:right;padding:8px;font-size:9px;font-weight:700;color:{{PRIMARY}};text-transform:uppercase;letter-spacing:0.8px;">Budget</th>
        <th style="text-align:right;padding:8px;font-size:9px;font-weight:700;color:{{PRIMARY}};text-transform:uppercase;letter-spacing:0.8px;">Var ($)</th>
        <th style="text-align:right;padding:8px;font-size:9px;font-weight:700;color:{{PRIMARY}};text-transform:uppercase;letter-spacing:0.8px;">Var (%)</th>
        <th style="padding:8px;width:70px;"></th>
      </tr>
    </thead>
    <tbody>
      <!-- Repeat this row for each category. Color var columns: green if favorable, red if unfavorable. -->
      <!-- For expense tables: under-budget = favorable (green), over-budget = unfavorable (red) -->
      <!-- For revenue tables: over-budget = favorable (green), under-budget = unfavorable (red) -->
      <tr style="border-bottom:1px solid #F0F0F0;">
        <td style="padding:9px 8px;font-size:12px;color:#333;font-weight:500;">Property Taxes</td>
        <td style="padding:9px 8px;text-align:right;font-size:12px;font-weight:600;color:{{PRIMARY}};">$46,244</td>
        <td style="padding:9px 8px;text-align:right;font-size:12px;color:#999;">$62,892</td>
        <td style="padding:9px 8px;text-align:right;font-size:12px;font-weight:600;color:{{GREEN}};">$16,648</td>
        <td style="padding:9px 8px;text-align:right;font-size:11px;color:{{GREEN}};">+26.5%</td>
        <td style="padding:9px 8px;width:70px;">
          <div style="height:7px;width:92%;border-radius:2px;background:{{GREEN}};opacity:0.65;"></div>
        </td>
      </tr>
      <tr style="border-bottom:1px solid #F0F0F0;">
        <td style="padding:9px 8px;font-size:12px;color:#333;font-weight:500;">Utilities</td>
        <td style="padding:9px 8px;text-align:right;font-size:12px;font-weight:600;color:{{PRIMARY}};">$13,216</td>
        <td style="padding:9px 8px;text-align:right;font-size:12px;color:#999;">$11,500</td>
        <td style="padding:9px 8px;text-align:right;font-size:12px;font-weight:600;color:{{RED}};">($1,716)</td>
        <td style="padding:9px 8px;text-align:right;font-size:11px;color:{{RED}};">-14.9%</td>
        <td style="padding:9px 8px;width:70px;">
          <div style="display:flex;justify-content:flex-end;">
            <div style="height:7px;width:38%;border-radius:2px;background:{{RED}};opacity:0.65;"></div>
          </div>
        </td>
      </tr>
      <!-- TOTALS ROW -->
      <tr style="border-top:2px solid {{PRIMARY}};background:#F7F7F7;">
        <td style="padding:9px 8px;font-size:12px;font-weight:700;color:{{PRIMARY}};">Total OpEx</td>
        <td style="padding:9px 8px;text-align:right;font-size:12px;font-weight:700;color:{{PRIMARY}};">$163,978</td>
        <td style="padding:9px 8px;text-align:right;font-size:12px;font-weight:600;color:#999;">$171,492</td>
        <td style="padding:9px 8px;text-align:right;font-size:12px;font-weight:700;color:{{GREEN}};">$7,514</td>
        <td style="padding:9px 8px;text-align:right;font-size:11px;font-weight:600;color:{{GREEN}};">+4.4%</td>
        <td></td>
      </tr>
    </tbody>
  </table>
</div>
</example_output>
Generate one row per category from extracted data. Scale variance bar widths proportionally (max bar = 100% of cell width).
Favorable variance bars align left. Unfavorable variance bars align right.
Negative dollar values use parenthetical notation: ($1,716) not -$1,716.`;

// ═══════════════════════════════════════════════════════════
// 3. REVENUE WATERFALL — McKinsey Style
// ═══════════════════════════════════════════════════════════

export const REVENUE_WATERFALL_EXAMPLE = `
<example_output>
<div style="width:100%;">
  <div style="font-size:14px;font-weight:700;color:{{PRIMARY}};margin-bottom:3px;">P&L Waterfall — Revenue to NOI</div>
  <div style="font-size:11px;color:#999;margin-bottom:20px;">November 2025</div>
  <div style="display:flex;align-items:flex-end;gap:4px;height:240px;padding-bottom:32px;position:relative;">
    <!-- Each bar is a flex child. Height and bottom position are calculated from data.
         TOTALS (Revenue, NOI): base=0, full height from bottom.
         DEDUCTIONS: positioned floating, showing the amount subtracted.
         Calculate: barHeight = (value / maxValue) * 200px, bottom = 32 + (base / maxValue) * 200px -->
    <div style="flex:1;position:relative;height:100%;">
      <div style="position:absolute;bottom:32px;width:80%;left:10%;height:192px;background:{{PRIMARY}};border-radius:2px;opacity:0.8;"></div>
      <div style="position:absolute;bottom:8px;width:100%;text-align:center;font-size:8px;color:#888;">Revenue</div>
      <div style="position:absolute;bottom:228px;width:100%;text-align:center;font-size:9px;font-weight:600;color:{{PRIMARY}};">$278K</div>
    </div>
    <div style="flex:1;position:relative;height:100%;">
      <div style="position:absolute;bottom:160px;width:80%;left:10%;height:32px;background:{{RED}};border-radius:2px;opacity:0.8;"></div>
      <div style="position:absolute;bottom:8px;width:100%;text-align:center;font-size:8px;color:#888;">Taxes</div>
      <div style="position:absolute;bottom:196px;width:100%;text-align:center;font-size:9px;font-weight:600;color:{{RED}};">–$46K</div>
    </div>
    <!-- Continue for each expense category... -->
    <div style="flex:1;position:relative;height:100%;">
      <div style="position:absolute;bottom:32px;width:80%;left:10%;height:128px;background:{{GREEN}};border-radius:2px;opacity:0.8;"></div>
      <div style="position:absolute;bottom:8px;width:100%;text-align:center;font-size:8px;color:#888;">NOI</div>
      <div style="position:absolute;bottom:164px;width:100%;text-align:center;font-size:9px;font-weight:600;color:{{GREEN}};">$114K</div>
    </div>
  </div>
</div>
</example_output>
Calculate bar positions mathematically: barHeight = (value / maxRevenue) * 200. Base offset = (cumulativeBase / maxRevenue) * 200 + 32.
Use {{PRIMARY}} for total bars, {{RED}} for deductions, {{GREEN}} for NOI/additions. Labels use abbreviated $NNK format.`;

// ═══════════════════════════════════════════════════════════
// 4. EXPENSE HORIZONTAL BARS
// ═══════════════════════════════════════════════════════════

export const EXPENSE_BARS_EXAMPLE = `
<example_output>
<div style="width:100%;">
  <div style="font-size:14px;font-weight:700;color:{{PRIMARY}};margin-bottom:3px;">Expense Breakdown by Category</div>
  <div style="font-size:11px;color:#999;margin-bottom:16px;">Actual vs. Budget · November 2025</div>
  <!-- Repeat this row for each expense category, sorted largest to smallest -->
  <div style="display:grid;grid-template-columns:130px 1fr 80px;align-items:center;gap:8px;margin-bottom:10px;">
    <span style="font-size:12px;color:#555;font-weight:500;">Property Taxes</span>
    <div style="position:relative;height:22px;background:#F3F4F6;border-radius:4px;overflow:hidden;">
      <div style="height:100%;width:73%;background:{{PRIMARY}};border-radius:4px;opacity:0.75;"></div>
      <div style="position:absolute;top:0;bottom:0;left:100%;width:2px;background:{{ACCENT}};opacity:0.5;" title="Budget"></div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:12px;font-weight:600;color:{{PRIMARY}};font-variant-numeric:tabular-nums;">$46,244</div>
      <div style="font-size:10px;color:{{GREEN}};font-weight:500;">+26.5%</div>
    </div>
  </div>
  <!-- Legend -->
  <div style="display:flex;gap:16px;margin-top:12px;font-size:10px;color:#999;">
    <span style="display:flex;align-items:center;gap:4px;"><span style="width:12px;height:7px;background:{{PRIMARY}};border-radius:2px;opacity:0.75;"></span> Actual</span>
    <span style="display:flex;align-items:center;gap:4px;"><span style="width:12px;height:2px;background:{{ACCENT}};opacity:0.5;"></span> Budget</span>
  </div>
</div>
</example_output>
Bar width = (actual / maxCategoryValue) * 100%. Budget marker position = (budget / maxCategoryValue) * 100%.
Variance %: positive = under budget (green), negative = over budget (red).
Sort categories by actual amount, largest first.`;

// ═══════════════════════════════════════════════════════════
// 5. OCCUPANCY GAUGE
// ═══════════════════════════════════════════════════════════

export const OCCUPANCY_GAUGE_EXAMPLE = `
<example_output>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;width:100%;">
  <!-- Physical Occupancy -->
  <div style="background:#FAFAFA;border-radius:10px;padding:20px;text-align:center;border:1px solid #E8E8E8;">
    <svg width="120" height="70" viewBox="0 0 120 70" style="display:block;margin:0 auto;">
      <path d="M 10 65 A 50 50 0 0 1 110 65" stroke="#E8E8E8" stroke-width="8" fill="none" stroke-linecap="round"/>
      <path d="M 10 65 A 50 50 0 0 1 110 65" stroke="{{PRIMARY}}" stroke-width="8" fill="none" stroke-linecap="round"
            stroke-dasharray="157" stroke-dashoffset="13.5"/>
      <!-- stroke-dashoffset = 157 * (1 - occupancy/100). For 91.4%: 157 * 0.086 = 13.5 -->
    </svg>
    <div style="font-size:28px;font-weight:700;color:{{PRIMARY}};margin-top:8px;">91.4%</div>
    <div style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.5px;">Physical</div>
    <div style="font-size:11px;color:{{RED}};font-weight:600;margin-top:4px;">–90 bps MoM</div>
  </div>
  <!-- Economic Occupancy -->
  <div style="background:#FAFAFA;border-radius:10px;padding:20px;text-align:center;border:1px solid #E8E8E8;">
    <svg width="120" height="70" viewBox="0 0 120 70" style="display:block;margin:0 auto;">
      <path d="M 10 65 A 50 50 0 0 1 110 65" stroke="#E8E8E8" stroke-width="8" fill="none" stroke-linecap="round"/>
      <path d="M 10 65 A 50 50 0 0 1 110 65" stroke="{{ACCENT}}" stroke-width="8" fill="none" stroke-linecap="round"
            stroke-dasharray="157" stroke-dashoffset="31.4"/>
    </svg>
    <div style="font-size:28px;font-weight:700;color:{{PRIMARY}};margin-top:8px;">80.0%</div>
    <div style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.5px;">Economic</div>
    <div style="font-size:11px;color:{{RED}};font-weight:600;margin-top:4px;">–70 bps MoM</div>
  </div>
</div>
</example_output>
SVG arc: total arc length = 157px. stroke-dashoffset = 157 * (1 - pct/100).
Use {{PRIMARY}} for physical, {{ACCENT}} for economic. Show MoM change in bps below each gauge.`;

// ═══════════════════════════════════════════════════════════
// 6. NOI TREND BARS — JLL Style
// ═══════════════════════════════════════════════════════════

export const NOI_TREND_BARS_EXAMPLE = `
<example_output>
<div style="width:100%;">
  <div style="font-size:14px;font-weight:700;color:{{PRIMARY}};margin-bottom:3px;">NOI — Trailing 6 Months</div>
  <div style="font-size:11px;color:#999;margin-bottom:16px;">Color: beat budget = primary, missed = red</div>
  <div style="display:flex;align-items:flex-end;gap:6px;height:180px;padding-bottom:28px;border-bottom:1px solid #E8E8E8;">
    <!-- Repeat for each month. barHeight = (noiValue / maxNOI) * 140px -->
    <!-- Color: if noi >= budget use {{PRIMARY}}, else use {{RED}} -->
    <!-- Current month (last bar) gets opacity:0.9, prior months get opacity:0.4 -->
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;">
      <div style="font-size:9px;font-weight:600;color:#888;">$91K</div>
      <div style="width:100%;height:106px;background:{{RED}};border-radius:3px 3px 0 0;opacity:0.35;"></div>
      <div style="font-size:8px;color:#AAA;">Jun</div>
    </div>
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;">
      <div style="font-size:9px;font-weight:600;color:#888;">$102K</div>
      <div style="width:100%;height:118px;background:{{PRIMARY}};border-radius:3px 3px 0 0;opacity:0.35;"></div>
      <div style="font-size:8px;color:#AAA;">Jul</div>
    </div>
    <!-- ... more months ... -->
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;">
      <div style="font-size:9px;font-weight:600;color:{{PRIMARY}};">$114K</div>
      <div style="width:100%;height:140px;background:{{PRIMARY}};border-radius:3px 3px 0 0;opacity:0.85;"></div>
      <div style="font-size:8px;color:{{PRIMARY}};font-weight:600;">Nov</div>
    </div>
  </div>
  <!-- Budget reference line note -->
  <div style="display:flex;gap:12px;margin-top:8px;font-size:10px;color:#888;">
    <span style="display:flex;align-items:center;gap:4px;"><span style="width:10px;height:7px;background:{{PRIMARY}};border-radius:2px;opacity:0.5;"></span> Beat budget</span>
    <span style="display:flex;align-items:center;gap:4px;"><span style="width:10px;height:7px;background:{{RED}};border-radius:2px;opacity:0.5;"></span> Missed budget</span>
  </div>
</div>
</example_output>
Show 3–6 trailing months of NOI. Bar height proportional to NOI value.
Current month at full opacity (0.85), prior months at 0.35.
If no budget data available, use {{PRIMARY}} for all bars.`;

// ═══════════════════════════════════════════════════════════
// 7. RENT ROLL TABLE
// ═══════════════════════════════════════════════════════════

export const RENT_ROLL_TABLE_EXAMPLE = `
<example_output>
<div style="width:100%;overflow-x:auto;">
  <div style="font-size:14px;font-weight:700;color:{{PRIMARY}};margin-bottom:3px;">Unit Mix Summary</div>
  <div style="font-size:11px;color:#999;margin-bottom:14px;">By floorplan</div>
  <table style="width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums;">
    <thead>
      <tr style="border-bottom:2px solid {{PRIMARY}};">
        <th style="text-align:left;padding:8px;font-size:9px;font-weight:700;color:{{PRIMARY}};text-transform:uppercase;letter-spacing:0.8px;">Floorplan</th>
        <th style="text-align:right;padding:8px;font-size:9px;font-weight:700;color:{{PRIMARY}};text-transform:uppercase;letter-spacing:0.8px;">Units</th>
        <th style="text-align:right;padding:8px;font-size:9px;font-weight:700;color:{{PRIMARY}};text-transform:uppercase;letter-spacing:0.8px;">Avg Rent</th>
        <th style="text-align:right;padding:8px;font-size:9px;font-weight:700;color:{{PRIMARY}};text-transform:uppercase;letter-spacing:0.8px;">Avg SF</th>
        <th style="text-align:right;padding:8px;font-size:9px;font-weight:700;color:{{PRIMARY}};text-transform:uppercase;letter-spacing:0.8px;">$/SF</th>
        <th style="text-align:right;padding:8px;font-size:9px;font-weight:700;color:{{PRIMARY}};text-transform:uppercase;letter-spacing:0.8px;">Occ %</th>
      </tr>
    </thead>
    <tbody>
      <tr style="border-bottom:1px solid #F0F0F0;">
        <td style="padding:9px 8px;font-size:12px;color:#333;font-weight:500;">1BR / 1BA</td>
        <td style="padding:9px 8px;text-align:right;font-size:12px;color:#333;">96</td>
        <td style="padding:9px 8px;text-align:right;font-size:12px;font-weight:600;color:{{PRIMARY}};">$1,045</td>
        <td style="padding:9px 8px;text-align:right;font-size:12px;color:#999;">685</td>
        <td style="padding:9px 8px;text-align:right;font-size:12px;color:#999;">$1.53</td>
        <td style="padding:9px 8px;text-align:right;font-size:12px;font-weight:600;color:{{GREEN}};">94.8%</td>
      </tr>
      <!-- More rows... -->
      <tr style="border-top:2px solid {{PRIMARY}};background:#F7F7F7;">
        <td style="padding:9px 8px;font-size:12px;font-weight:700;color:{{PRIMARY}};">Total / Avg</td>
        <td style="padding:9px 8px;text-align:right;font-size:12px;font-weight:700;color:{{PRIMARY}};">234</td>
        <td style="padding:9px 8px;text-align:right;font-size:12px;font-weight:700;color:{{PRIMARY}};">$1,188</td>
        <td style="padding:9px 8px;text-align:right;font-size:12px;font-weight:600;color:#999;">812</td>
        <td style="padding:9px 8px;text-align:right;font-size:12px;font-weight:600;color:#999;">$1.46</td>
        <td style="padding:9px 8px;text-align:right;font-size:12px;font-weight:700;color:{{PRIMARY}};">91.4%</td>
      </tr>
    </tbody>
  </table>
</div>
</example_output>
Generate one row per floorplan from rent_roll.unit_mix. Include totals/averages row.
Color occupancy: >=95% green, 90-95% primary, <90% red.`;

// ═══════════════════════════════════════════════════════════
// 8. RISK CARDS
// ═══════════════════════════════════════════════════════════

export const RISK_CARDS_EXAMPLE = `
<example_output>
<div style="display:grid;gap:12px;width:100%;">
  <div style="background:#FFF;border:1px solid #E8E8E8;border-left:4px solid {{RED}};border-radius:8px;padding:14px 16px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <span style="font-size:13px;font-weight:700;color:#1E293B;">Rising Vacancy Loss</span>
      <span style="font-size:10px;font-weight:700;color:{{RED}};background:#FEF2F2;padding:2px 8px;border-radius:4px;text-transform:uppercase;letter-spacing:0.5px;">High</span>
    </div>
    <p style="font-size:12px;color:#64748B;line-height:1.5;margin:0;">Vacancy loss increased 17.5% MoM to $22,476, representing 8.0% of GPR. Trending above both budget ($14,100) and prior year levels.</p>
  </div>
  <div style="background:#FFF;border:1px solid #E8E8E8;border-left:4px solid {{AMBER}};border-radius:8px;padding:14px 16px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <span style="font-size:13px;font-weight:700;color:#1E293B;">Declining Economic Occupancy</span>
      <span style="font-size:10px;font-weight:700;color:{{AMBER}};background:#FFFBEB;padding:2px 8px;border-radius:4px;text-transform:uppercase;letter-spacing:0.5px;">Medium</span>
    </div>
    <p style="font-size:12px;color:#64748B;line-height:1.5;margin:0;">Economic occupancy declined to 80.0%, a 10-month declining trend from 86.2% in December. Gap between physical (91.4%) and economic occupancy suggests pricing pressure.</p>
  </div>
</div>
</example_output>
Border-left color: HIGH = {{RED}}, MEDIUM = {{AMBER}}, LOW = {{GREEN}}.
Badge background: HIGH = #FEF2F2, MEDIUM = #FFFBEB, LOW = #F0FDF4.
Generate 2-4 risk items based on data anomalies, trends, and budget misses.`;

// ═══════════════════════════════════════════════════════════
// 9. MOVE IN/OUT BARS
// ═══════════════════════════════════════════════════════════

export const MOVE_IN_OUT_BARS_EXAMPLE = `
<example_output>
<div style="width:100%;">
  <div style="font-size:14px;font-weight:700;color:{{PRIMARY}};margin-bottom:14px;">Leasing Activity</div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">
    <div style="text-align:center;padding:14px;background:#FAFAFA;border-radius:8px;border:1px solid #E8E8E8;">
      <div style="font-size:24px;font-weight:700;color:{{GREEN}};">12</div>
      <div style="font-size:10px;color:#999;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">Move-Ins</div>
    </div>
    <div style="text-align:center;padding:14px;background:#FAFAFA;border-radius:8px;border:1px solid #E8E8E8;">
      <div style="font-size:24px;font-weight:700;color:{{RED}};">18</div>
      <div style="font-size:10px;color:#999;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">Move-Outs</div>
    </div>
    <div style="text-align:center;padding:14px;background:#FAFAFA;border-radius:8px;border:1px solid #E8E8E8;">
      <div style="font-size:24px;font-weight:700;color:{{PRIMARY}};">22</div>
      <div style="font-size:10px;color:#999;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">Renewals</div>
    </div>
    <div style="text-align:center;padding:14px;background:#FAFAFA;border-radius:8px;border:1px solid #E8E8E8;">
      <div style="font-size:24px;font-weight:700;color:{{AMBER}};">8</div>
      <div style="font-size:10px;color:#999;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">NTV</div>
    </div>
  </div>
  <div style="margin-top:10px;font-size:11px;color:#64748B;">
    Net absorption: <strong style="color:{{RED}};">–6 units</strong> · Avg new lease: $1,095/mo · Avg renewal: $1,125/mo
  </div>
</div>
</example_output>
Use data from leasing_activity. If move_ins > move_outs, net absorption is green. If negative, red.
Only generate if leasing_activity data exists in extracted data.`;

// ═══════════════════════════════════════════════════════════
// 10. COMPARISON TABLE (Institutional tier)
// ═══════════════════════════════════════════════════════════

export const COMPARISON_TABLE_EXAMPLE = `
<example_output>
<div style="width:100%;overflow-x:auto;">
  <div style="font-size:14px;font-weight:700;color:{{PRIMARY}};margin-bottom:3px;">Lease Expiration Schedule</div>
  <div style="font-size:11px;color:#999;margin-bottom:14px;">Next 12 months</div>
  <table style="width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums;">
    <thead>
      <tr style="border-bottom:2px solid {{PRIMARY}};">
        <th style="text-align:left;padding:8px;font-size:9px;font-weight:700;color:{{PRIMARY}};text-transform:uppercase;letter-spacing:0.8px;">Period</th>
        <th style="text-align:right;padding:8px;font-size:9px;font-weight:700;color:{{PRIMARY}};text-transform:uppercase;letter-spacing:0.8px;">Expiring</th>
        <th style="text-align:right;padding:8px;font-size:9px;font-weight:700;color:{{PRIMARY}};text-transform:uppercase;letter-spacing:0.8px;">% of Total</th>
        <th style="text-align:right;padding:8px;font-size:9px;font-weight:700;color:{{PRIMARY}};text-transform:uppercase;letter-spacing:0.8px;">Avg Rent</th>
        <th style="text-align:right;padding:8px;font-size:9px;font-weight:700;color:{{PRIMARY}};text-transform:uppercase;letter-spacing:0.8px;">Market Rent</th>
        <th style="text-align:right;padding:8px;font-size:9px;font-weight:700;color:{{PRIMARY}};text-transform:uppercase;letter-spacing:0.8px;">Upside</th>
      </tr>
    </thead>
    <tbody>
      <tr style="border-bottom:1px solid #F0F0F0;">
        <td style="padding:9px 8px;font-size:12px;color:#333;font-weight:500;">Q1 2026</td>
        <td style="padding:9px 8px;text-align:right;font-size:12px;color:#333;">28</td>
        <td style="padding:9px 8px;text-align:right;font-size:12px;color:#999;">12.0%</td>
        <td style="padding:9px 8px;text-align:right;font-size:12px;font-weight:600;color:{{PRIMARY}};">$1,045</td>
        <td style="padding:9px 8px;text-align:right;font-size:12px;color:#999;">$1,125</td>
        <td style="padding:9px 8px;text-align:right;font-size:12px;font-weight:600;color:{{GREEN}};">+$80</td>
      </tr>
    </tbody>
  </table>
</div>
</example_output>
Adapt column headers and data based on the section context.
Use for lease expirations, market comparisons, or multi-period breakdowns.`

