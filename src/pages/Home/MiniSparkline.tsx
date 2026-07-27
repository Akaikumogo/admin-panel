import { cn } from '@/lib/utils';

/** Minimal sparkline — last N values */
export function MiniSparkline({
  values,
  className,
  stroke = 'currentColor',
}: {
  values: number[];
  className?: string;
  stroke?: string;
}) {
  const pts = values.length ? values : [0];
  const max = Math.max(...pts, 1);
  const min = Math.min(...pts, 0);
  const span = Math.max(max - min, 1);
  const w = 72;
  const h = 24;
  const path = pts
    .map((v, i) => {
      const x = pts.length === 1 ? w / 2 : (i / (pts.length - 1)) * w;
      const y = h - ((v - min) / span) * (h - 4) - 2;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={cn('h-6 w-[72px] overflow-visible', className)}
      aria-hidden
    >
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.9}
      />
    </svg>
  );
}
