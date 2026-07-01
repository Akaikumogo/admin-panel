import { fmtDateTime, fmtRelative, toDateTimeAttr } from '@/lib/format';

interface DateTimeDisplayProps {
  value: string | Date | number | null | undefined;
  showRelative?: boolean;
  className?: string;
}

export function DateTimeDisplay({
  value,
  showRelative = true,
  className,
}: DateTimeDisplayProps) {
  const absolute = fmtDateTime(value);
  const relative = showRelative ? fmtRelative(value) : null;
  const iso = toDateTimeAttr(value);

  if (absolute === '—') {
    return <span className={className ?? 'text-slate-400'}>—</span>;
  }

  return (
    <div className={`flex flex-col gap-0.5 leading-tight ${className ?? ''}`}>
      <time dateTime={iso} className="text-xs tabular-nums text-slate-700 dark:text-slate-300">
        {absolute}
      </time>
      {relative ? (
        <span className="text-[11px] text-slate-500 dark:text-slate-400">{relative}</span>
      ) : null}
    </div>
  );
}
