// components/generation-toast.tsx

/**
 * Generation Toast — Persistent notification when a report completes.
 *
 * UPDATED v2:
 *   - Removed auto-dismiss (setTimeout) — toast stays until user clicks X
 *   - Listens for BOTH generation_progress=100 AND status='completed'
 *   - Shows property name if available in the payload
 *   - Added entrance/exit animations
 *   - Matches WriteUp AI warm palette
 *
 * Mount in dashboard layout:
 *   <GenerationToast userId={userId} />
 *
 * The toast fires regardless of which page the user is on.
 * If the user is already viewing that report, it does NOT show.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface Toast {
  id: string;
  reportId: string;
  propertyName?: string;
  timestamp: number;
}

// ── Palette ──
const T = {
  bg: '#FFFFFF',
  text: '#1A1A1A',
  textMid: '#4A4A4A',
  textSoft: '#7A7A7A',
  textMuted: '#A3A3A3',
  border: '#E8E5E0',
  borderL: '#F0EDE8',
  green: '#008A3E',
  greenBg: '#008A3E08',
  greenBorder: '#008A3E25',
  accent: '#00B7DB',
};

export default function GenerationToast({ userId }: { userId: string }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dismissing, setDismissing] = useState<Set<string>>(new Set());
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const channel = supabase
      .channel('generation-complete-toast')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'reports',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const report = payload.new as Record<string, unknown>;

          // Fire on generation_progress=100 OR status='completed'
          const isComplete =
            report.generation_progress === 100 ||
            report.status === 'completed';

          if (!isComplete) return;

          // Don't show if user is already viewing this report
          const reportId = report.id as string;
          if (typeof window !== 'undefined' && window.location.pathname.includes(reportId)) return;

          // Deduplicate — don't add if we already have a toast for this report
          setToasts((prev) => {
            if (prev.some((t) => t.reportId === reportId)) return prev;

            const toast: Toast = {
              id: `toast-${reportId}-${Date.now()}`,
              reportId,
              propertyName: (report.property_name as string) || undefined,
              timestamp: Date.now(),
            };
            return [...prev, toast];
          });

          // NO auto-dismiss — toast persists until user clicks X or View
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const dismiss = (id: string) => {
    setDismissing((prev) => new Set(prev).add(id));
    // Wait for exit animation before removing
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      setDismissing((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 200);
  };

  const view = (toast: Toast) => {
    dismiss(toast.id);
    router.push(`/dashboard/reports/${toast.reportId}`);
  };

  if (toasts.length === 0) return null;

  return (
    <>
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          fontFamily: 'var(--font-body, "DM Sans", system-ui, sans-serif)',
        }}
      >
        {toasts.map((toast) => {
          const isDismissing = dismissing.has(toast.id);

          return (
            <div
              key={toast.id}
              style={{
                background: T.bg,
                border: `1px solid ${T.border}`,
                borderRadius: 14,
                boxShadow:
                  '0 12px 40px rgba(0,0,0,0.10), 0 4px 12px rgba(0,0,0,0.05)',
                padding: '16px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                minWidth: 340,
                maxWidth: 420,
                animation: isDismissing
                  ? 'toastSlideOut 0.2s ease-in both'
                  : 'toastSlideIn 0.35s cubic-bezier(0.22, 1, 0.36, 1) both',
              }}
            >
              {/* Success icon */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: T.greenBg,
                  border: `1px solid ${T.greenBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path
                    d="M5 9L8 12L13 6"
                    stroke={T.green}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: T.text,
                    lineHeight: 1.3,
                  }}
                >
                  Report complete
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: T.textSoft,
                    marginTop: 2,
                    lineHeight: 1.3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {toast.propertyName
                    ? `${toast.propertyName} — generated and verified`
                    : 'Generated and verified'}
                </div>
              </div>

              {/* View button */}
              <button
                onClick={() => view(toast)}
                style={{
                  padding: '7px 16px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#fff',
                  background: T.accent,
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#009ABB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = T.accent;
                }}
              >
                View
              </button>

              {/* Dismiss X */}
              <button
                onClick={() => dismiss(toast.id)}
                style={{
                  padding: 4,
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  color: T.textMuted,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 6,
                  transition: 'all 0.15s',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = T.textMid;
                  e.currentTarget.style.background = T.borderL;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = T.textMuted;
                  e.currentTarget.style.background = 'none';
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M10 4L4 10M4 4L10 10"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes toastSlideIn {
          from {
            opacity: 0;
            transform: translateY(16px) translateX(8px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) translateX(0) scale(1);
          }
        }
        @keyframes toastSlideOut {
          from {
            opacity: 1;
            transform: translateY(0) translateX(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateY(4px) translateX(20px) scale(0.96);
          }
        }
      `}</style>
    </>
  );
}
