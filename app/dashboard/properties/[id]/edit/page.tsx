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

  // NEW (Day 16)
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

  // NEW (Day 16)
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

        // NEW (Day 16)
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

  // NEW (Day 16) — budget upload handler
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

  // NEW (Day 16) — budget delete handler
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

      // NEW (Day 16) — include investment_strategy in form data
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
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Property Name</label>
          <input
            name="name"
            type="text"
            defaultValue={property.name}
            required
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Address</label>
          <input
            name="address"
            type="text"
            defaultValue={property.address || ''}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">City</label>
            <input
              name="city"
              type="text"
              defaultValue={property.city || ''}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">State</label>
            <input
              name="state"
              type="text"
              defaultValue={property.state || ''}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
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
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          />
        </div>

        {/* Investment Strategy (Day 16) */}
        <div className="space-y-2 pt-2">
          <label className="block text-sm font-medium text-gray-700">Investment Strategy (optional)</label>
          <textarea
            value={investmentStrategy}
            onChange={e => setInvestmentStrategy(e.target.value)}
            placeholder="e.g., Renovate 20 units Q1-Q2, target $150 premium. Core-plus hold, 3-year exit."
            rows={3}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 text-sm focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400">Claude uses this context for strategic recommendations in reports.</p>
        </div>

        {/* Budget Upload (Day 16) */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Annual Budget (optional)</label>

          {budgetFileName ? (
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-md">
              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm text-green-700 flex-1">{budgetFileName}</span>

              <button
                type="button"
                onClick={handleBudgetDelete}
                className="text-sm text-red-500 hover:text-red-700"
              >
                Remove
              </button>

              <label className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer">
                Replace
                <input
                  type="file"
                  className="hidden"
                  accept=".xlsx,.xls"
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) handleBudgetUpload(f)
                  }}
                />
              </label>
            </div>
          ) : (
            <label
              className={`flex items-center justify-center px-4 py-6 border-2 border-dashed rounded-md cursor-pointer transition ${
                uploadingBudget ? 'border-gray-200 bg-gray-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
              }`}
            >
              <div className="text-center">
                <p className="text-sm text-gray-600">{uploadingBudget ? 'Uploading...' : 'Click to upload budget (.xlsx)'}</p>
                <p className="text-xs text-gray-400 mt-1">Stored once, reused for all future reports</p>
              </div>
              <input
                type="file"
                className="hidden"
                accept=".xlsx,.xls"
                disabled={uploadingBudget}
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) handleBudgetUpload(f)
                }}
              />
            </label>
          )}
        </div>

        <div className="flex gap-3 pt-4 border-t border-slate-100">
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
    </div>
  )
}
