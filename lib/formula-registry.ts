// lib/formula-registry.ts

/**
 * PHASE 2A — Formula Registry
 *
 * Known-correct formulas for standard multifamily financial metrics.
 * Used by Layer 2 of the three-layer math validation engine.
 *
 * ┌──────────────────────────────────────────────────────────────┐
 * │  THREE-LAYER MATH VALIDATION — This file serves Layer 2.    │
 * │                                                              │
 * │  Layer 1: Input Verification (source-data-registry.ts)       │
 * │  Layer 2: Formula Verification ← THIS FILE                  │
 * │    "Does Claude's formula match the registered formula?"     │
 * │    If mismatch → use registered formula, re-compute.         │
 * │  Layer 3: Arithmetic Verification (math-validator.ts)        │
 * └──────────────────────────────────────────────────────────────┘
 *
 * Two behaviors based on metric type:
 *   • Known metric — Claude's formula is checked against the registry.
 *     If reversed or wrong, Layer 2 catches it and applies the correct one.
 *   • Dynamic/custom metric — Not in registry. Passes through to Layer 3
 *     for arithmetic-only validation. Claude can perform any analysis
 *     without being limited to pre-defined metrics.
 */

// ═══════════════════════════════════════════════════════════
// FORMULA ENTRY TYPE
// ═══════════════════════════════════════════════════════════

export interface FormulaEntry {
  /** Human-readable name for audit logs */
  name: string;

  /**
   * The canonical formula expression.
   * Uses input key names as variables. Evaluated by mathjs.
   * Example: "total_revenue - total_operating_expenses"
   */
  formula: string;

  /**
   * Required input keys. The validator checks that Claude
   * provided all of these in the calculation's inputs{}.
   */
  required_inputs: string[];

  /**
   * Maximum acceptable difference between Claude's result
   * and the backend's result. Accounts for rounding.
   *   1   = within $1 for dollar amounts
   *   0.1 = within 0.1 for percentages
   */
  tolerance: number;

  /**
   * Alternate metric names that map to this formula.
   * Claude might call it "NOI" or "Net Operating Income" or
   * "net_operating_income" — all should resolve to the same entry.
   */
  aliases: string[];

  /**
   * Whether this formula has a known sign convention issue.
   * Budget variance can be "actual - budget" or "budget - actual" —
   * both are valid conventions. When true, Layer 2 checks magnitude
   * match rather than exact formula match.
   */
  sign_flexible: boolean;
}

// ═══════════════════════════════════════════════════════════
// THE FORMULA REGISTRY
// ═══════════════════════════════════════════════════════════

