'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateQuestionnaire } from '@/app/actions/reports'
import { QuestionnaireData } from '@/lib/supabase'

type InputMode = 'guided' | 'freeform'

type Props = {
  reportId: string
  initialData: QuestionnaireData | null
  initialMode: InputMode | null
  initialFreeform: string | null
}

const QUESTIONNAIRE_SECTIONS = [
  {
    id: 'occupancy',
    title: 'Occupancy & Leasing',
    questions: [
      { id: 'currentOccupancy', label: 'Current occupancy rate', placeholder: 'e.g., 94.5%' },
      { id: 'occupancyChange', label: 'Change from last month', placeholder: 'e.g., +1.2% or -0.5%' },
      { id: 'leaseActivity', label: 'Leasing activity this month', placeholder: 'e.g., 12 new leases, 8 renewals' },
      { id: 'renewalRate', label: 'Renewal rate', placeholder: 'e.g., 65%' },
    ]
  },
  {
    id: 'collections',
    title: 'Collections & Delinquency',
    questions: [
      { id: 'collectionRate', label: 'Collection rate', placeholder: 'e.g., 98.2%' },
      { id: 'delinquencyStatus', label: 'Delinquency status', placeholder: 'e.g., 3 units 30+ days past due' },
      { id: 'badDebtWriteoffs', label: 'Bad debt write-offs', placeholder: 'e.g., $2,500 this month' },
    ]
  },
  {
    id: 'revenue',
    title: 'Revenue Performance',
    questions: [
      { id: 'tradeOutAmount', label: 'Average trade-out on new leases', placeholder: 'e.g., +$75/unit' },
      { id: 'rentGrowth', label: 'Rent growth vs. prior year', placeholder: 'e.g., +4.2%' },
      { id: 'otherIncomeChanges', label: 'Notable other income changes', placeholder: 'e.g., Parking revenue up 10%' },
      { id: 'concessions', label: 'Concessions offered', placeholder: 'e.g., 1 month free on 2 units' },
    ]
  },
  {
    id: 'expenses',
    title: 'Expense Management',
    questions: [
      { id: 'majorVariances', label: 'Major expense variances vs. budget', placeholder: 'e.g., Utilities 8% over budget' },
      { id: 'unexpectedExpenses', label: 'Unexpected expenses', placeholder: 'e.g., Emergency HVAC repair $3,200' },
      { id: 'savingsInitiatives', label: 'Cost-saving initiatives', placeholder: 'e.g., Renegotiated landscaping contract' },
    ]
  },
  {
    id: 'capex',
    title: 'Capital Projects',
    questions: [
      { id: 'projectsCompleted', label: 'Projects completed this month', placeholder: 'e.g., Pool resurfacing complete' },
      { id: 'projectsInProgress', label: 'Projects in progress', placeholder: 'e.g., Clubhouse renovation 60% complete' },
      { id: 'upcomingProjects', label: 'Upcoming projects', placeholder: 'e.g., Roof replacement Q2' },
      { id: 'budgetStatus', label: 'CapEx budget status', placeholder: 'e.g., 45% of annual budget spent' },
    ]
  },
  {
    id: 'operations',
    title: 'Operations',
    questions: [
      { id: 'staffingChanges', label: 'Staffing changes', placeholder: 'e.g., New maintenance tech hired' },
      { id: 'operationalWins', label: 'Operational wins', placeholder: 'e.g., Reduced turn time to 5 days' },
      { id: 'operationalChallenges', label: 'Challenges encountered', placeholder: 'e.g., Vendor delays on appliances' },
    ]
  },
  {
    id: 'market',
    title: 'Market & Outlook',
    questions: [
      { id: 'marketConditions', label: 'Local market conditions', placeholder: 'e.g., Strong demand, limited supply' },
      { id: 'competitorActivity', label: 'Competitor activity', placeholder: 'e.g., New build opened nearby at $1,450' },
      { id: 'demandTrends', label: 'Demand trends', placeholder: 'e.g., Wait list of 15 applicants' },
    ]
  },
]

