import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '@/lib/utils';

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
    indicatorClassName?: string;
    percent?: number;
    status?: 'success' | 'exception' | 'active' | 'normal';
    size?: string;
    showInfo?: boolean;
    strokeColor?: string;
    className?: string;
  }
>(({ className, value, percent, indicatorClassName, status, showInfo, strokeColor, ...props }, ref) => {
  const v = percent ?? value ?? 0;
  const indicatorColor = strokeColor
    ? undefined
    : status === 'success'
      ? 'bg-emerald-500'
      : status === 'exception'
        ? 'bg-destructive'
        : 'bg-primary';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <ProgressPrimitive.Root
        ref={ref}
        className={cn('relative h-2 w-full overflow-hidden rounded-full bg-secondary')}
        value={v}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className={cn('h-full w-full flex-1 transition-all', indicatorColor, indicatorClassName)}
          style={{
            transform: `translateX(-${100 - v}%)`,
            backgroundColor: strokeColor,
          }}
        />
      </ProgressPrimitive.Root>
      {showInfo !== false ? <span className="text-xs text-muted-foreground w-10 text-right">{v}%</span> : null}
    </div>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
