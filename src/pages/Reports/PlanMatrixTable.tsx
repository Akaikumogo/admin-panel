import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Table, Tag } from '@/components/ui';
import { useTranslation } from '@/hooks/useTranslation';
import type { MonthlyPlanMatrix, MonthlyPlanMatrixEmployee } from '@/services/api';
import { PercentBar } from '@/pages/Analytics/components/PercentBar';

type Props = {
  data: MonthlyPlanMatrix;
  loading?: boolean;
  /** Highlight this YYYY-MM-DD column (e.g. today). */
  highlightDate?: string;
  /** Show Filial column even for single-org matrices. */
  forceOrgColumn?: boolean;
  pageSize?: number;
  /** Link under title to full reports. */
  reportsHref?: string;
};

export function PlanMatrixTable({
  data,
  loading,
  highlightDate,
  forceOrgColumn,
  pageSize = 40,
  reportsHref,
}: Props) {
  const { t } = useTranslation();
  const showOrgCol = forceOrgColumn || !data.orgId;

  const columns = useMemo(() => {
    const dayCols = (data.days ?? []).map((d, idx) => ({
      title: `${d.slice(8, 10)}.${d.slice(5, 7)}`,
      key: d,
      width: 64,
      align: 'center' as const,
      onHeaderCell: () =>
        highlightDate && d === highlightDate
          ? { className: 'bg-sky-50 dark:bg-sky-950/30' }
          : {},
      render: (_: unknown, row: MonthlyPlanMatrixEmployee) => {
        const cell = row.dayResults[idx];
        if (!cell) return '—';
        const cls = cell.completed
          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
          : cell.planCorrect > 0
            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';
        return (
          <span
            className={`inline-block min-w-[2.5rem] rounded px-1 py-0.5 text-[11px] font-semibold tabular-nums ${cls}`}
          >
            {cell.label}
          </span>
        );
      },
    }));

    return [
      {
        title: '№',
        key: 'idx',
        width: 50,
        fixed: 'left' as const,
        render: (_: unknown, __: MonthlyPlanMatrixEmployee, i: number) => i + 1,
      },
      ...(showOrgCol
        ? [
            {
              title: t({ uz: 'Filial', en: 'Branch', ru: 'Филиал' }),
              dataIndex: 'orgName',
              key: 'orgName',
              width: 150,
              fixed: 'left' as const,
              ellipsis: true,
            },
          ]
        : []),
      {
        title: t({ uz: 'F.I.O', en: 'Name', ru: 'Ф.И.О' }),
        dataIndex: 'fullName',
        key: 'fullName',
        width: 170,
        fixed: 'left' as const,
        ellipsis: true,
      },
      ...dayCols,
      {
        title: t({
          uz: `Bajarilgan / ${data.daysInMonth}`,
          en: `Done / ${data.daysInMonth}`,
          ru: `Выполнено / ${data.daysInMonth}`,
        }),
        dataIndex: 'daysCompleted',
        key: 'daysCompleted',
        width: 110,
        fixed: 'right' as const,
        render: (v: number) => (
          <span className="font-semibold tabular-nums">
            {v}/{data.daysInMonth}
          </span>
        ),
      },
      {
        title: t({ uz: 'Oylik %', en: 'Monthly %', ru: 'Мес. %' }),
        dataIndex: 'monthlyPercent',
        key: 'monthlyPercent',
        width: 130,
        fixed: 'right' as const,
        render: (p: number) => <PercentBar percent={p} />,
      },
    ];
  }, [data.days, data.daysInMonth, showOrgCol, highlightDate, t]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Tag color="success">10/10</Tag>
          <Tag color="warning">1–9/10</Tag>
          <Tag>0/10</Tag>
          <span className="text-muted-foreground">
            {data.orgName || t({ uz: 'Barcha filiallar', en: 'All branches', ru: 'Все филиалы' })}
            {' · '}
            {data.month} · {data.totalEmployees}{' '}
            {t({ uz: 'xodim', en: 'staff', ru: 'сотрудников' })}
            {' · '}
            {data.averageMonthlyPercent}%
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
      <div className="overflow-x-auto">
        <Table
          rowKey={(r) => `${r.orgId ?? ''}-${r.userId}`}
          loading={loading}
          dataSource={data.employees}
          columns={columns}
          pagination={{ pageSize, showSizeChanger: true }}
          size="small"
          scroll={{
            x: Math.max(
              700,
              280 + (data.days?.length ?? 0) * 64 + (showOrgCol ? 150 : 0),
            ),
          }}
        />
      </div>
    </div>
  );
}
