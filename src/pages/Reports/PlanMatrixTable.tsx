import { useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Download } from 'lucide-react';
import dayjs from 'dayjs';
import {
  Button,
  DatePicker,
  Segmented,
  Skeleton,
  Table,
  Tag,
  Tooltip,
  message,
} from '@/components/ui';
import { useTranslation } from '@/hooks/useTranslation';
import { useFetch } from '@/hooks/useFetch';
import apiService from '@/services/api';
import type {
  MonthlyPlanMatrix,
  MonthlyPlanMatrixEmployee,
  YearlyPlanMatrix,
  YearlyPlanMatrixEmployee,
} from '@/services/api';
import { PercentBar } from '@/pages/Analytics/components/PercentBar';
import { shortBranchName } from '@/pages/Home/branchName';
import { todayStr } from '@/pages/Analytics/analytics-utils';
import { cn } from '@/lib/utils';

export type PlanPeriod = 'daily' | 'monthly' | 'yearly';

/** showFilial=true → filial ustuni ko‘rinadi; false → ko‘rinmaydi (shaxsiy/filial). */
export type PlanResultsSharedProps = {
  showFilial?: boolean;
  orgId?: string;
  userId?: string;
  pageSize?: number;
  reportsHref?: string;
  className?: string;
  /** Tashqi period control o‘rniga ichki filter. */
  embeddedControls?: boolean;
  title?: ReactNode;
  defaultPeriod?: PlanPeriod;
};

const MONTH_SHORT = [
  'Yan',
  'Fev',
  'Mar',
  'Apr',
  'May',
  'Iyn',
  'Iyl',
  'Avg',
  'Sen',
  'Okt',
  'Noy',
  'Dek',
];

function isYearly(
  data: MonthlyPlanMatrix | YearlyPlanMatrix,
): data is YearlyPlanMatrix {
  return 'year' in data && Array.isArray((data as YearlyPlanMatrix).months);
}

function ScoreChip({
  label,
  completed,
  planCorrect,
  tip,
}: {
  label: string;
  completed: boolean;
  planCorrect: number;
  tip?: string;
}) {
  const cls = completed
    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
    : planCorrect > 0
      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';
  const chip = (
    <span
      className={`inline-block min-w-[2.5rem] rounded px-1 py-0.5 text-[11px] font-semibold tabular-nums ${cls}`}
    >
      {label}
    </span>
  );
  return tip ? <Tooltip title={tip}>{chip}</Tooltip> : chip;
}

type MatrixTableProps = {
  data: MonthlyPlanMatrix | YearlyPlanMatrix;
  period?: PlanPeriod;
  loading?: boolean;
  highlightDate?: string;
  /** true = filial ko‘rinadi, false = ko‘rinmaydi */
  showFilial?: boolean;
  pageSize?: number;
  reportsHref?: string;
  userId?: string;
};

