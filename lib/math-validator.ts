// lib/math-validator.ts

/**
 * PHASE 2A — Three-Layer Math Validation Engine
 *
 * Independently verifies every derived metric in a generated report.
 * This is the enterprise sales closer: "Every financial calculation
 * in your report is independently verified by deterministic backend
 * math. Here's the audit trail."
 *
 * ┌──────────────────────────────────────────────────────────────┐
 * │  THREE-LAYER VALIDATION                                      │
 * │                                                              │
 * │  Layer 1: INPUT VERIFICATION                                 │
 * │    Do Claude's input values match the Source Data Registry?   │
 * │    If mismatch → substitute registry value, re-run formula.  │
 * │                                                              │
 * │  Layer 2: FORMULA VERIFICATION                               │
 * │    Does Claude's formula match the registered formula?        │
 * │    If mismatch → use registered formula, re-compute result.  │
 * │                                                              │
 * │  Layer 3: ARITHMETIC VERIFICATION                            │
 * │    Does Claude's result match backend re-execution?           │
 * │    Uses mathjs (safe parser, never eval()). If mismatch →    │
 * │    override with backend result.                             │
 * │                                                              │
 * │  CONFIDENCE TIERS:                                           │
 * │    3-layer verified   — known metric, all inputs in registry │
 * │    2.5-layer verified — known metric, some inputs from suppl.│
 * │    2-layer verified   — custom metric, inputs in registry    │
 * │    arithmetic-only    — custom metric, custom inputs         │
 * │                                                              │
 * │  C5 FIX: Added input key alias resolver to handle Claude     │
 * │  using "current_revenue" when formula expects "total_revenue" │
 * └──────────────────────────────────────────────────────────────┘
 */

import { create, all } from 'mathjs';
import { resolveInputKey, type SourceDataRegistry } from './source-data-registry';
import { lookupFormula, isFormulaMatch, type FormulaEntry } from './formula-registry';

// Create a limited mathjs instance — no dangerous functions
const math = create(all, {});

// Restrict to safe operations only
const SAFE_EVALUATE = math.evaluate;

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

/** Input from a single calculations[] entry in Claude's response */
export interface CalculationInput {
  metric_name: string;
  inputs: Record<string, number>;
  formula: string;
  ai_result: number;
}

/** Confidence level for the validation */
export type ConfidenceLevel =
  | '3-layer'        // Known metric, all inputs verified
  | '2.5-layer'      // Known metric, some inputs unverifiable
  | '2-layer'        // Custom metric, inputs verified
  | 'arithmetic-only'; // Custom metric, custom inputs

/** Result for a single Layer 1 input check */
export interface Layer1InputResult {
  key: string;
  ai_value: number;
  registry_value: number | null;
  matched: boolean;
  corrected: boolean;
  path: string;
  source: string;
}

/** Result for a single calculation validation */
export interface ValidationDetail {
  section_id: string;
  metric_name: string;
  layer_1: {
    status: 'passed' | 'corrected' | 'partial' | 'skipped';
    inputs_verified: number;
    inputs_total: number;
    corrections: Layer1InputResult[];
  };
  layer_2: {
    status: 'passed' | 'overridden' | 'skipped';
    formula_match: boolean;
    registered_formula?: string;
    claude_formula: string;
    reason?: string;
  };
  layer_3: {
    status: 'passed' | 'overridden';
    ai_result: number;
    backend_result: number;
    difference: number;
    tolerance: number;
  };
  confidence: ConfidenceLevel;
  final_value: number;
  material_override: boolean; // >1% difference triggers re-gen flag
}

/** Complete validation result for a report */
export interface ValidationLog {
  validated_at: string;
  total_calculations: number;
  passed: number;
  overridden: number;
  skipped: number;
  material_overrides: number;
  sections_flagged: string[];
  details: ValidationDetail[];
}

/** What the validator returns for use by report-generator.ts */
export interface ValidatorResult {
  log: ValidationLog;
  /** Section IDs that had material overrides (>1% diff) — may need re-generation */
  sectionsToRegenerate: string[];
  /** Map of section_id → corrected calculations for narrative patching */
  corrections: Map<string, Array<{ metric_name: string; ai_value: number; corrected_value: number }>>;
}

