import { Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

type FilterBarProps = {
  children: React.ReactNode;
  className?: string;
  showIcon?: boolean;
};

/**
 * Flat toolbar row (SCHETCHIK) — alohida card emas.
 * Odatda `ListSurface` ichidagi `toolbar` sifatida.
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
 * Bitta surface: qidiruv/toolbar + jadval/list (SCHETCHIK).
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
        'surface overflow-hidden',
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

/** @deprecated Use ListSurface */
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
