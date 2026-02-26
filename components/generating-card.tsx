// components/generating-card.tsx

/**
 * PHASE 2B — Generating Card
 *
 * Pipeline card that shows during active report generation.
 * Displays: property name, month, progress bar, percentage,
 * dynamic status text, section count, and time estimate.
 *
 * Updates via Supabase Realtime when on the reports list page.
 * Updates via ProgressEngine directly on the generation page.
 *
 * Design: Matches pipeline card system from Day 23.
 *   - Cyan "Generating" badge with pulse animation
 *   - Teal-to-cyan gradient progress bar with shimmer overlay
 *   - Newsreader for property name, DM Sans for everything else
 *   - Click navigates to live generation page
 *
 * No emojis. No confetti. Clean, confident, institutional.
 */

'use client';

import React from 'react';
import type { ProgressState } from '@/lib/progress-engine';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface GeneratingCardProps {
  /** Report ID — used for navigation */
  reportId: string;
  /** Property name */
  propertyName: string;
  /** Report month/year display */
  reportPeriod: string;
  /** Progress state from ProgressEngine or Supabase Realtime */
  progress: ProgressState;
  /** Compact mode for pipeline list */
  compact?: boolean;
  /** Click handler (navigation to generation page) */
  onClick?: () => void;
}

// ═══════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════

export default function GeneratingCard({
  reportId,
  propertyName,
  reportPeriod,
  progress,
  compact = false,
  onClick,
}: GeneratingCardProps) {
  const isComplete = progress.phase === 'complete';
  const isError = progress.phase === 'error';
  const percentage = Math.round(progress.displayProgress);

  if (compact) {
    return (
      <div
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
        className="group cursor-pointer rounded-lg border border-stone-200 bg-white p-4 transition-all hover:border-cyan-300 hover:shadow-sm"
        style={{ fontFamily: '"DM Sans", sans-serif' }}
      >
        {/* Line 1: Property + Badge */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="text-sm font-semibold text-slate-800 truncate"
              style={{ fontFamily: '"Newsreader", serif' }}
            >
              {propertyName}
            </span>
            <span className="text-xs text-slate-400 shrink-0">
              {reportPeriod}
            </span>
          </div>
          <GeneratingBadge phase={progress.phase} />
        </div>

        {/* Line 2: Progress bar + percentage */}
        <div className="flex items-center gap-3 mb-1.5">
          <ProgressBar progress={progress.displayProgress} phase={progress.phase} />
          <span className="text-xs font-medium text-slate-500 tabular-nums w-8 text-right shrink-0">
            {percentage}%
          </span>
        </div>

        {/* Line 3: Status text */}
        <p className="text-xs text-slate-400 italic truncate">
          {progress.statusText}
        </p>
      </div>
    );
  }

  // ── Full card (generation page) ──
  return (
    <div
      className="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden"
      style={{ fontFamily: '"DM Sans", sans-serif' }}
    >
      {/* Header */}
      <div className="px-6 pt-5 pb-3">
        <div className="flex items-center justify-between mb-1">
          <h2
            className="text-lg font-semibold text-slate-800"
            style={{ fontFamily: '"Newsreader", serif' }}
          >
            {propertyName}
          </h2>
          <GeneratingBadge phase={progress.phase} />
        </div>
        <p className="text-sm text-slate-400">{reportPeriod}</p>
      </div>

      {/* Progress section */}
      <div className="px-6 pb-5">
        {/* Bar + percentage */}
        <div className="flex items-center gap-4 mb-3">
          <div className="flex-1">
            <ProgressBar
              progress={progress.displayProgress}
              phase={progress.phase}
              tall
            />
          </div>
          <span className="text-lg font-semibold text-slate-700 tabular-nums w-12 text-right">
            {percentage}%
          </span>
        </div>

        {/* Status text */}
        <p className="text-sm text-slate-500 mb-3 min-h-[20px] transition-opacity duration-200">
          {progress.statusText}
        </p>

        {/* Section count + time estimate */}
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>
            {progress.sectionsCompleted > 0 && (
              <>
                {progress.sectionsCompleted} of {progress.sectionsTotal} sections
              </>
            )}
          </span>
          {progress.estimatedSecondsRemaining !== null && progress.estimatedSecondsRemaining > 0 && (
            <span className="tabular-nums">
              ~{formatTimeRemaining(progress.estimatedSecondsRemaining)} remaining
            </span>
          )}
        </div>

        {/* Verified badge (shows after complete) */}
        {isComplete && progress.validationPassed && (
          <div
            className="mt-4 flex items-center gap-2 text-sm font-medium transition-opacity duration-300"
            style={{ color: '#059669' }}
          >
            <VerifiedShieldIcon />
            All calculations verified
          </div>
        )}

        {/* Error state */}
        {isError && progress.errorMessage && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-sm text-red-700">{progress.errorMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

function ProgressBar({
  progress,
  phase,
  tall = false,
}: {
  progress: number;
  phase: string;
  tall?: boolean;
}) {
  const isComplete = phase === 'complete';
  const height = tall ? 'h-2.5' : 'h-1.5';

  return (
    <div
      className={`w-full ${height} rounded-full overflow-hidden`}
      style={{ backgroundColor: '#DDD9D2' }}
    >
      <div
        className="h-full rounded-full relative overflow-hidden"
        style={{
          width: `${Math.min(progress, 100)}%`,
          background: isComplete
            ? 'linear-gradient(90deg, #059669, #10B981)' // Green on complete
            : 'linear-gradient(90deg, #0D9488, #0891B2)', // Teal-to-cyan
          transition: 'width 300ms ease-out',
        }}
      >
        {/* Shimmer overlay — only during generation */}
        {!isComplete && phase !== 'error' && phase !== 'idle' && (
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
              animation: 'shimmer 2s ease-in-out infinite',
            }}
          />
        )}
      </div>
    </div>
  );
}

function GeneratingBadge({ phase }: { phase: string }) {
  if (phase === 'complete') {
    return (
      <span
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium"
        style={{ backgroundColor: '#ECFDF5', color: '#059669' }}
      >
        Complete
      </span>
    );
  }

  if (phase === 'error') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600">
        Error
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: '#E0F7FA', color: '#0C7792' }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{
          backgroundColor: '#0C7792',
          animation: 'pulse 2s ease-in-out infinite',
        }}
      />
      Generating
    </span>
  );
}

function VerifiedShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M8 1L2 3.5V7.5C2 11.1 4.55 14.45 8 15.5C11.45 14.45 14 11.1 14 7.5V3.5L8 1Z"
        stroke="#059669"
        strokeWidth="1.2"
        fill="#ECFDF5"
      />
      <path
        d="M5.5 8L7 9.5L10.5 6"
        stroke="#059669"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

function formatTimeRemaining(seconds: number): string {
  if (seconds < 60) return `${seconds} seconds`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (remainingSeconds === 0) return `${minutes} min`;
  return `${minutes}m ${remainingSeconds}s`;
}

// ═══════════════════════════════════════════════════════════
// CSS KEYFRAMES (inject via style tag or Tailwind config)
// ═══════════════════════════════════════════════════════════

/**
 * Add to your global CSS or layout:
 *
 * @keyframes shimmer {
 *   0% { transform: translateX(-100%); }
 *   100% { transform: translateX(100%); }
 * }
 *
 * @keyframes pulse {
 *   0%, 100% { opacity: 1; }
 *   50% { opacity: 0.4; }
 * }
 */
