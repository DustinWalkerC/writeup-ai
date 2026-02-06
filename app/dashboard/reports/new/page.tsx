'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getProperties } from '@/app/actions/properties'
import { createReport } from '@/app/actions/reports'
import { Property, MONTHS } from '@/lib/supabase'

export default function NewReportPage() {
  const router = useRouter()
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [selectedProperty, setSelectedProperty] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  // Load properties
  useEffect(() => {
    async function load() {
      try {
        const data = await getProperties()
        setProperties(data)
        if (data.length > 0) {
          setSelectedProperty(data[0].id)
        }
        // Default to previous month
        const now = new Date()
        const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1
        setSelectedMonth(MONTHS[prevMonth])
        if (now.getMonth() === 0) {
          setSelectedYear(now.getFullYear() - 1)
        }
      } catch (err) {
        console.error(err)
        setError('Failed to load properties')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProperty || !selectedMonth) {
      setError('Please select a property and month')
      return
    }

    setCreating(true)
    setError(null)

    try {
      const report = await createReport(selectedProperty, selectedMonth, selectedYear)
      router.push(`/dashboard/reports/${report.id}/edit`)
    } catch (err) {
      console.error(err)
      setError('Failed to create report')
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-500">Loading...</div>
      </div>
    )
  }

  if (properties.length === 0) {
    return (
      <div className="max-w-xl mx-auto text-center py-12">
        <div className="text-5xl mb-4">🏢</div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">No properties yet</h2>
        <p className="text-slate-500 mb-6">
          You need to add a property before creating a report.
        </p>
        <Link
          href="/dashboard/properties/new"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          + Add Property
        </Link>
      </div>
    )
  }

  const currentYear = new Date().getFullYear()
  const years = [currentYear, currentYear - 1, currentYear - 2]

  return (
    <div className="max-w-xl mx-auto">
      <Link
        href="/dashboard/reports"
        className="text-slate-500 hover:text-slate-700 mb-4 inline-block"
      >
        ← Back to Reports
      </Link>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Create New Report</h1>
        <p className="text-slate-500 mb-6">Step 1: Select property and reporting period</p>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Property Select */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Property *
            </label>
            <select
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              required
            >
              {properties.map((prop) => (
                <option key={prop.id} value={prop.id}>
                  {prop.name} {prop.city && `- ${prop.city}, ${prop.state}`}
                </option>
              ))}
            </select>
          </div>

          {/* Month and Year */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Month *
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              >
                {MONTHS.map((month) => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Year *
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              >
                {years.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={creating}
            className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Continue →'}
          </button>
        </form>
      </div>
    </div>
  )
}
