'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
  const searchParams = useSearchParams()
  const [status, setStatus] = useState(initialStatus)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasAutoStarted = useRef(false)

  // Check if we should auto-start (coming from edit page with ?start=true)
  const shouldAutoStart = searchParams.get('start') === 'true'

  // Auto-start generation if coming from edit page
  useEffect(() => {
    if (shouldAutoStart && initialStatus === 'draft' && !hasAutoStarted.current) {
      hasAutoStarted.current = true
      handleGenerate()
    }
  }, [shouldAutoStart, initialStatus])

  // If already complete and not showing success, redirect to view
  useEffect(() => {
    if (initialStatus === 'complete' && !shouldAutoStart) {
      router.replace(`/dashboard/reports/${reportId}`)
    }
  }, [initialStatus, reportId, router, shouldAutoStart])

  const handleGenerate = async () => {
    if (isGenerating) return
    
    setIsGenerating(true)
    setError(null)
    setStatus('generating')

    const result = await generateReport(reportId)

    setIsGenerating(false)

    if (result.success) {
      setStatus('complete')
      // Don't auto-redirect - show success screen
    } else {
      setStatus('error')
      setError(result.error || 'Failed to generate report')
    }
  }

  // Success state - show after generation completes
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
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-100 flex items-center justify-center">
            <span className="text-emerald-600 text-3xl">✓</span>
          </div>
          
          <h2 className="text-2xl font-semibold text-slate-800 mb-2">Report Generated Successfully</h2>
          <p className="text-slate-500 mb-1">{propertyName}</p>
          <p className="text-slate-400 text-sm mb-10">{month} {year} Investor Report</p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={`/dashboard/reports/${reportId}`}
              className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-lg hover:from-cyan-700 hover:to-teal-700 font-medium transition-all shadow-md text-center"
            >
              View & Edit Report
            </Link>
            <Link
              href="/dashboard/reports/new"
              className="w-full sm:w-auto px-8 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium transition-colors text-center"
            >
              Start Another Report
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Generating state
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
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleGenerate}
              className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-lg hover:from-cyan-700 hover:to-teal-700 font-medium transition-all"
            >
              Try Again
            </button>
            <Link
              href={`/dashboard/reports/${reportId}/edit`}
              className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium transition-colors text-center"
            >
              Edit Data
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Ready state (draft) - only shows if user navigates directly to /generate
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
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
            <span className="text-white text-sm">▶</span>
          </div>
        </div>
        
        <h2 className="text-xl font-semibold text-slate-800 mb-2">Ready to Generate</h2>
        <p className="text-slate-500 mb-1">{propertyName}</p>
        <p className="text-slate-400 text-sm mb-8">{month} {year}</p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full sm:w-auto px-8 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-lg hover:from-cyan-700 hover:to-teal-700 font-medium transition-all shadow-md disabled:opacity-50"
          >
            Generate Report
          </button>
          <Link
            href={`/dashboard/reports/${reportId}/edit`}
            className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium transition-colors text-center"
          >
            Go Back
          </Link>
        </div>
        
        <p className="text-slate-400 text-xs mt-6">
          AI will analyze your files and create a professional investor report
        </p>
      </div>
    </div>
  )
}
