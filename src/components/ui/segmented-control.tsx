import * as React from 'react';
import { cn } from '@/lib/utils';

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value?: T;
  onChange?: (value: T) => void;
  options: { label: React.ReactNode; value: T }[];
  className?: string;
}) {
  return (
    <div className={cn('surface-segmented', className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange?.(opt.value)}
          className={cn(
            'rounded-sm px-3 py-1.5 text-sm font-medium transition-colors',
            value === opt.value
              ? 'surface-segmented-active'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
