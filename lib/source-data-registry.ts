// lib/source-data-registry.ts

/**
 * PHASE 1 — Source Data Registry
 *
 * The extraction step (Call 1) creates a Source Data Registry:
 * a canonical set of raw values that becomes the single source of
 * truth for everything downstream.
 *
 * Stored on: reports.extracted_data (JSONB)
 *
 * ┌──────────────────────────────────────────────────────────────┐
 * │  THREE-LAYER MATH VALIDATION — This file serves Layer 1.    │
 * │                                                              │
 * │  Layer 1: Input Verification                                 │
 * │    "Do the input values match the Source Data Registry?"     │
 * │    If mismatch → substitute registry value, re-run formula.  │
 * │                                                              │
 * │  Layer 2: Formula Verification (formula-registry.ts, Phase 2)│
 * │  Layer 3: Arithmetic Verification (math-validator.ts, Phase 2)│
 * └──────────────────────────────────────────────────────────────┘
 *
 * INPUT KEY MAPPING RULES (used by math-validator.ts in Phase 2):
 *   1. Direct match:   "total_revenue"        → registry.t12.current_month.total_revenue
 *   2. Prefix match:   "actual_X"             → registry.t12.current_month.[X]
 *                       "budget_X"             → registry.budget.current_month.[X]
 *                       "prior_X"              → registry.t12.prior_month.[X]
 *   3. Line item:      "actual_property_taxes" → registry.t12.current_month.line_items.expenses.property_taxes
 *   4. Rent roll:      "physical_occupancy"    → registry.rent_roll.physical_occupancy
 *   5. Literal:        "units"                 → registry.units
 *   Fallback: If no registry match found, skip Layer 1 for that input.
 *             Log "unverifiable_input" warning. Proceed to Layers 2 and 3.
 */

// ═══════════════════════════════════════════════════════════
// SOURCE DATA REGISTRY — Core Type
// ═══════════════════════════════════════════════════════════

/**
 * SourceDataRegistry — The canonical extracted data shape.
 * Matches the JSON structure from the architecture document.
 *
 * Every number in a generated report traces back to a value
 * in this registry. If a number can't be traced, it's either
 * a derived metric (verified by Layers 2+3) or a fabrication.
 */
export interface SourceDataRegistry {
  report_month: string;              // e.g. "November 2025"
  property: string;                  // e.g. "Hill at Woodway"
  units: number | null;

  t12: {
    current_month: T12MonthData;
    prior_month: T12MonthData | null;
    trailing_12: TrailingMonthSummary[] | null;
  };

  budget: {
    current_month: BudgetMonthData | null;
  } | null;

  rent_roll: RentRollData | null;

  leasing: LeasingData | null;
}

// ═══════════════════════════════════════════════════════════
// T-12 DATA TYPES
// ═══════════════════════════════════════════════════════════

export interface T12MonthData {
  total_revenue: number | null;
  total_operating_expenses: number | null;
  gross_potential_rent: number | null;
  vacancy_loss: number | null;
  loss_to_lease: number | null;
  concessions: number | null;
  bad_debt: number | null;
  other_income: number | null;
  net_rental_income: number | null;
  line_items: {
    revenue: Record<string, number>;
    expenses: Record<string, number>;
  };
}

export interface BudgetMonthData {
  total_revenue: number | null;
  total_operating_expenses: number | null;
  line_items: {
    revenue: Record<string, number>;
    expenses: Record<string, number>;
  };
}

export interface TrailingMonthSummary {
  month: string;                     // e.g. "December 2024"
  noi: number | null;
  revenue: number | null;
  expenses: number | null;
  occupancy: number | null;
}

// ═══════════════════════════════════════════════════════════
// RENT ROLL & LEASING TYPES
// ═══════════════════════════════════════════════════════════

export interface RentRollData {
  physical_occupancy: number | null;   // percentage, e.g. 91.4
  economic_occupancy: number | null;
  total_units: number | null;
  occupied_units: number | null;
  avg_market_rent: number | null;
  avg_effective_rent: number | null;
  unit_mix: UnitMixEntry[] | null;
}

export interface UnitMixEntry {
  floorplan: string;
  unit_count: number;
  avg_rent: number | null;
  avg_sqft: number | null;
  avg_rent_per_sqft: number | null;
  occupancy_pct: number | null;
}

export interface LeasingData {
  move_ins: number | null;
  move_outs: number | null;
  renewals: number | null;
  notices_to_vacate: number | null;
  new_lease_avg_rent: number | null;
  renewal_avg_rent: number | null;
}

