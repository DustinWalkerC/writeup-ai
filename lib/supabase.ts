import { createClient } from '@supabase/supabase-js'
import type { ExtractedFinancialData } from './document-intelligence'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ===================
// Type Definitions
// ===================

export type Property = {
  id: string
  user_id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  units: number | null
  created_at: string
  updated_at: string
}

export type ReportFile = {
  id: string
  report_id: string
  user_id: string
  file_name: string
  file_type: 'excel' | 'pdf' | 'csv'
  file_size: number | null
  storage_path: string
  file_path: string
  processing_status: 'pending' | 'processing' | 'complete' | 'error'
  processing_error: string | null
  extracted_data: Record<string, unknown>
  detected_properties: DetectedProperty[]
  selected_property_name: string | null
  created_at: string
  updated_at: string
}

export type DetectedProperty = {
  name: string
  confidence: number
  row_range?: string
}

export type ReportImage = {
  id: string
  url: string
  caption: string | null
  section: string | null
}

// ===================
// Questionnaire Types
// ===================

export type QuestionnaireData = {
  occupancy?: OccupancyQuestions
  collections?: CollectionsQuestions
  revenue?: RevenueQuestions
  expenses?: ExpenseQuestions
  capex?: CapExQuestions
  operations?: OperationsQuestions
  market?: MarketQuestions
  risks?: RiskQuestions
}

export type OccupancyQuestions = {
  currentOccupancy?: string
  occupancyChange?: string
  leaseActivity?: string
  renewalRate?: string
  notes?: string
}

export type CollectionsQuestions = {
  collectionRate?: string
  delinquencyStatus?: string
  badDebtWriteoffs?: string
  collectionActions?: string
  notes?: string
}

export type RevenueQuestions = {
  tradeOutAmount?: string
  rentGrowth?: string
  otherIncomeChanges?: string
  concessions?: string
  notes?: string
}

export type ExpenseQuestions = {
  majorVariances?: string
  unexpectedExpenses?: string
  savingsInitiatives?: string
  notes?: string
}

export type CapExQuestions = {
  projectsCompleted?: string
  projectsInProgress?: string
  upcomingProjects?: string
  budgetStatus?: string
  notes?: string
}

export type OperationsQuestions = {
  staffingChanges?: string
  operationalWins?: string
  operationalChallenges?: string
  vendorChanges?: string
  notes?: string
}

export type MarketQuestions = {
  marketConditions?: string
  competitorActivity?: string
  demandTrends?: string
  notes?: string
}

export type RiskQuestions = {
  currentRisks?: string
  mitigationSteps?: string
  insuranceClaims?: string
  legalMatters?: string
  notes?: string
}

// ===================
// Months Helper
// ===================

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
] as const

export type MonthName = typeof MONTHS[number]

// ===================
// Structured Content Types
// ===================

export type ReportSectionContent = {
  title: string
  content: string
  order: number
}

export type StructuredContent = {
  sections: {
    [sectionId: string]: ReportSectionContent
  }
  generatedAt?: string
  modelUsed?: string
  tokensUsed?: {
    input: number
    output: number
  }
}

// ===================
// Report Type (Single Definition)
// ===================

export type Report = {
  id: string
  property_id: string
  user_id: string
  month: string
  year: number
  status: 'draft' | 'generating' | 'complete' | 'error'
  content: StructuredContent | Record<string, unknown> | null
  financial_data: ExtractedFinancialData | null
  questionnaire: QuestionnaireData | Record<string, Record<string, string>> | null
  narrative: string | null
  images?: ReportImage[]
  template_version: string
  input_mode: 'guided' | 'freeform' | null
  freeform_narrative: string | null
  created_at: string
  updated_at: string
  property?: Property
  report_files?: ReportFile[]
}

// ===================
// User Settings Type
// ===================

export type UserSettings = {
  id: string
  user_id: string
  company_name: string | null
  company_logo_url: string | null
  accent_color: string
  color_scheme: 'professional' | 'monochromatic' | 'custom'
  secondary_color: string | null
  ai_tone: 'conservative' | 'balanced' | 'optimistic'
  custom_disclaimer: string | null
  created_at: string
  updated_at: string
}