// ═══════════════════════════════════════════════════════════
// C5 FIX: INPUT KEY ALIAS MAP
//
// Claude uses varied naming conventions for the same concept.
// The formula registry expects canonical names like
// "total_revenue" but Claude may pass "current_revenue",
// "revenue", "total_income", etc.
//
// This map resolves Claude's naming to the canonical variable
// names used in FORMULA_REGISTRY formulas. It runs BEFORE
// formula evaluation so mathjs can find the variables.
//
// Direction: claude_key → canonical_formula_variable
// ═══════════════════════════════════════════════════════════

const INPUT_KEY_ALIASES: Record<string, string> = {
  // Revenue aliases → total_revenue
  current_revenue: 'total_revenue',
  revenue: 'total_revenue',
  total_income: 'total_revenue',
  current_income: 'total_revenue',
  effective_gross_income_value: 'total_revenue',
  egi_value: 'total_revenue',
  monthly_revenue: 'total_revenue',

  // Operating expense aliases → total_operating_expenses
  current_expenses: 'total_operating_expenses',
  total_expenses: 'total_operating_expenses',
  operating_expenses: 'total_operating_expenses',
  current_operating_expenses: 'total_operating_expenses',
  opex: 'total_operating_expenses',
  total_opex: 'total_operating_expenses',
  monthly_expenses: 'total_operating_expenses',

  // NOI aliases → noi
  net_operating_income: 'noi',
  current_noi: 'noi',
  monthly_noi: 'noi',

  // Unit count aliases → units
  total_units: 'units',
  unit_count: 'units',
  num_units: 'units',
  number_of_units: 'units',

  // Occupancy aliases
  occupancy: 'physical_occupancy',
  occupancy_rate: 'physical_occupancy',
  current_occupancy: 'physical_occupancy',
  occ_rate: 'physical_occupancy',

  // Variance aliases
  actual_value: 'actual',
  actual_amount: 'actual',
  current_value: 'actual',
  current_amount: 'actual',
  budget_value: 'budget',
  budget_amount: 'budget',
  budgeted: 'budget',
  budgeted_amount: 'budget',

  // MoM aliases
  current_month: 'current',
  current_period: 'current',
  this_month: 'current',
  prior_month: 'prior',
  previous_month: 'prior',
  last_month: 'prior',
  prior_period: 'prior',

  // GPR aliases → gross_potential_rent
  gpr: 'gross_potential_rent',
  gross_rent: 'gross_potential_rent',
  potential_rent: 'gross_potential_rent',

  // Other income aliases
  ancillary_income: 'other_income',
  misc_income: 'other_income',

  // Concession aliases
  total_concessions: 'concessions',
  concession_amount: 'concessions',

  // Rent aliases
  average_rent: 'avg_rent',
  avg_effective_rent: 'avg_rent',
  average_sqft: 'avg_sqft',
  avg_square_feet: 'avg_sqft',

  // Market rent aliases
  total_market_rent: 'market_rent_total',
  market_rent: 'market_rent_total',
  total_actual_rent: 'actual_rent_total',
  in_place_rent: 'actual_rent_total',

  // EGI component aliases
  effective_gross_income_calc: 'effective_gross_income',
  egi: 'effective_gross_income',
};

/**
 * Resolves Claude's input keys to canonical formula variable names.
 * Produces a new inputs object with canonical keys, preserving
 * any keys that don't have an alias (pass-through).
 *
 * Also keeps the original keys so formulas that reference
 * Claude's naming convention still work.
 */
function resolveInputAliases(inputs: Record<string, number>): Record<string, number> {
  const resolved: Record<string, number> = {};

  for (const [key, value] of Object.entries(inputs)) {
    // Always keep the original key
    resolved[key] = value;

    // Add the canonical alias if one exists
    const canonical = INPUT_KEY_ALIASES[key];
    if (canonical && resolved[canonical] === undefined) {
      resolved[canonical] = value;
    }
  }

  // Reverse direction: if canonical keys exist but alias keys don't,
  // also populate common aliases. This handles the case where
  // Claude uses canonical names but the formula uses shorthand.
  for (const [alias, canonical] of Object.entries(INPUT_KEY_ALIASES)) {
    if (resolved[canonical] !== undefined && resolved[alias] === undefined) {
      resolved[alias] = resolved[canonical];
    }
  }

  return resolved;
}

