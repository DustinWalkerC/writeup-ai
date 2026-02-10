'use client'

import Link from 'next/link'

type Property = {
  id: string
  name: string
}

type Props = {
  propertiesNeedingReports: Property[]
  currentPeriod: { month: string; year: number }
}

export function QuickActions({ propertiesNeedingReports, currentPeriod }: Props) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
      
      <div className="space-y-3">
        {/* Primary Action */}
        <Link
          href="/dashboard/reports/new"
          className="flex items-center gap-3 p-4 rounded-lg bg-gradient-to-r from-cyan-600 to-teal-600 text-white hover:from-cyan-700 hover:to-teal-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="font-medium">Create New Report</span>
        </Link>

        {/* Secondary Actions */}
        <Link
          href="/dashboard/properties/new"
          className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <span className="font-medium">Add Property</span>
        </Link>

        {/* Properties needing reports */}
        {propertiesNeedingReports.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-sm font-medium text-slate-500 mb-2">
              Needs {currentPeriod.month} report:
            </p>
            <div className="space-y-2">
              {propertiesNeedingReports.map((property) => (
                <Link
                  key={property.id}
                  href={`/dashboard/reports/new?propertyId=${property.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 transition-colors"
                >
                  <span className="text-sm font-medium">{property.name}</span>
                  <span className="text-xs">Create →</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

