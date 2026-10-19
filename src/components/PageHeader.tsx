import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type PageHeaderProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Optional — SCHETCHIK uslubida ko‘pincha icon yo‘q */
  icon?: LucideIcon;
  actions?: React.ReactNode;
  className?: string;
};

/**
 * Flat page title (SCHETCHIK PageHeader andozasi).
 * Card/icon-box yo‘q — faqat matn + actions.
 */
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
        'flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        {Icon ? (
          <div className="mb-1.5 inline-flex items-center gap-2 text-muted-foreground">
            <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          </div>
        ) : null}
        <h1 className="text-[22px] font-semibold tracking-tight text-foreground text-balance md:text-2xl md:leading-tight">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-[62ch] text-[13px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
