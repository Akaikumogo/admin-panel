import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAnalyticsQueryString } from './AnalyticsFilters';

type Crumb = { label: string; to?: string };

type Props = { items: Crumb[] };

export function BreadcrumbNav({ items }: Props) {
  const qs = useAnalyticsQueryString();

  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-5 flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-[13px]"
    >
      <Link
        to={`/dashboard/analytics${qs}`}
        className="inline-flex items-center gap-1.5 font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <Home className="h-4 w-4" />
        Analitika
      </Link>
      {items.map((item, i) => (
        <span key={i} className="inline-flex items-center gap-1.5">
          <ChevronRight className="h-4 w-4 text-muted-foreground/70" />
          {item.to ? (
            <Link
              to={`${item.to}${qs}`}
              className="font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-[15px] font-semibold text-foreground">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