export function Questionnaire({ reportId, initialData, initialMode, initialFreeform }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [mode, setMode] = useState<InputMode>(initialMode || 'guided')
  const [formData, setFormData] = useState<QuestionnaireData>(initialData || {})
  const [freeformText, setFreeformText] = useState(initialFreeform || '')
  const [activeSection, setActiveSection] = useState(0)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  const handleInputChange = (sectionId: string, questionId: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [sectionId]: {
        ...(prev[sectionId as keyof QuestionnaireData] || {}),
        [questionId]: value,
      }
    }))
  }

  const handleSave = async () => {
    setSaveStatus('saving')
    startTransition(async () => {
      await updateQuestionnaire(reportId, formData, mode, freeformText)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    })
  }

  const handleGenerateReport = async () => {
    // Save first, then navigate with auto-start parameter
    setSaveStatus('saving')
    await updateQuestionnaire(reportId, formData, mode, freeformText)
    router.push(`/dashboard/reports/${reportId}/generate?start=true`)
  }

  return (
    <div>
      {/* Mode Toggle */}
      <div className="flex items-center gap-4 mb-6">
        <h2 className="text-lg font-semibold text-slate-900">Provide Context</h2>
        <div className="flex bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setMode('guided')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              mode === 'guided' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Guided
          </button>
          <button
            onClick={() => setMode('freeform')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              mode === 'freeform' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Freeform
          </button>
        </div>
      </div>

      {mode === 'guided' ? (
        <>
          {/* Section Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {QUESTIONNAIRE_SECTIONS.map((section, idx) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(idx)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeSection === idx
                    ? 'bg-cyan-100 text-cyan-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {section.title}
              </button>
            ))}
          </div>

          {/* Active Section Questions */}
          <div className="space-y-4">
            {QUESTIONNAIRE_SECTIONS[activeSection].questions.map((question) => (
              <div key={question.id}>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {question.label}
                </label>
                <input
                  type="text"
                  placeholder={question.placeholder}
                  value={
                    (formData[QUESTIONNAIRE_SECTIONS[activeSection].id as keyof QuestionnaireData] as Record<string, string> | undefined)?.[question.id] || ''
                  }
                  onChange={(e) => handleInputChange(
                    QUESTIONNAIRE_SECTIONS[activeSection].id,
                    question.id,
                    e.target.value
                  )}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-colors"
                />
              </div>
            ))}
          </div>

          {/* Section Navigation */}
          <div className="flex justify-between mt-6">
            <button
              onClick={() => setActiveSection(Math.max(0, activeSection - 1))}
              disabled={activeSection === 0}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <button
              onClick={() => setActiveSection(Math.min(QUESTIONNAIRE_SECTIONS.length - 1, activeSection + 1))}
              disabled={activeSection === QUESTIONNAIRE_SECTIONS.length - 1}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </>
      ) : (
        /* Freeform Mode */
        <div>
          <p className="text-sm text-slate-500 mb-3">
            Write anything you want the AI to know about this month&apos;s performance. 
            Be as detailed or brief as you like.
          </p>
          <textarea
            value={freeformText}
            onChange={(e) => setFreeformText(e.target.value)}
            placeholder="e.g., Strong month overall. Occupancy improved to 95.2% with 14 new move-ins. Collections at 98.5%. Completed pool renovation under budget. One maintenance tech resigned, currently interviewing replacements. Market remains competitive with the new build at Oakwood charging $50 less than our asking rents..."
            rows={12}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-colors resize-none"
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium disabled:opacity-50"
        >
          {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? '✓ Saved' : 'Save Draft'}
        </button>

        <button
          onClick={handleGenerateReport}
          disabled={isPending}
          className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-lg hover:from-cyan-700 hover:to-teal-700 font-medium transition-all shadow-md disabled:opacity-50"
        >
          Generate Report →
        </button>
      </div>
    </div>
  )
}