export const FORMULA_REGISTRY: Record<string, FormulaEntry> = {

  // ── Core P&L Metrics ──

  net_operating_income: {
    name: 'Net Operating Income',
    formula: 'total_revenue - total_operating_expenses',
    required_inputs: ['total_revenue', 'total_operating_expenses'],
    tolerance: 1,
    aliases: ['noi', 'net_operating_income', 'net operating income'],
    sign_flexible: false,
  },

  noi_margin: {
    name: 'NOI Margin',
    formula: '(noi / total_revenue) * 100',
    required_inputs: ['noi', 'total_revenue'],
    tolerance: 0.1,
    aliases: ['noi_margin', 'noi margin', 'noi_margin_percent'],
    sign_flexible: false,
  },

  effective_gross_income: {
    name: 'Effective Gross Income',
    formula: 'gross_potential_rent - vacancy_loss - concessions - bad_debt + other_income',
    required_inputs: ['gross_potential_rent', 'vacancy_loss', 'concessions', 'bad_debt', 'other_income'],
    tolerance: 1,
    aliases: ['egi', 'effective_gross_income', 'effective gross income'],
    sign_flexible: false,
  },

  expense_ratio: {
    name: 'Expense Ratio',
    formula: '(total_operating_expenses / total_revenue) * 100',
    required_inputs: ['total_operating_expenses', 'total_revenue'],
    tolerance: 0.1,
    aliases: ['expense_ratio', 'opex_ratio', 'operating_expense_ratio'],
    sign_flexible: false,
  },

  // ── Per-Unit Metrics ──

  revenue_per_unit: {
    name: 'Revenue Per Unit',
    formula: 'total_revenue / units',
    required_inputs: ['total_revenue', 'units'],
    tolerance: 1,
    aliases: ['revenue_per_unit', 'rev_per_unit'],
    sign_flexible: false,
  },

  expense_per_unit: {
    name: 'Expense Per Unit',
    formula: 'total_operating_expenses / units',
    required_inputs: ['total_operating_expenses', 'units'],
    tolerance: 1,
    aliases: ['expense_per_unit', 'opex_per_unit', 'expenses_per_unit'],
    sign_flexible: false,
  },

  noi_per_unit: {
    name: 'NOI Per Unit',
    formula: 'noi / units',
    required_inputs: ['noi', 'units'],
    tolerance: 1,
    aliases: ['noi_per_unit'],
    sign_flexible: false,
  },

  // ── Occupancy ──

  economic_occupancy: {
    name: 'Economic Occupancy',
    formula: '(effective_gross_income / gross_potential_rent) * 100',
    required_inputs: ['effective_gross_income', 'gross_potential_rent'],
    tolerance: 0.1,
    aliases: ['economic_occupancy', 'economic occupancy', 'economic_occ'],
    sign_flexible: false,
  },

  physical_occupancy: {
    name: 'Physical Occupancy',
    formula: '(occupied_units / total_units) * 100',
    required_inputs: ['occupied_units', 'total_units'],
    tolerance: 0.1,
    aliases: ['physical_occupancy', 'physical occupancy', 'occupancy_rate'],
    sign_flexible: false,
  },

  vacancy_rate: {
    name: 'Vacancy Rate',
    formula: '100 - physical_occupancy',
    required_inputs: ['physical_occupancy'],
    tolerance: 0.1,
    aliases: ['vacancy_rate', 'vacancy rate', 'vacancy_pct'],
    sign_flexible: false,
  },

  // ── Variance Metrics ──

  budget_variance_dollar: {
    name: 'Budget Variance ($)',
    formula: 'actual - budget',
    required_inputs: ['actual', 'budget'],
    tolerance: 1,
    aliases: [
      'budget_variance_dollar', 'budget_variance', 'budget variance',
      'variance_dollar', 'budget_var', 'favorable_variance',
    ],
    sign_flexible: true, // "actual - budget" or "budget - actual" both valid
  },

  budget_variance_percent: {
    name: 'Budget Variance (%)',
    formula: '((actual - budget) / budget) * 100',
    required_inputs: ['actual', 'budget'],
    tolerance: 0.1,
    aliases: [
      'budget_variance_percent', 'budget_variance_pct',
      'variance_percent', 'budget_var_pct',
    ],
    sign_flexible: true,
  },

  mom_change_dollar: {
    name: 'Month-over-Month Change ($)',
    formula: 'current - prior',
    required_inputs: ['current', 'prior'],
    tolerance: 1,
    aliases: ['mom_change_dollar', 'mom_change', 'month_over_month_change'],
    sign_flexible: true,
  },

  mom_change_percent: {
    name: 'Month-over-Month Change (%)',
    formula: '((current - prior) / prior) * 100',
    required_inputs: ['current', 'prior'],
    tolerance: 0.1,
    aliases: [
      'mom_change_percent', 'mom_change_pct', 'mom_percent',
      'month_over_month_percent',
    ],
    sign_flexible: true,
  },

  // ── Rent Metrics ──

  loss_to_lease: {
    name: 'Loss to Lease',
    formula: 'market_rent_total - actual_rent_total',
    required_inputs: ['market_rent_total', 'actual_rent_total'],
    tolerance: 1,
    aliases: ['loss_to_lease', 'ltl', 'loss to lease'],
    sign_flexible: true,
  },

  avg_rent_per_sqft: {
    name: 'Average Rent per Square Foot',
    formula: 'avg_rent / avg_sqft',
    required_inputs: ['avg_rent', 'avg_sqft'],
    tolerance: 0.01,
    aliases: ['avg_rent_per_sqft', 'rent_per_sqft', 'rent_psf'],
    sign_flexible: false,
  },

  concession_per_unit: {
    name: 'Concession Per Unit',
    formula: 'concessions / units',
    required_inputs: ['concessions', 'units'],
    tolerance: 1,
    aliases: ['concession_per_unit', 'concessions_per_unit'],
    sign_flexible: false,
  },
};

// ═══════════════════════════════════════════════════════════
// LOOKUP FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Normalize a metric name for registry lookup.
 * Handles: "Net Operating Income" → "net_operating_income"
 *          "NOI Margin" → "noi_margin"
 *          "Budget Variance ($)" → "budget_variance_dollar"
 */
function normalizeMetricName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[($%)]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .trim();
}

