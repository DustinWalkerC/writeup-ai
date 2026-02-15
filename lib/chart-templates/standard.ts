// lib/chart-templates/standard.ts

/**
 * CORE — Standard Template Set (JLL/CBRE-inspired Institutional CRE)
 *
 * Each constant is an HTML example that gets injected into the system prompt.
 * Claude uses these as exact structural references when building charts.
 *
 * IMPORTANT: These use {{TOKEN}} placeholders for colors. Claude replaces
 * these with the actual hex values from <brand_colors> in the user prompt.
 * Data values (numbers, labels) are shown as examples — Claude replaces
 * them with real extracted data.
 */

// ═══════════════════════════════════════════════════════════
// 1. KPI STRIP — Used by ALL sections, ALL tiers
// ═══════════════════════════════════════════════════════════

export const KPI_STRIP_EXAMPLE = `
<example_output>
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0;">
  <div style="background:{{SECONDARY}};border-radius:12px;padding:16px 18px;border-left:4px solid {{PRIMARY}};">
    <div style="font-size:11px;font-weight:600;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Occupancy</div>
    <div style="font-size:22px;font-weight:700;color:#0F172A;font-variant-numeric:tabular-nums;">91.4%</div>
    <div style="display:flex;align-items:center;gap:6px;margin-top:6px;">
      <span style="font-size:12px;font-weight:600;color:{{RED}};">▼ –0.9%</span>
      <span style="font-size:10px;color:#94A3B8;">MoM</span>
    </div>
  </div>
  <div style="background:{{SECONDARY}};border-radius:12px;padding:16px 18px;border-left:4px solid {{PRIMARY}};">
    <div style="font-size:11px;font-weight:600;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">NOI</div>
    <div style="font-size:22px;font-weight:700;color:#0F172A;font-variant-numeric:tabular-nums;">$113,848</div>
    <div style="display:flex;align-items:center;gap:6px;margin-top:6px;">
      <span style="font-size:12px;font-weight:600;color:{{GREEN}};">▲ +25.8%</span>
      <span style="font-size:10px;color:#94A3B8;">MoM</span>
      <span style="font-size:10px;color:#94A3B8;margin-left:4px;">vs budget: +$22.8K</span>
    </div>
  </div>
  <!-- Repeat for Revenue, Expenses, etc. -->
</div>
</example_output>
Adapt column count (3-5) based on number of metrics. Use ▲ for up, ▼ for down, — for flat.
Color the change value: {{GREEN}} for favorable, {{RED}} for unfavorable.`;

// ═══════════════════════════════════════════════════════════
// 2. BUDGET VARIANCE TABLE — revenue_summary, expense_summary, budget_vs_actual
// ═══════════════════════════════════════════════════════════

