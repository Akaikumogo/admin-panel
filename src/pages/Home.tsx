import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Users,
  Activity,
  Building2,
  Layers,
  AlertTriangle,
  Home as HomeIcon,
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
  Wifi,
  Plus,
  BookOpen,
  Flame,
  Star,
  Upload,
  ChevronDown,
} from 'lucide-react';
import {
  Card,
  Button,
  Avatar,
  Skeleton,
  Table,
  Progress,
  Tooltip,
} from '@/components/ui';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useTranslation } from '@/hooks/useTranslation';
import { useFetch } from '@/hooks/useFetch';
import apiService from '@/services/api';
import type {
  DailyTrend,
  HomeOverview,
  LevelFunnelItem,
  QuestionError,
  UserProfile,
} from '@/services/api';
import { BranchActivityHeatmap } from './Home/BranchActivityHeatmap';
import { MiniSparkline } from './Home/MiniSparkline';
import { formatDelta, shortBranchName } from './Home/branchName';
import { PageHeader } from '@/components/PageHeader';
import { cn } from '@/lib/utils';

type KpiTone = {
  accent: string;
  spark: string;
  chip: string;
};

const FUNNEL_ICONS = [Star, Flame, BookOpen, Layers, Trophy];

function DeltaBadge({
  percent,
  invert = false,
}: {
  percent: number | null | undefined;
  invert?: boolean;
}) {
  const { text, up } = formatDelta(percent);
  if (up === null) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
        <Minus size={11} /> —
      </span>
    );
  }
  const good = invert ? !up : up;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums',
        good
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-rose-600 dark:text-rose-400',
      )}
    >
      <Icon size={11} strokeWidth={2.25} />
      {text}
    </span>
  );
}