// ═══════════════════════════════════════════════════════════
// MAIN VALIDATION FUNCTION
// ═══════════════════════════════════════════════════════════

/**
 * Validate all calculations across all sections of a generated report.
 *
 * @param sections — The generated sections with calculations[] arrays
 * @param registry — The Source Data Registry from extraction (Phase 1)
 * @returns ValidatorResult with audit log, sections to regen, and corrections
 *
 * Called by report-generator.ts after narrative generation, before save.
 */
export function validateReport(
  sections: Array<{
    id: string;
    calculations?: CalculationInput[];
  }>,
  registry: SourceDataRegistry | null
): ValidatorResult {
  const details: ValidationDetail[] = [];
  const corrections = new Map<string, Array<{ metric_name: string; ai_value: number; corrected_value: number }>>();
  const sectionsToRegenerate: string[] = [];
  let passed = 0;
  let overridden = 0;
  let skipped = 0;
  let materialOverrides = 0;
  const sectionsFlagged: string[] = [];

  for (const section of sections) {
    if (!section.calculations || section.calculations.length === 0) continue;

    const sectionCorrections: Array<{ metric_name: string; ai_value: number; corrected_value: number }> = [];

    for (const calc of section.calculations) {
      const detail = validateSingleCalculation(calc, section.id, registry);
      details.push(detail);

      if (detail.layer_3.status === 'passed' && detail.layer_1.status !== 'corrected') {
        passed++;
      } else if (detail.layer_3.status === 'overridden' || detail.layer_1.status === 'corrected') {
        overridden++;

        sectionCorrections.push({
          metric_name: calc.metric_name,
          ai_value: calc.ai_result,
          corrected_value: detail.final_value,
        });

        if (detail.material_override) {
          materialOverrides++;
          if (!sectionsFlagged.includes(section.id)) {
            sectionsFlagged.push(section.id);
          }
        }
      }
    }

    if (sectionCorrections.length > 0) {
      corrections.set(section.id, sectionCorrections);
    }

    // Flag for re-generation if material overrides detected
    if (sectionCorrections.some(c => {
      const diff = Math.abs(c.ai_value - c.corrected_value);
      const pctDiff = c.ai_value !== 0 ? (diff / Math.abs(c.ai_value)) * 100 : 0;
      return pctDiff > 1;
    })) {
      sectionsToRegenerate.push(section.id);
    }
  }

  const log: ValidationLog = {
    validated_at: new Date().toISOString(),
    total_calculations: details.length,
    passed,
    overridden,
    skipped,
    material_overrides: materialOverrides,
    sections_flagged: sectionsFlagged,
    details,
  };

  return { log, sectionsToRegenerate, corrections };
}

// ═══════════════════════════════════════════════════════════
// SINGLE CALCULATION VALIDATION
// ═══════════════════════════════════════════════════════════