export const BUDGET_VARIANCE_TABLE_EXAMPLE = `
<example_output>
<div style="border-radius:12px;overflow:hidden;border:1px solid #E2E8F0;margin:16px 0;">
  <table style="width:100%;border-collapse:collapse;font-size:13px;font-variant-numeric:tabular-nums;">
    <thead>
      <tr style="background:{{PRIMARY}};">
        <th style="text-align:left;padding:10px 14px;font-size:11px;font-weight:700;color:#FFFFFF;text-transform:uppercase;letter-spacing:0.5px;">Category</th>
        <th style="text-align:right;padding:10px 14px;font-size:11px;font-weight:700;color:#FFFFFF;text-transform:uppercase;letter-spacing:0.5px;">Actual</th>
        <th style="text-align:right;padding:10px 14px;font-size:11px;font-weight:700;color:#FFFFFF;text-transform:uppercase;letter-spacing:0.5px;">Budget</th>
        <th style="text-align:right;padding:10px 14px;font-size:11px;font-weight:700;color:#FFFFFF;text-transform:uppercase;letter-spacing:0.5px;">Variance</th>
        <th style="text-align:right;padding:10px 14px;font-size:11px;font-weight:700;color:#FFFFFF;text-transform:uppercase;letter-spacing:0.5px;">Var %</th>
      </tr>
    </thead>
    <tbody>
      <tr style="background:#FFFFFF;">
        <td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;color:#334155;font-weight:500;">Gross Potential Rent</td>
        <td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;text-align:right;color:#334155;">$280,333</td>
        <td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;text-align:right;color:#64748B;">$285,000</td>
        <td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;text-align:right;color:{{RED}};font-weight:600;">($4,667)</td>
        <td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;text-align:right;color:{{RED}};font-weight:600;">–1.6%</td>
      </tr>
      <tr style="background:{{SECONDARY}};">
        <td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;color:#334155;font-weight:500;">Vacancy Loss</td>
        <td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;text-align:right;color:#334155;">($22,476)</td>
        <td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;text-align:right;color:#64748B;">($25,000)</td>
        <td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;text-align:right;color:{{GREEN}};font-weight:600;">$2,524</td>
        <td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;text-align:right;color:{{GREEN}};font-weight:600;">+10.1%</td>
      </tr>
      <!-- More rows... -->
      <tr style="background:#FFFFFF;border-top:2px solid {{PRIMARY}};">
        <td style="padding:10px 14px;color:#0F172A;font-weight:700;">Total Revenue</td>
        <td style="padding:10px 14px;text-align:right;color:#0F172A;font-weight:700;">$277,826</td>
        <td style="padding:10px 14px;text-align:right;color:#64748B;font-weight:700;">$285,000</td>
        <td style="padding:10px 14px;text-align:right;color:{{RED}};font-weight:700;">($7,174)</td>
        <td style="padding:10px 14px;text-align:right;color:{{RED}};font-weight:700;">–2.5%</td>
      </tr>
    </tbody>
  </table>
</div>
</example_output>
Alternate row backgrounds between #FFFFFF and {{SECONDARY}}.
Negative variances: parenthetical ($X,XXX) format. Color: {{RED}} for unfavorable, {{GREEN}} for favorable.
For EXPENSE tables: lower actual than budget is FAVORABLE (green). For REVENUE: higher is favorable.
If no budget data: omit Budget, Variance, and Var % columns — show only Category and Actual.`;

// ═══════════════════════════════════════════════════════════
// 3. REVENUE WATERFALL — revenue_analysis
// ═══════════════════════════════════════════════════════════

export const REVENUE_WATERFALL_EXAMPLE = `
<example_output>
<div style="background:#FFFFFF;border-radius:12px;border:1px solid #E2E8F0;padding:20px 24px;margin:16px 0;">
  <div style="font-size:14px;font-weight:700;color:{{PRIMARY}};margin-bottom:16px;">Revenue Bridge — GPR to Total Revenue</div>
  <div style="display:flex;align-items:flex-end;gap:4px;height:200px;padding-bottom:28px;position:relative;">
    <!-- Each bar is absolutely positioned based on its base and height -->
    <!-- GPR (total - full height from bottom) -->
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;position:relative;height:100%;">
      <div style="font-size:10px;font-weight:700;color:#334155;margin-bottom:4px;">$280K</div>
      <div style="width:80%;background:{{PRIMARY}};border-radius:4px 4px 0 0;height:100%;"></div>
      <div style="font-size:9px;color:#64748B;margin-top:4px;text-align:center;">GPR</div>
    </div>
    <!-- Vacancy (subtraction - floats from GPR level) -->
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;position:relative;height:100%;">
      <div style="font-size:10px;font-weight:600;color:{{RED}};margin-bottom:4px;">($22K)</div>
      <div style="flex:1;"></div>
      <div style="width:80%;background:{{RED}};opacity:0.75;border-radius:4px;height:8%;"></div>
      <div style="width:80%;height:84%;"></div>
      <div style="font-size:9px;color:#64748B;margin-top:4px;text-align:center;">Vacancy</div>
    </div>
    <!-- More deduction bars for LTL, Bad Debt, Concessions... -->
    <!-- Net Rent (total - shorter bar) -->
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;position:relative;height:100%;">
      <div style="font-size:10px;font-weight:700;color:{{ACCENT}};margin-bottom:4px;">$224K</div>
      <div style="flex:1;"></div>
      <div style="width:80%;background:{{ACCENT}};border-radius:4px 4px 0 0;height:80%;"></div>
      <div style="font-size:9px;color:#64748B;margin-top:4px;text-align:center;">Net Rent</div>
    </div>
    <!-- Total Revenue (final total) -->
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;position:relative;height:100%;">
      <div style="font-size:10px;font-weight:700;color:{{PRIMARY}};margin-bottom:4px;">$278K</div>
      <div style="flex:1;"></div>
      <div style="width:80%;background:{{PRIMARY}};border-radius:4px 4px 0 0;height:99%;"></div>
      <div style="font-size:9px;color:#64748B;margin-top:4px;text-align:center;">Total Rev</div>
    </div>
  </div>
</div>
</example_output>
Bars: GPR and totals use {{PRIMARY}}. Subtractions use {{RED}} with 0.75 opacity. Net Rent uses {{ACCENT}}.
Additions (Other Income, recoveries) use {{GREEN}}. Calculate bar heights proportionally based on data range.
Dollar labels above each bar. Category labels below.`;

