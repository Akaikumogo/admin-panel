import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { AnalyticsStatus } from '@/services/api';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<
  AnalyticsStatus,
  {
    variant: 'success' | 'warning' | 'destructive';
    Icon: typeof CheckCircle2;
  }
> = {
  green: { variant: 'success', Icon: CheckCircle2 },
  yellow: { variant: 'warning', Icon: AlertCircle },
  red: { variant: 'destructive', Icon: XCircle },
};

type Props = {
  status: AnalyticsStatus;
  percent?: number;
  showPercent?: boolean;
  className?: string;
};

export function StatusBadge({
  status,
  percent,
  showPercent = true,
  className,
}: Props) {
  const { variant, Icon } = STATUS_CONFIG[status];

  return (
    <Badge variant={variant} className={cn('gap-1 font-medium', className)}>
      <Icon className="h-3 w-3" aria-hidden />
      {showPercent && percent != null ? `${percent}%` : null}
    </Badge>
  );
}