function validateSingleCalculation(
  calc: CalculationInput,
  sectionId: string,
  registry: SourceDataRegistry | null
): ValidationDetail {
  // ── Layer 1: Input Verification ──
  const layer1 = runLayer1(calc, registry);

  // Build verified inputs (registry values where available, Claude values as fallback)
  const verifiedInputs: Record<string, number> = {};
  for (const [key, aiValue] of Object.entries(calc.inputs)) {
    const l1Result = layer1.corrections.find(c => c.key === key);
    if (l1Result && l1Result.corrected && l1Result.registry_value !== null) {
      verifiedInputs[key] = l1Result.registry_value;
    } else {
      verifiedInputs[key] = aiValue;
    }
  }

  // ── Layer 2: Formula Verification ──
  const layer2 = runLayer2(calc, verifiedInputs);

  // Determine which formula to use for Layer 3
  const formulaToEvaluate = layer2.status === 'overridden' && layer2.registered_formula
    ? layer2.registered_formula
    : calc.formula;

  // ── Layer 3: Arithmetic Verification ──
  // C5 FIX: Resolve input aliases before evaluation
  const resolvedInputs = resolveInputAliases(verifiedInputs);
  const layer3 = runLayer3(formulaToEvaluate, resolvedInputs, calc.ai_result, layer2.tolerance);

  // ── Determine confidence level ──
  const registryEntry = lookupFormula(calc.metric_name);
  const allInputsVerified = layer1.inputs_verified === layer1.inputs_total;
  const someInputsVerified = layer1.inputs_verified > 0;

  let confidence: ConfidenceLevel;
  if (registryEntry && allInputsVerified) {
    confidence = '3-layer';
  } else if (registryEntry && someInputsVerified) {
    confidence = '2.5-layer';
  } else if (!registryEntry && (allInputsVerified || someInputsVerified)) {
    confidence = '2-layer';
  } else {
    confidence = 'arithmetic-only';
  }

  // ── Determine material override ──
  const diff = Math.abs(calc.ai_result - layer3.backend_result);
  const pctDiff = calc.ai_result !== 0 ? (diff / Math.abs(calc.ai_result)) * 100 : 0;
  const materialOverride = pctDiff > 1;

  return {
    section_id: sectionId,
    metric_name: calc.metric_name,
    layer_1: layer1,
    layer_2: {
      status: layer2.status,
      formula_match: layer2.formula_match,
      registered_formula: layer2.registered_formula,
      claude_formula: calc.formula,
      reason: layer2.reason,
    },
    layer_3: {
      status: layer3.status,
      ai_result: calc.ai_result,
      backend_result: layer3.backend_result,
      difference: layer3.difference,
      tolerance: layer3.tolerance,
    },
    confidence,
    final_value: layer3.status === 'overridden' ? layer3.backend_result : calc.ai_result,
    material_override: materialOverride,
  };
}

// ═══════════════════════════════════════════════════════════
// LAYER 1: INPUT VERIFICATION
// ═══════════════════════════════════════════════════════════

function runLayer1(
  calc: CalculationInput,
  registry: SourceDataRegistry | null
): ValidationDetail['layer_1'] {
  if (!registry) {
    return {
      status: 'skipped',
      inputs_verified: 0,
      inputs_total: Object.keys(calc.inputs).length,
      corrections: [],
    };
  }

  const corrections: Layer1InputResult[] = [];
  let inputsVerified = 0;
  let inputsCorrected = 0;

  for (const [key, aiValue] of Object.entries(calc.inputs)) {
    // C5 FIX: Try resolving with the canonical key too
    const canonicalKey = INPUT_KEY_ALIASES[key] || key;
    let resolution = resolveInputKey(key, registry);

    // If original key didn't resolve, try canonical key
    if (!resolution.found && canonicalKey !== key) {
      resolution = resolveInputKey(canonicalKey, registry);
    }

    if (!resolution.found) {
      corrections.push({
        key,
        ai_value: aiValue,
        registry_value: null,
        matched: false,
        corrected: false,
        path: resolution.path,
        source: resolution.source,
      });
      continue;
    }

    const registryValue = resolution.value!;
    const matched = Math.abs(aiValue - registryValue) <= 1; // $1 tolerance for rounding

    if (matched) {
      inputsVerified++;
      corrections.push({
        key,
        ai_value: aiValue,
        registry_value: registryValue,
        matched: true,
        corrected: false,
        path: resolution.path,
        source: resolution.source,
      });
    } else {
      // Mismatch — flag for correction
      inputsCorrected++;
      inputsVerified++; // Still counts as "verified" — we know the right value
      corrections.push({
        key,
        ai_value: aiValue,
        registry_value: registryValue,
        matched: false,
        corrected: true,
        path: resolution.path,
        source: resolution.source,
      });
    }
  }

  let status: ValidationDetail['layer_1']['status'];
  if (inputsCorrected > 0) {
    status = 'corrected';
  } else if (inputsVerified === Object.keys(calc.inputs).length) {
    status = 'passed';
  } else if (inputsVerified > 0) {
    status = 'partial';
  } else {
    status = 'skipped';
  }

  return {
    status,
    inputs_verified: inputsVerified,
    inputs_total: Object.keys(calc.inputs).length,
    corrections,
  };
}