// ═══════════════════════════════════════════════════════════
// 4. EXPENSE HORIZONTAL BARS — expense_analysis
// ═══════════════════════════════════════════════════════════

export const EXPENSE_BARS_EXAMPLE = `
<example_output>
<div style="background:#FFFFFF;border-radius:12px;border:1px solid #E2E8F0;padding:20px 24px;margin:16px 0;">
  <div style="font-size:14px;font-weight:700;color:{{PRIMARY}};margin-bottom:16px;">Expense Categories — Actual vs Budget</div>
  <!-- Each expense row -->
  <div style="margin-bottom:12px;">
    <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
      <span style="font-size:12px;font-weight:600;color:#334155;">Property Taxes</span>
      <span style="font-size:12px;font-weight:600;color:{{GREEN}};">–$16,647 (under budget)</span>
    </div>
    <div style="position:relative;height:20px;background:#F1F5F9;border-radius:4px;overflow:hidden;">
      <div style="position:absolute;top:0;left:0;height:100%;width:65%;background:{{PRIMARY}};border-radius:4px;opacity:0.85;"></div>
      <div style="position:absolute;top:0;left:0;height:100%;width:78%;border:2px dashed {{ACCENT}};border-radius:4px;box-sizing:border-box;"></div>
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:2px;">
      <span style="font-size:10px;color:#94A3B8;">Actual: $28,353</span>
      <span style="font-size:10px;color:#94A3B8;">Budget: $45,000</span>
    </div>
  </div>
  <!-- Repeat for each expense category -->
</div>
</example_output>
Solid bar = Actual ({{PRIMARY}}). Dashed outline = Budget ({{ACCENT}}).
Variance text: {{GREEN}} if under budget (favorable for expenses), {{RED}} if over budget.
Scale all bars relative to the largest value across all categories.`;

// ═══════════════════════════════════════════════════════════
// 5. OCCUPANCY GAUGE — occupancy_leasing
// ═══════════════════════════════════════════════════════════

