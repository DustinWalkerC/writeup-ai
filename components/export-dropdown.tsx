'use client'

import { useState, useRef, useEffect } from 'react'

type ExportOption = {
  id: string
  label: string
  description: string
  onClick: () => Promise<void> | void
}

type Props = {
  options: ExportOption[]
  isExporting: boolean
  exportStatus: string | null
}

export function ExportDropdown({ options, isExporting, exportStatus }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleOptionClick = async (option: ExportOption) => {
    setIsOpen(false)
    await option.onClick()
  }

  return (
    <div className="flex items-center gap-3">
      {/* Status Message - Now to the LEFT of the button */}
      {exportStatus && (
        <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full">
          <span className="text-sm font-medium text-emerald-700">{exportStatus}</span>
        </div>
      )}

      {/* Dropdown Container */}
      <div className="relative" ref={dropdownRef}>
        {/* Export Button - Modern teal/cyan color */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isExporting}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-lg hover:from-cyan-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm transition-all shadow-sm"
        >
          {isExporting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Exporting...</span>
            </>
          ) : (
            <>
              <span>Export</span>
              <svg 
                className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </>
          )}
        </button>

        {/* Dropdown Menu */}
        {isOpen && !isExporting && (
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
            {options.map((option) => (
              <button
                key={option.id}
                onClick={() => handleOptionClick(option)}
                className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors"
              >
                <div className="font-medium text-slate-800 text-sm">{option.label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{option.description}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
