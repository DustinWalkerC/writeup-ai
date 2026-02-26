// components/generation-progress.tsx

/**
 * PHASE 2B — Generation Progress (Full-Page UI)
 *
 * The complete generation experience shown on the report generation page.
 * Contains: phase stepper, progress bar, dynamic status text,
 * section tracker, time estimate, dev token panel, and completion state.
 *
 * This component owns the ProgressEngine and drives it from streaming events.
 * It does NOT own the streaming logic — the parent page provides stream events.
 *
 * Design system: cyan-600/teal-600 gradient, Newsreader headings, DM Sans body.
 * No emojis. No confetti. Clean, confident, institutional.
 */

'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ProgressEngine,
  createSectionDetector,
  estimateTokenCount,
  type ProgressState,
  type ProgressPhase,
} from '@/lib/progress-engine';
import GeneratingCard from '@/components/generating-card';
import { DEV_FLAGS } from '@/lib/dev-config';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface GenerationProgressProps {
  /** Report ID */
  reportId: string;
  /** Property name */
  propertyName: string;
  /** Report period display (e.g. "November 2025") */
  reportPeriod: string;
  /** Max tokens for this tier */
  maxTokens: number;
  /** Expected number of sections */
  expectedSections: number;
  /** Called when user clicks "View Report" after completion */
  onViewReport: () => void;
  /** Called when user clicks "Prepare Another Report" */
  onPrepareAnother?: () => void;
  /** Resume state from DB (when user navigates back) */
  resumeProgress?: number;
  resumeStatusText?: string;
}

export interface GenerationProgressHandle {
  /** Feed a text chunk from the stream */
  feedStreamText: (text: string) => void;
  /** Signal extraction is complete */
  onExtractionComplete: () => void;
  /** Signal validation start */
  onValidationStart: () => void;
  /** Signal validation complete */
  onValidationComplete: (passed: boolean) => void;
  /** Signal full completion */
  onComplete: () => void;
  /** Signal error */
  onError: (message: string) => void;
}

// ═══════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════