export const OCCUPANCY_GAUGE_EXAMPLE = `
<example_output>
<div style="background:#FFFFFF;border-radius:12px;border:1px solid #E2E8F0;padding:20px 24px;margin:16px 0;text-align:center;">
  <div style="font-size:14px;font-weight:700;color:{{PRIMARY}};margin-bottom:16px;">Physical Occupancy</div>
  <svg width="180" height="110" viewBox="0 0 180 110" style="margin:0 auto;display:block;">
    <!-- Background arc -->
    <path d="M 20 100 A 70 70 0 0 1 160 100" fill="none" stroke="#F1F5F9" stroke-width="14" stroke-linecap="round"/>
    <!-- Filled arc (91.4% of 180 degrees) -->
    <path d="M 20 100 A 70 70 0 0 1 153 68" fill="none" stroke="{{PRIMARY}}" stroke-width="14" stroke-linecap="round"/>
    <!-- Center text -->
    <text x="90" y="85" text-anchor="middle" style="font-size:28px;font-weight:700;fill:#0F172A;font-variant-numeric:tabular-nums;">91.4%</text>
    <text x="90" y="102" text-anchor="middle" style="font-size:11px;fill:#64748B;">214 of 234 units</text>
  </svg>
  <!-- Economic occupancy bar below -->
  <div style="margin-top:16px;">
    <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
      <span style="font-size:11px;font-weight:600;color:#64748B;">Economic Occupancy</span>
      <span style="font-size:11px;font-weight:700;color:#334155;">80.0%</span>
    </div>
    <div style="height:8px;background:#F1F5F9;border-radius:4px;overflow:hidden;">
      <div style="height:100%;width:80%;background:{{ACCENT}};border-radius:4px;"></div>
    </div>
  </div>
</div>
</example_output>
Calculate the SVG arc endpoint based on the actual occupancy percentage.
Physical occupancy uses {{PRIMARY}} for the arc. Economic occupancy uses {{ACCENT}} for the bar.
Show "X of Y units" in the center text.`;

// ═══════════════════════════════════════════════════════════
// 6. NOI TREND BARS — noi_performance
// ═══════════════════════════════════════════════════════════

export const NOI_TREND_EXAMPLE = `
<example_output>
<div style="background:#FFFFFF;border-radius:12px;border:1px solid #E2E8F0;padding:20px 24px;margin:16px 0;">
  <div style="font-size:14px;font-weight:700;color:{{PRIMARY}};margin-bottom:16px;">NOI Trend — Trailing 6 Months</div>
  <div style="display:flex;align-items:flex-end;gap:8px;height:160px;padding-bottom:24px;position:relative;">
    <!-- Budget reference line (dashed) -->
    <div style="position:absolute;left:0;right:0;bottom:calc(24px + 72%);border-bottom:2px dashed {{ACCENT}};z-index:1;">
      <span style="position:absolute;right:0;top:-16px;font-size:9px;color:{{ACCENT}};font-weight:600;">Budget: $91K</span>
    </div>
    <!-- Bar: Jun (below budget) -->
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;">
      <div style="font-size:9px;font-weight:700;color:#334155;margin-bottom:3px;">$68K</div>
      <div style="width:70%;background:{{RED}};border-radius:4px 4px 0 0;height:54%;opacity:0.85;"></div>
      <div style="font-size:9px;color:#94A3B8;margin-top:4px;">Jun</div>
    </div>
    <!-- Bar: Nov (above budget - current month) -->
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;">
      <div style="font-size:9px;font-weight:700;color:{{GREEN}};margin-bottom:3px;">$114K</div>
      <div style="width:70%;background:{{GREEN}};border-radius:4px 4px 0 0;height:90%;"></div>
      <div style="font-size:9px;color:#0F172A;font-weight:700;margin-top:4px;">Nov</div>
    </div>
    <!-- Repeat for each month in the trailing period -->
  </div>
</div>
</example_output>
Bars that beat budget: {{GREEN}}. Bars that missed budget: {{RED}}. No budget data: {{PRIMARY}}.
Budget reference line: dashed, {{ACCENT}} color. Current month label is bold.
Calculate bar heights proportionally. Show 3-6 months depending on data availability.`;

// ═══════════════════════════════════════════════════════════
// 7. RENT ROLL TABLE — rent_roll_insights
// ═══════════════════════════════════════════════════════════

