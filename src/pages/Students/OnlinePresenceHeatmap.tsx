import { useMemo, useState } from 'react';
import { DatePicker, Segmented, Spin, Tooltip } from '@/components/ui';
import dayjs, { type Dayjs } from 'dayjs';
import { useFetch } from '@/hooks/useFetch';
import { useTranslation } from '@/hooks/useTranslation';
import {
  userActivityApi,
  type OnlineCalendarDay,
  type OnlineCalendarResponse,
} from '@/services/api';
import { cn } from '@/lib/utils';

const T = {
  title: { uz: 'Online tarixi', en: 'Online history', ru: 'История онлайна' },
  weeks4: { uz: '4 hafta', en: '4 weeks', ru: '4 недели' },
  months3: { uz: '3 oy', en: '3 months', ru: '3 месяца' },
  year1: { uz: '1 yil', en: '1 year', ru: '1 год' },
  custom: { uz: 'Oraliq', en: 'Range', ru: 'Период' },
  less: { uz: 'Kam', en: 'Less', ru: 'Меньше' },
  more: { uz: 'Ko‘p', en: 'More', ru: 'Больше' },
  noData: { uz: 'Bu oraliqda online yo‘q', en: 'No online time in range', ru: 'Нет онлайна за период' },
  hours: { uz: 'soat', en: 'h', ru: 'ч' },
  sessions: { uz: 'Sessionlar', en: 'Sessions', ru: 'Сессии' },
} as const;

const WEEKDAYS = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'] as const;

type Preset = '28' | '90' | '365' | 'custom';

function hoursColor(hours: number): string {
  if (hours <= 0) return 'bg-muted text-muted-foreground/50';
  if (hours < 1) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200';
  if (hours < 3) return 'bg-emerald-300 text-emerald-950 dark:bg-emerald-800 dark:text-emerald-50';
  if (hours < 6) return 'bg-emerald-500 text-white dark:bg-emerald-600';
  return 'bg-emerald-700 text-white dark:bg-emerald-500 dark:text-emerald-950';
}

function formatHoursLabel(hours: number): string {
  if (hours <= 0) return '';
  if (hours < 10) return String(hours);
  return String(Math.round(hours));
}

function formatSessionLine(s: OnlineCalendarDay['sessions'][number]): string {
  const start = dayjs(s.loginAt).format('HH:mm');
  const end = dayjs(s.logoutAt ?? s.lastSeenAt).format('HH:mm');
  const h = Math.round((s.durationSeconds / 3600) * 10) / 10;
  return `${start}–${end} (${h} soat)`;
}

