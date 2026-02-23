// lib/report-pipeline-tokens.ts
// Single source of truth for all pipeline design tokens

export const C = {
  accent: '#00B7DB',
  accentAction: '#0C7792',
  accentText: '#007A99',
  accentHover: '#0A6B80',
  bg: '#FFFFFF',
  bgAlt: '#F7F5F1',
  bgWarm: '#FAF9F7',
  text: '#1A1A1A',
  textMid: '#4A4A4A',
  textSoft: '#666666',
  textMuted: '#8E8E8E',
  border: '#E8E5E0',
  borderL: '#F0EDE8',
  green: '#007D37',
  greenBtn: '#29581D',
  gold: '#846A10',
  navy: '#002D5F',
  retOrg: '#B45309',
  progressTrack: '#DDD9D2',
} as const;

export type PipelineStage = 'draft' | 'in_review' | 'final_review' | 'ready_to_send' | 'sent';

export interface PipelineReport {
  id: string;
  property_name: string;
  period: string;
  pipeline_stage: PipelineStage;
  updated_at: string;
  returned?: boolean;
  return_note?: string;
}

export const PIPELINE_STAGES: { key: PipelineStage; label: string; hint: string; filterLabel: string }[] = [
  { key: 'draft', label: 'Draft', hint: 'Not yet generated', filterLabel: 'Draft' },
  { key: 'in_review', label: 'In Review', hint: 'Reviewing content', filterLabel: 'In Review' },
  { key: 'final_review', label: 'Final Review', hint: 'Pending approval', filterLabel: 'Final Review' },
  { key: 'ready_to_send', label: 'Ready to Send', hint: 'Ready for investors', filterLabel: 'Ready to Send' },
  { key: 'sent', label: 'Sent', hint: 'Delivered', filterLabel: 'Archive' },
];

export const STAGE_BADGE: Record<PipelineStage, { color: string; bg: string; border: string }> = {
  draft: { color: C.gold, bg: `${C.gold}10`, border: `${C.gold}22` },
  in_review: { color: C.accentText, bg: `${C.accentAction}08`, border: `${C.accentAction}18` },
  final_review: { color: C.navy, bg: `${C.navy}08`, border: `${C.navy}18` },
  ready_to_send: { color: C.green, bg: `${C.green}10`, border: `${C.green}22` },
  sent: { color: C.greenBtn, bg: `${C.greenBtn}08`, border: `${C.greenBtn}18` },
};

export const STAGE_ACTIONS: Record<PipelineStage, { label: string; icon: string } | null> = {
  draft: { label: 'Generate Report', icon: 'sparkle' },
  in_review: { label: 'Submit for Approval', icon: 'arrowR' },
  final_review: { label: 'Approve', icon: 'check' },
  ready_to_send: { label: 'Mark as Sent', icon: 'send' },
  sent: null,
};

export const STAGE_STAT_COLORS: Record<PipelineStage, string> = {
  draft: C.gold,
  in_review: C.accentAction,
  final_review: C.navy,
  ready_to_send: C.green,
  sent: C.greenBtn,
};

export function getStageIndex(stage: PipelineStage): number {
  return PIPELINE_STAGES.findIndex(s => s.key === stage);
}

export function getStageProgress(stage: PipelineStage): number {
  return (getStageIndex(stage) / 4) * 100;
}

export function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

export function formatReportPeriod(month: number, year: number): string {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return `${monthNames[month - 1]} ${year}`;
}