export const RENT_ROLL_TABLE_EXAMPLE = `
<example_output>
<div style="border-radius:12px;overflow:hidden;border:1px solid #E2E8F0;margin:16px 0;">
  <table style="width:100%;border-collapse:collapse;font-size:13px;font-variant-numeric:tabular-nums;">
    <thead>
      <tr style="background:{{PRIMARY}};">
        <th style="text-align:left;padding:10px 14px;font-size:11px;font-weight:700;color:#FFFFFF;text-transform:uppercase;letter-spacing:0.5px;">Floorplan</th>
        <th style="text-align:center;padding:10px 14px;font-size:11px;font-weight:700;color:#FFFFFF;text-transform:uppercase;letter-spacing:0.5px;">Units</th>
        <th style="text-align:right;padding:10px 14px;font-size:11px;font-weight:700;color:#FFFFFF;text-transform:uppercase;letter-spacing:0.5px;">Avg Rent</th>
        <th style="text-align:right;padding:10px 14px;font-size:11px;font-weight:700;color:#FFFFFF;text-transform:uppercase;letter-spacing:0.5px;">Avg SF</th>
        <th style="text-align:right;padding:10px 14px;font-size:11px;font-weight:700;color:#FFFFFF;text-transform:uppercase;letter-spacing:0.5px;">$/SF</th>
        <th style="text-align:right;padding:10px 14px;font-size:11px;font-weight:700;color:#FFFFFF;text-transform:uppercase;letter-spacing:0.5px;">Occ %</th>
      </tr>
    </thead>
    <tbody>
      <tr style="background:#FFFFFF;">
        <td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;color:#334155;font-weight:500;">1BR / 1BA</td>
        <td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;text-align:center;color:#334155;">96</td>
        <td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;text-align:right;color:#334155;">$1,085</td>
        <td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;text-align:right;color:#64748B;">742</td>
        <td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;text-align:right;color:#64748B;">$1.46</td>
        <td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;text-align:right;color:{{GREEN}};font-weight:600;">95.8%</td>
      </tr>
      <tr style="background:{{SECONDARY}};">
        <td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;color:#334155;font-weight:500;">2BR / 2BA</td>
        <td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;text-align:center;color:#334155;">108</td>
        <td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;text-align:right;color:#334155;">$1,265</td>
        <td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;text-align:right;color:#64748B;">1,024</td>
        <td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;text-align:right;color:#64748B;">$1.24</td>
        <td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;text-align:right;color:{{RED}};font-weight:600;">87.0%</td>
      </tr>
      <!-- Totals row -->
      <tr style="background:#FFFFFF;border-top:2px solid {{PRIMARY}};">
        <td style="padding:10px 14px;color:#0F172A;font-weight:700;">Total / Avg</td>
        <td style="padding:10px 14px;text-align:center;color:#0F172A;font-weight:700;">234</td>
        <td style="padding:10px 14px;text-align:right;color:#0F172A;font-weight:700;">$1,188</td>
        <td style="padding:10px 14px;text-align:right;color:#0F172A;font-weight:700;">895</td>
        <td style="padding:10px 14px;text-align:right;color:#0F172A;font-weight:700;">$1.33</td>
        <td style="padding:10px 14px;text-align:right;color:#0F172A;font-weight:700;">91.4%</td>
      </tr>
    </tbody>
  </table>
</div>
</example_output>
Alternate rows between #FFFFFF and {{SECONDARY}}. Occupancy: {{GREEN}} if ≥93%, {{RED}} if <90%, #334155 otherwise.
Totals row has 2px top border in {{PRIMARY}}.`;

// ═══════════════════════════════════════════════════════════
// 8. RISK CARDS — risk_watch_items, risk_matrix
// ═══════════════════════════════════════════════════════════

