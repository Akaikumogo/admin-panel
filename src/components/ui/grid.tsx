import { cn } from '@/lib/utils';

export function Row({
  gutter = 0,
  children,
  className,
}: {
  gutter?: number | [number, number];
  children: React.ReactNode;
  className?: string;
}) {
  const [gx, gy] = Array.isArray(gutter) ? gutter : [gutter, gutter];
  return (
    <div
      className={cn('flex flex-wrap', className)}
      style={{ marginLeft: gx ? -gx / 2 : undefined, marginRight: gx ? -gx / 2 : undefined, rowGap: gy }}
    >
      {children}
    </div>
  );
}

export function Col({
  span = 24,
  xs,
  sm,
  md,
  lg,
  xl,
  children,
  className,
}: {
  span?: number;
  xs?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
  children: React.ReactNode;
  className?: string;
}) {
  const effectiveSpan = xl ?? lg ?? md ?? sm ?? xs ?? span;
  const pct = `${(effectiveSpan / 24) * 100}%`;
  return (
    <div className={cn('px-2', className)} style={{ width: pct, flex: `0 0 ${pct}`, maxWidth: pct }}>
      {children}
    </div>
  );
}
