import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  ClipboardCopy,
  Minus,
  Target,
  TrendingUp,
  Users,
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
import { Button, Card, Skeleton, Table, Tag, message } from '@/components/ui';
import { useFetch } from '@/hooks/useFetch';
import { useTranslation } from '@/hooks/useTranslation';
import apiService from '@/services/api';
import type { AnalyticsStatus, BranchRankingRow } from '@/services/api';
import { PageHeader } from '@/components/PageHeader';
import { cn } from '@/lib/utils';
import { AnalyticsFilters, useAnalyticsFilters } from './components/AnalyticsFilters';
import { BranchWeekdayHeatmap } from './components/BranchWeekdayHeatmap';
import { PercentBar } from './components/PercentBar';
import { StatusBadge } from './components/StatusBadge';
import {
  estimateEodPercent,
  formatDelta,
  formatNumber,
  statusFromPercent,
  statusSoftBg,
  statusTextColor,
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
  tone = 'neutral',
}: {
  label: string;
  value: string;
  hint?: string;
  trend?: number | null;
  trendSuffix?: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
}) {
  const toneClass =
    tone === 'success'
      ? 'from-emerald-500/10 to-transparent'
      : tone === 'warning'
        ? 'from-amber-500/10 to-transparent'
        : tone === 'danger'
          ? 'from-red-500/10 to-transparent'
          : tone === 'info'
            ? 'from-blue-500/10 to-transparent'
            : 'from-slate-500/5 to-transparent';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border/50 bg-white p-4 shadow-sm dark:bg-slate-950',
        'bg-gradient-to-br',
        toneClass,
      )}
    >
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1.5 text-2xl font-bold tracking-tight tabular-nums text-foreground sm:text-[28px]">
        {value}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {trend !== undefined ? <TrendChip value={trend ?? null} suffix={trendSuffix} /> : null}
        {hint ? <span className="text-[11px] text-muted-foreground">{hint}</span> : null}
      </div>
    </div>
  );
}