// ═══════════════════════════════════════════════════════════
// INPUT KEY RESOLVER — Layer 1 Helper
// ═══════════════════════════════════════════════════════════

/**
 * Result of resolving an input key against the registry.
 */
export interface InputResolution {
  found: boolean;
  value: number | null;
  path: string;                      // human-readable path for audit log
  source: 'direct' | 'prefix' | 'line_item' | 'rent_roll' | 'literal' | 'unresolved';
}

/**
 * Resolves an input key from a calculations[] entry against
 * the Source Data Registry. Used by math-validator.ts (Phase 2)
 * to verify that Claude used the correct input values.
 *
 * @param key    — The input key from Claude's calculation, e.g. "total_revenue", "actual_property_taxes"
 * @param registry — The Source Data Registry from extraction
 * @returns      — Resolution result with value and audit path
 *
 * Examples:
 *   resolveInputKey("total_revenue", registry)
 *     → { found: true, value: 277826, path: "t12.current_month.total_revenue", source: "direct" }
 *
 *   resolveInputKey("budget_total_expenses", registry)
 *     → { found: true, value: 194000, path: "budget.current_month.total_operating_expenses", source: "prefix" }
 *
 *   resolveInputKey("actual_property_taxes", registry)
 *     → { found: true, value: 46244, path: "t12.current_month.line_items.expenses.property_taxes", source: "line_item" }
 */
export function resolveInputKey(key: string, registry: SourceDataRegistry): InputResolution {
  const notFound: InputResolution = {
    found: false,
    value: null,
    path: `unresolved: ${key}`,
    source: 'unresolved',
  };

  // Rule 5: Literal match — "units"
  if (key === 'units') {
    return {
      found: registry.units !== null,
      value: registry.units,
      path: 'units',
      source: 'literal',
    };
  }

  // Rule 4: Rent roll match
  const rentRollKeys: Record<string, keyof RentRollData> = {
    physical_occupancy: 'physical_occupancy',
    economic_occupancy: 'economic_occupancy',
    total_units: 'total_units',
    occupied_units: 'occupied_units',
    avg_market_rent: 'avg_market_rent',
    avg_effective_rent: 'avg_effective_rent',
  };
  if (rentRollKeys[key] && registry.rent_roll) {
    const rrKey = rentRollKeys[key];
    const val = registry.rent_roll[rrKey];
    return {
      found: val !== null && val !== undefined,
      value: val as number | null,
      path: `rent_roll.${rrKey}`,
      source: 'rent_roll',
    };
  }

  // Rule 1: Direct match against current month T-12
  const currentMonth = registry.t12.current_month;
  const directKeys: (keyof T12MonthData)[] = [
    'total_revenue', 'total_operating_expenses', 'gross_potential_rent',
    'vacancy_loss', 'loss_to_lease', 'concessions', 'bad_debt',
    'other_income', 'net_rental_income',
  ];
  for (const dk of directKeys) {
    if (key === dk) {
      const val = currentMonth[dk];
      if (typeof val === 'number' || val === null) {
        return {
          found: val !== null,
          value: val,
          path: `t12.current_month.${dk}`,
          source: 'direct',
        };
      }
    }
  }

  // Rule 2: Prefix match — "actual_X", "budget_X", "prior_X"
  if (key.startsWith('actual_')) {
    const remainder = key.slice(7); // strip "actual_"
    return resolveFromT12Month(remainder, currentMonth, 't12.current_month', 'prefix');
  }
  if (key.startsWith('budget_') && registry.budget?.current_month) {
    const remainder = key.slice(7); // strip "budget_"
    return resolveFromBudget(remainder, registry.budget.current_month, 'budget.current_month', 'prefix');
  }
  if (key.startsWith('prior_') && registry.t12.prior_month) {
    const remainder = key.slice(6); // strip "prior_"
    return resolveFromT12Month(remainder, registry.t12.prior_month, 't12.prior_month', 'prefix');
  }

  // Rule 3: Line item match (without prefix) — check revenue then expenses
  const lineItemResult = resolveLineItem(key, currentMonth, 't12.current_month');
  if (lineItemResult.found) return lineItemResult;

  return notFound;
}

// ═══════════════════════════════════════════════════════════
// INTERNAL HELPERS
// ═══════════════════════════════════════════════════════════

