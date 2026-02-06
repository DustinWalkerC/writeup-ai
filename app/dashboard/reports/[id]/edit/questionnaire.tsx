'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { QuestionnaireData } from '@/lib/supabase'
import { saveQuestionnaire, saveFreeformNarrative, updateReport } from '@/app/actions/reports'

type Props = {
  reportId: string
  initialData: QuestionnaireData
  initialMode: 'guided' | 'freeform'
  initialFreeform: string | null
}

type SectionKey = keyof QuestionnaireData

const sections: { key: SectionKey; title: string; icon: string; questions: { key: string; label: string; placeholder: string }[] }[] = [
  {
    key: 'occupancy',
    title: 'Occupancy & Leasing',
    icon: '🏠',
    questions: [
      { key: 'currentOccupancy', label: 'What is the current occupancy rate?', placeholder: 'e.g., 94.2% occupied (241/256 units)' },
      { key: 'occupancyChange', label: 'How has occupancy changed this month?', placeholder: 'e.g., Up 1.5% from last month, trending toward stabilization' },
      { key: 'leaseActivity', label: 'Describe new lease activity', placeholder: 'e.g., 12 new leases signed, averaging $1,450/month' },
      { key: 'renewalRate', label: 'What is the renewal rate and any notable trends?', placeholder: 'e.g., 68% renewal rate, up from 62% last month' },
    ],
  },
  {
    key: 'collections',
    title: 'Collections & Delinquency',
    icon: '💰',
    questions: [
      { key: 'collectionRate', label: 'What is the collection rate for the month?', placeholder: 'e.g., 97.8% of billed rent collected' },
      { key: 'delinquencyStatus', label: 'Describe any delinquency issues', placeholder: 'e.g., 3 units 30+ days past due, totaling $4,200' },
      { key: 'badDebtWriteoffs', label: 'Any bad debt write-offs?', placeholder: 'e.g., Wrote off $1,500 from vacated unit, pursuing collections' },
      { key: 'collectionActions', label: 'What collection actions are being taken?', placeholder: 'e.g., 2 units in eviction process, expected resolution by month end' },
    ],
  },
  {
    key: 'revenue',
    title: 'Revenue & Trade-Outs',
    icon: '📈',
    questions: [
      { key: 'tradeOutAmount', label: 'What is the average trade-out amount?', placeholder: 'e.g., +$85 average increase on new leases vs. expiring' },
      { key: 'rentGrowth', label: 'Describe overall rent growth trends', placeholder: 'e.g., Achieved 3.2% growth YoY, in line with budget' },
      { key: 'otherIncomeChanges', label: 'Any changes to other income?', placeholder: 'e.g., Added $5/unit parking fee, generating additional $1,280/month' },
      { key: 'concessions', label: 'Are you offering any concessions?', placeholder: 'e.g., Offering 1 month free on 15-month leases, 4 units used this month' },
    ],
  },
  {
    key: 'expenses',
    title: 'Expenses & Variances',
    icon: '📊',
    questions: [
      { key: 'majorVariances', label: 'What are the major expense variances from budget?', placeholder: 'e.g., Utilities +12% due to cold snap, insurance -5% from re-negotiation' },
      { key: 'unexpectedExpenses', label: 'Any unexpected expenses this month?', placeholder: 'e.g., $8,500 emergency HVAC repair in Building C' },
      { key: 'savingsInitiatives', label: 'What cost savings initiatives are in progress?', placeholder: 'e.g., LED retrofit 60% complete, projecting $800/month savings' },
    ],
  },
  {
    key: 'capex',
    title: 'CapEx & Projects',
    icon: '🔨',
    questions: [
      { key: 'projectsCompleted', label: 'What projects were completed this month?', placeholder: 'e.g., Pool resurfacing complete, new fitness equipment installed' },
      { key: 'projectsInProgress', label: 'What projects are currently in progress?', placeholder: 'e.g., Roof replacement Phase 2 - 40% complete, on schedule' },
      { key: 'upcomingProjects', label: 'What major projects are upcoming?', placeholder: 'e.g., Clubhouse renovation starting Q2, $150K budget approved' },
      { key: 'budgetStatus', label: 'How is CapEx tracking vs. budget?', placeholder: 'e.g., YTD spend $245K of $400K annual budget, on track' },
    ],
  },
  {
    key: 'operations',
    title: 'Operations',
    icon: '⚙️',
    questions: [
      { key: 'staffingChanges', label: 'Any staffing changes?', placeholder: 'e.g., New maintenance tech started, fully staffed now' },
      { key: 'operationalWins', label: 'What operational wins occurred this month?', placeholder: 'e.g., Reduced turn time to 5 days, Google rating up to 4.2 stars' },
      { key: 'operationalChallenges', label: 'What challenges did you face?', placeholder: 'e.g., Vendor delays on appliance deliveries, found alternative supplier' },
      { key: 'vendorChanges', label: 'Any vendor changes?', placeholder: 'e.g., Switched landscaping vendor, saving $400/month' },
    ],
  },
  {
    key: 'market',
    title: 'Market & Competition',
    icon: '🏙️',
    questions: [
      { key: 'marketConditions', label: 'Describe current market conditions', placeholder: 'e.g., Strong demand continues, limited new supply in submarket' },
      { key: 'competitorActivity', label: 'What are competitors doing?', placeholder: 'e.g., Competitor at 123 Main offering 6 weeks free, we remain competitive without' },
      { key: 'demandTrends', label: 'What demand trends are you seeing?', placeholder: 'e.g., Increased inquiries from young professionals, adjusting marketing' },
    ],
  },
  {
    key: 'risks',
    title: 'Risks & Mitigation',
    icon: '⚠️',
    questions: [
      { key: 'currentRisks', label: 'What risks are you monitoring?', placeholder: 'e.g., Property tax reassessment pending, potential 8% increase' },
      { key: 'mitigationSteps', label: 'What mitigation steps are being taken?', placeholder: 'e.g., Engaged tax consultant for appeal, building reserve' },
      { key: 'insuranceClaims', label: 'Any insurance claims or incidents?', placeholder: 'e.g., Minor water damage claim filed, $2,500 deductible paid' },
      { key: 'legalMatters', label: 'Any legal matters to report?', placeholder: 'e.g., No active litigation, standard lease enforcement ongoing' },
    ],
  },
]

