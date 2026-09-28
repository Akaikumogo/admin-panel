import dayjs from 'dayjs';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';

export type PlanGridDay = {
  date: string;
  goal: number;
  isDayOff: boolean;
  holidayName: string | null;
  calendarApplies: boolean;
  /** Admin tomonidan o'zgartirilgan kun (belgi bilan ko'rsatiladi). */
  customized?: boolean;
};

const WEEKDAYS = [
  { uz: 'Du', en: 'Mo', ru: 'Пн' },
  { uz: 'Se', en: 'Tu', ru: 'Вт' },
  { uz: 'Ch', en: 'We', ru: 'Ср' },
  { uz: 'Pa', en: 'Th', ru: 'Чт' },
  { uz: 'Ju', en: 'Fr', ru: 'Пт' },
  { uz: 'Sh', en: 'Sa', ru: 'Сб' },
  { uz: 'Ya', en: 'Su', ru: 'Вс' },
];

function cellTone(day: PlanGridDay, defaultGoal: number): string {
  if (!day.calendarApplies) {
    return 'bg-muted/40 text-muted-foreground border-transparent';
  }
  if (day.goal === 0) {
    return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900';
  }
  if (day.goal < defaultGoal) {
    return 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900';
  }
  if (day.goal === defaultGoal) {
    return 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900';
  }
  if (day.goal < defaultGoal * 2) {
    return 'bg-emerald-200 text-emerald-900 border-emerald-300 dark:bg-emerald-800/60 dark:text-emerald-100 dark:border-emerald-700';
  }
  return 'bg-emerald-500 text-white border-emerald-600 dark:bg-emerald-600 dark:border-emerald-500';
}

export function PlanMonthNav({
  month,
  onChange,
}: {
  month: string;
  onChange: (month: string) => void;
}) {
  const { lang } = useTranslation();
  const m = dayjs(`${month}-01`);
  const label = m.toDate().toLocaleDateString(
    lang === 'ru' ? 'ru-RU' : lang === 'en' ? 'en-US' : 'uz-UZ',
    { month: 'long', year: 'numeric' },
  );
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label="prev"
        className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-border hover:bg-muted"
        onClick={() => onChange(m.subtract(1, 'month').format('YYYY-MM'))}
      >
        <ChevronLeft size={16} />
      </button>
      <span className="min-w-[140px] text-center text-sm font-semibold capitalize">
        {label}
      </span>
      <button
        type="button"
        aria-label="next"
        className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-border hover:bg-muted"
        onClick={() => onChange(m.add(1, 'month').format('YYYY-MM'))}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

export function PlanMonthGrid({
  days,
  defaultGoal,
  onSelect,
  compact = false,
}: {
  days: PlanGridDay[];
  defaultGoal: number;
  onSelect?: (day: PlanGridDay) => void;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const today = dayjs().format('YYYY-MM-DD');
  if (!days.length) return null;
  const firstDow = (dayjs(days[0].date).day() + 6) % 7;
  const cells: Array<PlanGridDay | null> = [
    ...Array.from({ length: firstDow }, () => null),
    ...days,
  ];

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5 mb-1.5">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w.en}
            className={cn(
              'text-center text-xs font-medium',
              i >= 5 ? 'text-red-500' : 'text-muted-foreground',
            )}
          >
            {t(w)}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((day, i) =>
          day ? (
            <button
              key={day.date}
              type="button"
              disabled={!onSelect}
              onClick={() => onSelect?.(day)}
              title={day.holidayName ?? undefined}
              className={cn(
                'relative flex flex-col rounded-md border text-left transition-shadow',
                compact ? 'h-14 p-1.5' : 'h-24 p-2',
                cellTone(day, defaultGoal),
                onSelect && 'hover:shadow-md hover:ring-1 hover:ring-primary/40 cursor-pointer',
                !onSelect && 'cursor-default',
                day.date === today && 'ring-2 ring-primary',
              )}
            >
              <span className="flex items-center justify-between text-xs font-medium opacity-80">
                {Number(day.date.slice(8))}
                {day.customized ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                ) : null}
              </span>
              <span
                className={cn(
                  'font-bold tabular-nums leading-none',
                  compact ? 'text-base mt-0.5' : 'text-2xl mt-1',
                )}
              >
                {day.calendarApplies ? day.goal : '—'}
              </span>
              {!compact && day.holidayName ? (
                <span className="mt-auto line-clamp-2 text-[10px] leading-tight opacity-90">
                  {day.holidayName}
                </span>
              ) : null}
            </button>
          ) : (
            <div key={`pad-${i}`} />
          ),
        )}
      </div>
    </div>
  );
}

export function PlanLegend({ defaultGoal }: { defaultGoal: number }) {
  const { t } = useTranslation();
  const items = [
    { cls: 'bg-red-100 border-red-200', label: t({ uz: 'Dam olish (plan 0)', en: 'Day off (plan 0)', ru: 'Выходной (план 0)' }) },
    { cls: 'bg-amber-100 border-amber-200', label: t({ uz: `${defaultGoal} dan kam`, en: `Below ${defaultGoal}`, ru: `Меньше ${defaultGoal}` }) },
    { cls: 'bg-emerald-50 border-emerald-200', label: t({ uz: `Standart (${defaultGoal})`, en: `Default (${defaultGoal})`, ru: `Стандарт (${defaultGoal})` }) },
    { cls: 'bg-emerald-200 border-emerald-300', label: t({ uz: 'Oshirilgan', en: 'Increased', ru: 'Повышен' }) },
    { cls: 'bg-emerald-500 border-emerald-600', label: t({ uz: `${defaultGoal * 2}+`, en: `${defaultGoal * 2}+`, ru: `${defaultGoal * 2}+` }) },
  ];
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          <span className={cn('h-3 w-3 rounded-sm border', it.cls)} />
          {it.label}
        </span>
      ))}
    </div>
  );
}
