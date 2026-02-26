// lib/dev-config.ts

/**
 * PHASE 2A — Development Configuration Flags
 *
 * Controls dev-only features that never render in production.
 * The toggle lives in the existing dev tier override menu
 * (dashboard header). Only renders when NODE_ENV === 'development'.
 *
 * ┌──────────────────────────────────────────────────────┐
 * │  PRODUCTION: These flags are always false.            │
 * │  DEVELOPMENT: Toggled via localStorage checkboxes.   │
 * │  In production: panel never renders, no data in DOM. │
 * └──────────────────────────────────────────────────────┘
 */

const IS_DEV = typeof window !== 'undefined'
  ? process.env.NODE_ENV === 'development'
  : false;

/**
 * Dev-only feature flags.
 * Read from localStorage when in development, always false in production.
 *
 * Usage:
 *   import { DEV_FLAGS } from '@/lib/dev-config';
 *   if (DEV_FLAGS.showTokens) { ... }
 */
export const DEV_FLAGS = {
  /** Show token counts (input/output), cost estimate, model name, tokens/sec */
  get showTokens(): boolean {
    if (!IS_DEV) return false;
    try {
      return localStorage.getItem('writeup_show_tokens') === 'true';
    } catch {
      return false;
    }
  },

  /** Show validation audit details inline in the report viewer */
  get showValidationDetails(): boolean {
    if (!IS_DEV) return false;
    try {
      return localStorage.getItem('writeup_show_validation') === 'true';
    } catch {
      return false;
    }
  },

  /** Log all prompt content to console before API calls */
  get logPrompts(): boolean {
    if (!IS_DEV) return false;
    try {
      return localStorage.getItem('writeup_log_prompts') === 'true';
    } catch {
      return false;
    }
  },

  /** Force a specific tier for testing (overrides subscription) */
  get tierOverride(): string | null {
    if (!IS_DEV) return null;
    try {
      return localStorage.getItem('writeup_tier_override');
    } catch {
      return null;
    }
  },
};

/**
 * Toggle a dev flag. Called from the dev panel in the dashboard header.
 *
 * Usage:
 *   toggleDevFlag('showTokens', true);
 */
export function toggleDevFlag(flag: keyof typeof DEV_FLAG_KEYS, value: boolean): void {
  if (!IS_DEV) return;
  try {
    const key = DEV_FLAG_KEYS[flag];
    if (value) {
      localStorage.setItem(key, 'true');
    } else {
      localStorage.removeItem(key);
    }
    // Dispatch event so components can react
    window.dispatchEvent(new CustomEvent('devFlagsChanged', { detail: { flag, value } }));
  } catch {
    // localStorage unavailable
  }
}

/** Maps flag names to localStorage keys */
const DEV_FLAG_KEYS = {
  showTokens: 'writeup_show_tokens',
  showValidationDetails: 'writeup_show_validation',
  logPrompts: 'writeup_log_prompts',
} as const;

/**
 * Server-side dev config — safe to use in API routes and server components.
 * These read from environment variables, not localStorage.
 */
export const SERVER_DEV_FLAGS = {
  /** Enable verbose logging of validation results */
  get logValidation(): boolean {
    return process.env.NODE_ENV === 'development'
      && process.env.LOG_VALIDATION === 'true';
  },

  /** Skip validation entirely (for fast iteration on prompt changes) */
  get skipValidation(): boolean {
    return process.env.SKIP_VALIDATION === 'true';
  },

  /** Log full prompt content to server console */
  get logPrompts(): boolean {
    return process.env.NODE_ENV === 'development'
      && process.env.LOG_PROMPTS === 'true';
  },
};
