import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAnalyticsQueryString } from './AnalyticsFilters';

type Crumb = { label: string; to?: string };

type Props = { items: Crumb[] };

export function BreadcrumbNav({ items }: Props) {
  const qs = useAnalyticsQueryString();

  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground mb-4">
      <Link
        to={`/dashboard/analytics${qs}`}
        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
        Analitika
      </Link>
      {items.map((item, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5" />
          {item.to ? (
            <Link to={`${item.to}${qs}`} className="hover:text-foreground transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
