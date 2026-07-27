import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type PageHeaderProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {Icon ? (
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground"
            aria-hidden
          >
            <Icon className="h-5 w-5" strokeWidth={1.75} />
          </div>
        ) : null}
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight text-foreground text-balance sm:text-2xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
