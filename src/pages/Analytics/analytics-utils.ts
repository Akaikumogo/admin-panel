import type { AnalyticsStatus } from '@/services/api';

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function statusColor(status: AnalyticsStatus): string {
  if (status === 'green') return 'bg-emerald-500';
  if (status === 'yellow') return 'bg-amber-500';
  return 'bg-red-500';
}

export function statusTextColor(status: AnalyticsStatus): string {
  if (status === 'green') return 'text-emerald-600 dark:text-emerald-400';
  if (status === 'yellow') return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

/** @deprecated Use StatusBadge component */
export function statusEmoji(status: AnalyticsStatus): string {
  if (status === 'green') return '🟢';
  if (status === 'yellow') return '🟡';
  return '🔴';
}

export function formatNumber(n: number): string {
  return n.toLocaleString('uz-UZ');
}

export function encodeDivision(division: string): string {
  return encodeURIComponent(division);
}

export function decodeDivision(encoded: string): string {
  return decodeURIComponent(encoded);
}
