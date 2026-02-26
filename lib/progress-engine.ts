// lib/progress-engine.ts

/**
 * PHASE 2B — Dual-Track Progress Engine
 *
 * The progress bar must never appear frozen. Not for one second.
 * From click to completion, the bar is always moving forward.
 * The percentage always increments: 1, 2, 3, 4... never backwards, never stuck.
 *
 * ┌──────────────────────────────────────────────────────────────┐
 * │  DUAL-TRACK PROGRESS                                        │
 * │                                                              │
 * │  Track 1: Real Progress (token-driven)                       │
 * │    Updates when actual tokens arrive from stream.             │
 * │    Jumps to true % based on tokens_streamed / max_tokens.    │
 * │    Bursty — matches streaming rhythm.                        │
 * │                                                              │
 * │  Track 2: Interpolated Progress (time-driven)                │
 * │    requestAnimationFrame loop (~60fps) that smoothly          │
 * │    increments between real updates. Predicted rate from       │
 * │    rolling tokens/sec average.                               │
 * │    Smooth — constant visual motion.                          │
 * │                                                              │
 * │  Display = max(display, interpolated) — never goes backwards │
 * └──────────────────────────────────────────────────────────────┘
 *
 * Progress Phases:
 *   Extraction   0–5%    "Analyzing financial documents..."     Slow creep, pulse
 *   Generation   5–90%   Dynamic section text                   Smooth fill, shimmer
 *   Validation   90–95%  "Verifying all calculations..."        Quick fill, pulse
 *   Save         95–100% "Finalizing your report..."            Quick fill
 *   Complete     100%    "Report complete" + View Report button  Green tint, badge
 */

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export type ProgressPhase =
  | 'idle'
  | 'extracting'
  | 'generating'
  | 'validating'
  | 'saving'
  | 'complete'
  | 'error';

export interface ProgressState {
  /** Display percentage (0–100). Always the value shown to the user. */
  displayProgress: number;
  /** Current phase */
  phase: ProgressPhase;
  /** Dynamic status text */
  statusText: string;
  /** Section count: completed / total */
  sectionsCompleted: number;
  sectionsTotal: number;
  /** Estimated time remaining in seconds (null if unknown) */
  estimatedSecondsRemaining: number | null;
  /** Whether validation passed (shown after complete) */
  validationPassed: boolean;
  /** Error message if phase === 'error' */
  errorMessage: string | null;
}

export interface ProgressCallbacks {
  /** Called on every animation frame with updated state */
  onUpdate: (state: ProgressState) => void;
  /** Called when generation completes */
  onComplete?: () => void;
  /** Called on error */
  onError?: (message: string) => void;
}

// ═══════════════════════════════════════════════════════════
// SECTION STATUS MAP
// ═══════════════════════════════════════════════════════════

export const SECTION_STATUS_MAP: Record<string, string> = {
  executive_summary: 'Building your executive summary...',
  investment_thesis_update: 'Evaluating investment thesis performance...',
  occupancy_leasing: 'Analyzing occupancy and leasing trends...',
  lease_expiration_rollover: 'Reviewing lease expiration schedule...',
  revenue_summary: 'Summarizing revenue performance...',
  revenue_analysis: 'Analyzing revenue drivers and variances...',
  expense_summary: 'Reviewing operating expenses...',
  expense_analysis: 'Breaking down expense categories and budget variances...',
  noi_performance: 'Calculating NOI performance and margin trends...',
  rent_roll_deep_dive: 'Deep-diving into unit-level rent data...',
  budget_vs_actual: 'Comparing actuals against budget targets...',
  market_submarket_analysis: 'Analyzing submarket conditions and competitive landscape...',
  capital_improvements: 'Reviewing capital improvement progress...',
  risk_watch_items: 'Identifying risk factors and watch items...',
  asset_manager_strategic_outlook: 'Developing strategic outlook and recommendations...',
};

// ═══════════════════════════════════════════════════════════
// PROGRESS ENGINE CLASS
// ═══════════════════════════════════════════════════════════

export class ProgressEngine {
  // ── State ──
  private phase: ProgressPhase = 'idle';
  private realProgress: number = 0;       // Token-driven (bursty)
  private displayProgress: number = 0;    // What the user sees (smooth)
  private statusText: string = '';
  private errorMessage: string | null = null;
  private validationPassed: boolean = false;

  // ── Token tracking ──
  private tokensStreamed: number = 0;
  private maxTokens: number = 16000;      // Updated per-tier from config
  private tokenTimestamps: Array<{ time: number; count: number }> = [];
  private rollingTokensPerSec: number = 0;

  // ── Section tracking ──
  private detectedSections: string[] = [];
  private totalExpectedSections: number = 10; // Updated from report config

  // ── Timing ──
  private startTime: number = 0;
  private rafId: number | null = null;
  private lastFrameTime: number = 0;

