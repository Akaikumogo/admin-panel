import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ClipboardCopy,
  Minus,
} from 'lucide-react';
import { domToBlob } from 'modern-screenshot';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button, Skeleton, Table, message } from '@/components/ui';
import { useFetch } from '@/hooks/useFetch';
import { useTranslation } from '@/hooks/useTranslation';
import apiService from '@/services/api';
import type { BranchRankingRow } from '@/services/api';
import { PageHeader } from '@/components/PageHeader';
import { cn } from '@/lib/utils';
import { AnalyticsFilters, useAnalyticsFilters } from './components/AnalyticsFilters';
import { PercentBar } from './components/PercentBar';
import { StatusBadge } from './components/StatusBadge';
import {
  estimateEodPercent,
  formatDelta,
  formatNumber,
  statusFromPercent,
  todayStr,
} from './analytics-utils';

const emptyDashboard = {
  planDate: todayStr(),
  dailyGoalCorrect: 10,
  totalPlan: 0,
  completedTotal: 0,
  extraCorrectTotal: 0,
  remaining: 0,
  completionPercent: 0,
  totalEmployees: 0,
  activeEmployees: 0,
  completedEmployees: 0,
  branchCount: 0,
};

function TrendChip({
  value,
  suffix = '',
  invert = false,
}: {
  value: number | null;
  suffix?: string;
  invert?: boolean;
}) {
  if (value === null || Number.isNaN(value)) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
        <Minus className="h-3 w-3" /> —
      </span>
    );
  }
  const up = invert ? value < 0 : value > 0;
  const down = invert ? value > 0 : value < 0;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums',
        up && 'text-emerald-600 dark:text-emerald-400',
        down && 'text-red-600 dark:text-red-400',
        !up && !down && 'text-muted-foreground',
      )}
    >
      {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : null}
      {down ? <ArrowDownRight className="h-3.5 w-3.5" /> : null}
      {!up && !down ? <Minus className="h-3 w-3" /> : null}
      {formatDelta(value, suffix)}
    </span>
  );
}

function KpiCard({
  label,
  value,
  hint,
  trend,
  trendSuffix,
}: {
  label: string;
  value: string;
  hint?: string;
  trend?: number | null;
  trendSuffix?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1.5 text-2xl font-bold tracking-tight tabular-nums text-foreground">
        {value}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {trend !== undefined ? <TrendChip value={trend ?? null} suffix={trendSuffix} /> : null}
        {hint ? <span className="text-[11px] text-muted-foreground">{hint}</span> : null}
      </div>
    </div>
  );
}

