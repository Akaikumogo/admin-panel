import * as React from 'react';
import { cn } from '@/lib/utils';

export function ListItem({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <li className={cn('py-3', className)}>{children}</li>;
}

export function List({
  dataSource = [],
  renderItem,
  className,
}: {
  dataSource?: unknown[];
  renderItem: (item: unknown, index: number) => React.ReactNode;
  className?: string;
}) {
  return (
    <ul className={cn('divide-y divide-border', className)}>
      {dataSource.map((item, index) => (
        <li key={index} className="py-3">
          {renderItem(item, index)}
        </li>
      ))}
    </ul>
  );
}

List.Item = ListItem;

export function Pagination({
  current = 1,
  pageSize = 10,
  total = 0,
  onChange,
  className,
}: {
  current?: number;
  pageSize?: number;
  total?: number;
  onChange?: (page: number, pageSize?: number) => void;
  showSizeChanger?: boolean;
  className?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className={cn('flex items-center justify-center gap-2 py-3', className)}>
      <button type="button" className="rounded-md border px-3 py-1 text-sm disabled:opacity-50" disabled={current <= 1} onClick={() => onChange?.(current - 1)}>‹</button>
      <span className="text-sm text-muted-foreground">{current} / {pages}</span>
      <button type="button" className="rounded-md border px-3 py-1 text-sm disabled:opacity-50" disabled={current >= pages} onClick={() => onChange?.(current + 1)}>›</button>
    </div>
  );
}

export function Timeline({
  items,
  className,
}: {
  items: { color?: string; children: React.ReactNode }[];
  className?: string;
}) {
  return (
    <div className={cn('space-y-4', className)}>
      {items.map((item, i) => (
        <div key={i} className="flex gap-3">
          <div className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: item.color ?? 'var(--primary)' }} />
          <div className="flex-1 border-l border-border pb-4 pl-4 -ml-[1.35rem] last:border-transparent">{item.children}</div>
        </div>
      ))}
    </div>
  );
}

export function Badge({
  status,
  text,
  color,
  children,
  className,
  dot,
  offset,
}: {
  status?: 'success' | 'processing' | 'default' | 'error' | 'warning';
  text?: React.ReactNode;
  color?: string;
  children?: React.ReactNode;
  className?: string;
  dot?: boolean;
  offset?: number[];
}) {
  const statusColor =
    status === 'success' ? 'bg-emerald-500'
    : status === 'processing' ? 'bg-blue-500'
    : status === 'error' ? 'bg-red-500'
    : status === 'warning' ? 'bg-amber-500'
    : color ?? 'bg-slate-400';

  if (dot && children) {
    return (
      <span className={cn('relative inline-flex', className)} style={{ marginTop: offset?.[1], marginLeft: offset?.[0] }}>
        {children}
        <span className={cn('absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-background', statusColor)} />
      </span>
    );
  }

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className={cn('h-2 w-2 rounded-full', statusColor)} />
      {text ?? children}
    </span>
  );
}

export const Typography = {
  Text: ({ children, className, type, code, style }: { children?: React.ReactNode; className?: string; type?: 'secondary' | 'danger'; code?: boolean; style?: React.CSSProperties }) => (
    <span
      className={cn(
        type === 'secondary' && 'text-muted-foreground',
        type === 'danger' && 'text-destructive',
        code && 'rounded bg-muted px-1 py-0.5 font-mono text-xs',
        className,
      )}
      style={style}
    >
      {children}
    </span>
  ),
  Title: ({ children, level = 4, className }: { children?: React.ReactNode; level?: 1 | 2 | 3 | 4 | 5; className?: string }) => {
    const Tag = `h${level}` as keyof JSX.IntrinsicElements;
    return React.createElement(Tag, { className: cn('font-semibold', className) }, children);
  },
};