  // ── Callbacks ──
  private callbacks: ProgressCallbacks;

  constructor(callbacks: ProgressCallbacks) {
    this.callbacks = callbacks;
  }

  // ═══════════════════════════════════════════════════════
  // PUBLIC API — Called by the generation page
  // ═══════════════════════════════════════════════════════

  /**
   * Start the progress engine. Call when generation begins.
   * @param maxTokens — Token limit for this tier (drives progress calculation)
   * @param expectedSections — Number of sections expected in the report
   */
  start(maxTokens: number, expectedSections: number): void {
    this.maxTokens = maxTokens;
    this.totalExpectedSections = expectedSections;
    this.startTime = performance.now();
    this.lastFrameTime = this.startTime;
    this.phase = 'extracting';
    this.statusText = 'Analyzing financial documents...';
    this.realProgress = 0;
    this.displayProgress = 0;
    this.tokensStreamed = 0;
    this.tokenTimestamps = [];
    this.detectedSections = [];
    this.errorMessage = null;
    this.validationPassed = false;

    // Start the animation loop
    this.tick();
  }

  /** Call when extraction completes and narrative generation begins */
  onExtractionComplete(): void {
    this.phase = 'generating';
    this.realProgress = 5;
    this.statusText = 'Generating report sections...';
  }

  /**
   * Call on each token chunk received from the stream.
   * @param tokenCount — Number of tokens in this chunk
   */
  onTokens(tokenCount: number): void {
    this.tokensStreamed += tokenCount;

    // Update rolling tokens/sec (weighted: 0.7 old + 0.3 new)
    const now = performance.now();
    this.tokenTimestamps.push({ time: now, count: tokenCount });

    // Keep only last 5 seconds of data for rolling average
    const cutoff = now - 5000;
    this.tokenTimestamps = this.tokenTimestamps.filter(t => t.time > cutoff);

    if (this.tokenTimestamps.length >= 2) {
      const totalTokens = this.tokenTimestamps.reduce((sum, t) => sum + t.count, 0);
      const timeSpan = (now - this.tokenTimestamps[0].time) / 1000;
      const newRate = timeSpan > 0 ? totalTokens / timeSpan : 0;
      this.rollingTokensPerSec = this.rollingTokensPerSec * 0.7 + newRate * 0.3;
    }

    // Real progress: 5% (extraction done) + (tokens / max) * 85%
    // Capped at 90% until validation completes
    this.realProgress = Math.min(
      5 + (this.tokensStreamed / this.maxTokens) * 85,
      90
    );
  }

  /**
   * Call when a new section ID is detected in the streaming JSON.
   * @param sectionId — The section ID found in the stream
   */
  onSectionDetected(sectionId: string): void {
    if (!this.detectedSections.includes(sectionId)) {
      this.detectedSections.push(sectionId);
    }
    this.statusText = SECTION_STATUS_MAP[sectionId] || `Generating section: ${sectionId}...`;
  }

  /** Call when narrative streaming completes and validation begins */
  onValidationStart(): void {
    this.phase = 'validating';
    this.statusText = 'Verifying all calculations...';
    this.realProgress = 90;
  }

  /** Call when validation completes */
  onValidationComplete(passed: boolean): void {
    this.validationPassed = passed;
    this.phase = 'saving';
    this.statusText = 'Finalizing your report...';
    this.realProgress = 95;
  }

  /** Call when everything is done — report saved */
  onComplete(): void {
    this.phase = 'complete';
    this.statusText = 'Report complete';
    this.realProgress = 100;
    this.displayProgress = 100;

    // Emit final state
    this.emitState();

    // Stop animation loop after a brief delay (let completion animation play)
    setTimeout(() => {
      this.stop();
      this.callbacks.onComplete?.();
    }, 1500);
  }

  /** Call on error */
  onError(message: string): void {
    this.phase = 'error';
    this.errorMessage = message;
    this.statusText = 'Generation interrupted';
    this.emitState();
    this.stop();
    this.callbacks.onError?.(message);
  }

  /** Stop the animation loop */
  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /** Get current state (for initial render or DB resume) */
  getState(): ProgressState {
    return this.buildState();
  }

  /**
   * Resume from DB state (when user navigates back to generation page).
   * @param progress — The generation_progress value from DB (0–100)
   * @param statusText — The generation_status_text from DB
   */
  resume(progress: number, statusText: string): void {
    this.displayProgress = progress;
    this.realProgress = progress;
    this.statusText = statusText || 'Resuming generation...';

    if (progress < 5) {
      this.phase = 'extracting';
    } else if (progress < 90) {
      this.phase = 'generating';
    } else if (progress < 95) {
      this.phase = 'validating';
    } else if (progress < 100) {
      this.phase = 'saving';
    } else {
      this.phase = 'complete';
    }

    this.startTime = performance.now();
    this.lastFrameTime = this.startTime;
    this.tick();
  }