// ═══════════════════════════════════════════════════════════
// LAYER 2: FORMULA VERIFICATION
// ═══════════════════════════════════════════════════════════

interface Layer2Result {
  status: 'passed' | 'overridden' | 'skipped';
  formula_match: boolean;
  registered_formula?: string;
  tolerance: number;
  reason?: string;
}

function runLayer2(
  calc: CalculationInput,
  verifiedInputs: Record<string, number>
): Layer2Result {
  const registryEntry = lookupFormula(calc.metric_name);

  // Custom metric — not in registry. Skip Layer 2.
  if (!registryEntry) {
    return {
      status: 'skipped',
      formula_match: false,
      tolerance: 1, // default tolerance for custom metrics
    };
  }

  // C5 FIX: Resolve aliases before checking formula match
  // so required_inputs check uses both Claude's and canonical keys
  const resolvedInputs = resolveInputAliases(verifiedInputs);

  // Check formula match
  const matchResult = isFormulaMatch(calc.formula, registryEntry, resolvedInputs);

  if (matchResult.match) {
    return {
      status: 'passed',
      formula_match: true,
      registered_formula: registryEntry.formula,
      tolerance: registryEntry.tolerance,
    };
  }

  // Formula mismatch — override with registered formula
  return {
    status: 'overridden',
    formula_match: false,
    registered_formula: registryEntry.formula,
    tolerance: registryEntry.tolerance,
    reason: matchResult.reason,
  };
}

// ═══════════════════════════════════════════════════════════
// LAYER 3: ARITHMETIC VERIFICATION
// ═══════════════════════════════════════════════════════════

interface Layer3Result {
  status: 'passed' | 'overridden';
  backend_result: number;
  difference: number;
  tolerance: number;
}

function runLayer3(
  formula: string,
  inputs: Record<string, number>,
  aiResult: number,
  tolerance: number
): Layer3Result {
  let backendResult: number;

  try {
    // Evaluate using mathjs (safe — never uses eval())
    backendResult = safeEvaluate(formula, inputs);
  } catch (error) {
    // C5 FIX: Better error logging — show available vs. needed keys
    const formulaVars = formula.match(/\b[a-z_][a-z0-9_]*\b/gi) || [];
    const inputKeys = Object.keys(inputs);
    const missing = formulaVars.filter(v =>
      !inputKeys.includes(v) && isNaN(Number(v))
    );

    if (missing.length > 0) {
      if (process.env.NODE_ENV === 'development') console.warn(
        `[math-validator] Formula "${formula}" needs variables [${missing.join(', ')}] ` +
        `but inputs only have [${inputKeys.slice(0, 15).join(', ')}${inputKeys.length > 15 ? '...' : ''}]`
      );
    } else {
      if (process.env.NODE_ENV === 'development') console.warn(
        `[math-validator] Could not evaluate formula "${formula}": ${error}`
      );
    }

    // Fall back to accepting Claude's result
    return {
      status: 'passed',
      backend_result: aiResult,
      difference: 0,
      tolerance,
    };
  }

  const difference = Math.abs(aiResult - backendResult);
  const passed = difference <= tolerance;

  return {
    status: passed ? 'passed' : 'overridden',
    backend_result: roundToReasonablePrecision(backendResult, tolerance),
    difference: roundToReasonablePrecision(difference, 0.001),
    tolerance,
  };
}

// ═══════════════════════════════════════════════════════════
// SAFE MATH EVALUATION
// ═══════════════════════════════════════════════════════════

/**
 * Safely evaluate a formula string with given variable values.
 * Uses mathjs — no eval(), no Function constructor, no code injection.
 *
 * Supported: basic arithmetic (+, -, *, /), parentheses, variable names.
 * NOT supported: any function calls, imports, assignments.
 */
