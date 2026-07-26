import { cn } from '@/lib/utils';
import type { AnalyticsStatus } from '@/services/api';
import { statusColor } from '../analytics-utils';

type Props = {
  percent: number;
  status?: AnalyticsStatus;
  className?: string;
  height?: 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  leftLabel?: string;
  rightLabel?: string;
};

export function PercentBar({
  percent,
  status,
  className,
  height = 'md',
  showLabel,
  leftLabel,
  rightLabel,
}: Props) {
  const clamped = Math.min(100, Math.max(0, percent));
  const barColor = status ? statusColor(status) : 'bg-blue-600';

  const h =
    height === 'sm'
      ? 'h-2'
      : height === 'lg'
        ? 'h-3.5'
        : height === 'xl'
          ? 'h-5'
          : 'h-2.5';

  return (
    <div className={cn('w-full space-y-1.5', className)}>
      {(showLabel || leftLabel || rightLabel) && (
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{leftLabel ?? (showLabel ? `${clamped}%` : null)}</span>
          <span className="tabular-nums font-medium text-foreground">
            {rightLabel ?? (showLabel ? `${clamped}%` : null)}
          </span>
        </div>
      )}
      <div className={cn('w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800', h)}>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            barColor,
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
