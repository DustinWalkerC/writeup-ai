'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { StatsCard } from '@/components/stats-card'
import { SearchInput } from '@/components/search-input'
import { PropertyCard } from '@/components/property-card'
import { EmptyState } from '@/components/empty-state'

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

type PropertiesData = {
  properties: Property[]
  stats: {
    totalProperties: number
    totalUnits: number
  }
}

export function PropertiesContent() {
  const [data, setData] = useState<PropertiesData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchProperties()
  }, [])

  const fetchProperties = async () => {
    try {
      const response = await fetch('/api/properties')
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error || 'Failed to load properties')
      }
    } catch (err) {
      setError('Failed to load properties')
      console.error('Properties fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredProperties = useMemo(() => {
    if (!data?.properties) return []
    if (!searchQuery) return data.properties

    const query = searchQuery.toLowerCase()
    return data.properties.filter(
      p => p.name.toLowerCase().includes(query) || 
           p.address.toLowerCase().includes(query)
    )
  }, [data?.properties, searchQuery])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error}</p>
        <button 
          onClick={fetchProperties}
          className="mt-4 text-cyan-600 hover:text-cyan-700 font-medium"
        >
          Try again
        </button>
      </div>
    )
  }

  const hasProperties = data?.properties && data.properties.length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Properties</h1>
          <p className="text-slate-500 mt-1">Manage your portfolio properties</p>
        </div>
        <Link
          href="/dashboard/properties/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-lg hover:from-cyan-700 hover:to-teal-700 font-medium transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Property
        </Link>
      </div>

      {hasProperties && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatsCard
              title="Total Properties"
              value={data?.stats.totalProperties || 0}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              }
            />
            <StatsCard
              title="Total Units"
              value={data?.stats.totalUnits.toLocaleString() || 0}
              accentColor="#10b981"
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
            />
          </div>

          {/* Search */}
          <div className="max-w-md">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search properties..."
            />
          </div>

          {/* Properties Grid */}
          {filteredProperties.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProperties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <p className="text-slate-500">No properties match your search</p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 text-cyan-600 hover:text-cyan-700 font-medium"
              >
                Clear search
              </button>
            </div>
          )}
        </>
      )}

      {!hasProperties && (
        <EmptyState
          icon={
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
          title="No properties yet"
          description="Add your first property to start generating investor reports"
          actionLabel="Add Property"
          actionHref="/dashboard/properties/new"
        />
      )}
    </div>
  )
}