  // ═══════════════════════════════════════════════════════
  // ANIMATION LOOP — ~60fps via requestAnimationFrame
  // ═══════════════════════════════════════════════════════

  private tick = (): void => {
    const now = performance.now();
    const dt = (now - this.lastFrameTime) / 1000; // delta in seconds
    this.lastFrameTime = now;

    let newDisplay = this.displayProgress;

    switch (this.phase) {
      case 'extracting':
        // Slow creep from 0 to 5%
        newDisplay = Math.min(this.displayProgress + 0.02, 5);
        break;

      case 'generating':
        if (this.realProgress > this.displayProgress) {
          // Ease toward real progress
          newDisplay = this.displayProgress + (this.realProgress - this.displayProgress) * 0.08;
        } else {
          // Interpolated creep — keeps bar moving during streaming pauses
          // +0.005% per frame (~0.3%/sec). Slow enough to never overshoot,
          // fast enough to always be visibly moving.
          const creep = Math.max(0.005, dt * 0.3);
          newDisplay = this.displayProgress + creep;
        }
        // Cap at 90% until validation
        newDisplay = Math.min(newDisplay, 90);
        break;

      case 'validating':
        // Quick fill toward 95%
        newDisplay = Math.min(this.displayProgress + 0.15, 95);
        break;

      case 'saving':
        // Quick fill toward 100%
        newDisplay = Math.min(this.displayProgress + 0.2, 100);
        break;

      case 'complete':
        newDisplay = 100;
        break;

      case 'error':
      case 'idle':
        // No movement
        break;
    }

    // CRITICAL: display never goes backwards
    this.displayProgress = Math.max(newDisplay, this.displayProgress);

    // Emit state
    this.emitState();

    // Continue animation loop (unless stopped)
    if (this.phase !== 'complete' && this.phase !== 'error' && this.phase !== 'idle') {
      this.rafId = requestAnimationFrame(this.tick);
    }
  };

  // ═══════════════════════════════════════════════════════
  // STATE BUILDERS
  // ═══════════════════════════════════════════════════════

  private buildState(): ProgressState {
    return {
      displayProgress: Math.round(this.displayProgress * 10) / 10,
      phase: this.phase,
      statusText: this.statusText,
      sectionsCompleted: this.detectedSections.length,
      sectionsTotal: this.totalExpectedSections,
      estimatedSecondsRemaining: this.estimateTimeRemaining(),
      validationPassed: this.validationPassed,
      errorMessage: this.errorMessage,
    };
  }

  private emitState(): void {
    this.callbacks.onUpdate(this.buildState());
  }

  private estimateTimeRemaining(): number | null {
    if (this.phase === 'complete' || this.phase === 'error') return 0;
    if (this.phase === 'extracting') return null; // Can't estimate during extraction
    if (this.rollingTokensPerSec <= 0) return null;

    const tokensRemaining = this.maxTokens - this.tokensStreamed;
    if (tokensRemaining <= 0) return null;

    // Time for remaining tokens + ~5s buffer for validation + save
    const generationSeconds = tokensRemaining / this.rollingTokensPerSec;
    return Math.round(generationSeconds + 5);
  }
}

// ═══════════════════════════════════════════════════════════
// SECTION DETECTION HELPER
// ═══════════════════════════════════════════════════════════

/**
 * Parse streaming text to detect new section IDs.
 * Called from the generation page's stream reader.
 *
 * Usage:
 *   const detector = createSectionDetector((sectionId) => {
 *     progressEngine.onSectionDetected(sectionId);
 *   });
 *   // In the stream loop:
 *   detector.feed(textChunk);
 */
export function createSectionDetector(
  onSection: (sectionId: string) => void
): { feed: (text: string) => void } {
  const seenSections = new Set<string>();
  let buffer = '';

  return {
    feed(text: string): void {
      buffer += text;

      // Look for section ID patterns in the accumulated buffer
      const pattern = /"id"\s*:\s*"([a-z_]+)"/g;
      let match;

      while ((match = pattern.exec(buffer)) !== null) {
        const sectionId = match[1];
        if (!seenSections.has(sectionId) && sectionId in SECTION_STATUS_MAP) {
          seenSections.add(sectionId);
          onSection(sectionId);
        }
      }

      // Keep only the last 500 chars to avoid unbounded growth
      if (buffer.length > 1000) {
        buffer = buffer.slice(-500);
      }
    },
  };
}

// ═══════════════════════════════════════════════════════════
// TOKEN ESTIMATION HELPER
// ═══════════════════════════════════════════════════════════

/**
 * Rough token count from a text chunk.
 * ~4 chars per token for English text. Good enough for progress bar.
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}