function resolveFromT12Month(
  key: string,
  month: T12MonthData,
  pathPrefix: string,
  source: InputResolution['source']
): InputResolution {
  // Try direct field first
  const directKeys: (keyof T12MonthData)[] = [
    'total_revenue', 'total_operating_expenses', 'gross_potential_rent',
    'vacancy_loss', 'loss_to_lease', 'concessions', 'bad_debt',
    'other_income', 'net_rental_income',
  ];
  for (const dk of directKeys) {
    if (key === dk || key === dk.replace('total_operating_', 'total_')) {
      const val = month[dk];
      if (typeof val === 'number' || val === null) {
        return { found: val !== null, value: val, path: `${pathPrefix}.${dk}`, source };
      }
    }
  }

  // Try line items
  return resolveLineItem(key, month, pathPrefix);
}

function resolveFromBudget(
  key: string,
  budget: BudgetMonthData,
  pathPrefix: string,
  source: InputResolution['source']
): InputResolution {
  // Direct field
  if (key === 'total_revenue' && budget.total_revenue !== null) {
    return { found: true, value: budget.total_revenue, path: `${pathPrefix}.total_revenue`, source };
  }
  if ((key === 'total_operating_expenses' || key === 'total_expenses') && budget.total_operating_expenses !== null) {
    return { found: true, value: budget.total_operating_expenses, path: `${pathPrefix}.total_operating_expenses`, source };
  }

  // Line items
  if (budget.line_items) {
    if (budget.line_items.revenue[key] !== undefined) {
      return { found: true, value: budget.line_items.revenue[key], path: `${pathPrefix}.line_items.revenue.${key}`, source };
    }
    if (budget.line_items.expenses[key] !== undefined) {
      return { found: true, value: budget.line_items.expenses[key], path: `${pathPrefix}.line_items.expenses.${key}`, source };
    }
  }

  return { found: false, value: null, path: `unresolved: ${pathPrefix}.${key}`, source: 'unresolved' };
}

function resolveLineItem(
  key: string,
  month: T12MonthData,
  pathPrefix: string
): InputResolution {
  if (!month.line_items) {
    return { found: false, value: null, path: `unresolved: ${pathPrefix}.line_items.${key}`, source: 'unresolved' };
  }

  // Check revenue line items
  if (month.line_items.revenue[key] !== undefined) {
    return {
      found: true,
      value: month.line_items.revenue[key],
      path: `${pathPrefix}.line_items.revenue.${key}`,
      source: 'line_item',
    };
  }

  // Check expense line items
  if (month.line_items.expenses[key] !== undefined) {
    return {
      found: true,
      value: month.line_items.expenses[key],
      path: `${pathPrefix}.line_items.expenses.${key}`,
      source: 'line_item',
    };
  }

  return { found: false, value: null, path: `unresolved: ${pathPrefix}.line_items.${key}`, source: 'unresolved' };
}

// ═══════════════════════════════════════════════════════════
// REGISTRY BUILDER — Converts extraction output to registry
// ═══════════════════════════════════════════════════════════

/**
 * Builds a SourceDataRegistry from the raw extraction JSON.
 * The extraction prompt (Call 1) returns data in the ExtractedFinancialData
 * format (from extraction-schema.ts). This function normalizes it into
 * the canonical registry shape.
 *
 * Called by report-generator.ts after extraction, before narrative generation.
 * The registry is stored on reports.extracted_data for validation.
 */
