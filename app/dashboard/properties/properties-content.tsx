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

type SlotInfo = {
  used: number
  total: number
}

export function PropertiesContent() {
  const [data, setData] = useState<PropertiesData | null>(null)
  const [slots, setSlots] = useState<SlotInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchProperties()
  }, [])

  const fetchProperties = async () => {
    try {
      const [propRes, subRes] = await Promise.all([
        fetch('/api/properties'),
        fetch('/api/subscription'),
      ])
      const propResult = await propRes.json()
      const subResult = await subRes.json()

      if (propResult.success) {
        setData(propResult.data)
      } else {
        setError(propResult.error || 'Failed to load properties')
      }

      if (subResult.success) {
        const sub = subResult.data.subscription
        const usage = subResult.data.usage
        setSlots({
          used: usage.properties_used || 0,
          total: sub?.property_slots || 2,
        })
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          border: '2.5px solid #E8E5E0', borderTopColor: '#00B7DB',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <p style={{ color: '#CC0000', fontSize: 14 }}>{error}</p>
        <button 
          onClick={fetchProperties}
          style={{
            marginTop: 16, fontSize: 14, fontWeight: 600,
            color: '#00B7DB', background: 'none', border: 'none',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </div>
    )
  }

  const hasProperties = data?.properties && data.properties.length > 0
  const emptySlots = slots ? Math.max(0, slots.total - (data?.properties?.length || 0)) : 0
  const allSlotsFull = slots ? (data?.properties?.length || 0) >= slots.total : false

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-display, Georgia, serif)',
            fontSize: 28, fontWeight: 500, color: '#1A1A1A',
            letterSpacing: '-0.015em',
          }}>Properties</h1>
          <p style={{ fontSize: 14, color: '#7A7A7A', marginTop: 4 }}>
            Manage your portfolio properties
            {slots && (
              <span style={{ color: '#A3A3A3' }}> · {slots.used} of {slots.total} slots used</span>
            )}
          </p>
        </div>
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
              accentColor="#00B7DB"
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProperties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}

            {/* Empty slot placeholders */}
            {!searchQuery && emptySlots > 0 && Array.from({ length: Math.min(emptySlots, 6) }).map((_, i) => (
              <Link
                key={`slot-${i}`}
                href="/dashboard/properties/new"
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  minHeight: 180, gap: 12, padding: 24, textDecoration: 'none',
                  background: '#FAF9F7', border: '2px dashed #E8E5E0', borderRadius: 14,
                  transition: 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#00B7DB50'
                  e.currentTarget.style.background = '#00B7DB06'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E8E5E0'
                  e.currentTarget.style.background = '#FAF9F7'
                }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: '#F7F5F1', border: '1px solid #F0EDE8',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.3s',
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A3A3A3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#7A7A7A' }}>
                    Set Up Property
                  </span>
                  <p style={{ fontSize: 11, color: '#A3A3A3', marginTop: 2 }}>
                    Slot {(data?.properties?.length || 0) + i + 1} of {slots?.total}
                  </p>
                </div>
              </Link>
            ))}

            {/* Upsell card */}
            {!searchQuery && allSlotsFull && (
              <Link
                href="/dashboard/pricing"
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  minHeight: 180, gap: 12, padding: 24, textDecoration: 'none',
                  background: '#FAF9F7', border: '2px dashed #E8E5E0', borderRadius: 14,
                  transition: 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#00B7DB50'
                  e.currentTarget.style.background = '#00B7DB06'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E8E5E0'
                  e.currentTarget.style.background = '#FAF9F7'
                }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: '#00B7DB0D', border: '1px solid #00B7DB22',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00B7DB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>
                    Need More Properties?
                  </span>
                  <p style={{ fontSize: 12, color: '#7A7A7A', marginTop: 2 }}>
                    Upgrade your plan to add more slots
                  </p>
                </div>
              </Link>
            )}
          </div>

          {/* No search results */}
          {searchQuery && filteredProperties.length === 0 && (
            <div style={{
              background: '#FFFFFF', border: '1px solid #E8E5E0', borderRadius: 14,
              padding: 32, textAlign: 'center',
            }}>
              <p style={{ color: '#7A7A7A', fontSize: 14 }}>No properties match your search</p>
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  marginTop: 8, fontSize: 14, fontWeight: 600,
                  color: '#00B7DB', background: 'none', border: 'none',
                  cursor: 'pointer',
                }}
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