function RankBarRow({
  rank,
  name,
  percent,
  status,
  onClick,
  medal,
}: {
  rank: number;
  name: string;
  percent: number;
  status: AnalyticsStatus;
  onClick: () => void;
  medal?: boolean;
}) {
  const badge =
    medal && rank === 1 ? '🥇' : medal && rank === 2 ? '🥈' : medal && rank === 3 ? '🥉' : `${rank}`;

  return (
    <button type="button" onClick={onClick} className="group w-full text-left">
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="w-6 shrink-0 text-center text-sm font-semibold tabular-nums text-muted-foreground">
            {badge}
          </span>
          <span className="truncate text-sm font-medium text-foreground group-hover:text-blue-600">
            {name}
          </span>
        </div>
        <span className={cn('shrink-0 text-sm font-bold tabular-nums', statusTextColor(status))}>
          {percent}%
        </span>
      </div>
      <div className="ml-8">
        <PercentBar percent={percent} status={status} height="md" />
      </div>
    </button>
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

      const isDark = document.documentElement.classList.contains('dark');
      const blob = await domToBlob(root, {
        scale: 2,
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
        new ClipboardItem({ 'image/png': blob }),
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

  const { data: heatmap } = useFetch(
    ['weekday-heatmap', date, orgId],
    () => apiService.getWeekdayHeatmap({ to: date, orgId: orgId || undefined }),
    { weekdays: [], branches: [], rangeFrom: '', rangeTo: '' },
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

  const top10 = useMemo(() => filteredBranches.slice(0, 10), [filteredBranches]);
  const bottom5 = useMemo(
    () => [...filteredBranches].sort((a, b) => a.percent - b.percent).slice(0, 5),
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

  const worstBranch = under.branches[0] ?? bottom5[0] ?? null;
  const bestBranch = top10[0] ?? null;

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
      width: 48,
      render: (_: unknown, __: BranchRankingRow, i: number) => (
        <span className="text-muted-foreground tabular-nums">{i + 1}</span>
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
          className="text-left font-medium transition-colors hover:text-blue-600"
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
      width: 200,
      render: (p: number, row: BranchRankingRow) => (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <StatusBadge status={row.status} percent={p} />
          </div>
          <PercentBar percent={p} status={row.status} height="sm" />
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

  const overallStatus = statusFromPercent(dashboard.completionPercent);

  return (
    <div className="min-h-full space-y-5 rounded-2xl bg-slate-50/80 p-1 dark:bg-slate-950/40 sm:p-2">
      <PageHeader
        icon={Activity}
        title={t({ uz: 'Analitika', en: 'Analytics', ru: 'Аналитика' })}
        description={t({
          uz: 'Bugungi holat → muammo → filial → bo‘lim → xodim',
          en: 'Today → problem → branch → department → employee',
          ru: 'Сегодня → проблема → филиал → отдел → сотрудник',
        })}
      />

      <div className="rounded-xl border border-border/40 bg-white/80 p-3 shadow-sm dark:bg-slate-950/60">
        <AnalyticsFilters />
      </div>

      {loading ? (
        <Skeleton active paragraph={{ rows: 10 }} />
      ) : (
        <>
          {/* 1. Bugungi holat */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2 px-1">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-blue-600">
                  {t({ uz: 'Bugungi holat', en: "Today's pulse", ru: 'Сегодня' })}
                </div>
                <h2 className="text-lg font-semibold text-foreground">
                  {planType === 'daily'
                    ? t({ uz: 'Kunlik reja', en: 'Daily plan', ru: 'Дневной план' })
                    : t({ uz: 'Oylik ko‘rinish', en: 'Monthly view', ru: 'Месяц' })}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {planType === 'daily' ? dashboard.planDate : date.slice(0, 7)}
                  </span>
                </h2>
              </div>
              {insightLine ? (
                <p className="max-w-xl text-right text-xs leading-relaxed text-muted-foreground">
                  {insightLine}
                </p>
              ) : null}
            </div>

            {planType === 'daily' ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <KpiCard
                    label={t({ uz: 'Bajarilish', en: 'Completion', ru: 'Выполнение' })}
                    value={`${dashboard.completionPercent}%`}
                    trend={percentDelta}
                    trendSuffix="%"
                    hint={t({ uz: 'kechagiga nisbatan', en: 'vs yesterday', ru: 'к вчера' })}
                    tone={
                      overallStatus === 'green'
                        ? 'success'
                        : overallStatus === 'yellow'
                          ? 'warning'
                          : 'danger'
                    }
                  />
                  <KpiCard
                    label={t({ uz: 'Bajarildi', en: 'Completed', ru: 'Выполнено' })}
                    value={formatNumber(dashboard.completedTotal)}
                    hint={`${formatNumber(dashboard.completedEmployees)} ${t({ uz: 'xodim', en: 'employees', ru: 'сотр.' })}`}
                    tone="success"
                  />
                  <KpiCard
                    label={t({ uz: 'Qoldi', en: 'Remaining', ru: 'Осталось' })}
                    value={formatNumber(dashboard.remaining)}
                    hint={`${Math.max(0, 100 - dashboard.completionPercent).toFixed(1)}% ${t({ uz: 'reja', en: 'of plan', ru: 'плана' })}`}
                    tone="warning"
                  />
                  <KpiCard
                    label={t({ uz: 'Umumiy reja', en: 'Total plan', ru: 'Общий план' })}
                    value={formatNumber(dashboard.totalPlan)}
                    hint={`${formatNumber(dashboard.activeEmployees)} ${t({ uz: 'faol ·', en: 'active ·', ru: 'актив ·' })} ${formatNumber(dashboard.branchCount)} ${t({ uz: 'filial', en: 'branches', ru: 'филиалов' })}`}
                    tone="info"
                  />
                </div>

                <Card className="!border-border/40 !bg-white !shadow-sm dark:!bg-slate-950">
                  <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div className="text-sm font-semibold text-foreground">
                          {t({ uz: 'Umumiy progress', en: 'Overall progress', ru: 'Общий прогресс' })}
                        </div>
                        <div className="text-sm tabular-nums text-muted-foreground">
                          <span className="font-semibold text-foreground">
                            {formatNumber(dashboard.completedTotal)}
                          </span>
                          {' / '}
                          {formatNumber(dashboard.totalPlan)}
                        </div>
                      </div>
                      <PercentBar
                        percent={dashboard.completionPercent}
                        status={overallStatus}
                        height="xl"
                        showLabel
                        leftLabel={`${dashboard.completionPercent}%`}
                        rightLabel={`${formatNumber(dashboard.remaining)} ${t({ uz: 'qoldi', en: 'left', ru: 'осталось' })}`}
                      />
                    </div>
                    <div
                      className={cn(
                        'shrink-0 rounded-xl border px-4 py-3 text-center sm:min-w-[140px]',
                        statusSoftBg(statusFromPercent(eodForecast)),
                      )}
                    >
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {t({ uz: 'Kun oxiri prognoz', en: 'EOD forecast', ru: 'Прогноз' })}
                      </div>
                      <div className={cn('mt-1 text-2xl font-bold tabular-nums', statusTextColor(statusFromPercent(eodForecast)))}>
                        ~{eodForecast}%
                      </div>
                    </div>
                  </div>
                </Card>
              </>
            ) : monthlyKpi ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <KpiCard
                  label={t({ uz: 'Xodimlar', en: 'Employees', ru: 'Сотрудники' })}
                  value={formatNumber(monthlyKpi.totalEmployees)}
                />
                <KpiCard
                  label={t({ uz: "O'rtacha oylik", en: 'Avg monthly', ru: 'Средний за месяц' })}
                  value={`${monthlyKpi.completionPercent}%`}
                  tone={statusFromPercent(monthlyKpi.completionPercent) === 'green' ? 'success' : 'warning'}
                />
                <KpiCard
                  label={t({ uz: 'Filiallar', en: 'Branches', ru: 'Филиалы' })}
                  value={formatNumber(monthlyKpi.branchCount)}
                  tone="info"
                />
              </div>
            ) : null}
          </section>

          {/* 2. Muammo qayerda */}
          {planType === 'daily' && (
            <section className="space-y-3">
              <div className="px-1 text-[11px] font-semibold uppercase tracking-wider text-amber-600">
                {t({ uz: 'Muammo qayerda', en: 'Where it hurts', ru: 'Где проблема' })}
              </div>
              <button
                type="button"
                onClick={() => navigate(`/dashboard/analytics/underperformers?date=${date}`)}
                className="w-full rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 to-white p-5 text-left shadow-sm transition hover:border-amber-500/40 dark:to-slate-950"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-300">
                      <AlertTriangle className="h-5 w-5" />
                      {t({
                        uz: 'Rejani bajarmayotganlar',
                        en: 'Underperformers',
                        ru: 'Не выполняют план',
                      })}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-4 text-sm">
                      <span className="inline-flex items-center gap-1.5">
                        <Building2 className="h-4 w-4 text-amber-600" />
                        <strong className="tabular-nums">{under.branchCount}</strong>{' '}
                        {t({ uz: 'filial', en: 'branches', ru: 'филиалов' })}
                      </span>
                      <span>
                        <strong className="tabular-nums">{under.divisionCount}</strong>{' '}
                        {t({ uz: 'bo‘lim', en: 'departments', ru: 'отделов' })}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-amber-600" />
                        <strong className="tabular-nums">{formatNumber(under.employeeCount)}</strong>{' '}
                        {t({ uz: 'xodim', en: 'employees', ru: 'сотрудников' })}
                      </span>
                    </div>
                  </div>
                  {worstBranch ? (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-red-600">
                        {t({ uz: 'Eng yomon', en: 'Worst', ru: 'Худший' })}
                      </div>
                      <div className="mt-1 max-w-[220px] truncate text-sm font-semibold text-foreground">
                        {'orgName' in worstBranch ? worstBranch.orgName : '—'}
                      </div>
                      <div className="text-lg font-bold tabular-nums text-red-600">
                        {'percent' in worstBranch ? worstBranch.percent : 0}%
                      </div>
                    </div>
                  ) : null}
                </div>
              </button>
            </section>
          )}

          {/* 3. Filiallar */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-blue-600">
                {t({ uz: 'Filiallar', en: 'Branches', ru: 'Филиалы' })}
              </div>
              {bestBranch ? (
                <Tag className="!border-emerald-500/30 !bg-emerald-500/10 !text-emerald-700 dark:!text-emerald-300">
                  <TrendingUp className="mr-1 inline h-3.5 w-3.5" />
                  {t({ uz: 'Lider', en: 'Leader', ru: 'Лидер' })}: {bestBranch.orgName} · {bestBranch.percent}%
                </Tag>
              ) : null}
            </div>

            <div className="grid gap-4 xl:grid-cols-12">
              <Card className="!border-border/40 !bg-white !shadow-sm xl:col-span-7 dark:!bg-slate-950">
                <div className="border-b border-border/40 px-4 py-3 text-sm font-semibold">
                  {t({ uz: 'Top 10 filial', en: 'Top 10 branches', ru: 'Топ 10 филиалов' })}
                </div>
                <div className="space-y-4 p-4">
                  {top10.map((b, i) => (
                    <RankBarRow
                      key={b.orgId}
                      rank={i + 1}
                      name={b.orgName}
                      percent={b.percent}
                      status={b.status}
                      medal
                      onClick={() => navigate(`/dashboard/analytics/branches/${b.orgId}?date=${date}`)}
                    />
                  ))}
                </div>
              </Card>

              <Card className="!border-border/40 !bg-white !shadow-sm xl:col-span-5 dark:!bg-slate-950">
                <div className="border-b border-border/40 px-4 py-3 text-sm font-semibold text-red-600">
                  {t({ uz: 'Eng orqada', en: 'Bottom performers', ru: 'Отстающие' })}
                </div>
                <div className="space-y-4 p-4">
                  {bottom5.map((b, i) => (
                    <RankBarRow
                      key={b.orgId}
                      rank={i + 1}
                      name={b.orgName}
                      percent={b.percent}
                      status="red"
                      onClick={() => navigate(`/dashboard/analytics/branches/${b.orgId}?date=${date}`)}
                    />
                  ))}
                </div>
              </Card>
            </div>

            <div
              ref={rankingSnapRef}
              className="rounded-2xl border border-border/40 bg-white shadow-sm dark:bg-slate-950"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 px-4 py-3">
                <div>
                  <div className="text-sm font-semibold">
                    {t({
                      uz: 'Filiallar reytingi',
                      en: 'Branch ranking',
                      ru: 'Рейтинг филиалов',
                    })}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {date} ·{' '}
                    {t({
                      uz: 'Asosiy filialsiz · barcha filiallar',
                      en: 'Excluding main branch · all branches',
                      ru: 'Без головного · все филиалы',
                    })}
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
              <div className="p-2 md:p-3">
                <Table
                  size="middle"
                  rowKey="orgId"
                  columns={branchColumns}
                  dataSource={rankingAllBranches}
                  pagination={false}
                  scroll={{ y: 560 }}
                />
              </div>
            </div>
          </section>

          {/* 4. Trendlar */}
          {planType === 'daily' && (
            <section className="space-y-3">
              <div className="px-1 text-[11px] font-semibold uppercase tracking-wider text-blue-600">
                {t({ uz: 'Tempo va trend', en: 'Pace & trend', ru: 'Темп и тренд' })}
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="!border-border/40 !bg-white !shadow-sm dark:!bg-slate-950">
                  <div className="border-b border-border/40 px-4 py-3 text-sm font-semibold">
                    {t({
                      uz: 'Kun davomida (soatlik)',
                      en: 'Hourly progress',
                      ru: 'Почасовой прогресс',
                    })}
                  </div>
                  <div className="p-3 pt-4">
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={hourly.points}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <ChartTooltip />
                        <Bar
                          dataKey="completedEmployees"
                          name={t({ uz: 'Xodimlar', en: 'Employees', ru: 'Сотрудники' })}
                          fill="#2563EB"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="!border-border/40 !bg-white !shadow-sm dark:!bg-slate-950">
                  <div className="border-b border-border/40 px-4 py-3 text-sm font-semibold">
                    {t({ uz: 'Oxirgi 7 kun', en: 'Last 7 days', ru: 'Последние 7 дней' })}
                  </div>
                  <div className="p-3 pt-4">
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={trend7}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
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
                          stroke="#2563EB"
                          fill="#2563EB"
                          fillOpacity={0.12}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>

              <BranchWeekdayHeatmap data={heatmap} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