const GenerationProgress = React.forwardRef<GenerationProgressHandle, GenerationProgressProps>(
  function GenerationProgress(
    {
      reportId,
      propertyName,
      reportPeriod,
      maxTokens,
      expectedSections,
      onViewReport,
      onPrepareAnother,
      resumeProgress,
      resumeStatusText,
    },
    ref
  ) {
    const [progressState, setProgressState] = useState<ProgressState>({
      displayProgress: resumeProgress || 0,
      phase: 'idle',
      statusText: '',
      sectionsCompleted: 0,
      sectionsTotal: expectedSections,
      estimatedSecondsRemaining: null,
      validationPassed: false,
      errorMessage: null,
    });

    // Dev-only token tracking
    const [devStats, setDevStats] = useState({
      inputTokens: 0,
      outputTokens: 0,
      tokensPerSec: 0,
      model: '',
      cost: 0,
    });

    const engineRef = useRef<ProgressEngine | null>(null);
    const sectionDetectorRef = useRef<ReturnType<typeof createSectionDetector> | null>(null);
    const totalTextRef = useRef<number>(0);

    // ── Initialize engine ──
    useEffect(() => {
      const engine = new ProgressEngine({
        onUpdate: (state) => setProgressState(state),
        onComplete: () => {/* handled via state */},
        onError: () => {/* handled via state */},
      });

      engineRef.current = engine;

      // Create section detector
      sectionDetectorRef.current = createSectionDetector((sectionId) => {
        engine.onSectionDetected(sectionId);
      });

      // Start or resume
      if (resumeProgress && resumeProgress > 0) {
        engine.resume(resumeProgress, resumeStatusText || 'Resuming generation...');
      } else {
        engine.start(maxTokens, expectedSections);
      }

      return () => {
        engine.stop();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Expose imperative handle to parent ──
    React.useImperativeHandle(ref, () => ({
      feedStreamText(text: string) {
        const engine = engineRef.current;
        if (!engine) return;

        // Feed to section detector
        sectionDetectorRef.current?.feed(text);

        // Estimate tokens and feed to engine
        const tokenCount = estimateTokenCount(text);
        engine.onTokens(tokenCount);
        totalTextRef.current += text.length;

        // Dev stats
        if (DEV_FLAGS.showTokens) {
          setDevStats(prev => ({
            ...prev,
            outputTokens: prev.outputTokens + tokenCount,
          }));
        }
      },

      onExtractionComplete() {
        engineRef.current?.onExtractionComplete();
      },

      onValidationStart() {
        engineRef.current?.onValidationStart();
      },

      onValidationComplete(passed: boolean) {
        engineRef.current?.onValidationComplete(passed);
      },

      onComplete() {
        engineRef.current?.onComplete();
      },

      onError(message: string) {
        engineRef.current?.onError(message);
      },
    }));

    const isComplete = progressState.phase === 'complete';
    const isError = progressState.phase === 'error';
    const percentage = Math.round(progressState.displayProgress);

    return (
      <div className="max-w-2xl mx-auto" style={{ fontFamily: '"DM Sans", sans-serif' }}>
        {/* Phase Stepper */}
        <PhaseStepper currentPhase={progressState.phase} />

        {/* Main progress card */}
        <div className="mt-6">
          <GeneratingCard
            reportId={reportId}
            propertyName={propertyName}
            reportPeriod={reportPeriod}
            progress={progressState}
          />
        </div>

        {/* Section tracker (shows during generation) */}
        {progressState.phase === 'generating' && progressState.sectionsCompleted > 0 && (
          <div className="mt-4 rounded-xl border border-stone-200 bg-white p-5">
            <h3
              className="text-sm font-semibold text-slate-700 mb-3"
              style={{ fontFamily: '"Newsreader", serif' }}
            >
              Sections Generated
            </h3>
            <div className="flex items-center gap-1.5 flex-wrap">
              {Array.from({ length: progressState.sectionsTotal }).map((_, i) => (
                <div
                  key={i}
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max(100 / progressState.sectionsTotal - 1, 4)}%`,
                    minWidth: '12px',
                    backgroundColor: i < progressState.sectionsCompleted
                      ? '#0D9488' // Teal for completed
                      : '#DDD9D2', // Track color for pending
                  }}
                />
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {progressState.sectionsCompleted} of {progressState.sectionsTotal} complete
            </p>
          </div>
        )}

        {/* Action buttons */}
        {isComplete && (
          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={onViewReport}
              className="flex-1 px-6 py-3 rounded-lg text-white font-medium text-sm transition-transform"
              style={{
                background: 'linear-gradient(135deg, #0D9488, #0891B2)',
                animation: 'scaleIn 200ms ease-out',
              }}
            >
              View Report
            </button>
            {onPrepareAnother && (
              <button
                onClick={onPrepareAnother}
                className="px-6 py-3 rounded-lg border border-stone-300 text-slate-600 font-medium text-sm hover:bg-stone-50 transition-colors"
              >
                Prepare Another Report
              </button>
            )}
          </div>
        )}

        {/* Error retry */}
        {isError && (
          <div className="mt-6">
            <button
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 rounded-lg border border-red-300 text-red-600 font-medium text-sm hover:bg-red-50 transition-colors"
            >
              Retry Generation
            </button>
          </div>
        )}

        {/* Dev-only token panel */}
        {DEV_FLAGS.showTokens && (
          <DevTokenPanel
            inputTokens={devStats.inputTokens}
            outputTokens={devStats.outputTokens}
            phase={progressState.phase}
            percentage={percentage}
          />
        )}
      </div>
    );
  }
);

export default GenerationProgress;

// ═══════════════════════════════════════════════════════════
// PHASE STEPPER
// ═══════════════════════════════════════════════════════════

const PHASES: Array<{ key: ProgressPhase; label: string }> = [
  { key: 'extracting', label: 'Extract' },
  { key: 'generating', label: 'Generate' },
  { key: 'validating', label: 'Validate' },
  { key: 'complete', label: 'Complete' },
];

function PhaseStepper({ currentPhase }: { currentPhase: ProgressPhase }) {
  const phaseOrder: ProgressPhase[] = ['extracting', 'generating', 'validating', 'saving', 'complete'];
  const currentIndex = phaseOrder.indexOf(currentPhase);

  return (
    <div className="flex items-center justify-between px-4">
      {PHASES.map((phase, i) => {
        const stepIndex = phaseOrder.indexOf(phase.key);
        const isActive = currentPhase === phase.key || (phase.key === 'complete' && currentPhase === 'saving');
        const isDone = currentIndex > stepIndex || currentPhase === 'complete';
        const isPending = currentIndex < stepIndex && currentPhase !== 'complete';

        return (
          <React.Fragment key={phase.key}>
            {/* Step indicator */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300"
                style={{
                  backgroundColor: isDone
                    ? '#0D9488'
                    : isActive
                    ? '#E0F7FA'
                    : '#F5F5F4',
                  color: isDone
                    ? '#FFFFFF'
                    : isActive
                    ? '#0C7792'
                    : '#A8A29E',
                  border: isActive ? '2px solid #0891B2' : '2px solid transparent',
                }}
              >
                {isDone ? (
                  <CheckIcon />
                ) : (
                  i + 1
                )}
              </div>
              <span
                className="text-xs font-medium"
                style={{
                  color: isDone || isActive ? '#0C7792' : '#A8A29E',
                }}
              >
                {phase.label}
              </span>
            </div>

            {/* Connector line */}
            {i < PHASES.length - 1 && (
              <div
                className="flex-1 h-0.5 mx-2 rounded-full transition-all duration-500"
                style={{
                  backgroundColor: isDone ? '#0D9488' : '#DDD9D2',
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path
        d="M2.5 6L5 8.5L9.5 3.5"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════
// DEV TOKEN PANEL (development only)
// ═══════════════════════════════════════════════════════════

function DevTokenPanel({
  inputTokens,
  outputTokens,
  phase,
  percentage,
}: {
  inputTokens: number;
  outputTokens: number;
  phase: ProgressPhase;
  percentage: number;
}) {
  return (
    <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
          Dev Only
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <span className="text-amber-600">Phase:</span>{' '}
          <span className="text-amber-800 font-medium">{phase}</span>
        </div>
        <div>
          <span className="text-amber-600">Progress:</span>{' '}
          <span className="text-amber-800 font-medium tabular-nums">{percentage}%</span>
        </div>
        <div>
          <span className="text-amber-600">Input tokens:</span>{' '}
          <span className="text-amber-800 font-medium tabular-nums">
            {inputTokens.toLocaleString()}
          </span>
        </div>
        <div>
          <span className="text-amber-600">Output tokens:</span>{' '}
          <span className="text-amber-800 font-medium tabular-nums">
            {outputTokens.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