export const RISK_CARDS_EXAMPLE = `
<example_output>
<div style="display:flex;flex-direction:column;gap:12px;margin:16px 0;">
  <!-- High risk -->
  <div style="background:#FFFFFF;border-radius:12px;border:1px solid #E2E8F0;border-left:4px solid {{RED}};padding:16px 20px;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
      <span style="font-size:10px;font-weight:700;color:#FFFFFF;background:{{RED}};padding:2px 8px;border-radius:4px;text-transform:uppercase;letter-spacing:0.5px;">High</span>
      <span style="font-size:14px;font-weight:700;color:#0F172A;">Accelerating Loss-to-Lease</span>
    </div>
    <p style="font-size:13px;color:#475569;line-height:1.5;margin:0 0 8px;">Loss-to-lease increased 238% YoY to $20,724 (7.4% of GPR), indicating rents are significantly below market achievable rates on in-place leases.</p>
    <p style="font-size:12px;color:{{ACCENT}};font-weight:600;margin:0;">Mitigation: Implement a 3–5% rent increase program on upcoming renewals, targeting the highest-gap units first.</p>
  </div>
  <!-- Medium risk -->
  <div style="background:#FFFFFF;border-radius:12px;border:1px solid #E2E8F0;border-left:4px solid {{AMBER}};padding:16px 20px;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
      <span style="font-size:10px;font-weight:700;color:#FFFFFF;background:{{AMBER}};padding:2px 8px;border-radius:4px;text-transform:uppercase;letter-spacing:0.5px;">Medium</span>
      <span style="font-size:14px;font-weight:700;color:#0F172A;">Rising Bad Debt</span>
    </div>
    <p style="font-size:13px;color:#475569;line-height:1.5;margin:0 0 8px;">Bad debt reached $7,703 (2.7% of GPR), the third consecutive monthly increase.</p>
    <p style="font-size:12px;color:{{ACCENT}};font-weight:600;margin:0;">Mitigation: Review collections procedures and consider early intervention for accounts 30+ days delinquent.</p>
  </div>
</div>
</example_output>
Border-left color: {{RED}} for high, {{AMBER}} for medium, {{GREEN}} for low.
Badge background matches border-left color. Mitigation text uses {{ACCENT}} color.
Generate 2-4 risk items based on the data. Always include at least one risk if the data supports it.`;

// ═══════════════════════════════════════════════════════════
// 9. MOVE-IN/OUT BARS — occupancy_leasing
// ═══════════════════════════════════════════════════════════

export const MOVE_IN_OUT_EXAMPLE = `
<example_output>
<div style="background:#FFFFFF;border-radius:12px;border:1px solid #E2E8F0;padding:20px 24px;margin:16px 0;">
  <div style="font-size:14px;font-weight:700;color:{{PRIMARY}};margin-bottom:16px;">Leasing Activity</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
    <!-- Current Month -->
    <div>
      <div style="font-size:12px;font-weight:700;color:#334155;margin-bottom:10px;">November 2025</div>
      <div style="margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
          <span style="font-size:11px;color:#64748B;">Move-ins</span>
          <span style="font-size:11px;font-weight:600;color:{{GREEN}};">12</span>
        </div>
        <div style="height:8px;background:#F1F5F9;border-radius:4px;overflow:hidden;">
          <div style="height:100%;width:60%;background:{{GREEN}};border-radius:4px;"></div>
        </div>
      </div>
      <div style="margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
          <span style="font-size:11px;color:#64748B;">Move-outs</span>
          <span style="font-size:11px;font-weight:600;color:{{RED}};">8</span>
        </div>
        <div style="height:8px;background:#F1F5F9;border-radius:4px;overflow:hidden;">
          <div style="height:100%;width:40%;background:{{RED}};border-radius:4px;"></div>
        </div>
      </div>
      <div style="margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
          <span style="font-size:11px;color:#64748B;">Renewals</span>
          <span style="font-size:11px;font-weight:600;color:{{ACCENT}};">18</span>
        </div>
        <div style="height:8px;background:#F1F5F9;border-radius:4px;overflow:hidden;">
          <div style="height:100%;width:90%;background:{{ACCENT}};border-radius:4px;"></div>
        </div>
      </div>
      <div style="font-size:11px;color:#64748B;margin-top:6px;">Net absorption: <strong style="color:{{GREEN}};">+4 units</strong></div>
    </div>
    <!-- Prior Month (same structure, different data) -->
  </div>
</div>
</example_output>
Move-ins: {{GREEN}}. Move-outs: {{RED}}. Renewals: {{ACCENT}}.
Scale bars relative to the largest value across both months.
Show net absorption (move-ins minus move-outs). Skip this chart entirely if no leasing data uploaded.`;