export function buildRegistryFromExtraction(
  extracted: Record<string, unknown>,
  propertyName: string,
  reportMonth: string,
  units: number | null
): SourceDataRegistry {
  const income = (extracted.income || {}) as Record<string, Record<string, number | null>>;
  const expenses = (extracted.expenses || {}) as Record<string, unknown>;
  const noi = (extracted.noi || {}) as Record<string, number | null>;
  const occupancy = (extracted.occupancy || {}) as Record<string, number | null>;
  const leasing = (extracted.leasing_activity || {}) as Record<string, number | null>;
  const rentRoll = (extracted.rent_roll || {}) as Record<string, unknown>;
  const trailing = (extracted.trailing_12 || {}) as Record<string, unknown[]>;

  // Build T-12 current month
  const currentMonth: T12MonthData = {
    total_revenue: getNum(income.total_revenue, 'current'),
    total_operating_expenses: getNum((expenses.total_expenses || {}) as Record<string, number | null>, 'current'),
    gross_potential_rent: getNum(income.gross_potential_rent, 'current'),
    vacancy_loss: getNum(income.vacancy_loss, 'current'),
    loss_to_lease: getNum(income.loss_to_lease, 'current'),
    concessions: getNum(income.concessions, 'current'),
    bad_debt: getNum(income.bad_debt, 'current'),
    other_income: getNum(income.other_income, 'current'),
    net_rental_income: getNum(income.net_rental_income, 'current'),
    line_items: {
      revenue: buildLineItems(income, 'current'),
      expenses: buildExpenseLineItems(expenses, 'current'),
    },
  };

  // Build T-12 prior month
  const priorMonth: T12MonthData = {
    total_revenue: getNum(income.total_revenue, 'prior'),
    total_operating_expenses: getNum((expenses.total_expenses || {}) as Record<string, number | null>, 'prior'),
    gross_potential_rent: getNum(income.gross_potential_rent, 'prior'),
    vacancy_loss: getNum(income.vacancy_loss, 'prior'),
    loss_to_lease: getNum(income.loss_to_lease, 'prior'),
    concessions: getNum(income.concessions, 'prior'),
    bad_debt: getNum(income.bad_debt, 'prior'),
    other_income: getNum(income.other_income, 'prior'),
    net_rental_income: getNum(income.net_rental_income, 'prior'),
    line_items: {
      revenue: buildLineItems(income, 'prior'),
      expenses: buildExpenseLineItems(expenses, 'prior'),
    },
  };

  // Build budget
  const budgetData: BudgetMonthData | null = income.total_revenue?.budget !== undefined ? {
    total_revenue: getNum(income.total_revenue, 'budget'),
    total_operating_expenses: getNum((expenses.total_expenses || {}) as Record<string, number | null>, 'budget'),
    line_items: {
      revenue: buildLineItems(income, 'budget'),
      expenses: buildExpenseLineItems(expenses, 'budget'),
    },
  } : null;

  // Build trailing 12
  const trailingMonths: TrailingMonthSummary[] | null =
    trailing.months && Array.isArray(trailing.months)
      ? (trailing.months as string[]).map((month, i) => ({
          month,
          noi: (trailing.noi as (number | null)[])?.[i] ?? null,
          revenue: (trailing.revenue as (number | null)[])?.[i] ?? null,
          expenses: (trailing.expenses as (number | null)[])?.[i] ?? null,
          occupancy: (trailing.occupancy as (number | null)[])?.[i] ?? null,
        }))
      : null;

  // Build rent roll
  const rrData: RentRollData | null = rentRoll.total_units ? {
    physical_occupancy: occupancy.physical_percent ?? null,
    economic_occupancy: occupancy.economic_percent ?? null,
    total_units: (rentRoll.total_units as number) ?? null,
    occupied_units: occupancy.units_occupied ?? null,
    avg_market_rent: (rentRoll.avg_rent as number) ?? null,
    avg_effective_rent: (rentRoll.avg_rent as number) ?? null,
    unit_mix: Array.isArray(rentRoll.unit_mix)
      ? (rentRoll.unit_mix as UnitMixEntry[])
      : null,
  } : null;

  // Build leasing
  const leasingData: LeasingData | null = leasing.move_ins !== undefined ? {
    move_ins: leasing.move_ins,
    move_outs: leasing.move_outs,
    renewals: leasing.renewals,
    notices_to_vacate: leasing.notices_to_vacate,
    new_lease_avg_rent: leasing.new_lease_avg_rent,
    renewal_avg_rent: leasing.renewal_avg_rent,
  } : null;

  return {
    report_month: reportMonth,
    property: propertyName,
    units,
    t12: {
      current_month: currentMonth,
      prior_month: hasSomeData(priorMonth) ? priorMonth : null,
      trailing_12: trailingMonths,
    },
    budget: budgetData ? { current_month: budgetData } : null,
    rent_roll: rrData,
    leasing: leasingData,
  };
}

// ── Internal helpers ──

function getNum(obj: Record<string, number | null> | undefined, key: string): number | null {
  if (!obj) return null;
  return obj[key] ?? null;
}

function buildLineItems(income: Record<string, Record<string, number | null>>, period: string): Record<string, number> {
  const result: Record<string, number> = {};
  const skip = new Set(['total_revenue', 'total_expenses']);
  for (const [key, vals] of Object.entries(income)) {
    if (skip.has(key) || !vals || typeof vals !== 'object') continue;
    const v = vals[period];
    if (typeof v === 'number') result[key] = v;
  }
  return result;
}

function buildExpenseLineItems(expenses: Record<string, unknown>, period: string): Record<string, number> {
  const result: Record<string, number> = {};
  const categories = (expenses.categories || []) as Array<Record<string, unknown>>;
  for (const cat of categories) {
    const name = cat.name as string;
    const val = cat[period];
    if (name && typeof val === 'number') {
      const key = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      result[key] = val;
    }
  }
  return result;
}

function hasSomeData(month: T12MonthData): boolean {
  return month.total_revenue !== null || month.total_operating_expenses !== null;
}