export default function ExecutiveDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { date, orgId, planType } = useAnalyticsFilters();
  const rankingSnapRef = useRef<HTMLDivElement>(null);
  const [copyingRank, setCopyingRank] = useState(false);

  const copyRankingSnapshot = async () => {
    const root = rankingSnapRef.current;
    if (!root) return;
    setCopyingRank(true);

    const restores: Array<() => void> = [];
    try {
      const prevMinW = root.style.minWidth;
      const prevPad = root.style.padding;
      const prevFont = root.style.fontSize;
      root.style.minWidth = '980px';
      root.style.padding = '8px';
      root.style.fontSize = '16px';
      root.classList.add('ranking-snap-hires');
      restores.push(() => {
        root.style.minWidth = prevMinW;
        root.style.padding = prevPad;
        root.style.fontSize = prevFont;
        root.classList.remove('ranking-snap-hires');
      });

      root.querySelectorAll<HTMLElement>('.overflow-auto').forEach((node) => {
        const prev = {
          maxHeight: node.style.maxHeight,
          height: node.style.height,
          overflow: node.style.overflow,
        };
        node.style.maxHeight = 'none';
        node.style.height = 'auto';
        node.style.overflow = 'visible';
        restores.push(() => {
          node.style.maxHeight = prev.maxHeight;
          node.style.height = prev.height;
          node.style.overflow = prev.overflow;
        });
      });

      // Jadvaldagi filter qatorini vaqtincha yashirish — Telegram uchun toza rasm
      root.querySelectorAll<HTMLElement>('thead tr').forEach((tr, idx) => {
        if (idx === 0) return;
        const prev = tr.style.display;
        tr.style.display = 'none';
        restores.push(() => {
          tr.style.display = prev;
        });
      });

      // Yozuvlarni kattalashtirish
      root.querySelectorAll<HTMLElement>('th, td, .text-sm, .text-xs').forEach((node) => {
        const prev = {
          fontSize: node.style.fontSize,
          lineHeight: node.style.lineHeight,
          padding: node.style.padding,
        };
        const isHead = node.tagName === 'TH';
        node.style.fontSize = isHead ? '15px' : '16px';
        node.style.lineHeight = '1.45';
        if (node.tagName === 'TD' || node.tagName === 'TH') {
          node.style.padding = '12px 14px';
        }
        restores.push(() => {
          node.style.fontSize = prev.fontSize;
          node.style.lineHeight = prev.lineHeight;
          node.style.padding = prev.padding;
        });
      });

      const isDark = document.documentElement.classList.contains('dark');
      const blob = await domToBlob(root, {
        scale: 3,
        backgroundColor: isDark ? '#0f172a' : '#ffffff',
        filter: (node) => {
          if (!(node instanceof HTMLElement)) return true;
          return node.dataset.snapshotIgnore !== '1';
        },
      });

      if (!blob) throw new Error('Snapshot yaratilmadi');

      if (!navigator.clipboard?.write) {
        throw new Error('Clipboard API qo‘llab-quvvatlanmaydi');
      }

      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': Promise.resolve(blob) }),
      ]);
      message.success(
        t({
          uz: 'Reyting rasmi nusxalandi — Telegramda Ctrl+V',
          en: 'Ranking image copied — paste in Telegram (Ctrl+V)',
          ru: 'Рейтинг скопирован — вставьте в Telegram (Ctrl+V)',
        }),
      );
    } catch (err) {
      console.error(err);
      message.error(
        t({
          uz: 'Rasmni nusxalab bo‘lmadi. HTTPS va ruxsatni tekshiring.',
          en: 'Could not copy image. Check HTTPS and permissions.',
          ru: 'Не удалось скопировать изображение.',
        }),
      );
    } finally {
      restores.forEach((fn) => fn());
      setCopyingRank(false);
    }
  };

  const { data: dashboard, initialLoading: dashLoading } = useFetch(
    ['executive-dashboard', date, planType],
    () => apiService.getExecutiveDashboard({ date }),
    emptyDashboard,
    { enabled: planType === 'daily' },
  );

  const { data: monthlyComparison, initialLoading: monthlyLoading } = useFetch(
    ['branch-comparison', date.slice(0, 7), planType],
    () => apiService.getBranchComparison({ month: date.slice(0, 7) }),
    { month: date.slice(0, 7), daysInMonth: 30, dailyGoalCorrect: 10, branches: [] },
    { enabled: planType === 'monthly' },
  );

  const { data: ranking, initialLoading: rankLoading } = useFetch(
    ['branch-ranking', date, planType],
    () =>
      planType === 'monthly'
        ? apiService.getBranchComparison({ month: date.slice(0, 7) }).then((m) => ({
            planDate: date,
            dailyGoalCorrect: m.dailyGoalCorrect,
            branches: m.branches.map((b) => ({
              orgId: b.orgId,
              orgName: b.orgName,
              isDefault: b.isDefault,
              totalEmployees: b.totalEmployees,
              plan: b.totalEmployees * m.dailyGoalCorrect * m.daysInMonth,
              completed: b.completedDays * m.dailyGoalCorrect,
              percent: b.averageMonthlyPercent,
              completedEmployees: 0,
              status: statusFromPercent(b.averageMonthlyPercent),
              rank: b.rank,
            })),
          }))
        : apiService.getBranchRanking({ date }),
    { planDate: date, dailyGoalCorrect: 10, branches: [] },
  );

  const { data: hourly } = useFetch(
    ['hourly-progress', date, orgId, planType],
    () => apiService.getHourlyProgress({ date, orgId: orgId || undefined }),
    { planDate: date, orgId: null, points: [], maxCompleted: 1 },
    { enabled: planType === 'daily' },
  );

  const { data: trend } = useFetch(
    ['daily-trend', date, orgId, planType],
    () => apiService.getDailyTrend({ to: date, orgId: orgId || undefined }),
    { dailyGoalCorrect: 10, points: [] },
    { enabled: planType === 'daily' },
  );

  const { data: under } = useFetch(
    ['underperformers', date, planType],
    () => apiService.getUnderperformers({ date, threshold: 70 }),
    {
      planDate: date,
      threshold: 70,
      branchCount: 0,
      divisionCount: 0,
      employeeCount: 0,
      branches: [],
    },
    { enabled: planType === 'daily' },
  );

  const filteredBranches = useMemo(() => {
    let list = ranking.branches.filter((b) => !b.isDefault);
    if (orgId) list = list.filter((b) => b.orgId === orgId);
    return list;
  }, [ranking.branches, orgId]);

  const rankingAllBranches = useMemo(
    () => [...filteredBranches].sort((a, b) => b.percent - a.percent || a.orgName.localeCompare(b.orgName)),
    [filteredBranches],
  );

  const trend7 = useMemo(() => trend.points.slice(-7), [trend.points]);

  const yesterdayPercent = useMemo(() => {
    if (trend.points.length < 2) return null;
    const prev = trend.points[trend.points.length - 2];
    return prev?.percent ?? null;
  }, [trend.points]);

  const percentDelta =
    yesterdayPercent === null ? null : Math.round((dashboard.completionPercent - yesterdayPercent) * 10) / 10;

  const currentHour = useMemo(() => {
    const pts = hourly.points;
    if (!pts.length) return new Date().getHours();
    // Oxirgi non-zero yoki oxirgi nuqta
    for (let i = pts.length - 1; i >= 0; i -= 1) {
      if ((pts[i]?.completedEmployees ?? 0) > 0) {
        return Number(String(pts[i].label).split(':')[0]) || new Date().getHours();
      }
    }
    return new Date().getHours();
  }, [hourly.points]);

  const eodForecast = useMemo(
    () => estimateEodPercent(dashboard.completionPercent, currentHour),
    [dashboard.completionPercent, currentHour],
  );

  const worstBranch = under.branches[0] ?? null;
  const bestBranch = rankingAllBranches[0] ?? null;

  const insightLine = useMemo(() => {
    if (planType !== 'daily') return null;
    const parts: string[] = [];
    if (percentDelta !== null) {
      parts.push(
        percentDelta >= 0
          ? t({
              uz: `Kechagidan ${formatDelta(percentDelta, '%')} yaxshi`,
              en: `${formatDelta(percentDelta, '%')} vs yesterday`,
              ru: `${formatDelta(percentDelta, '%')} к вчера`,
            })
          : t({
              uz: `Kechagidan ${formatDelta(percentDelta, '%')} past`,
              en: `${formatDelta(percentDelta, '%')} vs yesterday`,
              ru: `${formatDelta(percentDelta, '%')} к вчера`,
            }),
      );
    }
    if (worstBranch) {
      parts.push(
        t({
          uz: `Eng sust: ${'orgName' in worstBranch ? worstBranch.orgName : ''} (${'percent' in worstBranch ? worstBranch.percent : 0}%)`,
          en: `Weakest: ${'orgName' in worstBranch ? worstBranch.orgName : ''}`,
          ru: `Слабый: ${'orgName' in worstBranch ? worstBranch.orgName : ''}`,
        }),
      );
    }
    parts.push(
      t({
        uz: `Kun oxiri prognoz: ~${eodForecast}%`,
        en: `EOD forecast: ~${eodForecast}%`,
        ru: `Прогноз к концу дня: ~${eodForecast}%`,
      }),
    );
    return parts.join(' · ');
  }, [planType, percentDelta, worstBranch, eodForecast, t]);

  const branchColumns = [
    {
      title: '#',
      dataIndex: 'rank',
      key: 'rank',
      width: 56,
      render: (_: unknown, __: BranchRankingRow, i: number) => (
        <span className="text-base font-semibold tabular-nums text-muted-foreground">
          {i + 1}
        </span>
      ),
    },
    {
      title: t({ uz: 'Filial', en: 'Branch', ru: 'Филиал' }),
      dataIndex: 'orgName',
      key: 'orgName',
      ellipsis: true,
      render: (name: string, row: BranchRankingRow) => (
        <button
          type="button"
          className="text-left text-[15px] font-semibold transition-colors hover:text-primary"
          onClick={() => navigate(`/dashboard/analytics/branches/${row.orgId}?date=${date}`)}
        >
          {name}
        </button>
      ),
    },
    {
      title: '%',
      dataIndex: 'percent',
      key: 'percent',
      width: 220,
      render: (p: number, row: BranchRankingRow) => (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <StatusBadge status={row.status} percent={p} />
          </div>
          <PercentBar percent={p} status={row.status} height="md" />
        </div>
      ),
    },
  ];

  const loading = planType === 'monthly' ? monthlyLoading || rankLoading : dashLoading || rankLoading;

  const monthlyKpi = monthlyComparison.branches.length
    ? {
        totalEmployees: monthlyComparison.branches.reduce((s, b) => s + b.totalEmployees, 0),
        completionPercent:
          Math.round(
            (monthlyComparison.branches.reduce((s, b) => s + b.averageMonthlyPercent, 0) /
              monthlyComparison.branches.length) *
              10,
          ) / 10,
        branchCount: monthlyComparison.branches.length,
      }
    : null;

  return (
    <div className="min-h-full space-y-5">
      <PageHeader
        icon={Activity}
        title={t({ uz: 'Analitika', en: 'Analytics', ru: 'Аналитика' })}
        description={t({
          uz: 'Kunlik reja va filiallar reytingi',
          en: 'Daily plan and branch ranking',
          ru: 'Дневной план и рейтинг филиалов',
        })}
      />

      <div className="rounded-xl border border-border bg-card p-3">
        <AnalyticsFilters />
      </div>

      {loading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : (
        <>
          <section className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2 px-0.5">
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                {planType === 'daily'
                  ? t({ uz: 'Kunlik reja', en: 'Daily plan', ru: 'Дневной план' })
                  : t({ uz: 'Oylik ko‘rinish', en: 'Monthly view', ru: 'Месяц' })}
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {planType === 'daily' ? dashboard.planDate : date.slice(0, 7)}
                </span>
              </h2>
              {insightLine ? (
                <p className="max-w-xl text-right text-xs text-muted-foreground">
                  {insightLine}
                </p>
              ) : null}
            </div>

            {planType === 'daily' ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard
                  label={t({ uz: 'Bajarilish', en: 'Completion', ru: 'Выполнение' })}
                  value={`${dashboard.completionPercent}%`}
                  trend={percentDelta}
                  trendSuffix="%"
                  hint={t({ uz: 'kechagiga nisbatan', en: 'vs yesterday', ru: 'к вчера' })}
                />
                <KpiCard
                  label={t({ uz: 'Bajarildi', en: 'Completed', ru: 'Выполнено' })}
                  value={formatNumber(dashboard.completedTotal)}
                  hint={`${formatNumber(dashboard.completedEmployees)} ${t({ uz: 'xodim', en: 'employees', ru: 'сотр.' })}`}
                />
                <KpiCard
                  label={t({ uz: 'Qoldi', en: 'Remaining', ru: 'Осталось' })}
                  value={formatNumber(dashboard.remaining)}
                  hint={`~${eodForecast}% ${t({ uz: 'kun oxiri', en: 'EOD', ru: 'к концу дня' })}`}
                />
                <KpiCard
                  label={t({ uz: 'Umumiy reja', en: 'Total plan', ru: 'Общий план' })}
                  value={formatNumber(dashboard.totalPlan)}
                  hint={`${formatNumber(dashboard.branchCount)} ${t({ uz: 'filial', en: 'branches', ru: 'филиалов' })}`}
                />
              </div>
            ) : monthlyKpi ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <KpiCard
                  label={t({ uz: 'Xodimlar', en: 'Employees', ru: 'Сотрудники' })}
                  value={formatNumber(monthlyKpi.totalEmployees)}
                />
                <KpiCard
                  label={t({ uz: "O'rtacha oylik", en: 'Avg monthly', ru: 'Средний за месяц' })}
                  value={`${monthlyKpi.completionPercent}%`}
                />
                <KpiCard
                  label={t({ uz: 'Filiallar', en: 'Branches', ru: 'Филиалы' })}
                  value={formatNumber(monthlyKpi.branchCount)}
                />
              </div>
            ) : null}
          </section>

          {planType === 'daily' && (
            <button
              type="button"
              onClick={() => navigate(`/dashboard/analytics/underperformers?date=${date}`)}
              className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-left transition hover:bg-muted/40"
            >
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-semibold text-foreground">
                  {t({
                    uz: 'Rejani bajarmayotganlar',
                    en: 'Underperformers',
                    ru: 'Не выполняют план',
                  })}
                </span>
                <span className="text-xs text-muted-foreground">
                  {under.branchCount} {t({ uz: 'filial', en: 'branches', ru: 'фил.' })} ·{' '}
                  {formatNumber(under.employeeCount)}{' '}
                  {t({ uz: 'xodim', en: 'employees', ru: 'сотр.' })}
                </span>
              </div>
              {worstBranch ? (
                <span className="text-xs font-medium text-muted-foreground">
                  {t({ uz: 'Eng sust', en: 'Weakest', ru: 'Слабый' })}:{' '}
                  <span className="text-foreground">
                    {'orgName' in worstBranch ? worstBranch.orgName : '—'}
                  </span>{' '}
                  <span className="tabular-nums text-red-600">
                    {'percent' in worstBranch ? worstBranch.percent : 0}%
                  </span>
                </span>
              ) : null}
            </button>
          )}

          <section
            ref={rankingSnapRef}
            className="overflow-hidden rounded-xl border border-border bg-card"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
              <div>
                <div className="text-[15px] font-semibold tracking-tight">
                  {t({
                    uz: 'Filiallar reytingi',
                    en: 'Branch ranking',
                    ru: 'Рейтинг филиалов',
                  })}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {date}
                  {bestBranch
                    ? ` · ${t({ uz: 'Lider', en: 'Leader', ru: 'Лидер' })}: ${bestBranch.orgName} (${bestBranch.percent}%)`
                    : ''}
                </p>
              </div>
              <Button
                type="primary"
                size="small"
                data-snapshot-ignore="1"
                loading={copyingRank}
                icon={<ClipboardCopy size={14} />}
                onClick={() => void copyRankingSnapshot()}
                disabled={copyingRank || rankingAllBranches.length === 0}
              >
                {t({
                  uz: 'Rasmni nusxalash',
                  en: 'Copy image',
                  ru: 'Копировать фото',
                })}
              </Button>
            </div>
            <div className="p-3 md:p-4">
              <Table
                size="small"
                variant="flat"
                rowKey="orgId"
                columns={branchColumns}
                dataSource={rankingAllBranches}
                pagination={false}
              />
            </div>
          </section>

          {planType === 'daily' && (
            <section className="grid gap-4 lg:grid-cols-2">
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="border-b border-border px-4 py-3 text-sm font-semibold">
                  {t({
                    uz: 'Kun davomida (soatlik)',
                    en: 'Hourly progress',
                    ru: 'Почасовой прогресс',
                  })}
                </div>
                <div className="p-3 pt-4">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={hourly.points}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <ChartTooltip />
                      <Bar
                        dataKey="completedEmployees"
                        name={t({ uz: 'Xodimlar', en: 'Employees', ru: 'Сотрудники' })}
                        fill="var(--primary)"
                        radius={[3, 3, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="border-b border-border px-4 py-3 text-sm font-semibold">
                  {t({ uz: 'Oxirgi 7 kun', en: 'Last 7 days', ru: 'Последние 7 дней' })}
                </div>
                <div className="p-3 pt-4">
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={trend7}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v) => String(v).slice(5)}
                      />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <ChartTooltip formatter={(v: number) => [`${v}%`, '']} />
                      <Area
                        type="monotone"
                        dataKey="percent"
                        stroke="var(--primary)"
                        fill="var(--primary)"
                        fillOpacity={0.12}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
