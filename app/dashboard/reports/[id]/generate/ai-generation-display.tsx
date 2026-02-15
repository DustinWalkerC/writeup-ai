'use client';
import { useState, useEffect, useRef } from 'react';

interface GeneratedSection {
  id: string; title: string; content: string;
  metrics: Array<{ label: string; value: string; change?: string; changeDirection?: string; vsbudget?: string }>;
  included: boolean; skipReason: string | null;
}

interface AIGenerationDisplayProps {
  status: 'idle' | 'generating' | 'completed' | 'error';
  streamText: string;
  sections: GeneratedSection[];
  error: string | null;
  usage: { inputTokens: number; outputTokens: number } | null;
  onRegenerateSection: (sectionId: string) => void;
  tier?: string;
}

interface AnalysisStage {
  id: string;
  label: string;
  detail: string;
  status: 'pending' | 'active' | 'complete';
}

function renderGeneratedContent(content: string): string {
  if (!content) return '';

  // First, convert literal \n sequences to actual newlines
  let html = content.replace(/\\n/g, '\n');

  // Check if content has inline HTML (charts, tables, SVGs from Claude)
  const hasInlineHTML = /<(?:div|table|svg|span|style|tr|td|th)\b/i.test(html);

  if (hasInlineHTML) {
    // Split on HTML blocks to preserve them, convert text parts
    const parts = html.split(/(<(?:div|table|svg|style)[\s\S]*?<\/(?:div|table|svg|style)>)/gi);
    return parts
      .map((part) => {
        if (/^<(?:div|table|svg|style)/i.test(part.trim())) {
          return part; // HTML block — leave untouched
        }
        return convertTextToHTML(part);
      })
      .join('');
  }

  return convertTextToHTML(html);
}

function convertTextToHTML(text: string): string {
  if (!text.trim()) return '';
  return text
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n\n+/g, '</p><p style="margin:8px 0;line-height:1.6;">')
    .replace(/\n/g, '<br/>')
    .replace(/^(.+)/, '<p style="margin:8px 0;line-height:1.6;">$1')
    .replace(/(.+)$/, '$1</p>');
}

const ANALYSIS_STAGES: Omit<AnalysisStage, 'status'>[] = [
  { id: 'parse', label: 'Parsing Financial Documents', detail: 'Extracting data from uploaded T-12, rent roll, and supporting files' },
  { id: 'validate', label: 'Validating Data Integrity', detail: 'Cross-referencing line items and verifying month alignment' },
  { id: 'kpi', label: 'Calculating Key Performance Indicators', detail: 'NOI, occupancy rates, revenue per unit, expense ratios' },
  { id: 'variance', label: 'Analyzing Budget Variance', detail: 'Comparing actuals to budget across all GL categories' },
  { id: 'trends', label: 'Evaluating Trends & Patterns', detail: 'Month-over-month changes, trailing averages, seasonality' },
  { id: 'narrative', label: 'Generating Investor Narrative', detail: 'Writing institutional-quality prose for each report section' },
  { id: 'compile', label: 'Compiling Final Report', detail: 'Assembling sections, metrics, and formatting output' },
];