function PlanMatrixTableBase({
  data,
  period = 'monthly',
  loading,
  highlightDate,
  showFilial = true,
  pageSize = 40,
  reportsHref,
  userId,
}: MatrixTableProps) {
  const { t } = useTranslation();
  const yearly = isYearly(data);

  const employees = useMemo(() => {
    const rows = data.employees ?? [];
    if (!userId) return rows;
    return rows.filter((e) => e.userId === userId);
  }, [data.employees, userId]);

  const columns = useMemo(() => {
    const idxCol = {
      title: '№',
      key: 'idx',
      width: 48,
      fixed: 'left' as const,
      filterable: false as const,
      render: (_: unknown, __: { userId: string }, i: number) => i + 1,
    };

    const orgCol = showFilial
      ? [
          {
            title: t({ uz: 'Filial', en: 'Branch', ru: 'Филиал' }),
            dataIndex: 'orgName',
            key: 'orgName',
            width: 180,
            fixed: 'left' as const,
            ellipsis: true,
            render: (name: string, row: { orgId?: string; orgName?: string }) => {
              const label = shortBranchName(name || row.orgName || '—');
              if (!row.orgId) return label;
              return (
                <Link
                  to={`/dashboard/reports?orgId=${row.orgId}`}
                  className="text-[var(--shell-rail)] hover:underline font-medium"
                  title={name}
                  onClick={(e) => e.stopPropagation()}
                >
                  {label}
                </Link>
              );
            },
          },
        ]
      : [];

    const nameCol = {
      title: t({ uz: 'F.I.O', en: 'Name', ru: 'Ф.И.О' }),
      dataIndex: 'fullName',
      key: 'fullName',
      width: 170,
      fixed: 'left' as const,
      ellipsis: true,
      render: (name: string, row: { userId: string }) => (
        <Link
          to={`/dashboard/employees/${row.userId}`}
          className="text-[var(--shell-rail)] hover:underline font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          {name}
        </Link>
      ),
    };

    const statsCols = [
      {
        title: t({ uz: 'Urinishlar', en: 'Attempts', ru: 'Попытки' }),
        dataIndex: 'attemptsTotal',
        key: 'attemptsTotal',
        width: 90,
        fixed: 'right' as const,
        filterable: false as const,
        align: 'center' as const,
        render: (v: number | undefined) => (
          <span className="tabular-nums font-medium">{v ?? 0}</span>
        ),
      },
      {
        title: t({ uz: 'Xatolar', en: 'Errors', ru: 'Ошибки' }),
        dataIndex: 'wrongTotal',
        key: 'wrongTotal',
        width: 80,
        fixed: 'right' as const,
        filterable: false as const,
        align: 'center' as const,
        render: (v: number | undefined) => (
          <span className="tabular-nums font-medium text-rose-600 dark:text-rose-400">
            {v ?? 0}
          </span>
        ),
      },
      {
        title: t({
          uz: 'Plandan tashqari',
          en: 'Beyond plan',
          ru: 'Сверх плана',
        }),
        dataIndex: 'extraCorrectTotal',
        key: 'extraCorrectTotal',
        width: 110,
        fixed: 'right' as const,
        filterable: false as const,
        align: 'center' as const,
        render: (v: number) => (
          <span className="tabular-nums font-medium text-sky-700 dark:text-sky-300">
            {v ?? 0}
          </span>
        ),
      },
    ];

    if (yearly) {
      const yData = data as YearlyPlanMatrix;
      const monthCols = (yData.months ?? []).map((m, idx) => ({
        title: MONTH_SHORT[Number(m.slice(5, 7)) - 1] ?? m.slice(5, 7),
        key: m,
        width: 88,
        align: 'center' as const,
        filterable: false as const,
        render: (_: unknown, row: YearlyPlanMatrixEmployee) => {
          const cell = row.monthResults[idx];
          if (!cell) return '—';
          const tip = t({
            uz: `${cell.percent}% · reja ${cell.label}\nUrinish: ${cell.attempts} · Xato: ${cell.wrong} · Plandan tashqari: ${cell.extraCorrect}`,
            en: `${cell.percent}% · plan ${cell.label}\nAttempts: ${cell.attempts} · Errors: ${cell.wrong} · Extra: ${cell.extraCorrect}`,
            ru: `${cell.percent}% · план ${cell.label}\nПопытки: ${cell.attempts} · Ошибки: ${cell.wrong} · Сверх: ${cell.extraCorrect}`,
          });
          return (
            <Tooltip title={<span className="whitespace-pre-line">{tip}</span>}>
              <span className="inline-flex flex-col items-center gap-0.5 leading-tight">
                <span
                  className={`rounded px-1 text-[11px] font-semibold tabular-nums ${
                    cell.percent >= 100
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                      : cell.percent > 0
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {cell.percent}%
                </span>
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {cell.label}
                </span>
              </span>
            </Tooltip>
          );
        },
      }));

      return [
        idxCol,
        ...orgCol,
        nameCol,
        ...monthCols,
        {
          title: t({ uz: 'Yillik', en: 'Year', ru: 'Год' }),
          dataIndex: 'daysCompleted',
          key: 'daysCompleted',
          width: 100,
          fixed: 'right' as const,
          filterable: false as const,
          render: (v: number, row: YearlyPlanMatrixEmployee) => (
            <span className="font-semibold tabular-nums">
              {v}/{row.daysInYear}
            </span>
          ),
        },
        {
          title: t({ uz: 'Yillik %', en: 'Yearly %', ru: 'Год %' }),
          dataIndex: 'yearlyPercent',
          key: 'yearlyPercent',
          width: 120,
          fixed: 'right' as const,
          filterable: false as const,
          render: (p: number) => <PercentBar percent={p} />,
        },
        ...statsCols,
      ];
    }

    const mData = data as MonthlyPlanMatrix;
    let dayKeys = mData.days ?? [];
    if (period === 'daily' && highlightDate) {
      dayKeys = dayKeys.filter((d) => d === highlightDate);
      if (!dayKeys.length && highlightDate) dayKeys = [highlightDate];
    }

    const dayCols = dayKeys.map((d) => {
      const idx = (mData.days ?? []).indexOf(d);
      const title =
        period === 'daily'
          ? `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}`
          : `${d.slice(8, 10)}.${d.slice(5, 7)}`;
      return {
        title,
        key: d,
        width: period === 'daily' ? 96 : 64,
        align: 'center' as const,
        filterable: false as const,
        onHeaderCell: () =>
          highlightDate && d === highlightDate
            ? { className: 'bg-sky-50 dark:bg-sky-950/30' }
            : {},
        render: (_: unknown, row: MonthlyPlanMatrixEmployee) => {
          const cell = idx >= 0 ? row.dayResults[idx] : undefined;
          if (!cell) return '—';
          const tip = t({
            uz: `Sana: ${cell.date}\nReja: ${cell.label}\nUrinish: ${cell.attempts ?? 0} · Xato: ${cell.wrong ?? 0} · Plandan tashqari: ${cell.extraCorrect ?? Math.max(0, cell.rawCorrect - 10)}`,
            en: `Date: ${cell.date}\nPlan: ${cell.label}\nAttempts: ${cell.attempts ?? 0} · Errors: ${cell.wrong ?? 0} · Extra: ${cell.extraCorrect ?? Math.max(0, cell.rawCorrect - 10)}`,
            ru: `Дата: ${cell.date}\nПлан: ${cell.label}\nПопытки: ${cell.attempts ?? 0} · Ошибки: ${cell.wrong ?? 0} · Сверх: ${cell.extraCorrect ?? Math.max(0, cell.rawCorrect - 10)}`,
          });
          return (
            <ScoreChip
              label={cell.label}
              completed={cell.completed}
              planCorrect={cell.planCorrect}
              tip={tip}
            />
          );
        },
      };
    });

    const daysInMonth = mData.daysInMonth;

    return [
      idxCol,
      ...orgCol,
      nameCol,
      ...dayCols,
      {
        title: t({
          uz: `Bajarilgan / ${daysInMonth}`,
          en: `Done / ${daysInMonth}`,
          ru: `Выполнено / ${daysInMonth}`,
        }),
        dataIndex: 'daysCompleted',
        key: 'daysCompleted',
        width: 110,
        fixed: 'right' as const,
        filterable: false as const,
        render: (v: number) => (
          <span className="font-semibold tabular-nums">
            {v}/{daysInMonth}
          </span>
        ),
      },
      {
        title: t({ uz: 'Oylik %', en: 'Monthly %', ru: 'Мес. %' }),
        dataIndex: 'monthlyPercent',
        key: 'monthlyPercent',
        width: 120,
        fixed: 'right' as const,
        filterable: false as const,
        render: (p: number) => <PercentBar percent={p} />,
      },
      ...statsCols,
    ];
  }, [data, period, showFilial, highlightDate, yearly, t]);

  const scrollX = useMemo(() => {
    if (yearly) {
      const yData = data as YearlyPlanMatrix;
      return Math.max(
        900,
        280 + (yData.months?.length ?? 0) * 88 + (showFilial ? 180 : 0) + 400,
      );
    }
    const mData = data as MonthlyPlanMatrix;
    const dayCount = period === 'daily' ? 1 : (mData.days?.length ?? 0);
    return Math.max(
      700,
      280 + dayCount * (period === 'daily' ? 96 : 64) + (showFilial ? 180 : 0) + 400,
    );
  }, [data, period, showFilial, yearly]);

  const metaEmployees = employees.length;
  const metaLabel = yearly
    ? `${(data as YearlyPlanMatrix).year} · ${metaEmployees}`
    : period === 'daily' && highlightDate
      ? `${highlightDate} · ${metaEmployees}`
      : `${(data as MonthlyPlanMatrix).month} · ${metaEmployees}`;

  const avgLabel = yearly
    ? `${(data as YearlyPlanMatrix).averageYearlyPercent}%`
    : `${(data as MonthlyPlanMatrix).averageMonthlyPercent}%`;

  return (
    <div className="space-y-3 min-w-0 max-w-full">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs min-w-0">
          {yearly ? (
            <>
              <Tag color="success">100%</Tag>
              <Tag color="warning">1–99%</Tag>
              <Tag>0%</Tag>
            </>
          ) : (
            <>
              <Tag color="success">10/10</Tag>
              <Tag color="warning">1–9/10</Tag>
              <Tag>0/10</Tag>
            </>
          )}
          <span className="text-muted-foreground truncate max-w-full">
            {data.orgName ||
              t({
                uz: 'Barcha filiallar',
                en: 'All branches',
                ru: 'Все филиалы',
              })}
            {' · '}
            {metaLabel}{' '}
            {t({ uz: 'xodim', en: 'staff', ru: 'сотрудников' })}
            {' · '}
            {avgLabel}
          </span>
        </div>
        {reportsHref ? (
          <Link
            to={reportsHref}
            className="text-xs font-medium text-[var(--shell-rail)] hover:underline shrink-0"
          >
            {t({
              uz: 'To‘liq hisobot →',
              en: 'Full reports →',
              ru: 'Полный отчёт →',
            })}
          </Link>
        ) : null}
      </div>
      <Table
        rowKey={(r) => `${r.orgId ?? ''}-${r.userId}`}
        loading={loading}
        dataSource={employees}
        columns={columns}
        pagination={{ pageSize, showSizeChanger: true }}
        size="small"
        scroll={{ x: scrollX }}
        className="min-w-0"
      />
    </div>
  );
}

/** HOC: barcha reja jadvallari bir xil `showFilial` kontrakti bilan. */
export function withPlanResultsTable<P extends object>(
  Component: ComponentType<P & { showFilial: boolean }>,
) {
  function WithPlanResults(props: P & { showFilial?: boolean }) {
    const showFilial = props.showFilial ?? true;
    return <Component {...props} showFilial={showFilial} />;
  }
  WithPlanResults.displayName = `withPlanResultsTable(${Component.displayName || Component.name || 'Component'})`;
  return WithPlanResults;
}

export const PlanMatrixTable = withPlanResultsTable(PlanMatrixTableBase);

const emptyMonth = (month: string): MonthlyPlanMatrix => ({
  orgId: '',
  orgName: '',
  month,
  daysInMonth: 30,
  dailyGoalCorrect: 10,
  days: [],
  totalEmployees: 0,
  averageMonthlyPercent: 0,
  fullCompletedEmployees: 0,
  employees: [],
});

const emptyYear = (year: string): YearlyPlanMatrix => ({
  orgId: '',
  orgName: '',
  year,
  months: [],
  dailyGoalCorrect: 10,
  totalEmployees: 0,
  averageYearlyPercent: 0,
  employees: [],
});

/**
 * Yagona reja natijalari paneli: kunlik/oylik/yillik + Excel.
 * showFilial=true → filial ustuni; false → yashirin (shaxsiy yoki bitta filial).
 */
function PlanResultsTableInner({
  showFilial = true,
  orgId,
  userId,
  pageSize = 30,
  reportsHref,
  className,
  embeddedControls = true,
  title,
  defaultPeriod = 'monthly',
}: PlanResultsSharedProps & { showFilial: boolean }) {
  const { t } = useTranslation();
  const today = todayStr();
  const [period, setPeriod] = useState<PlanPeriod>(defaultPeriod);
  const [day, setDay] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [year, setYear] = useState(today.slice(0, 4));
  const [exporting, setExporting] = useState(false);

  const monthForFetch = period === 'daily' ? day.slice(0, 7) : month;

  const { data: planMatrix, initialLoading: monthLoading } =
    useFetch<MonthlyPlanMatrix>(
      ['plan-results-month', orgId ?? '', userId ?? '', monthForFetch],
      () =>
        apiService.getMonthlyPlanMatrix({
          orgId: orgId || undefined,
          month: monthForFetch,
        }),
      emptyMonth(monthForFetch),
      { enabled: period !== 'yearly' },
    );

  const { data: yearMatrix, initialLoading: yearLoading } =
    useFetch<YearlyPlanMatrix>(
      ['plan-results-year', orgId ?? '', userId ?? '', year],
      () =>
        apiService.getYearlyPlanMatrix({
          orgId: orgId || undefined,
          year,
        }),
      emptyYear(year),
      { enabled: period === 'yearly' },
    );

  const loading = period === 'yearly' ? yearLoading : monthLoading;

  const onExport = async () => {
    setExporting(true);
    try {
      if (period === 'yearly') {
        await apiService.downloadYearlyPlanMatrixExcel({
          orgId: orgId || undefined,
          year,
          userId,
          showFilial,
        });
      } else {
        await apiService.downloadMonthlyPlanMatrixExcel({
          orgId: orgId || undefined,
          month: monthForFetch,
          period,
          date: period === 'daily' ? day : undefined,
          userId,
          showFilial,
        });
      }
      message.success(
        t({ uz: 'Excel yuklandi', en: 'Excel downloaded', ru: 'Excel скачан' }),
      );
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Excel xato');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className={cn('space-y-3 min-w-0 max-w-full', className)}>
      {(title || embeddedControls) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {title ? <div className="min-w-0">{title}</div> : <div />}
          {embeddedControls ? (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Segmented<PlanPeriod>
                value={period}
                onChange={setPeriod}
                options={[
                  {
                    value: 'daily',
                    label: t({ uz: 'Kunlik', en: 'Daily', ru: 'День' }),
                  },
                  {
                    value: 'monthly',
                    label: t({ uz: 'Oylik', en: 'Monthly', ru: 'Мес.' }),
                  },
                  {
                    value: 'yearly',
                    label: t({ uz: 'Yillik', en: 'Yearly', ru: 'Год' }),
                  },
                ]}
              />
              {period === 'yearly' ? (
                <DatePicker
                  picker="year"
                  value={dayjs(`${year}-01-01`)}
                  onChange={(d) => d && setYear(d.format('YYYY'))}
                  allowClear={false}
                  className="w-[110px]"
                />
              ) : period === 'daily' ? (
                <DatePicker
                  value={dayjs(day)}
                  onChange={(d) => d && setDay(d.format('YYYY-MM-DD'))}
                  allowClear={false}
                  className="w-[150px]"
                />
              ) : (
                <DatePicker
                  picker="month"
                  value={dayjs(`${month}-01`)}
                  onChange={(d) => d && setMonth(d.format('YYYY-MM'))}
                  allowClear={false}
                  className="w-[140px]"
                />
              )}
              <Button
                type="primary"
                icon={<Download className="h-4 w-4" />}
                loading={exporting}
                onClick={() => void onExport()}
              >
                {t({ uz: 'Excel', en: 'Excel', ru: 'Excel' })}
              </Button>
            </div>
          ) : null}
        </div>
      )}

      {loading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : period === 'yearly' ? (
        <PlanMatrixTable
          data={yearMatrix}
          period="yearly"
          showFilial={showFilial}
          userId={userId}
          pageSize={pageSize}
          reportsHref={reportsHref}
        />
      ) : (
        <PlanMatrixTable
          data={planMatrix}
          period={period}
          highlightDate={period === 'daily' ? day : today}
          showFilial={showFilial}
          userId={userId}
          pageSize={pageSize}
          reportsHref={reportsHref}
        />
      )}
    </div>
  );
}

export const PlanResultsTable = withPlanResultsTable(PlanResultsTableInner);
