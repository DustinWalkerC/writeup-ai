'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { generateReport, regenerateReport } from '@/app/actions/ai'

type Props = {
  reportId: string
  propertyName: string
  month: string
  year: number
  initialStatus: string
  initialNarrative: string | null
}

export function GenerateClient({
  reportId,
  propertyName,
  month,
  year,
  initialStatus,
  initialNarrative,
}: Props) {
  const router = useRouter()
  const [status, setStatus] = useState(initialStatus)
  const [narrative, setNarrative] = useState(initialNarrative)
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)

  // Timer for elapsed time during generation
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isGenerating) {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isGenerating])

  // Auto-start generation if status is draft
  useEffect(() => {
    if (status === 'draft' && !isGenerating && !narrative) {
      handleGenerate()
    }
  }, [])

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)
    setStatus('generating')
    setElapsedTime(0)

    const result = await generateReport(reportId)

    if (result.success) {
      setNarrative(result.narrative || null)
      setStatus('complete')
    } else {
      setError(result.error || 'Generation failed')
      setStatus('error')
    }

    setIsGenerating(false)
  }

  const handleRegenerate = async () => {
    setIsGenerating(true)
    setError(null)
    setStatus('generating')
    setNarrative(null)
    setElapsedTime(0)

    const result = await regenerateReport(reportId)

    if (result.success) {
      setNarrative(result.narrative || null)
      setStatus('complete')
    } else {
      setError(result.error || 'Generation failed')
      setStatus('error')
    }

    setIsGenerating(false)
  }

  const formatTime = (seconds: number) => {
    return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/dashboard/reports/${reportId}/edit`}
          className="text-slate-500 hover:text-slate-700 text-sm"
        >
          ← Back to Edit
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">
          {propertyName}
        </h1>
        <p className="text-slate-500">{month} {year} Investor Report</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-4 mb-8 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs">✓</span>
          <span className="text-slate-600">Setup</span>
        </div>
        <div className="flex-1 h-px bg-slate-200"></div>
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs">✓</span>
          <span className="text-slate-600">Context</span>
        </div>
        <div className="flex-1 h-px bg-slate-200"></div>
        <div className="flex items-center gap-2">
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
            status === 'complete' ? 'bg-green-500 text-white' : 'bg-amber-500 text-white'
          }`}>
            {status === 'complete' ? '✓' : '3'}
          </span>
          <span className="font-medium text-slate-900">Generate</span>
        </div>
        <div className="flex-1 h-px bg-slate-200"></div>
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs">4</span>
          <span className="text-slate-400">Export</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg border border-slate-200 p-8">
        {/* Generating State */}
        {status === 'generating' && (
          <div className="text-center py-16">
            <div className="inline-block mb-6">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-slate-200 rounded-full"></div>
                <div className="absolute inset-0 w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Generating Institutional Report
            </h2>
            <p className="text-slate-500 mb-4">
              Claude is analyzing your data and writing PE-grade content...
            </p>
            <div className="text-sm text-slate-400">
              Elapsed: {formatTime(elapsedTime)}
            </div>
            
            <div className="mt-8 max-w-md mx-auto text-left">
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 text-slate-600">
                  <span className="text-green-500">✓</span>
                  Analyzing property context
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <span className={elapsedTime > 3 ? 'text-green-500' : 'text-slate-300'}>
                    {elapsedTime > 3 ? '✓' : '○'}
                  </span>
                  Processing questionnaire data
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <span className={elapsedTime > 8 ? 'text-green-500' : 'text-slate-300'}>
                    {elapsedTime > 8 ? '✓' : '○'}
                  </span>
                  Generating executive summary
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <span className={elapsedTime > 15 ? 'text-green-500' : 'text-slate-300'}>
                    {elapsedTime > 15 ? '✓' : '○'}
                  </span>
                  Writing detailed sections
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <span className={elapsedTime > 20 ? 'text-green-500' : 'text-slate-300'}>
                    {elapsedTime > 20 ? '✓' : '○'}
                  </span>
                  Finalizing report
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Generation Failed
            </h2>
            <p className="text-red-600 mb-6 max-w-md mx-auto">{error}</p>
            <div className="flex items-center justify-center gap-4">
              <Link
                href={`/dashboard/reports/${reportId}/edit`}
                className="px-4 py-2 text-slate-600 hover:text-slate-900"
              >
                ← Edit Context
              </Link>
              <button
                onClick={handleRegenerate}
                disabled={isGenerating}
                className="px-6 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Success State */}
        {status === 'complete' && narrative && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-xl">
                  ✓
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Report Generated
                  </h2>
                  <p className="text-sm text-slate-500">
                    Institutional-quality content ready for review
                  </p>
                </div>
              </div>
              <button
                onClick={handleRegenerate}
                disabled={isGenerating}
                className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
              >
                🔄 Regenerate
              </button>
            </div>

            {/* Report Preview */}
            <div className="border border-slate-200 rounded-lg overflow-hidden mb-6">
              <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                <span className="text-sm text-slate-500">Preview</span>
              </div>
              <div className="p-6 max-h-[500px] overflow-y-auto">
                <div className="prose prose-slate prose-sm max-w-none">
                  {narrative.split('\n').map((line, i) => {
                    if (line.startsWith('## ')) {
                      return (
                        <h3 key={i} className="text-lg font-semibold text-slate-900 mt-6 mb-3 first:mt-0">
                          {line.replace('## ', '')}
                        </h3>
                      )
                    }
                    if (line.trim()) {
                      return (
                        <p key={i} className="text-slate-700 mb-3 leading-relaxed">
                          {line}
                        </p>
                      )
                    }
                    return null
                  })}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <Link
                href={`/dashboard/reports/${reportId}/edit`}
                className="text-slate-600 hover:text-slate-900"
              >
                ← Edit Context
              </Link>
              <Link
                href={`/dashboard/reports/${reportId}`}
                className="px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium"
              >
                Review & Export →
              </Link>
            </div>
          </div>
        )}

        {/* Draft State */}
        {status === 'draft' && !isGenerating && (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">🏛️</div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Ready to Generate
            </h2>
            <p className="text-slate-500 mb-6">
              Click below to generate an institutional-quality investor report.
            </p>
            <button
              onClick={handleGenerate}
              className="px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium"
            >
              Generate Report
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
