import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type EmptyStateProps = {
  icon?: ReactNode;
  title: ReactNode;
  text?: ReactNode;
  action?: ReactNode;
  className?: string;
};

/** SCHETCHIK EmptyState — dashed icon + title + optional CTA */
export function EmptyState({
  icon,
  title,
  text,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-start gap-4 px-6 py-12 sm:px-10',
        className,
      )}
    >
      {icon ? (
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-dashed border-border text-muted-foreground">
          {icon}
        </div>
      ) : null}
      <div className="max-w-md">
        <h3 className="text-base font-semibold tracking-tight text-foreground">
          {title}
        </h3>
        {text ? (
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {text}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export default EmptyState;
