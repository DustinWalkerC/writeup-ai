'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { updateProperty } from '@/app/actions/properties'

type Property = {
  id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  units: number | null
  investment_strategy?: string | null
  budget_file_name?: string | null
}

export default function EditPropertyPage() {
  const router = useRouter()
  const params = useParams()
  const propertyId = params.id as string

  const [property, setProperty] = useState<Property | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCsvHelp, setShowCsvHelp] = useState(false)

  const [investmentStrategy, setInvestmentStrategy] = useState('')
  const [budgetFileName, setBudgetFileName] = useState('')
  const [uploadingBudget, setUploadingBudget] = useState(false)

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const res = await fetch(`/api/properties/${propertyId}`)
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        setProperty(data)
        setInvestmentStrategy(data.investment_strategy || '')
        setBudgetFileName(data.budget_file_name || '')
      } catch (err: any) {
        setError(err.message || 'Failed to load property')
      } finally {
        setIsLoading(false)
      }
    }
    fetchProperty()
  }, [propertyId])

  const handleBudgetUpload = async (file: File) => {
    if (!property) return
    setUploadingBudget(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/properties/${property.id}/budget`, {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (res.ok) setBudgetFileName(data.budgetFileName)
      else alert(data.error || 'Budget upload failed')
    } catch (err) {
      console.error('Budget upload failed:', err)
      alert('Budget upload failed')
    } finally {
      setUploadingBudget(false)
    }
  }

  const handleBudgetDelete = async () => {
    if (!property) return
    try {
      await fetch(`/api/properties/${property.id}/budget`, { method: 'DELETE' })
      setBudgetFileName('')
    } catch (err) {
      console.error('Budget delete failed:', err)
      alert('Failed to remove budget')
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)

    try {
      const formData = new FormData(e.currentTarget)
      formData.set('investment_strategy', investmentStrategy)

      await updateProperty(propertyId, formData)
      router.push('/dashboard/properties')
    } catch (err: any) {
      setError(err.message || 'Failed to update property')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!property) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error || 'Property not found'}</p>
        <button
          onClick={() => router.push('/dashboard/properties')}
          className="mt-4 text-cyan-600 hover:text-cyan-700 font-medium"
        >
          Back to Properties
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/dashboard/properties')}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Edit Property</h1>
          <p className="text-slate-500 mt-1">{property.name}</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Property Details Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <h3 className="text-lg font-semibold text-slate-900">Property Details</h3>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Property Name</label>
            <input
              name="name"
              type="text"
              defaultValue={property.name}
              required
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Address</label>
            <input
              name="address"
              type="text"
              defaultValue={property.address || ''}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">City</label>
              <input
                name="city"
                type="text"
                defaultValue={property.city || ''}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">State</label>
              <input
                name="state"
                type="text"
                defaultValue={property.state || ''}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Number of Units</label>
            <input
              name="units"
              type="number"
              defaultValue={property.units || ''}
              min="1"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Investment Context Card */}
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
              value={investmentStrategy}
              onChange={e => setInvestmentStrategy(e.target.value)}
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

            {budgetFileName ? (
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-sm text-green-700 flex-1 truncate">{budgetFileName}</span>
                <button
                  type="button"
                  onClick={handleBudgetDelete}
                  className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors"
                >
                  Remove
                </button>
                <label className="text-sm text-cyan-600 hover:text-cyan-700 cursor-pointer font-medium transition-colors">
                  Replace
                  <input
                    type="file"
                    className="hidden"
                    accept=".csv"
                    onChange={e => {
                      const f = e.target.files?.[0]
                      if (f) handleBudgetUpload(f)
                      if (e.target) e.target.value = ''
                    }}
                  />
                </label>
              </div>
            ) : (
              <label className={`flex flex-col items-center justify-center px-4 py-6 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                uploadingBudget
                  ? 'border-slate-200 bg-slate-50'
                  : 'border-slate-200 hover:border-cyan-300 hover:bg-cyan-50/30'
              }`}>
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <p className="text-sm text-slate-600 font-medium">
                  {uploadingBudget ? 'Uploading...' : 'Upload budget (.csv)'}
                </p>
                <p className="text-xs text-slate-400 mt-1">Stored once, reused for all future reports</p>
                <input
                  type="file"
                  className="hidden"
                  accept=".csv"
                  disabled={uploadingBudget}
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) handleBudgetUpload(f)
                    if (e.target) e.target.value = ''
                  }}
                />
              </label>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="flex-1 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 text-white font-medium rounded-lg hover:from-cyan-700 hover:to-teal-700 transition-all disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard/properties')}
            className="px-6 py-2.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
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