/**
 * Look up a formula entry by metric name.
 * Tries: exact key match → normalized key match → alias match.
 * Returns null for custom/dynamic metrics (not in registry).
 */
export function lookupFormula(metricName: string): FormulaEntry | null {
  const normalized = normalizeMetricName(metricName);

  // Direct key match
  if (FORMULA_REGISTRY[normalized]) {
    return FORMULA_REGISTRY[normalized];
  }

  // Search all entries by alias
  for (const entry of Object.values(FORMULA_REGISTRY)) {
    for (const alias of entry.aliases) {
      if (normalizeMetricName(alias) === normalized) {
        return entry;
      }
    }
  }

  // Partial match — try matching the core metric part
  // e.g. "property_tax_budget_variance" → "budget_variance_dollar"
  if (normalized.includes('budget_variance') || normalized.includes('variance_dollar')) {
    return FORMULA_REGISTRY.budget_variance_dollar;
  }
  if (normalized.includes('variance_percent') || normalized.includes('variance_pct')) {
    return FORMULA_REGISTRY.budget_variance_percent;
  }
  if (normalized.includes('mom_change') && normalized.includes('percent')) {
    return FORMULA_REGISTRY.mom_change_percent;
  }
  if (normalized.includes('mom_change') || normalized.includes('month_over_month')) {
    return FORMULA_REGISTRY.mom_change_dollar;
  }
  if (normalized.includes('per_unit') && normalized.includes('revenue')) {
    return FORMULA_REGISTRY.revenue_per_unit;
  }
  if (normalized.includes('per_unit') && (normalized.includes('expense') || normalized.includes('opex'))) {
    return FORMULA_REGISTRY.expense_per_unit;
  }
  if (normalized.includes('per_unit') && normalized.includes('noi')) {
    return FORMULA_REGISTRY.noi_per_unit;
  }

  // Not found — this is a custom/dynamic metric
  return null;
}

/**
 * Check if Claude's formula is structurally equivalent to the
 * registered formula. Handles sign convention differences.
 *
 * For sign_flexible formulas (like budget_variance):
 *   "actual - budget" and "budget - actual" both pass.
 *   Layer 3 will verify the arithmetic is internally consistent.
 *
 * For strict formulas (like NOI):
 *   "total_revenue - total_operating_expenses" passes.
 *   "total_operating_expenses - total_revenue" fails → override.
 */
export function isFormulaMatch(
  claudeFormula: string,
  registryEntry: FormulaEntry,
  claudeInputs: Record<string, number>
): { match: boolean; reason?: string } {
  // Check that all required inputs are present (possibly with prefix mapping)
  const claudeInputKeys = Object.keys(claudeInputs);
  const missingInputs: string[] = [];

  for (const required of registryEntry.required_inputs) {
    const found = claudeInputKeys.some(key => {
      const normalizedKey = normalizeMetricName(key);
      const normalizedRequired = normalizeMetricName(required);
      return normalizedKey === normalizedRequired
        || normalizedKey.endsWith('_' + normalizedRequired)
        || normalizedKey.startsWith(normalizedRequired + '_');
    });
    if (!found) missingInputs.push(required);
  }

  if (missingInputs.length > 0) {
    return {
      match: false,
      reason: `Missing required inputs: ${missingInputs.join(', ')}`,
    };
  }

  // For sign-flexible formulas, we accept either convention
  if (registryEntry.sign_flexible) {
    return { match: true };
  }

  // For strict formulas, normalize and compare
  const normalizedClaude = normalizeFormula(claudeFormula);
  const normalizedRegistry = normalizeFormula(registryEntry.formula);

  if (normalizedClaude === normalizedRegistry) {
    return { match: true };
  }

  // Check if it's just a variable naming difference
  // e.g. Claude uses "noi" for what registry calls "net_operating_income"
  // As long as the structure is the same, it's a match
  const claudeOps = extractOperators(claudeFormula);
  const registryOps = extractOperators(registryEntry.formula);

  if (claudeOps === registryOps) {
    return { match: true };
  }

  return {
    match: false,
    reason: `Formula mismatch: Claude used "${claudeFormula}", expected "${registryEntry.formula}"`,
  };
}

// ── Internal helpers ──

function normalizeFormula(formula: string): string {
  return formula
    .replace(/\s+/g, '')
    .toLowerCase()
    .replace(/[()]/g, '');
}

function extractOperators(formula: string): string {
  return formula.replace(/[a-z_0-9.]+/gi, '').replace(/\s/g, '');
}