// ═══════════════════════════════════════════════════════════
// 10. COMPARISON TABLE — generic multi-column (institutional)
// ═══════════════════════════════════════════════════════════

export const COMPARISON_TABLE_EXAMPLE = `
<example_output>
<div style="border-radius:12px;overflow:hidden;border:1px solid #E2E8F0;margin:16px 0;">
  <table style="width:100%;border-collapse:collapse;font-size:13px;font-variant-numeric:tabular-nums;">
    <thead>
      <tr style="background:{{PRIMARY}};">
        <th style="text-align:left;padding:10px 14px;font-size:11px;font-weight:700;color:#FFFFFF;text-transform:uppercase;letter-spacing:0.5px;">Metric</th>
        <th style="text-align:right;padding:10px 14px;font-size:11px;font-weight:700;color:#FFFFFF;text-transform:uppercase;letter-spacing:0.5px;">Current</th>
        <th style="text-align:right;padding:10px 14px;font-size:11px;font-weight:700;color:#FFFFFF;text-transform:uppercase;letter-spacing:0.5px;">Prior Month</th>
        <th style="text-align:right;padding:10px 14px;font-size:11px;font-weight:700;color:#FFFFFF;text-transform:uppercase;letter-spacing:0.5px;">Budget</th>
        <th style="text-align:right;padding:10px 14px;font-size:11px;font-weight:700;color:#FFFFFF;text-transform:uppercase;letter-spacing:0.5px;">T-12 Avg</th>
      </tr>
    </thead>
    <tbody>
      <tr style="background:#FFFFFF;">
        <td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;color:#334155;font-weight:500;">Physical Occupancy</td>
        <td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;text-align:right;color:#334155;font-weight:600;">91.4%</td>
        <td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;text-align:right;color:#64748B;">92.3%</td>
        <td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;text-align:right;color:#64748B;">95.0%</td>
        <td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;text-align:right;color:#64748B;">92.8%</td>
      </tr>
      <tr style="background:{{SECONDARY}};">
        <td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;color:#334155;font-weight:500;">Revenue/Unit</td>
        <td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;text-align:right;color:#334155;font-weight:600;">$1,188</td>
        <td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;text-align:right;color:#64748B;">$1,202</td>
        <td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;text-align:right;color:#64748B;">$1,218</td>
        <td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;text-align:right;color:#64748B;">$1,195</td>
      </tr>
    </tbody>
  </table>
</div>
</example_output>
Generic multi-column format. Use for any section that needs to compare current vs prior vs budget vs trailing average.
Header: {{PRIMARY}} background. Rows alternate #FFFFFF and {{SECONDARY}}.`;

// ═══════════════════════════════════════════════════════════
// REPORT HEADER — rendered at top of report when logo/company name exists
// ═══════════════════════════════════════════════════════════

export const REPORT_HEADER_EXAMPLE = `
<example_output>
<div style="display:flex;align-items:center;gap:16px;padding:20px 28px;margin-bottom:24px;border-bottom:2px solid {{ACCENT}};background:#FFFFFF;">
  <img src="{{LOGO_URL}}" alt="" style="max-height:48px;width:auto;object-fit:contain;" />
  <div style="flex:1;">
    <div style="font-size:18px;font-weight:700;color:{{PRIMARY}};letter-spacing:-0.3px;">{{COMPANY_NAME}}</div>
    <div style="font-size:12px;color:#64748B;margin-top:2px;">Monthly Investor Report — {{PROPERTY_NAME}} — {{MONTH}} {{YEAR}}</div>
  </div>
</div>
</example_output>
If LOGO_URL is provided, include the img tag. If not, omit the img tag entirely.
If neither COMPANY_NAME nor LOGO_URL is available, skip the entire report header.`;