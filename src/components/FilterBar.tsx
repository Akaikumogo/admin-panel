import { Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

type FilterBarProps = {
  children: React.ReactNode;
  className?: string;
  showIcon?: boolean;
};

/**
 * Flat toolbar row (SCHETCHIK andozasi) — alohida card emas.
 * Odatda `ListSurface` ichidagi `toolbar` sifatida ishlatiladi.
 */
export function FilterBar({ children, className, showIcon = false }: FilterBarProps) {
  return (
    <div className={cn('flex min-w-0 flex-1 flex-wrap items-center gap-3', className)}>
      {showIcon ? (
        <Filter size={16} className="shrink-0 text-muted-foreground" aria-hidden />
      ) : null}
      {children}
    </div>
  );
}

/**
 * Bitta surface: qidiruv/toolbar + jadval/list.
 * Card → alohida FilterBar → alohida Table o‘rniga SCHETCHIK uslubi.
 */
export function ListSurface({
  toolbar,
  children,
  className,
  loading,
}: {
  toolbar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  loading?: boolean;
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-border/70 bg-card',
        'shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-border/80 dark:shadow-none',
        loading && 'opacity-60 transition-opacity',
        className,
      )}
    >
      {toolbar ? (
        <div className="flex flex-wrap items-center gap-3 border-b border-border/80 px-4 py-3 md:px-5">
          {toolbar}
        </div>
      ) : null}
      {children}
    </div>
  );
}

/** @deprecated Use ListSurface — kept as alias for gradual migration */
export function ContentCard({
  children,
  className,
  loading,
  toolbar,
}: {
  children: React.ReactNode;
  className?: string;
  loading?: boolean;
  toolbar?: React.ReactNode;
}) {
  return (
    <ListSurface className={className} loading={loading} toolbar={toolbar}>
      {children}
    </ListSurface>
  );
}
