'use client'

import { useState, useEffect } from 'react'

type GenerationPhase = {
  id: string
  label: string
  status: 'pending' | 'active' | 'complete'
}

type Props = {
  isGenerating: boolean
}

const GENERATION_PHASES: GenerationPhase[] = [
  { id: 'init', label: 'Initializing analysis engine', status: 'pending' },
  { id: 'files', label: 'Opening uploaded documents', status: 'pending' },
  { id: 'parse', label: 'Scanning T-12 financials', status: 'pending' },
  { id: 'extract', label: 'Extracting revenue & expense data', status: 'pending' },
  { id: 'occupancy', label: 'Analyzing occupancy metrics', status: 'pending' },
  { id: 'variance', label: 'Calculating budget variances', status: 'pending' },
  { id: 'trends', label: 'Identifying performance trends', status: 'pending' },
  { id: 'context', label: 'Processing property manager notes', status: 'pending' },
  { id: 'model', label: 'Modeling financial performance', status: 'pending' },
  { id: 'draft', label: 'Drafting executive summary', status: 'pending' },
  { id: 'sections', label: 'Writing report sections', status: 'pending' },
  { id: 'insights', label: 'Generating investor insights', status: 'pending' },
  { id: 'review', label: 'Running accuracy check', status: 'pending' },
  { id: 'format', label: 'Formatting & styling report', status: 'pending' },
  { id: 'finalize', label: 'Finalizing document', status: 'pending' },
]

const DETAIL_MESSAGES = [
  'Reading gross potential rent...',
  'Calculating loss to lease...',
  'Analyzing vacancy trends...',
  'Reviewing expense ratios...',
  'Checking NOI margins...',
  'Comparing to prior period...',
  'Evaluating market conditions...',
  'Assessing lease velocity...',
  'Reviewing renewal rates...',
  'Analyzing trade-out premiums...',
  'Checking delinquency rates...',
  'Reviewing capital expenditures...',
  'Evaluating operational efficiency...',
  'Drafting occupancy narrative...',
  'Writing financial commentary...',
  'Formatting KPI displays...',
  'Generating recommendations...',
  'Verifying calculations...',
  'Polishing language...',
  'Applying professional tone...',
]

export function AIGenerationDisplay({ isGenerating }: Props) {
  const [phases, setPhases] = useState<GenerationPhase[]>(GENERATION_PHASES)
  const [currentDetail, setCurrentDetail] = useState('')
  const [elapsedTime, setElapsedTime] = useState(0)
  const [activePhaseIndex, setActivePhaseIndex] = useState(0)

  // Timer
  useEffect(() => {
    if (!isGenerating) return
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [isGenerating])

  // Phase progression
  useEffect(() => {
    if (!isGenerating) return
    const phaseInterval = setInterval(() => {
      setActivePhaseIndex(prev => {
        if (prev + 1 >= phases.length) return prev
        return prev + 1
      })
    }, 2500)
    return () => clearInterval(phaseInterval)
  }, [isGenerating, phases.length])

  // Update phase statuses
  useEffect(() => {
    setPhases(prev => prev.map((phase, index) => ({
      ...phase,
      status: index < activePhaseIndex ? 'complete' : index === activePhaseIndex ? 'active' : 'pending'
    })))
  }, [activePhaseIndex])

  // Cycle detail messages
  useEffect(() => {
    if (!isGenerating) return
    let idx = 0
    const interval = setInterval(() => {
      setCurrentDetail(DETAIL_MESSAGES[idx % DETAIL_MESSAGES.length])
      idx++
    }, 1200)
    return () => clearInterval(interval)
  }, [isGenerating])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!isGenerating) return null

  return (
    <div className="min-h-[500px] flex flex-col items-center justify-center p-8">
      {/* Modern Ring Spinner */}
      <div className="relative mb-12">
        {/* Outer glow */}
        <div 
          className="absolute inset-[-20px] rounded-full blur-2xl opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.4) 0%, rgba(34,197,94,0.3) 50%, transparent 70%)' }}
        />
        
        {/* Spinner ring */}
        <div className="relative w-28 h-28">
          {/* Background ring */}
          <div 
            className="absolute inset-0 rounded-full"
            style={{ 
              border: '4px solid #e2e8f0',
            }}
          />
          
          {/* Animated gradient ring */}
          <div 
            className="absolute inset-0 rounded-full animate-spin"
            style={{
              border: '4px solid transparent',
              borderTopColor: '#06b6d4',
              borderRightColor: '#22c55e',
              animationDuration: '1.5s',
            }}
          />
          
          {/* Second spinning ring (opposite direction) */}
          <div 
            className="absolute inset-2 rounded-full animate-spin"
            style={{
              border: '3px solid transparent',
              borderBottomColor: '#0ea5e9',
              borderLeftColor: '#10b981',
              animationDuration: '2s',
              animationDirection: 'reverse',
            }}
          />
          
          {/* Center content */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-mono font-semibold text-slate-700">
                {formatTime(elapsedTime)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Text */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-slate-800 mb-2">
          AI is analyzing your data and crafting your investor report
        </h2>
      </div>

      {/* Current Detail - Blue/Teal color */}
      <div className="h-6 mb-8">
        <p 
          className="text-sm font-medium animate-pulse"
          style={{ color: '#0891b2' }}
        >
          {currentDetail}
        </p>
      </div>

      {/* Progress Phases - Blue/Green/Yellow theme */}
      <div className="w-full max-w-md space-y-1.5">
        {phases.slice(Math.max(0, activePhaseIndex - 2), activePhaseIndex + 5).map((phase) => (
          <div 
            key={phase.id}
            className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-500 ${
              phase.status === 'active' ? 'bg-cyan-50 border border-cyan-200' : 
              phase.status === 'complete' ? 'opacity-50' : 'opacity-30'
            }`}
          >
            {/* Status Indicator */}
            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
              phase.status === 'complete' ? 'bg-emerald-500' : 
              phase.status === 'active' ? 'bg-cyan-500' : 'bg-slate-300'
            }`}>
              {phase.status === 'complete' && (
                <span className="text-white text-xs font-bold">✓</span>
              )}
              {phase.status === 'active' && (
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              )}
            </div>
            
            {/* Label */}
            <span className={`text-sm transition-all duration-300 ${
              phase.status === 'active' ? 'text-cyan-700 font-medium' : 
              phase.status === 'complete' ? 'text-slate-500' : 'text-slate-400'
            }`}>
              {phase.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