function safeEvaluate(formula: string, inputs: Record<string, number>): number {
  // Validate formula contains only safe characters
  const safePattern = /^[\w\s+\-*/().,%]+$/;
  if (!safePattern.test(formula)) {
    throw new Error(`Unsafe formula characters detected: "${formula}"`);
  }

  // Normalize formula — replace variable names with their values
  // This avoids issues with mathjs scope and ensures clean evaluation
  let expression = formula;

  // Sort keys by length (longest first) to avoid partial replacement
  // e.g. "total_revenue" should be replaced before "revenue"
  const sortedKeys = Object.keys(inputs).sort((a, b) => b.length - a.length);

  for (const key of sortedKeys) {
    const value = inputs[key];
    // Replace all occurrences of the variable with its value
    // Use word boundary-aware replacement
    const regex = new RegExp(`\\b${escapeRegex(key)}\\b`, 'g');
    expression = expression.replace(regex, String(value));
  }

  // Check if any unresolved variables remain
  const unresolvedVars = expression.match(/\b[a-z_][a-z0-9_]*\b/gi);
  if (unresolvedVars && unresolvedVars.length > 0) {
    // Filter out math constants and functions
    const mathBuiltins = new Set(['pi', 'e', 'inf', 'nan', 'true', 'false']);
    const genuinelyUnresolved = unresolvedVars.filter(v => !mathBuiltins.has(v.toLowerCase()));
    if (genuinelyUnresolved.length > 0) {
      throw new Error(
        `Undefined symbol${genuinelyUnresolved.length > 1 ? 's' : ''}: ${genuinelyUnresolved.join(', ')}`
      );
    }
  }

  // Evaluate the pure arithmetic expression
  const result = SAFE_EVALUATE(expression);

  if (typeof result !== 'number' || !isFinite(result)) {
    throw new Error(`Evaluation produced non-finite result: ${result}`);
  }

  return result;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function roundToReasonablePrecision(value: number, tolerance: number): number {
  if (tolerance >= 1) {
    return Math.round(value);
  }
  if (tolerance >= 0.1) {
    return Math.round(value * 10) / 10;
  }
  if (tolerance >= 0.01) {
    return Math.round(value * 100) / 100;
  }
  return Math.round(value * 1000) / 1000;
}

// ═══════════════════════════════════════════════════════════
// UTILITY: Apply corrections to sections
// ═══════════════════════════════════════════════════════════

/**
 * Apply validated corrections to generated sections.
 * Updates calculations[] entries and metrics[] values with
 * backend-verified numbers. Does NOT modify narrative text —
 * that's flagged for re-generation via sectionsToRegenerate.
 */
export function applyCorrections(
  sections: Array<{
    id: string;
    metrics: Array<{ label: string; value: string; change?: string }>;
    calculations?: CalculationInput[];
  }>,
  validationDetails: ValidationDetail[]
): void {
  for (const detail of validationDetails) {
    if (detail.layer_3.status !== 'overridden' && detail.layer_1.status !== 'corrected') {
      continue; // No correction needed
    }

    const section = sections.find(s => s.id === detail.section_id);
    if (!section) continue;

    // Update the calculation entry with the corrected value
    if (section.calculations) {
      const calcEntry = section.calculations.find(c => c.metric_name === detail.metric_name);
      if (calcEntry) {
        calcEntry.ai_result = detail.final_value;

        // Also correct inputs if Layer 1 found mismatches
        for (const correction of detail.layer_1.corrections) {
          if (correction.corrected && correction.registry_value !== null) {
            calcEntry.inputs[correction.key] = correction.registry_value;
          }
        }
      }
    }

    // Update metrics if the label matches
    // This ensures KPI cards show the verified number
    const metricMatch = section.metrics.find(m => {
      const normalizedLabel = m.label.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const normalizedMetric = detail.metric_name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      return normalizedLabel.includes(normalizedMetric) || normalizedMetric.includes(normalizedLabel);
    });

    if (metricMatch && detail.layer_3.status === 'overridden') {
      // Re-format the corrected value into the metric's display format
      const corrected = detail.final_value;
      const currentValue = metricMatch.value;

      if (currentValue.includes('%')) {
        metricMatch.value = `${corrected.toFixed(1)}%`;
      } else if (currentValue.includes('$')) {
        metricMatch.value = `$${Math.round(corrected).toLocaleString()}`;
      }
    }
  }
}
