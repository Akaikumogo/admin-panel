import dayjs from 'dayjs';
import { CalendarDays, CalendarOff, ChevronLeft, ChevronRight, PartyPopper, Target } from 'lucide-react';
import { Spin } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { useFetch } from '@/hooks/useFetch';
import apiService from '@/services/api';
import { cellTone, PlanLegend } from './PlanMonthGrid';

const WEEKDAYS = [
  { uz: 'Du', en: 'Mo', ru: 'Пн' },
  { uz: 'Se', en: 'Tu', ru: 'Вт' },
  { uz: 'Ch', en: 'We', ru: 'Ср' },
  { uz: 'Pa', en: 'Th', ru: 'Чт' },
  { uz: 'Ju', en: 'Fr', ru: 'Пт' },
  { uz: 'Sh', en: 'Sa', ru: 'Сб' },
  { uz: 'Ya', en: 'Su', ru: 'Вс' },
];

export function PlanYearView({
  year,
  onYearChange,
  onOpenMonth,
}: {
  year: string;
  onYearChange: (year: string) => void;
  onOpenMonth: (month: string) => void;
}) {
  const { t, lang } = useTranslation();
  const locale = lang === 'ru' ? 'ru-RU' : lang === 'en' ? 'en-US' : 'uz-UZ';
  const today = dayjs().format('YYYY-MM-DD');
  const { data, initialLoading } = useFetch(
    ['plan-calendar-year', year],
    () => apiService.getPlanCalendarYear(year),
    null,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          aria-label="prev"
          className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-border hover:bg-muted"
          onClick={() => onYearChange(String(Number(year) - 1))}
        >
          <ChevronLeft size={16} />
        </button>
        <span className="min-w-[80px] text-center text-sm font-semibold">{year}</span>
        <button
          type="button"
          aria-label="next"
          className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-border hover:bg-muted"
          onClick={() => onYearChange(String(Number(year) + 1))}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {initialLoading || !data ? (
        <div className="flex items-center justify-center h-64">
          <Spin size="large" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat
              icon={<CalendarDays size={16} />}
              label={t({ uz: 'Ish kunlari', en: 'Working days', ru: 'Рабочие дни' })}
              value={data.workingDays}
            />
            <Stat
              icon={<Target size={16} />}
              label={t({ uz: 'Yillik plan (1 xodim)', en: 'Yearly plan (per employee)', ru: 'План на год (1 сотр.)' })}
              value={data.totalGoal}
            />
            <Stat
              icon={<CalendarOff size={16} />}
              label={t({ uz: 'Dam olish kunlari', en: 'Days off', ru: 'Выходные' })}
              value={data.daysOff}
            />
            <Stat
              icon={<PartyPopper size={16} />}
              label={t({ uz: 'Bayram kunlari', en: 'Holidays', ru: 'Праздники' })}
              value={data.holidays.filter((h) => h.isDayOff).length}
            />
          </div>

          {data.calendarStart.startsWith(year) ? (
            <p className="text-xs text-muted-foreground">
              {t({
                uz: `Plan ${dayjs(data.calendarStart).format('DD.MM.YYYY')} dan (baza yaratilgan kun) hisoblanadi.`,
                en: `Plan counts from ${dayjs(data.calendarStart).format('DD.MM.YYYY')} (database start).`,
                ru: `План считается с ${dayjs(data.calendarStart).format('DD.MM.YYYY')} (запуск базы).`,
              })}
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {data.months.map((mo) => {
              const firstDow = (dayjs(`${mo.month}-01`).day() + 6) % 7;
              return (
                <button
                  key={mo.month}
                  type="button"
                  onClick={() => onOpenMonth(mo.month)}
                  className="rounded-lg border border-border bg-card p-3 text-left transition-shadow hover:shadow-md hover:ring-1 hover:ring-primary/40"
                >
                  <div className="mb-2 flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold capitalize">
                      {dayjs(`${mo.month}-01`).toDate().toLocaleDateString(locale, { month: 'long' })}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {mo.workingDays} {t({ uz: 'kun', en: 'days', ru: 'дн.' })} ·{' '}
                      <b className="text-foreground">{mo.totalGoal}</b>
                    </span>
                  </div>
                  <div className="grid grid-cols-7 gap-0.5 mb-0.5">
                    {WEEKDAYS.map((w, i) => (
                      <span
                        key={w.en}
                        className={cn(
                          'text-center text-[10px]',
                          i >= 5 ? 'text-red-500' : 'text-muted-foreground',
                        )}
                      >
                        {t(w)}
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-0.5">
                    {Array.from({ length: firstDow }).map((_, i) => (
                      <span key={`pad-${i}`} />
                    ))}
                    {mo.days.map((d) => (
                      <span
                        key={d.date}
                        title={
                          d.calendarApplies
                            ? `${dayjs(d.date).format('DD.MM')}: ${d.goal}${d.holidayName ? ` · ${d.holidayName}` : ''}`
                            : undefined
                        }
                        className={cn(
                          'flex h-6 items-center justify-center rounded border text-[10px] font-medium tabular-nums',
                          cellTone(
                            {
                              date: d.date,
                              goal: d.goal,
                              isDayOff: d.isDayOff,
                              holidayName: d.holidayName,
                              calendarApplies: d.calendarApplies,
                            },
                            data.defaultGoal,
                          ),
                          d.date === today && 'ring-2 ring-primary',
                        )}
                      >
                        {Number(d.date.slice(8))}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          <PlanLegend defaultGoal={data.defaultGoal} />

          {data.holidays.length ? (
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="mb-2 text-sm font-semibold">
                {t({ uz: 'Bayram va maxsus kunlar', en: 'Holidays and special days', ru: 'Праздники и особые дни' })}
              </div>
              <div className="grid gap-1 sm:grid-cols-2 text-sm">
                {data.holidays.map((h) => (
                  <div key={h.date} className="flex items-center gap-2">
                    <span className="w-24 shrink-0 tabular-nums text-muted-foreground">
                      {dayjs(h.date).format('DD.MM.YYYY')}
                    </span>
                    <span
                      className={cn(
                        'h-2 w-2 shrink-0 rounded-full',
                        h.isDayOff ? 'bg-red-500' : 'bg-emerald-500',
                      )}
                    />
                    <span className="truncate">{h.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}
