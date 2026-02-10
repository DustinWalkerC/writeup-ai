'use client'

import Link from 'next/link'

type Property = {
  id: string
  name: string
  address: string
  units: number
  lastReport?: {
    month: string
    year: number
    status: string
  } | null
}

type Props = {
  property: Property
}

export function PropertyCard({ property }: Props) {
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'complete':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'generating':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200'
      case 'draft':
        return 'bg-slate-50 text-slate-600 border-slate-200'
      case 'error':
        return 'bg-red-50 text-red-700 border-red-200'
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200'
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 truncate">{property.name}</h3>
          <p className="text-sm text-slate-500 truncate">{property.address}</p>
        </div>
        <div className="flex items-center gap-1 ml-3 px-2.5 py-1 bg-slate-100 rounded-lg">
          <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <span className="text-sm font-medium text-slate-700">{property.units}</span>
        </div>
      </div>

      {/* Last Report Status */}
      <div className="mb-4 pb-4 border-b border-slate-100">
        {property.lastReport ? (
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Last report</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-700">
                {property.lastReport.month} {property.lastReport.year}
              </span>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusStyles(property.lastReport.status)}`}>
                {property.lastReport.status}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Last report</span>
            <span className="text-sm text-slate-400">No reports yet</span>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-2">
        <Link
          href={`/dashboard/reports/new?propertyId=${property.id}`}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 text-white text-sm font-medium rounded-lg hover:from-cyan-700 hover:to-teal-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Report
        </Link>
        <Link
          href={`/dashboard/properties/${property.id}/edit`}
          className="px-3 py-2 text-slate-600 text-sm font-medium rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
        >
          Edit
        </Link>
      </div>
    </div>
  )
}
