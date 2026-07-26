import type { AnalyticsStatus } from '@/services/api';
import { tashkentToday } from '@/lib/tashkent-time';

export function todayStr(): string {
  return tashkentToday();
}

export function statusFromPercent(percent: number): AnalyticsStatus {
  if (percent >= 90) return 'green';
  if (percent >= 70) return 'yellow';
  return 'red';
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

export function statusSoftBg(status: AnalyticsStatus): string {
  if (status === 'green') return 'bg-emerald-500/10 border-emerald-500/20';
  if (status === 'yellow') return 'bg-amber-500/10 border-amber-500/20';
  return 'bg-red-500/10 border-red-500/20';
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

export function formatDelta(n: number, suffix = ''): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toLocaleString('uz-UZ')}${suffix}`;
}

/** Ish kuni 06:00–20:00 bo‘yicha kun oxiri prognozi */
export function estimateEodPercent(currentPercent: number, hour: number): number {
  const start = 6;
  const end = 20;
  const span = end - start;
  const elapsed = Math.max(0.5, Math.min(span, hour - start));
  if (hour < start) return Math.min(100, currentPercent);
  if (hour >= end) return Math.min(100, currentPercent);
  const projected = currentPercent * (span / elapsed);
  return Math.min(100, Math.round(projected * 10) / 10);
}

export function encodeDivision(division: string): string {
  return encodeURIComponent(division);
}

export function decodeDivision(encoded: string): string {
  return decodeURIComponent(encoded);
}
