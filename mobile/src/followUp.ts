export const FOLLOW_UP_DEFAULT = 'Relevé';

export const FOLLOW_UP_STATUSES = [
  'Relevé',
  'Devis à faire',
  'Devis créé',
  'Devis envoyé',
  'Devis signé',
  'Facturé',
  'Payé',
  'Perdu',
] as const;

export type FollowUpStatus = (typeof FOLLOW_UP_STATUSES)[number];

export const FOLLOW_UP_FILTERS = [
  { id: 'all', label: 'Tous' },
  { id: 'open', label: 'En cours' },
  { id: 'Devis à faire', label: 'Devis à faire' },
  { id: 'Devis envoyé', label: 'Devis envoyé' },
  { id: 'Devis signé', label: 'Signé' },
  { id: 'Facturé', label: 'Facturé' },
  { id: 'Payé', label: 'Payé' },
  { id: 'Perdu', label: 'Perdu' },
] as const;

export function isFollowUpStatus(value: string): value is FollowUpStatus {
  return (FOLLOW_UP_STATUSES as readonly string[]).includes(value);
}

export function normalizeFollowUp(value: unknown): FollowUpStatus {
  const raw = String(value || '').trim();
  return isFollowUpStatus(raw) ? raw : FOLLOW_UP_DEFAULT;
}

export function followUpTone(status: string) {
  switch (status) {
    case 'Devis à faire':
      return 'warn';
    case 'Devis créé':
      return 'info';
    case 'Devis envoyé':
      return 'wait';
    case 'Devis signé':
      return 'ok';
    case 'Facturé':
      return 'bill';
    case 'Payé':
      return 'done';
    case 'Perdu':
      return 'lost';
    default:
      return 'idle';
  }
}

export function matchesFollowUpFilter(status: string, filter: string) {
  if (!filter || filter === 'all') return true;
  if (filter === 'open') return status !== 'Payé' && status !== 'Perdu';
  return status === filter;
}

const MARK = /^\[SUIVI:([^\]]+)\]\n?/;

export function parseFollowUpMark(notes: string) {
  const match = notes.match(MARK);
  return match ? normalizeFollowUp(match[1]) : '';
}

export function stripFollowUpMark(notes: string) {
  return notes.replace(MARK, '');
}

export function encodeFollowUpMark(notes: string, status: string) {
  return `[SUIVI:${normalizeFollowUp(status)}]\n${stripFollowUpMark(notes)}`;
}

export function followUpFromRecord(status: unknown, notes: string): FollowUpStatus {
  const fromColumn = String(status || '').trim();
  if (isFollowUpStatus(fromColumn)) return fromColumn;
  return parseFollowUpMark(notes) || FOLLOW_UP_DEFAULT;
}

export type PosePlan = {
  poseDate: string;
  reminder1: string;
  reminder2: string;
};

const PLAN_RE = /\[PLAN:([^\]]*)\]\n?/;

export function parsePlanMark(notes: string): PosePlan {
  const match = notes.match(PLAN_RE);
  const parts = (match?.[1] || '').split('|');
  return {
    poseDate: parts[0] || '',
    reminder1: parts[1] || '',
    reminder2: parts[2] || '',
  };
}

export function stripPlanMark(notes: string) {
  return notes.replace(PLAN_RE, '');
}

export function encodePlanMark(notes: string, plan: PosePlan) {
  const clean = stripPlanMark(notes);
  if (!plan.poseDate && !plan.reminder1 && !plan.reminder2) return clean;
  return `[PLAN:${plan.poseDate}|${plan.reminder1}|${plan.reminder2}]\n${clean}`;
}

export function planFromSite(site: { poseDate?: string; reminder1?: string; reminder2?: string }): PosePlan {
  return {
    poseDate: site.poseDate || '',
    reminder1: site.reminder1 || '',
    reminder2: site.reminder2 || '',
  };
}

export const FOLLOW_UP_COLORS: Record<string, { bg: string; text: string }> = {
  idle: { bg: '#2A2A30', text: '#C9C4B8' },
  warn: { bg: '#3D2E14', text: '#E6C07B' },
  info: { bg: '#1E2C3A', text: '#8CB4D4' },
  wait: { bg: '#3A2A12', text: '#F0C56E' },
  ok: { bg: '#1C3324', text: '#8FCB9B' },
  bill: { bg: '#1B3033', text: '#7EC8C4' },
  done: { bg: '#16301F', text: '#A6E3B4' },
  lost: { bg: '#3A1C1C', text: '#E06A6A' },
};
