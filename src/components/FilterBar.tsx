import { Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

type FilterBarProps = {
  children: React.ReactNode;
  className?: string;
  showIcon?: boolean;
};

export function FilterBar({ children, className, showIcon = true }: FilterBarProps) {
  return (
    <div
      className={cn(
        'surface-panel flex items-center gap-3 flex-wrap px-4 py-3',
        className,
      )}
    >
      {showIcon ? <Filter size={16} className="text-muted-foreground shrink-0" aria-hidden /> : null}
      {children}
    </div>
  );
}

export function ContentCard({
  children,
  className,
  loading,
}: {
  children: React.ReactNode;
  className?: string;
  loading?: boolean;
}) {
  return (
    <div
      className={cn(
        'surface-panel transition-opacity duration-150',
        loading && 'opacity-50',
        className,
      )}
    >
      {children}
    </div>
  );
}
