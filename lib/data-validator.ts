// lib/data-validator.ts

/**
 * CORE — Programmatic Data Validation
 *
 * Runs between Call 1 (extraction) and Call 2 (narrative) to catch
 * math errors, impossible values, and NOI ceiling violations before
 * they reach the investor report.
 */

import { ExtractedFinancialData } from './extraction-schema';
import { SectionDefinition } from './section-definitions';

export interface ValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
  corrected: ExtractedFinancialData;
  sectionsToSkip: string[]; // section IDs that should be skipped due to missing data
}

/**
 * Validate extracted financial data for accuracy and completeness.
 * Returns corrected data with auto-fixes for minor issues.
 */
export function validateExtractedData(
  data: ExtractedFinancialData,
  sections: SectionDefinition[]
): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const sectionsToSkip: string[] = [];
  const corrected = structuredClone(data);

  // ── 1. Minimum data check ──
  if (!data.data_quality.t12_found) {
    errors.push('T-12 operating statement not found in uploaded documents. Cannot generate report.');
    return { valid: false, warnings, errors, corrected, sectionsToSkip };
  }

  // ── 2. NOI = Revenue - Expenses (within 2% tolerance) ──
  const rev = data.income.total_revenue.current;
  const exp = data.expenses.total_expenses.current;
  const noi = data.noi.current;

  if (rev !== null && exp !== null && noi !== null) {
    const expectedNOI = rev - exp;
    const diff = Math.abs(noi - expectedNOI);
    const tolerance = Math.abs(rev) * 0.02;

    if (diff > tolerance) {
      warnings.push(
        `NOI sanity check: NOI ($${noi.toLocaleString()}) does not equal Revenue ($${rev.toLocaleString()}) - Expenses ($${exp.toLocaleString()}) = $${expectedNOI.toLocaleString()}. Difference: $${diff.toLocaleString()}.`
      );
      // Auto-correct NOI to match Revenue - Expenses
      corrected.noi.current = expectedNOI;
      warnings.push(`Auto-corrected NOI to $${expectedNOI.toLocaleString()}.`);
    }
  }

  // ── 3. Revenue decomposition check ──
  const gpr = data.income.gross_potential_rent.current;
  const vacancy = data.income.vacancy_loss.current;
  const ltl = data.income.loss_to_lease.current;
  const concessions = data.income.concessions.current;
  const badDebt = data.income.bad_debt.current;
  const nri = data.income.net_rental_income.current;

  if (gpr !== null && nri !== null) {
    const deductions = (vacancy || 0) + (ltl || 0) + (concessions || 0) + (badDebt || 0);
    const expectedNRI = gpr - deductions;
    const diff = Math.abs(nri - expectedNRI);
    const tolerance = Math.abs(gpr) * 0.02;

    if (diff > tolerance) {
      warnings.push(
        `Revenue decomposition check: NRI ($${nri.toLocaleString()}) does not match GPR minus deductions ($${expectedNRI.toLocaleString()}). Difference: $${diff.toLocaleString()}.`
      );
    }
  }

  // ── 4. Occupancy range check ──
  if (data.occupancy.physical_percent !== null) {
    if (data.occupancy.physical_percent > 100 || data.occupancy.physical_percent < 0) {
      warnings.push(`Physical occupancy ${data.occupancy.physical_percent}% is out of range (0-100%).`);
      corrected.occupancy.physical_percent = Math.max(0, Math.min(100, data.occupancy.physical_percent));
    }
  }

  if (data.occupancy.economic_percent !== null) {
    if (data.occupancy.economic_percent > 100 || data.occupancy.economic_percent < 0) {
      warnings.push(`Economic occupancy ${data.occupancy.economic_percent}% is out of range (0-100%).`);
      corrected.occupancy.economic_percent = Math.max(0, Math.min(100, data.occupancy.economic_percent));
    }
  }

  // ── 5. Unit count consistency ──
  if (data.occupancy.units_occupied !== null && data.occupancy.units_vacant !== null && data.property.units !== null) {
    const total = data.occupancy.units_occupied + data.occupancy.units_vacant;
    if (Math.abs(total - data.property.units) > 2) {
      warnings.push(
        `Unit count mismatch: occupied (${data.occupancy.units_occupied}) + vacant (${data.occupancy.units_vacant}) = ${total}, but property has ${data.property.units} units.`
      );
    }
  }

  // ── 6. No negative values where impossible ──
  if (rev !== null && rev < 0) {
    warnings.push(`Total revenue is negative ($${rev.toLocaleString()}) — this is unusual. Verify source data.`);
  }

  // ── 7. NOI Ceiling enforcement — strip below-NOI items ──
  // If Claude extracted any below-NOI fields (it shouldn't), remove them
  const belowNOI = corrected as unknown as Record<string, unknown>;
  const belowNOIFields = ['debt_service', 'capex', 'capital_expenditures', 'distributions', 'loan_payments', 'mortgage'];
  for (const field of belowNOIFields) {
    if (belowNOI[field] !== undefined) {
      warnings.push(`Removed below-NOI field: ${field} (NOI ceiling enforcement).`);
      delete belowNOI[field];
    }
  }

  // ── 8. Determine which sections to skip based on data availability ──
  for (const section of sections) {
    const shouldSkip = checkSectionDataAvailability(section.id, data);
    if (shouldSkip) {
      sectionsToSkip.push(section.id);
    }
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
    corrected,
    sectionsToSkip,
  };
}

/**
 * Check whether a section should be skipped based on available data.
 * Returns a skip reason string if the section should be skipped, or null if it can generate.
 */
function checkSectionDataAvailability(sectionId: string, data: ExtractedFinancialData): string | null {
  switch (sectionId) {
    // These always generate if T-12 exists (which is validated above)
    case 'executive_summary':
    case 'revenue_summary':
    case 'expense_summary':
    case 'noi_performance':
    case 'risk_watch_items':
    case 'risk_matrix':
      return null;

    // These need rent roll
    case 'rent_roll_insights':
    case 'rent_roll_deep_dive':
    case 'lease_expiration_rollover':
      return data.data_quality.rent_roll_found ? null : 'Rent roll not uploaded — unit-level data unavailable';

    // Leasing activity subsection
    case 'occupancy_leasing':
      // Can still generate occupancy from rent roll or T-12, just skip leasing subsection
      return null; // Handled in prompt — leasing data availability noted

    // Budget required
    case 'budget_vs_actual':
      return data.data_quality.budget_found ? null : 'Budget CSV not uploaded — budget comparison unavailable';

    // Revenue/expense analysis can work without budget (just no variance)
    case 'revenue_analysis':
    case 'expense_analysis':
      return null;

    // Conditional on user input (handled in prompt guidance)
    case 'capital_improvements':
    case 'capital_improvements_tracker':
    case 'investment_thesis_update':
    case 'market_positioning':
    case 'market_submarket_analysis':
    case 'asset_manager_outlook':
    case 'asset_manager_strategic_outlook':
    case 'regulatory_compliance':
    case 'resident_operational_metrics':
      return null; // These are conditional — Claude handles skip logic based on questionnaire

    default:
      return null;
  }
}

/**
 * Build human-readable skip reasons for sections that were pre-skipped.
 */
export function getSkipReason(sectionId: string, data: ExtractedFinancialData): string {
  return checkSectionDataAvailability(sectionId, data) || 'Insufficient data for this section';
}
