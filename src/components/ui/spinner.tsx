import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as React from 'react';

export function Spinner({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <Loader2
      className={cn('animate-spin text-primary', className)}
      size={size}
      aria-label="Loading"
    />
  );
}

export function Spin({
  spinning = true,
  children,
  className,
  size,
}: {
  spinning?: boolean;
  children?: React.ReactNode;
  className?: string;
  size?: 'small' | 'default' | 'large' | string;
}) {
  const spinnerSize = size === 'large' ? 36 : size === 'small' ? 20 : 28;

  if (!children) {
    return spinning ? (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <Spinner size={spinnerSize} />
      </div>
    ) : null;
  }

  return (
    <div className={cn('relative', className)}>
      {spinning && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/60 backdrop-blur-[1px]">
          <Spinner size={spinnerSize} />
        </div>
      )}
      <div className={spinning ? 'pointer-events-none opacity-60' : undefined}>{children}</div>
    </div>
  );
}
