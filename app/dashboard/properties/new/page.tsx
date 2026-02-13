'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createProperty } from '@/app/actions/properties'

export default function NewPropertyPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCsvHelp, setShowCsvHelp] = useState(false)
  const [budgetFile, setBudgetFile] = useState<File | null>(null)
  const [uploadingBudget, setUploadingBudget] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    units: '',
    type: 'multifamily',
    investment_strategy: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const data = new FormData()
      data.append('name', formData.name)
      data.append('address', formData.address)
      data.append('units', formData.units)
      data.append('type', formData.type)
      data.append('investment_strategy', formData.investment_strategy)

      const result = await createProperty(data)

      if (result?.error) {
        setError(result.error)
        setIsSubmitting(false)
        return
      }

      // Upload budget if provided
      if (budgetFile && result?.id) {
        setUploadingBudget(true)
        try {
          const budgetForm = new FormData()
          budgetForm.append('file', budgetFile)
          await fetch(`/api/properties/${result.id}/budget`, {
            method: 'POST',
            body: budgetForm,
          })
        } catch (err) {
          console.error('Budget upload failed:', err)
        }
        setUploadingBudget(false)
      }

      router.push('/dashboard/properties')
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/properties"
          className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700 mb-4 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Properties
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Add New Property</h1>
        <p className="text-slate-500 mt-1">Add a property to your portfolio</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Property Details Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <h3 className="text-lg font-semibold text-slate-900">Property Details</h3>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Property Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Sunset Apartments"
              required
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Address *
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="e.g., 123 Main St, Houston, TX 77001"
              required
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Number of Units *
              </label>
              <input
                type="number"
                value={formData.units}
                onChange={(e) => setFormData({ ...formData, units: e.target.value })}
                placeholder="e.g., 150"
                min="1"
                required
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Property Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all bg-white"
              >
                <option value="multifamily">Multifamily</option>
                <option value="office">Office</option>
                <option value="retail">Retail</option>
                <option value="industrial">Industrial</option>
                <option value="mixed_use">Mixed Use</option>
              </select>
            </div>
          </div>
        </div>

        {/* Investment Context Card (Optional) */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Investment Context</h3>
              <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-full">Optional</span>
            </div>
            <p className="text-sm text-slate-500 mt-1">This information is used automatically in every report generated for this property.</p>
          </div>

          {/* Investment Strategy */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Investment Strategy / Business Plan
            </label>
            <textarea
              value={formData.investment_strategy}
              onChange={(e) => setFormData({ ...formData, investment_strategy: e.target.value })}
              placeholder="e.g., Value-add acquisition targeting 20-unit interior renovation in Q1-Q2 2025. Targeting $150/unit rent premium post-renovation. Core-plus hold strategy with 3-year exit timeline..."
              rows={4}
              className="w-full border border-slate-200 rounded-lg px-4 py-3 text-slate-900 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all placeholder-slate-400"
            />
            <p className="text-xs text-slate-400 mt-1">
              The analysis engine weaves this context into the strategic recommendations of every report.
            </p>
          </div>

          {/* Budget Upload */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-slate-700">Annual Budget</label>
              <button
                type="button"
                onClick={() => setShowCsvHelp(true)}
                className="text-xs text-cyan-600 hover:text-cyan-700 font-medium transition-colors"
              >
                How to export as CSV?
              </button>
            </div>

            {budgetFile ? (
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-sm text-green-700 flex-1 truncate">{budgetFile.name}</span>
                <button
                  type="button"
                  onClick={() => setBudgetFile(null)}
                  className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center px-4 py-6 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-cyan-300 hover:bg-cyan-50/30 transition-all">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <p className="text-sm text-slate-600 font-medium">Upload budget (.csv)</p>
                <p className="text-xs text-slate-400 mt-1">Stored once, reused for all future reports</p>
                <input
                  type="file"
                  className="hidden"
                  accept=".csv"
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) setBudgetFile(f)
                    e.target.value = ''
                  }}
                />
              </label>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isSubmitting || uploadingBudget}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-600 to-teal-600 text-white font-medium rounded-lg hover:from-cyan-700 hover:to-teal-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {uploadingBudget ? 'Uploading Budget...' : 'Creating...'}
              </span>
            ) : (
              'Create Property'
            )}
          </button>
          <Link
            href="/dashboard/properties"
            className="px-6 py-3 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-all"
          >
            Cancel
          </Link>
        </div>
      </form>

      {/* CSV Help Modal */}
      {showCsvHelp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">How to Export as CSV</h3>
              <button
                onClick={() => setShowCsvHelp(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 text-sm text-slate-600">
              <div>
                <p className="font-medium text-slate-800 mb-1">From Microsoft Excel:</p>
                <div className="bg-slate-50 rounded-lg p-3 space-y-1.5 text-slate-600">
                  <p>1. Open your budget file in Excel</p>
                  <p>2. Click <span className="font-medium text-slate-800">File</span> then <span className="font-medium text-slate-800">Save As</span></p>
                  <p>3. Choose your save location</p>
                  <p>4. In the <span className="font-medium text-slate-800">Save as type</span> dropdown, select <span className="font-medium text-slate-800">CSV (Comma delimited) (*.csv)</span></p>
                  <p>5. Click <span className="font-medium text-slate-800">Save</span></p>
                </div>
              </div>

              <div>
                <p className="font-medium text-slate-800 mb-1">From Google Sheets:</p>
                <div className="bg-slate-50 rounded-lg p-3 space-y-1.5 text-slate-600">
                  <p>1. Open your budget in Google Sheets</p>
                  <p>2. Click <span className="font-medium text-slate-800">File</span> then <span className="font-medium text-slate-800">Download</span></p>
                  <p>3. Select <span className="font-medium text-slate-800">Comma-separated values (.csv)</span></p>
                </div>
              </div>

              <p className="text-xs text-slate-400">
                CSV files are smaller and faster for our analysis engine to process than Excel files.
              </p>
            </div>

            <button
              onClick={() => setShowCsvHelp(false)}
              className="w-full mt-5 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-lg text-sm font-medium hover:from-cyan-700 hover:to-teal-700 transition-all"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
