'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { generateReport } from '@/app/actions/ai'
import { AIGenerationDisplay } from './ai-generation-display'

type Props = {
  reportId: string
  initialStatus: string
  propertyName: string
  month: string
  year: number
}

export function GenerateClient({ reportId, initialStatus, propertyName, month, year }: Props) {
  const router = useRouter()
  const [status, setStatus] = useState(initialStatus)
  const [isGenerating, setIsGenerating] = useState(initialStatus === 'generating')
  const [error, setError] = useState<string | null>(null)

  // Auto-start generation if status is draft
  useEffect(() => {
    if (initialStatus === 'draft' && !isGenerating) {
      handleGenerate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)
    setStatus('generating')

    const result = await generateReport(reportId)

    if (result.success) {
      setStatus('complete')
    } else {
      setStatus('error')
      setError(result.error || 'Failed to generate report')
    }
    
    setIsGenerating(false)
  }

  // Generating state - inline, no black background
  if (isGenerating || status === 'generating') {
    return (
      <div className="max-w-3xl mx-auto">
        {/* Progress Steps at Top */}
        <div className="flex items-center gap-4 mb-8 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs">✓</span>
            <span className="text-slate-600">Property & Period</span>
          </div>
          <div className="flex-1 h-px bg-slate-200"></div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs">✓</span>
            <span className="text-slate-600">Upload & Context</span>
          </div>
          <div className="flex-1 h-px bg-slate-200"></div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-cyan-500 text-white flex items-center justify-center text-xs">3</span>
            <span className="font-medium text-slate-900">Generate</span>
          </div>
          <div className="flex-1 h-px bg-slate-200"></div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs">4</span>
            <span className="text-slate-400">Review & Export</span>
          </div>
        </div>

        {/* Property Info */}
        <div className="text-center mb-4">
          <p className="text-slate-500 text-sm">
            {propertyName} — {month} {year}
          </p>
        </div>

        {/* Generation Display */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <AIGenerationDisplay isGenerating={true} />
        </div>
      </div>
    )
  }

  // Complete state
  if (status === 'complete') {
    return (
      <div className="max-w-3xl mx-auto">
        {/* Progress Steps at Top */}
        <div className="flex items-center gap-4 mb-8 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs">✓</span>
            <span className="text-slate-600">Property & Period</span>
          </div>
          <div className="flex-1 h-px bg-slate-200"></div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs">✓</span>
            <span className="text-slate-600">Upload & Context</span>
          </div>
          <div className="flex-1 h-px bg-slate-200"></div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs">✓</span>
            <span className="text-slate-600">Generate</span>
          </div>
          <div className="flex-1 h-px bg-slate-200"></div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-cyan-500 text-white flex items-center justify-center text-xs">4</span>
            <span className="font-medium text-slate-900">Review & Export</span>
          </div>
        </div>

        {/* Success Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-100 flex items-center justify-center">
            <span className="text-emerald-600 text-2xl font-bold">✓</span>
          </div>
          
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Report Generated Successfully</h2>
          <p className="text-slate-500 mb-1">{propertyName}</p>
          <p className="text-slate-400 text-sm mb-8">{month} {year} Investor Report</p>
          
          <div className="flex items-center justify-center gap-3">
            <Link
              href={`/dashboard/reports/${reportId}`}
              className="px-6 py-2.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 font-medium transition-colors"
            >
              View Report
            </Link>
            <Link
              href="/dashboard/reports"
              className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium transition-colors"
            >
              All Reports
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="max-w-3xl mx-auto">
        {/* Progress Steps */}
        <div className="flex items-center gap-4 mb-8 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs">✓</span>
            <span className="text-slate-600">Property & Period</span>
          </div>
          <div className="flex-1 h-px bg-slate-200"></div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs">✓</span>
            <span className="text-slate-600">Upload & Context</span>
          </div>
          <div className="flex-1 h-px bg-slate-200"></div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs">!</span>
            <span className="font-medium text-red-600">Generate</span>
          </div>
          <div className="flex-1 h-px bg-slate-200"></div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs">4</span>
            <span className="text-slate-400">Review & Export</span>
          </div>
        </div>

        {/* Error Card */}
        <div className="bg-white rounded-xl border border-red-200 shadow-sm p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
            <span className="text-red-600 text-2xl font-bold">×</span>
          </div>
          
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Generation Failed</h2>
          <p className="text-red-500 text-sm mb-8 max-w-md mx-auto">{error}</p>
          
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleGenerate}
              className="px-6 py-2.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 font-medium transition-colors"
            >
              Try Again
            </button>
            <Link
              href={`/dashboard/reports/${reportId}/edit`}
              className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium transition-colors"
            >
              Edit Data
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Ready state (draft) - this shouldn't show often since we auto-start
  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress Steps */}
      <div className="flex items-center gap-4 mb-8 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs">✓</span>
          <span className="text-slate-600">Property & Period</span>
        </div>
        <div className="flex-1 h-px bg-slate-200"></div>
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs">✓</span>
          <span className="text-slate-600">Upload & Context</span>
        </div>
        <div className="flex-1 h-px bg-slate-200"></div>
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-cyan-500 text-white flex items-center justify-center text-xs">3</span>
          <span className="font-medium text-slate-900">Generate</span>
        </div>
        <div className="flex-1 h-px bg-slate-200"></div>
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs">4</span>
          <span className="text-slate-400">Review & Export</span>
        </div>
      </div>

      {/* Ready Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-cyan-100 flex items-center justify-center">
          <div 
            className="w-8 h-8 rounded-full border-3 border-cyan-500 border-t-transparent animate-spin"
            style={{ borderWidth: '3px' }}
          />
        </div>
        
        <h2 className="text-xl font-semibold text-slate-800 mb-2">Ready to Generate</h2>
        <p className="text-slate-500 mb-1">{propertyName}</p>
        <p className="text-slate-400 text-sm mb-8">{month} {year}</p>
        
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={handleGenerate}
            className="px-8 py-2.5 bg-gradient-to-r from-cyan-600 to-emerald-600 text-white rounded-lg hover:from-cyan-700 hover:to-emerald-700 font-medium transition-all shadow-md"
          >
            Generate Report
          </button>
          <Link
            href={`/dashboard/reports/${reportId}/edit`}
            className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium transition-colors"
          >
            Edit First
          </Link>
        </div>
      </div>
    </div>
  )
}