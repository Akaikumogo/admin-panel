import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Table, Tag, Tooltip } from '@/components/ui';
import { useTranslation } from '@/hooks/useTranslation';
import type {
  MonthlyPlanMatrix,
  MonthlyPlanMatrixEmployee,
  YearlyPlanMatrix,
  YearlyPlanMatrixEmployee,
} from '@/services/api';
import { PercentBar } from '@/pages/Analytics/components/PercentBar';
import { shortBranchName } from '@/pages/Home/branchName';

export type PlanPeriod = 'daily' | 'monthly' | 'yearly';

type Props = {
  data: MonthlyPlanMatrix | YearlyPlanMatrix;
  period?: PlanPeriod;
  loading?: boolean;
  /** Highlight this YYYY-MM-DD column (e.g. today). */
  highlightDate?: string;
  /** Show Filial column even for single-org matrices. */
  forceOrgColumn?: boolean;
  /** Hide Filial column (e.g. already inside a branch view). */
  hideOrgColumn?: boolean;
  pageSize?: number;
  /** Link under title to full reports. */
  reportsHref?: string;
  /** When set, only this employee's row(s) are shown. */
  userId?: string;
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

function isYearly(data: MonthlyPlanMatrix | YearlyPlanMatrix): data is YearlyPlanMatrix {
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

export function PlanMatrixTable({
  data,
  period = 'monthly',
  loading,
  highlightDate,
  forceOrgColumn,
  hideOrgColumn,
  pageSize = 40,
  reportsHref,
  userId,
}: Props) {
  const { t } = useTranslation();
  const yearly = isYearly(data);
  const showOrgCol =
    !hideOrgColumn && (forceOrgColumn || !data.orgId);

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

    const orgCol = showOrgCol
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
      return {
        title: `${d.slice(8, 10)}.${d.slice(5, 7)}`,
        key: d,
        width: 64,
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
            uz: `Reja: ${cell.label}\nUrinish: ${cell.attempts ?? 0} · Xato: ${cell.wrong ?? 0} · Plandan tashqari: ${cell.extraCorrect ?? Math.max(0, cell.rawCorrect - 10)}`,
            en: `Plan: ${cell.label}\nAttempts: ${cell.attempts ?? 0} · Errors: ${cell.wrong ?? 0} · Extra: ${cell.extraCorrect ?? Math.max(0, cell.rawCorrect - 10)}`,
            ru: `План: ${cell.label}\nПопытки: ${cell.attempts ?? 0} · Ошибки: ${cell.wrong ?? 0} · Сверх: ${cell.extraCorrect ?? Math.max(0, cell.rawCorrect - 10)}`,
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
  }, [data, period, showOrgCol, highlightDate, yearly, t]);

  const scrollX = useMemo(() => {
    if (yearly) {
      const yData = data as YearlyPlanMatrix;
      return Math.max(
        900,
        280 + (yData.months?.length ?? 0) * 88 + (showOrgCol ? 180 : 0) + 400,
      );
    }
    const mData = data as MonthlyPlanMatrix;
    const dayCount =
      period === 'daily' ? 1 : (mData.days?.length ?? 0);
    return Math.max(
      700,
      280 + dayCount * 64 + (showOrgCol ? 180 : 0) + 400,
    );
  }, [data, period, showOrgCol, yearly]);

  const metaLabel = yearly
    ? `${(data as YearlyPlanMatrix).year} · ${data.totalEmployees}`
    : `${(data as MonthlyPlanMatrix).month} · ${data.totalEmployees}`;

  const avgLabel = yearly
    ? `${(data as YearlyPlanMatrix).averageYearlyPercent}%`
    : `${(data as MonthlyPlanMatrix).averageMonthlyPercent}%`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs">
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
          <span className="text-muted-foreground">
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
            className="text-xs font-medium text-[var(--shell-rail)] hover:underline"
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
      />
    </div>
  );
}
