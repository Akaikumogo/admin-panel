import { cn } from '@/lib/utils';
import type { AnalyticsStatus } from '@/services/api';
import { statusColor } from '../analytics-utils';

type Props = {
  percent: number;
  status?: AnalyticsStatus;
  className?: string;
  height?: 'sm' | 'md' | 'lg';
};

export function PercentBar({ percent, status, className, height = 'md' }: Props) {
  const clamped = Math.min(100, Math.max(0, percent));
  const barColor = status ? statusColor(status) : 'bg-primary';

  const h = height === 'sm' ? 'h-1.5' : height === 'lg' ? 'h-4' : 'h-2.5';

  return (
    <div className={cn('w-full rounded-full bg-muted overflow-hidden', h, className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-500', barColor)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
