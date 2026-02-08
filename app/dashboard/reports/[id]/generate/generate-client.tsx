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
  initialNarrative 
}: Props) {
  const router = useRouter()
  const [status, setStatus] = useState(initialStatus)
  const [narrative, setNarrative] = useState(initialNarrative)
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  // Auto-start generation if status is draft
  useEffect(() => {
    if (status === 'draft' && !isGenerating) {
      handleGenerate()
    }
  }, [])

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)
    setStatus('generating')

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
          {propertyName} — {month} {year}
        </h1>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-4 mb-8 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs">✓</span>
          <span className="text-slate-600">Property & Period</span>
        </div>
        <div className="flex-1 h-px bg-slate-200"></div>
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs">✓</span>
          <span className="text-slate-600">Upload & Context</span>
        </div>
        <div className="flex-1 h-px bg-slate-200"></div>
        <div className="flex items-center gap-2">
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
            status === 'complete' ? 'bg-green-500 text-white' : 'bg-blue-600 text-white'
          }`}>
            {status === 'complete' ? '✓' : '3'}
          </span>
          <span className="font-medium text-slate-900">Generate</span>
        </div>
        <div className="flex-1 h-px bg-slate-200"></div>
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs">4</span>
          <span className="text-slate-400">Review & Export</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg border border-slate-200 p-8">
        
        {/* Generating State */}
        {status === 'generating' && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mb-4"></div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Generating Your Report...
            </h2>
            <p className="text-slate-500">
              Writeup AI is analyzing your data and writing the narrative.
              <br />This usually takes 10-30 seconds.
            </p>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">😕</div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Generation Failed
            </h2>
            <p className="text-red-600 mb-6">{error}</p>
            <button
              onClick={handleRegenerate}
              disabled={isGenerating}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Success State */}
        {status === 'complete' && narrative && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <span className="text-2xl">✨</span>
                <h2 className="text-xl font-semibold text-slate-900">
                  Report Generated!
                </h2>
              </div>
              <button
                onClick={handleRegenerate}
                disabled={isGenerating}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                🔄 Regenerate
              </button>
            </div>

            {/* Narrative Preview */}
            <div className="prose prose-slate max-w-none mb-8">
              <div className="bg-slate-50 rounded-lg p-6 whitespace-pre-wrap font-serif text-slate-800 leading-relaxed">
                {narrative}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-200">
              <Link
                href={`/dashboard/reports/${reportId}/edit`}
                className="text-slate-600 hover:text-slate-900"
              >
                ← Edit Context
              </Link>
              <Link
                href={`/dashboard/reports/${reportId}`}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Review & Export →
              </Link>
            </div>
          </div>
        )}

        {/* Draft State (shouldn't show normally, auto-generates) */}
        {status === 'draft' && !isGenerating && (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">🤖</div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Ready to Generate
            </h2>
            <p className="text-slate-500 mb-6">
              Click below to generate your investor report using AI.
            </p>
            <button
              onClick={handleGenerate}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Generate Report
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
