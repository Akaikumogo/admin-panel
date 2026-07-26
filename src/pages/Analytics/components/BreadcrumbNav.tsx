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
      className="mb-5 flex flex-wrap items-center gap-1.5 rounded-xl border border-border/60 bg-slate-50/80 px-3.5 py-2.5 text-[13px] dark:bg-slate-900/50"
    >
      <Link
        to={`/dashboard/analytics${qs}`}
        className="inline-flex items-center gap-1.5 font-medium text-slate-600 transition-colors hover:text-foreground dark:text-slate-300"
      >
        <Home className="h-4 w-4" />
        Analitika
      </Link>
      {items.map((item, i) => (
        <span key={i} className="inline-flex items-center gap-1.5">
          <ChevronRight className="h-4 w-4 text-slate-400" />
          {item.to ? (
            <Link
              to={`${item.to}${qs}`}
              className="font-medium text-slate-600 transition-colors hover:text-foreground dark:text-slate-300"
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