export function Questionnaire({ reportId, initialData, initialMode, initialFreeform }: Props) {
  const router = useRouter()
  const [mode, setMode] = useState<'guided' | 'freeform'>(initialMode)
  const [expandedSections, setExpandedSections] = useState<Set<SectionKey>>(new Set(['occupancy']))
  const [formData, setFormData] = useState<QuestionnaireData>(initialData || {})
  const [freeformText, setFreeformText] = useState(initialFreeform || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const toggleSection = (key: SectionKey) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const updateField = (section: SectionKey, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...(prev[section] as Record<string, string> || {}),
        [field]: value,
      },
    }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (mode === 'guided') {
        await saveQuestionnaire(reportId, formData)
      } else {
        await saveFreeformNarrative(reportId, freeformText)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Save error:', err)
      alert('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleGenerateReport = async () => {
    // Save first
    await handleSave()
    // Navigate to generate step (we'll build this on Day 5-6)
    router.push(`/dashboard/reports/${reportId}/generate`)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">
          ✍️ Monthly Context & Narrative Input
        </h2>
        
        {/* Mode toggle */}
        <div className="flex bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setMode('guided')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              mode === 'guided' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            Guided Questions
          </button>
          <button
            onClick={() => setMode('freeform')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              mode === 'freeform' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            Paste Narrative
          </button>
        </div>
      </div>

      <p className="text-slate-500 text-sm mb-6">
        {mode === 'guided' 
          ? 'Answer any questions relevant to this month. All fields are optional — just fill in what applies.'
          : 'Paste your narrative notes, bullet points, or any context you want included in the report.'
        }
      </p>

      {mode === 'guided' ? (
        <div className="space-y-4">
          {sections.map((section) => (
            <div key={section.key} className="border border-slate-200 rounded-lg overflow-hidden">
              {/* Section header */}
              <button
                onClick={() => toggleSection(section.key)}
                className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <span className="flex items-center gap-2 font-medium text-slate-900">
                  <span>{section.icon}</span>
                  {section.title}
                </span>
                <span className="text-slate-400">
                  {expandedSections.has(section.key) ? '−' : '+'}
                </span>
              </button>

              {/* Section content */}
              {expandedSections.has(section.key) && (
                <div className="p-4 space-y-4">
                  {section.questions.map((q) => (
                    <div key={q.key}>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {q.label}
                      </label>
                      <textarea
                        value={(formData[section.key] as Record<string, string> || {})[q.key] || ''}
                        onChange={(e) => updateField(section.key, q.key, e.target.value)}
                        placeholder={q.placeholder}
                        rows={2}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm resize-none"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <textarea
          value={freeformText}
          onChange={(e) => { setFreeformText(e.target.value); setSaved(false) }}
          placeholder="Paste your monthly update notes here. Include any information about occupancy, collections, expenses, projects, market conditions, etc. The AI will extract relevant information and structure it into a professional report.

Example:
- Occupancy up to 94%, signed 8 new leases
- Collections strong at 98%, one eviction in progress
- Completed pool renovation, residents very happy
- Market remains competitive, holding rents steady
- No major risks to report"
          rows={16}
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
        />
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-200">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 text-slate-600 hover:text-slate-900 disabled:opacity-50"
        >
          {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Draft'}
        </button>
        
        <button
          onClick={handleGenerateReport}
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
        >
          Generate Report →
        </button>
      </div>
    </div>
  )
}