function buildWeeks(days: OnlineCalendarDay[]): (OnlineCalendarDay | null)[][] {
  if (days.length === 0) return [];
  const first = dayjs(days[0].date);
  // Monday = 0 … Sunday = 6
  const pad = (first.day() + 6) % 7;
  const cells: (OnlineCalendarDay | null)[] = [
    ...Array.from({ length: pad }, () => null),
    ...days,
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (OnlineCalendarDay | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

type Props = {
  userId: string;
};

export function OnlinePresenceHeatmap({ userId }: Props) {
  const { t } = useTranslation();
  const [preset, setPreset] = useState<Preset>('28');
  const [customRange, setCustomRange] = useState<[Dayjs, Dayjs] | null>(null);

  const query = useMemo(() => {
    if (preset === 'custom' && customRange) {
      return {
        from: customRange[0].format('YYYY-MM-DD'),
        to: customRange[1].format('YYYY-MM-DD'),
      };
    }
    const days = preset === '90' ? 90 : preset === '365' ? 365 : 28;
    return { days };
  }, [preset, customRange]);

  const enabled =
    Boolean(userId) && (preset !== 'custom' || Boolean(customRange));

  const { data, initialLoading } = useFetch<OnlineCalendarResponse | null>(
    [
      'online-calendar',
      userId,
      query.from ?? '',
      query.to ?? '',
      String(query.days ?? ''),
    ],
    () => userActivityApi.onlineCalendar(userId, query),
    null,
    { enabled },
  );

  const weeks = useMemo(
    () => (data?.days ? buildWeeks(data.days) : []),
    [data?.days],
  );

  const compact = (data?.days.length ?? 0) > 120;
  const cellPx = compact ? 14 : 24;
  const gapPx = 4;

  const monthLabels = useMemo(() => {
    if (!data?.days?.length) return [] as { label: string; weekIndex: number }[];
    const labels: { label: string; weekIndex: number }[] = [];
    let lastMonth = '';
    weeks.forEach((week, wi) => {
      const firstDay = week.find((d): d is OnlineCalendarDay => Boolean(d?.date));
      if (!firstDay) return;
      const m = dayjs(firstDay.date).format('MMM');
      if (m !== lastMonth) {
        labels.push({ label: m, weekIndex: wi });
        lastMonth = m;
      }
    });
    return labels;
  }, [weeks, data?.days]);

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-foreground">{t(T.title)}</h3>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            value={preset}
            onChange={(v) => setPreset(v)}
            options={[
              { label: t(T.weeks4), value: '28' },
              { label: t(T.months3), value: '90' },
              { label: t(T.year1), value: '365' },
              { label: t(T.custom), value: 'custom' },
            ]}
          />
          {preset === 'custom' ? (
            <DatePicker.RangePicker
              value={customRange}
              onChange={(v) => setCustomRange(v)}
              allowClear
              className="h-8"
            />
          ) : null}
        </div>
      </div>

      {!enabled ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          {t({
            uz: 'Oraliqni tanlang',
            en: 'Pick a date range',
            ru: 'Выберите период',
          })}
        </p>
      ) : initialLoading || !data ? (
        <div className="flex items-center justify-center h-28">
          <Spin />
        </div>
      ) : data.days.every((d) => d.hours <= 0) ? (
        <p className="text-sm text-muted-foreground py-6 text-center">{t(T.noData)}</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="inline-flex flex-col gap-1 min-w-max">
            <div
              className="relative mb-0.5 h-4"
              style={{ paddingLeft: 28 }}
            >
              {monthLabels.map((m) => (
                <span
                  key={`${m.label}-${m.weekIndex}`}
                  className="absolute text-[10px] text-muted-foreground capitalize"
                  style={{
                    left: 28 + m.weekIndex * (cellPx + gapPx),
                  }}
                >
                  {m.label}
                </span>
              ))}
            </div>
            <div className="flex" style={{ gap: gapPx }}>
              <div
                className="flex flex-col w-6 shrink-0"
                style={{ gap: gapPx }}
              >
                {WEEKDAYS.map((d, i) => (
                  <div
                    key={d}
                    className="w-6 text-[9px] text-muted-foreground text-right pr-0.5 flex items-center justify-end"
                    style={{ height: cellPx }}
                  >
                    {i % 2 === 0 ? d : ''}
                  </div>
                ))}
              </div>
              <div className="flex" style={{ gap: gapPx }}>
                {weeks.map((week, wi) => (
                  <div
                    key={wi}
                    className="flex flex-col"
                    style={{ gap: gapPx }}
                  >
                    {week.map((day, di) => {
                      if (!day) {
                        return (
                          <div
                            key={`pad-${wi}-${di}`}
                            className="rounded-sm bg-transparent"
                            style={{ width: cellPx, height: cellPx }}
                          />
                        );
                      }
                      const label = compact
                        ? day.hours > 0
                          ? String(Math.round(day.hours))
                          : ''
                        : formatHoursLabel(day.hours);
                      const tip = (
                        <div className="text-xs space-y-1 max-w-[240px]">
                          <div className="font-medium">
                            {dayjs(day.date).format('DD.MM.YYYY')} — {day.hours}{' '}
                            {t(T.hours)}
                          </div>
                          {day.sessions.length > 0 ? (
                            <div>
                              <div className="opacity-80 mb-0.5">
                                {t(T.sessions)}:
                              </div>
                              <ul className="space-y-0.5">
                                {day.sessions.map((s, i) => (
                                  <li key={`${s.loginAt}-${i}`}>
                                    {formatSessionLine(s)}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </div>
                      );
                      return (
                        <Tooltip key={day.date} title={tip}>
                          <div
                            className={cn(
                              'rounded-sm flex items-center justify-center font-semibold leading-none select-none cursor-default',
                              compact ? 'text-[7px]' : 'text-[9px]',
                              hoursColor(day.hours),
                            )}
                            style={{ width: cellPx, height: cellPx }}
                          >
                            {label}
                          </div>
                        </Tooltip>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-3 pl-7 text-[10px] text-muted-foreground">
              <span>{t(T.less)}</span>
              {[0, 0.5, 2, 4, 8].map((h) => (
                <div
                  key={h}
                  className={cn('h-3 w-3 rounded-sm', hoursColor(h))}
                />
              ))}
              <span>{t(T.more)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