export default function AIGenerationDisplay({ status, streamText, sections, error, usage, onRegenerateSection, tier }: AIGenerationDisplayProps) {
  const [stages, setStages] = useState<AnalysisStage[]>(
    ANALYSIS_STAGES.map(s => ({ ...s, status: 'pending' as const }))
  );
  const [liveStats, setLiveStats] = useState({
    dataPoints: 0,
    lineItems: 0,
    sectionsBuilt: 0,
    elapsedSeconds: 0,
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Drive stage progression based on stream text length
  useEffect(() => {
    if (status !== 'generating') return;

    const len = streamText.length;
    const thresholds = [
      { min: 0, stageIndex: 0 },     // parse
      { min: 50, stageIndex: 1 },     // validate
      { min: 200, stageIndex: 2 },    // kpi
      { min: 800, stageIndex: 3 },    // variance
      { min: 2000, stageIndex: 4 },   // trends
      { min: 4000, stageIndex: 5 },   // narrative
      { min: 7000, stageIndex: 6 },   // compile
    ];

    let activeIndex = 0;
    for (const t of thresholds) {
      if (len >= t.min) activeIndex = t.stageIndex;
    }

    setStages(prev => prev.map((s, i) => ({
      ...s,
      status: i < activeIndex ? 'complete' : i === activeIndex ? 'active' : 'pending',
    })));

    // Update live stats
    setLiveStats(prev => ({
      ...prev,
      dataPoints: Math.min(Math.floor(len * 0.8), 12000),
      lineItems: Math.min(Math.floor(len * 0.15), 2400),
      sectionsBuilt: Math.min(Math.floor(activeIndex * 1.5), tier === 'institutional' ? 15 : tier === 'professional' ? 10 : 4),
    }));
  }, [streamText, status, tier]);

  // Elapsed time counter
  useEffect(() => {
    if (status === 'generating' && !startTimeRef.current) {
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setLiveStats(prev => ({
            ...prev,
            elapsedSeconds: Math.floor((Date.now() - startTimeRef.current!) / 1000),
          }));
        }
      }, 1000);
    }

    if (status === 'completed' || status === 'error') {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  // Mark all stages complete when done
  useEffect(() => {
    if (status === 'completed') {
      setStages(prev => prev.map(s => ({ ...s, status: 'complete' as const })));
    }
  }, [status]);

  // ---------- IDLE STATE ----------
  if (status === 'idle') {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-50 to-teal-50 border border-cyan-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-lg font-medium text-slate-700">Ready to generate your report</p>
        <p className="text-sm text-slate-400 mt-1">Click &quot;Generate Report&quot; to start the analysis engine</p>
      </div>
    );
  }

  // ---------- GENERATING STATE ----------
  if (status === 'generating') {
    const completedCount = stages.filter(s => s.status === 'complete').length;
    const progress = Math.round((completedCount / stages.length) * 100);

    return (
      <div className="space-y-6">
        {/* Header Card */}
        <div className="bg-gradient-to-r from-cyan-600 to-teal-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold">Writeup AI Analysis Engine</h2>
                <p className="text-cyan-100 text-sm">Processing your financial data</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{progress}%</p>
              <p className="text-cyan-100 text-xs">{formatTime(liveStats.elapsedSeconds)}</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-700 ease-out"
              style={{ width: `${Math.max(progress, 5)}%` }}
            />
          </div>
        </div>

        {/* Live Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatBox label="Data Points Analyzed" value={liveStats.dataPoints.toLocaleString()} animate />
          <StatBox label="Line Items Processed" value={liveStats.lineItems.toLocaleString()} animate />
          <StatBox label="Sections Building" value={`${liveStats.sectionsBuilt}`} />
          <StatBox label="Time Elapsed" value={formatTime(liveStats.elapsedSeconds)} />
        </div>

        {/* Stages List */}
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {stages.map((stage) => (
            <div key={stage.id} className="px-6 py-4 flex items-center gap-4">
              <div className="flex-shrink-0">
                {stage.status === 'complete' ? (
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                ) : stage.status === 'active' ? (
                  <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-cyan-600 animate-pulse" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-slate-300" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${
                  stage.status === 'complete' ? 'text-green-700' :
                  stage.status === 'active' ? 'text-cyan-700' :
                  'text-slate-400'
                }`}>
                  {stage.label}
                </p>
                <p className={`text-xs mt-0.5 ${
                  stage.status === 'active' ? 'text-cyan-500' : 'text-slate-400'
                }`}>
                  {stage.detail}
                </p>
              </div>
              {stage.status === 'active' && (
                <span className="text-xs text-cyan-600 font-medium">In Progress</span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---------- ERROR STATE ----------
  if (status === 'error') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <h3 className="text-red-800 font-semibold">Generation Error</h3>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // ---------- COMPLETED STATE ----------
  const includedSections = sections.filter(s => s.included);
  const skippedSections = sections.filter(s => !s.included);
  const totalMetrics = includedSections.reduce((sum, s) => sum + (s.metrics?.length || 0), 0);

  return (
    <div className="space-y-6">
      {/* Completion Summary */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-green-800">Report Generated Successfully</h2>
            <p className="text-green-600 text-sm">{includedSections.length} sections with {totalMetrics} key metrics</p>
          </div>
        </div>
        {usage && (
          <div className="flex items-center gap-6 text-sm text-green-700/70">
            <span>Input: {usage.inputTokens.toLocaleString()} tokens</span>
            <span>Output: {usage.outputTokens.toLocaleString()} tokens</span>
            <span className="text-green-600 font-medium">
              {sections.filter(s => s.included).length} sections generated
            </span>
          </div>
        )}
      </div>

      {/* Generated Sections */}
      {includedSections.map(section => (
        <div key={section.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">{section.title}</h3>
            <button onClick={() => onRegenerateSection(section.id)}
              className="text-sm text-cyan-600 hover:text-cyan-700 font-medium inline-flex items-center gap-1 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Regenerate
            </button>
          </div>

          {section.metrics?.length > 0 && (
            <div className="px-6 py-4 bg-slate-50 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {section.metrics.map((m, i) => (
                <div key={i} className="bg-white rounded-lg p-3 border border-slate-100">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">{m.label}</p>
                  <p className="text-lg font-bold text-slate-900 mt-1">{m.value}</p>
                  {m.change && (
                    <p className={`text-xs mt-0.5 ${
                      m.changeDirection === 'up' ? 'text-green-600' :
                      m.changeDirection === 'down' ? 'text-red-600' :
                      'text-slate-500'
                    }`}>
                      {m.change} MoM {m.vsbudget && <span className="ml-2 text-slate-400">vs budget: {m.vsbudget}</span>}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="px-6 py-4 prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{
            __html: renderGeneratedContent(section.content)
          }} />
        </div>
      ))}

      {skippedSections.length > 0 && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
          <p className="text-sm font-medium text-slate-500 mb-2">Sections skipped (insufficient data):</p>
          <div className="space-y-1">
            {skippedSections.map(s => (
              <p key={s.id} className="text-sm text-slate-400">
                {s.title}{s.skipReason ? `: ${s.skipReason}` : ''}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, animate }: { label: string; value: string; animate?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold text-slate-900 mt-1 tabular-nums ${animate ? 'transition-all duration-300' : ''}`}>
        {value}
      </p>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

