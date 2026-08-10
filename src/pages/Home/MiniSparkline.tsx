import { useId } from 'react';
import { cn } from '@/lib/utils';

/** Minimal sparkline with soft area fill — last N values */
export function MiniSparkline({
  values,
  className,
  stroke = 'var(--shell-rail)',
}: {
  values: number[];
  className?: string;
  stroke?: string;
}) {
  const gradId = useId().replace(/:/g, '');
  const pts = values.length ? values : [0];
  const max = Math.max(...pts, 1);
  const min = Math.min(...pts, 0);
  const span = Math.max(max - min, 1);
  const w = 88;
  const h = 28;
  const coords = pts.map((v, i) => {
    const x = pts.length === 1 ? w / 2 : (i / (pts.length - 1)) * w;
    const y = h - ((v - min) / span) * (h - 6) - 3;
    return { x, y };
  });
  const line = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(' ');
  const area =
    coords.length > 1
      ? `${line} L${coords[coords.length - 1].x.toFixed(1)},${h} L${coords[0].x.toFixed(1)},${h} Z`
      : '';

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={cn('h-7 w-[88px] overflow-visible', className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {area ? <path d={area} fill={`url(#${gradId})`} /> : null}
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {coords.length > 0 ? (
        <circle
          cx={coords[coords.length - 1].x}
          cy={coords[coords.length - 1].y}
          r="2.25"
          fill={stroke}
        />
      ) : null}
    </svg>
  );
}
