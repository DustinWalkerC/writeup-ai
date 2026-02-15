// lib/extraction-schema.ts

/**
 * CORE — Call 1 Extraction Output Schema
 *
 * This defines the exact JSON structure that Claude returns
 * from the data extraction call. Every field is either a
 * number or null (never fabricated).
 */

export interface FinancialLineItem {
  current: number | null;
  prior: number | null;
  budget: number | null;
}

export interface ExpenseCategory {
  name: string;
  current: number | null;
  prior: number | null;
  budget: number | null;
}

export interface UnitMixEntry {
  floorplan: string;
  unit_count: number;
  avg_rent: number | null;
  avg_sqft: number | null;
  avg_rent_per_sqft: number | null;
  occupancy_pct: number | null;
}

export interface ExtractedFinancialData {
  property: {
    name: string;
    units: number | null;
    month: string;
    year: number;
  };

  income: {
    gross_potential_rent: FinancialLineItem;
    vacancy_loss: FinancialLineItem;
    loss_to_lease: FinancialLineItem;
    concessions: FinancialLineItem;
    bad_debt: FinancialLineItem;
    net_rental_income: FinancialLineItem;
    other_income: FinancialLineItem;
    total_revenue: FinancialLineItem;
  };

  expenses: {
    categories: ExpenseCategory[];
    total_expenses: FinancialLineItem;
  };

  noi: FinancialLineItem;

  occupancy: {
    physical_percent: number | null;
    economic_percent: number | null;
    units_occupied: number | null;
    units_vacant: number | null;
    units_on_notice: number | null;
    units_preleased: number | null;
  };

  leasing_activity: {
    move_ins: number | null;
    move_outs: number | null;
    renewals: number | null;
    notices_to_vacate: number | null;
    new_lease_avg_rent: number | null;
    renewal_avg_rent: number | null;
  };

  rent_roll: {
    unit_mix: UnitMixEntry[];
    total_units: number | null;
    avg_rent: number | null;
  };

  trailing_12: {
    months: string[];
    noi: (number | null)[];
    revenue: (number | null)[];
    expenses: (number | null)[];
    occupancy: (number | null)[];
  };

  data_quality: {
    t12_found: boolean;
    rent_roll_found: boolean;
    leasing_found: boolean;
    budget_found: boolean;
    month_match_confirmed: boolean;
    notes: string[];
  };
}

/**
 * Default empty extraction result — used as fallback
 */
export function emptyExtraction(propertyName: string, month: string, year: number): ExtractedFinancialData {
  const emptyLine: FinancialLineItem = { current: null, prior: null, budget: null };
  return {
    property: { name: propertyName, units: null, month, year },
    income: {
      gross_potential_rent: { ...emptyLine },
      vacancy_loss: { ...emptyLine },
      loss_to_lease: { ...emptyLine },
      concessions: { ...emptyLine },
      bad_debt: { ...emptyLine },
      net_rental_income: { ...emptyLine },
      other_income: { ...emptyLine },
      total_revenue: { ...emptyLine },
    },
    expenses: { categories: [], total_expenses: { ...emptyLine } },
    noi: { ...emptyLine },
    occupancy: { physical_percent: null, economic_percent: null, units_occupied: null, units_vacant: null, units_on_notice: null, units_preleased: null },
    leasing_activity: { move_ins: null, move_outs: null, renewals: null, notices_to_vacate: null, new_lease_avg_rent: null, renewal_avg_rent: null },
    rent_roll: { unit_mix: [], total_units: null, avg_rent: null },
    trailing_12: { months: [], noi: [], revenue: [], expenses: [], occupancy: [] },
    data_quality: { t12_found: false, rent_roll_found: false, leasing_found: false, budget_found: false, month_match_confirmed: false, notes: [] },
  };
}