function KpiCell({
  label,
  value,
  icon: Icon,
  loading,
  tone,
  sparkValues,
  deltaPercent,
  invertDelta,
  hint,
}: {
  label: string;
  value: number | string;
  icon: typeof Users;
  loading: boolean;
  tone: KpiTone;
  sparkValues?: number[];
  deltaPercent?: number | null;
  invertDelta?: boolean;
  hint?: string;
}) {
  return (
    <div className="relative px-3 py-3 sm:px-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </p>
        <span
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-md',
            tone.chip,
            tone.accent,
          )}
        >
          <Icon size={14} strokeWidth={1.75} />
        </span>
      </div>
      {loading ? (
        <Skeleton.Input active size="small" className="mt-2 !w-16" />
      ) : (
        <>
          <p
            className={cn(
              'mt-1.5 text-2xl font-semibold tracking-tight tabular-nums',
              tone.accent,
            )}
          >
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          <div className="mt-2 flex items-end justify-between gap-2">
            {hint ? (
              <span className="text-[11px] text-muted-foreground">{hint}</span>
            ) : (
              <DeltaBadge percent={deltaPercent} invert={invertDelta} />
            )}
            {sparkValues && sparkValues.length > 1 ? (
              <MiniSparkline values={sparkValues} stroke={tone.spark} />
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

function severityOf(rate: number): {
  label: string;
  color: string;
} {
  if (rate >= 50) return { label: 'Critical', color: 'text-rose-600 dark:text-rose-400' };
  if (rate >= 30) return { label: 'High', color: 'text-orange-600 dark:text-orange-400' };
  return { label: 'Medium', color: 'text-amber-600 dark:text-amber-400' };
}

export default function HomePage() {
  const { t } = useTranslation();

  const { data: me, refetch: refetchMe, initialLoading: meLoading } =
    useFetch<UserProfile | null>(['me'], () => apiService.me(), null);

  const orgIdForAnalytics = 'all';
  const ready = !!me;

  const { data: homeOverview, initialLoading: homeOverviewLoading } =
    useFetch<HomeOverview | null>(
      ['home-overview'],
      () => apiService.getHomeOverview(),
      null,
      { enabled: ready },
    );

  const { data: adminPing } = useFetch<{ message: string } | null>(
    ['admin-ping', me?.role],
    () => apiService.adminPing(),
    null,
    { enabled: me?.role === 'SUPERADMIN' },
  );

  const { data: summary, initialLoading: summaryLoading } =
    useFetch<AnalyticsSummary | null>(
      ['analytics-summary', orgIdForAnalytics],
      () => apiService.getAnalyticsSummary(orgIdForAnalytics),
      null,
      { enabled: ready },
    );

  const { data: funnel, initialLoading: funnelLoading } = useFetch<
    LevelFunnelItem[]
  >(
    ['level-funnel', orgIdForAnalytics],
    () => apiService.getLevelFunnel(orgIdForAnalytics),
    [] as LevelFunnelItem[],
    { enabled: ready },
  );

  const { data: errorQuestions, initialLoading: errorsLoading } = useFetch<
    QuestionError[]
  >(
    ['question-errors', orgIdForAnalytics],
    () => apiService.getQuestionErrors(orgIdForAnalytics),
    [] as QuestionError[],
    { enabled: ready },
  );

  const { data: dailyTrend } = useFetch<DailyTrend | null>(
    ['daily-trend-home'],
    () => apiService.getDailyTrend({ orgId: 'all' }),
    null,
    { enabled: ready },
  );

  const insight = homeOverview?.insight;
  const weekSpark = useMemo(() => {
    const rows = homeOverview?.branchHeatmap ?? [];
    if (!rows.length) return [] as number[];
    const weeks = rows[0]?.weeks ?? [];
    return weeks.map((_, i) =>
      rows.reduce((sum, r) => sum + (r.weeks[i]?.count ?? 0), 0),
    );
  }, [homeOverview?.branchHeatmap]);

  const planSpark = useMemo(
    () => (dailyTrend?.points ?? []).slice(-14).map((p) => p.percent),
    [dailyTrend?.points],
  );

  const weakModules = useMemo(() => {
    return (funnel ?? []).filter((item) => {
      if (item.totalStarted <= 0) return true;
      return item.totalCompleted / item.totalStarted < 0.25;
    }).length;
  }, [funnel]);

  const homeKpis = useMemo(() => {
    const tone = {
      primary: {
        accent: 'text-primary',
        spark: '#22786e',
        chip: 'bg-accent',
      } satisfies KpiTone,
      accent: {
        accent: 'text-accent-600 dark:text-accent-400',
        spark: '#2f9688',
        chip: 'bg-accent-100 dark:bg-accent-500/15',
      } satisfies KpiTone,
      rose: {
        accent: 'text-rose-700 dark:text-rose-400',
        spark: 'rgb(225 29 72)',
        chip: 'bg-rose-500/10',
      } satisfies KpiTone,
      amber: {
        accent: 'text-amber-700 dark:text-amber-400',
        spark: 'rgb(217 119 6)',
        chip: 'bg-amber-500/10',
      } satisfies KpiTone,
      zinc: {
        accent: 'text-zinc-700 dark:text-zinc-300',
        spark: '#71717a',
        chip: 'bg-zinc-100 dark:bg-zinc-800',
      } satisfies KpiTone,
    };

    return [
      {
        key: 'users',
        label: t({
          uz: 'Foydalanuvchilar',
          en: 'Users',
          ru: 'Пользователи',
        }),
        icon: Users,
        tone: tone.primary,
        loading: summaryLoading,
        value: summary?.totalUsers ?? 0,
        sparkValues: planSpark,
        deltaPercent: insight?.loginDeltaPercent ?? null,
      },
      {
        key: 'active',
        label: t({ uz: 'Faol (7 kun)', en: 'Active (7d)', ru: 'Активные (7д)' }),
        icon: Activity,
        tone: tone.accent,
        loading: summaryLoading || homeOverviewLoading,
        value: summary?.activeUsers7d ?? 0,
        sparkValues: weekSpark,
        deltaPercent: insight?.loginDeltaPercent ?? null,
      },
      {
        key: 'online',
        label: t({ uz: 'Online', en: 'Online', ru: 'Онлайн' }),
        icon: Wifi,
        tone: tone.accent,
        loading: homeOverviewLoading,
        value: insight?.onlineHint ?? 0,
        sparkValues: weekSpark.slice(-6),
        deltaPercent: null as number | null,
      },
      {
        key: 'errors',
        label: t({
          uz: 'Xato (30 kun)',
          en: 'Errors (30d)',
          ru: 'Ошибки (30д)',
        }),
        icon: AlertTriangle,
        tone: tone.rose,
        loading: homeOverviewLoading,
        value: insight?.errors30d ?? 0,
        sparkValues: weekSpark.slice(-6).map((v) => Math.max(0, v * 0.4)),
        deltaPercent: insight?.errorDeltaPercent ?? null,
        invertDelta: true,
      },
      {
        key: 'orgs',
        label: t({
          uz: 'Tashkilotlar',
          en: 'Organizations',
          ru: 'Организации',
        }),
        icon: Building2,
        tone: tone.zinc,
        loading: summaryLoading,
        value: summary?.totalOrganizations ?? 0,
        sparkValues: undefined as number[] | undefined,
        deltaPercent: null as number | null,
      },
      {
        key: 'attention',
        label: t({ uz: 'Diqqat', en: 'Attention', ru: 'Внимание' }),
        icon: Trophy,
        tone: tone.amber,
        loading: funnelLoading,
        value: weakModules,
        sparkValues: undefined as number[] | undefined,
        deltaPercent: null as number | null,
        hint: t({
          uz: 'past completion',
          en: 'low completion',
          ru: 'низкий completion',
        }),
      },
    ];
  }, [
    t,
    summary,
    summaryLoading,
    homeOverviewLoading,
    funnelLoading,
    insight,
    weekSpark,
    planSpark,
    weakModules,
  ]);

  const secondaryActions = [
    {
      to: '/dashboard/levels',
      label: t({ uz: 'Modul qo‘shish', en: 'Add module', ru: 'Добавить модуль' }),
      icon: Layers,
    },
    {
      to: '/dashboard/organizations',
      label: t({
        uz: 'Tashkilot',
        en: 'Organization',
        ru: 'Организация',
      }),
      icon: Building2,
    },
    {
      to: '/dashboard/import-export',
      label: t({ uz: 'Import / Export', en: 'Import / Export', ru: 'Импорт / Экспорт' }),
      icon: Upload,
    },
  ];

  const errorColumns = useMemo(
    () => [
      {
        title: t({ uz: 'Savol', en: 'Question', ru: 'Вопрос' }),
        dataIndex: 'prompt',
        key: 'prompt',
        ellipsis: true,
        width: '32%',
        filterable: true,
      },
      {
        title: t({ uz: 'Modul', en: 'Module', ru: 'Модуль' }),
        dataIndex: 'levelTitle',
        key: 'levelTitle',
        filterable: true,
      },
      {
        title: t({ uz: 'Nazariya', en: 'Theory', ru: 'Теория' }),
        dataIndex: 'theoryTitle',
        key: 'theoryTitle',
        filterable: true,
      },
      {
        title: t({ uz: 'Urinishlar', en: 'Attempts', ru: 'Попытки' }),
        dataIndex: 'totalAttempts',
        key: 'totalAttempts',
        width: 100,
        filterable: false,
        render: (v: number) => (
          <span className="tabular-nums">{v.toLocaleString()}</span>
        ),
      },
      {
        title: t({ uz: 'Xatolik %', en: 'Error %', ru: 'Ошибки %' }),
        dataIndex: 'errorRate',
        key: 'errorRate',
        width: 180,
        filterable: false,
        render: (val: number) => {
          const sev = severityOf(val);
          return (
            <div className="min-w-[140px] space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold tabular-nums">{val}%</span>
                <span className={cn('text-[10px] font-semibold uppercase', sev.color)}>
                  ● {sev.label}
                </span>
              </div>
              <Progress
                percent={val}
                size="small"
                showInfo={false}
                strokeColor={
                  val > 50
                    ? 'rgb(225 29 72)'
                    : val > 30
                      ? 'rgb(234 88 12)'
                      : 'rgb(5 150 105)'
                }
              />
            </div>
          );
        },
      },
    ],
    [t],
  );

  return (
    <div className="page-stack">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader
          icon={HomeIcon}
          title={t({
            uz: `Xush kelibsiz${me?.firstName ? `, ${me.firstName}` : ''}`,
            en: `Welcome${me?.firstName ? `, ${me.firstName}` : ''}`,
            ru: `Добро пожаловать${me?.firstName ? `, ${me.firstName}` : ''}`,
          })}
          description={t({
            uz: 'Bugungi holat — bitta KPI, bitta asosiy ish',
            en: 'Today’s status — one KPI row, one primary action',
            ru: 'Статус на сегодня — один KPI, одно главное действие',
          })}
          className="flex-1"
        />
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button type="primary" size="middle" asChild>
            <Link to="/dashboard/users" className="inline-flex items-center gap-1.5">
              <Plus size={15} strokeWidth={2} />
              {t({
                uz: 'Foydalanuvchi',
                en: 'Add user',
                ru: 'Пользователь',
              })}
            </Link>
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button type="default" size="middle" className="gap-1.5">
                {t({ uz: 'Yana', en: 'More', ru: 'Ещё' })}
                <ChevronDown size={14} />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-1.5">
              {secondaryActions.map((a) => (
                <Link
                  key={a.to}
                  to={a.to}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-foreground transition hover:bg-muted"
                >
                  <a.icon size={15} className="text-muted-foreground" />
                  {a.label}
                </Link>
              ))}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="surface overflow-hidden p-4 md:p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            {t({
              uz: 'Bugungi signal',
              en: 'Today’s signal',
              ru: 'Сигнал на сегодня',
            })}
          </p>
          <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {new Date().toLocaleDateString()}
          </p>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-3 lg:grid-cols-6">
          {homeKpis.map((kpi) => (
            <KpiCell
              key={kpi.key}
              label={kpi.label}
              icon={kpi.icon}
              tone={kpi.tone}
              loading={kpi.loading}
              value={kpi.value}
              sparkValues={kpi.sparkValues}
              deltaPercent={kpi.deltaPercent}
              invertDelta={'invertDelta' in kpi ? kpi.invertDelta : false}
              hint={'hint' in kpi ? kpi.hint : undefined}
            />
          ))}
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              {t({
                uz: 'Filial holati',
                en: 'Branch health',
                ru: 'Состояние филиалов',
              })}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t({
                uz: 'Faollik + xato — bir qarashda',
                en: 'Activity + errors at a glance',
                ru: 'Активность и ошибки одним взглядом',
              })}
            </p>
          </div>
          {homeOverview?.scopeLabel ? (
            <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
              {homeOverview.scopeLabel}
            </span>
          ) : null}
        </div>

        <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12 xl:gap-4">
          <div className="surface flex min-h-[340px] flex-col overflow-hidden p-4 md:p-5 xl:col-span-8">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Activity size={15} strokeWidth={1.75} className="text-primary" />
              {t({
                uz: 'Faollik (12 hafta)',
                en: 'Activity (12 weeks)',
                ru: 'Активность (12 недель)',
              })}
            </div>
            <div className="min-h-0 flex-1">
              {homeOverviewLoading ? (
                <Skeleton active paragraph={{ rows: 6 }} />
              ) : (
                <BranchActivityHeatmap
                  rows={homeOverview?.branchHeatmap ?? []}
                />
              )}
            </div>
          </div>

          <div className="flex min-h-[340px] flex-col gap-4 xl:col-span-4">
            <div className="surface shrink-0 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    {t({ uz: 'Siz', en: 'You', ru: 'Вы' })}
                  </p>
                  {meLoading ? (
                    <Skeleton active title={false} paragraph={{ rows: 2 }} />
                  ) : (
                    <>
                      <h2 className="mt-1 text-base font-semibold tracking-tight text-foreground">
                        {me?.firstName} {me?.lastName}
                      </h2>
                      <p className="text-sm text-muted-foreground">{me?.role}</p>
                    </>
                  )}
                </div>
                <Avatar
                  size={40}
                  className="!rounded-xl"
                  style={{ backgroundColor: 'var(--primary)' }}
                  icon={<ShieldCheck size={18} />}
                />
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
                <span className="text-[12px] text-muted-foreground">
                  {me?.role === 'SUPERADMIN'
                    ? adminPing?.message || 'API OK'
                    : t({
                        uz: 'Cheklangan ruxsat',
                        en: 'Limited access',
                        ru: 'Ограниченный доступ',
                      })}
                </span>
                {me?.role === 'SUPERADMIN' ? (
                  <button
                    type="button"
                    onClick={() => void refetchMe()}
                    className="text-[12px] font-medium text-primary hover:underline"
                  >
                    {t({ uz: 'Yangilash', en: 'Refresh', ru: 'Обновить' })}
                  </button>
                ) : null}
              </div>
            </div>

            <div className="surface flex min-h-0 flex-1 flex-col p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <AlertTriangle
                    size={15}
                    strokeWidth={1.75}
                    className="text-destructive"
                  />
                  {t({
                    uz: 'Xato top (30 kun)',
                    en: 'Error top (30d)',
                    ru: 'Топ ошибок (30д)',
                  })}
                </div>
                <Link
                  to="/dashboard/analytics"
                  className="text-[11px] font-medium text-primary hover:underline"
                >
                  {t({ uz: 'Barchasi', en: 'All', ru: 'Все' })}
                </Link>
              </div>
              {homeOverviewLoading ? (
                <Skeleton active paragraph={{ rows: 4 }} />
              ) : (homeOverview?.topErrorBranches?.length ?? 0) === 0 ? (
                <p className="py-2 text-sm text-muted-foreground">
                  {t({
                    uz: 'Maʼlumot yoʻq',
                    en: 'No data',
                    ru: 'Нет данных',
                  })}
                </p>
              ) : (
                <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
                  {(homeOverview?.topErrorBranches ?? []).map((row, idx) => {
                    const prev = row.previousValue ?? 0;
                    const deltaPct =
                      prev > 0
                        ? Math.round(((row.value - prev) / prev) * 1000) / 10
                        : row.value > 0
                          ? 100
                          : null;
                    const short = shortBranchName(row.orgName);
                    return (
                      <li
                        key={row.orgId}
                        className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                            #{idx + 1}
                          </span>
                          <Tooltip title={row.orgName}>
                            <p className="truncate text-sm font-semibold">
                              {row.isDefault ? (
                                <span className="mr-1 text-amber-500">★</span>
                              ) : null}
                              {short}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="block rounded-md bg-destructive/10 px-2 py-0.5 font-mono text-xs font-semibold tabular-nums text-destructive">
                            {row.value.toLocaleString()}
                          </span>
                          <div className="mt-1 flex justify-end">
                            <DeltaBadge percent={deltaPct} invert />
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>

      {(funnelLoading || (funnel?.length ?? 0) > 0) && (
        <section className="space-y-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              {t({
                uz: 'Kontent salomatligi',
                en: 'Content health',
                ru: 'Здоровье контента',
              })}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t({
                uz: 'Modul completion — pastlar diqqat talab qiladi',
                en: 'Module completion — lows need attention',
                ru: 'Completion модулей — низкие требуют внимания',
              })}
            </p>
          </div>
        <Card
          title={
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Layers
                size={15}
                strokeWidth={1.75}
                className="text-primary"
              />
              {t({
                uz: 'Modul funnel',
                en: 'Module funnel',
                ru: 'Воронка модулей',
              })}
            </span>
          }
        >
          {funnelLoading ? (
            <Skeleton active paragraph={{ rows: 4 }} />
          ) : (
            <div className="space-y-3">
              {funnel.map((item, idx) => {
                const pct =
                  item.totalStarted > 0
                    ? Math.round(
                        (item.totalCompleted / item.totalStarted) * 100,
                      )
                    : 0;
                const Icon = FUNNEL_ICONS[idx % FUNNEL_ICONS.length];
                return (
                  <div
                    key={item.levelId}
                    className="flex items-center gap-3 rounded-md px-1 py-1.5 hover:bg-muted/40"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-teal-500/10 text-teal-700 dark:text-teal-300">
                      <Icon size={15} strokeWidth={1.75} />
                    </span>
                    <div className="w-40 shrink-0 truncate text-sm font-medium text-foreground sm:w-52">
                      #{item.orderIndex + 1} {item.levelTitle}
                    </div>
                    <Progress
                      percent={pct}
                      size="small"
                      className="min-w-0 flex-1"
                      strokeColor="var(--primary)"
                    />
                    <div className="hidden w-36 shrink-0 text-right text-xs text-muted-foreground sm:block">
                      <div className="font-semibold tabular-nums text-foreground">
                        {item.totalStarted.toLocaleString()} users
                      </div>
                      <div className="tabular-nums">
                        {pct}% · {item.totalCompleted.toLocaleString()} done
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
        </section>
      )}

      {(errorsLoading || (errorQuestions?.length ?? 0) > 0) && (
        <Card
          title={
            <span className="flex items-center gap-2 text-sm font-semibold text-destructive">
              <AlertTriangle size={15} strokeWidth={1.75} />
              {t({
                uz: 'Eng ko‘p xato qilingan savollar',
                en: 'Most error-prone questions',
                ru: 'Вопросы с наибольшим числом ошибок',
              })}
            </span>
          }
        >
          {errorsLoading ? (
            <Skeleton active paragraph={{ rows: 4 }} />
          ) : (
            <Table
              dataSource={errorQuestions as unknown as Record<string, unknown>[]}
              columns={errorColumns}
              rowKey="questionId"
              pagination={false}
              size="small"
              scroll={{ y: 420 }}
              className="[&_tbody_tr:nth-child(even)]:bg-muted/25 [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10"
            />
          )}
        </Card>
      )}
    </div>
  );
}

