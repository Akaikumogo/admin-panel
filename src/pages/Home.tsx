import { useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ShieldCheck,
  Users,
  Activity,
  Building2,
  Shield,
  Layers,
  HelpCircle,
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
  CalendarDays,
} from 'lucide-react';
import {
  Card,
  Button,
  Badge,
  Typography,
  Avatar,
  Skeleton,
  Table,
  Progress,
  Tooltip,
  Segmented,
  DatePicker,
} from '@/components/ui';
import { useTranslation } from '@/hooks/useTranslation';
import { useFetch } from '@/hooks/useFetch';
import apiService from '@/services/api';
import type {
  AnalyticsSummary,
  DailyTrend,
  HomeOverview,
  LevelFunnelItem,
  MonthlyPlanMatrix,
  QuestionError,
  UserProfile,
  YearlyPlanMatrix,
} from '@/services/api';
import { BranchActivityHeatmap } from './Home/BranchActivityHeatmap';
import { MiniSparkline } from './Home/MiniSparkline';
import { formatDelta, shortBranchName } from './Home/branchName';
import { PlanMatrixTable, type PlanPeriod } from './Reports/PlanMatrixTable';
import { PageHeader } from '@/components/PageHeader';
import { cn } from '@/lib/utils';
import { todayStr } from './Analytics/analytics-utils';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

type KpiTone = {
  accent: string;
  spark: string;
  chip: string;
};

const KPI_META: Array<{
  key: keyof Pick<
    AnalyticsSummary,
    | 'totalUsers'
    | 'activeUsers7d'
    | 'totalOrganizations'
    | 'totalModerators'
    | 'totalLevels'
    | 'totalQuestions'
  >;
  icon: typeof Users;
  tone: KpiTone;
}> = [
  {
    key: 'totalUsers',
    icon: Users,
    tone: {
      accent: 'text-cyan-600 dark:text-cyan-400',
      spark: 'rgb(8 145 178)',
      chip: 'bg-cyan-500/10',
    },
  },
  {
    key: 'activeUsers7d',
    icon: Activity,
    tone: {
      accent: 'text-blue-600 dark:text-blue-400',
      spark: 'rgb(37 99 235)',
      chip: 'bg-blue-500/10',
    },
  },
  {
    key: 'totalOrganizations',
    icon: Building2,
    tone: {
      accent: 'text-orange-600 dark:text-orange-400',
      spark: 'rgb(234 88 12)',
      chip: 'bg-orange-500/10',
    },
  },
  {
    key: 'totalModerators',
    icon: Shield,
    tone: {
      accent: 'text-violet-600 dark:text-violet-400',
      spark: 'rgb(124 58 237)',
      chip: 'bg-violet-500/10',
    },
  },
  {
    key: 'totalLevels',
    icon: Layers,
    tone: {
      accent: 'text-sky-600 dark:text-sky-400',
      spark: 'rgb(2 132 199)',
      chip: 'bg-sky-500/10',
    },
  },
  {
    key: 'totalQuestions',
    icon: HelpCircle,
    tone: {
      accent: 'text-emerald-600 dark:text-emerald-400',
      spark: 'rgb(5 150 105)',
      chip: 'bg-emerald-500/10',
    },
  },
];

const KPI_LABELS: Record<string, { uz: string; en: string; ru: string }> = {
  totalUsers: {
    uz: 'Foydalanuvchilar',
    en: 'Total users',
    ru: 'Пользователей',
  },
  activeUsers7d: { uz: 'Faol (7 kun)', en: 'Active (7d)', ru: 'Активные (7д)' },
  totalOrganizations: {
    uz: 'Tashkilotlar',
    en: 'Organizations',
    ru: 'Организации',
  },
  totalModerators: { uz: 'Moderatorlar', en: 'Moderators', ru: 'Модераторы' },
  totalLevels: { uz: 'Modullar', en: 'Modules', ru: 'Модули' },
  totalQuestions: { uz: 'Savollar', en: 'Questions', ru: 'Вопросы' },
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
}: {
  label: string;
  value: number | string;
  icon: typeof Users;
  loading: boolean;
  tone: KpiTone;
  sparkValues?: number[];
  deltaPercent?: number | null;
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
            <DeltaBadge percent={deltaPercent} />
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
    () => apiService.getDailyTrend({}),
    null,
    { enabled: ready },
  );

  const homeToday = todayStr();
  const [period, setPeriod] = useState<PlanPeriod>('monthly');
  const [month, setMonth] = useState(homeToday.slice(0, 7));
  const [year, setYear] = useState(homeToday.slice(0, 4));
  const [searchParams] = useSearchParams();
  const orgFilter = searchParams.get('orgId') ?? '';

  const emptyHomeMatrix: MonthlyPlanMatrix = {
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
  };

  const emptyYearMatrix: YearlyPlanMatrix = {
    orgId: '',
    orgName: '',
    year,
    months: [],
    dailyGoalCorrect: 10,
    totalEmployees: 0,
    averageYearlyPercent: 0,
    employees: [],
  };

  const { data: planMatrix, initialLoading: planMatrixLoading } =
    useFetch<MonthlyPlanMatrix>(
      ['home-plan-matrix', month, orgFilter],
      () =>
        apiService.getMonthlyPlanMatrix({
          month,
          orgId: orgFilter || undefined,
        }),
      emptyHomeMatrix,
      { enabled: ready && period !== 'yearly' },
    );

  const { data: yearMatrix, initialLoading: yearMatrixLoading } =
    useFetch<YearlyPlanMatrix>(
      ['home-year-matrix', year, orgFilter],
      () =>
        apiService.getYearlyPlanMatrix({
          year,
          orgId: orgFilter || undefined,
        }),
      emptyYearMatrix,
      { enabled: ready && period === 'yearly' },
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

  const quickActions = [
    {
      to: '/dashboard/users',
      label: t({ uz: '+ User', en: '+ User', ru: '+ User' }),
      icon: Plus,
    },
    {
      to: '/dashboard/levels',
      label: t({ uz: '+ Modul', en: '+ Module', ru: '+ Модуль' }),
      icon: Layers,
    },
    {
      to: '/dashboard/organizations',
      label: t({ uz: '+ Tashkilot', en: '+ Org', ru: '+ Орг.' }),
      icon: Building2,
    },
    {
      to: '/dashboard/import-export',
      label: t({ uz: 'Import', en: 'Import', ru: 'Импорт' }),
      icon: Upload,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <PageHeader
          icon={HomeIcon}
          title={t({
            uz: `Xush kelibsiz${me?.firstName ? `, ${me.firstName}` : ''}`,
            en: `Welcome${me?.firstName ? `, ${me.firstName}` : ''}`,
            ru: `Добро пожаловать${me?.firstName ? `, ${me.firstName}` : ''}`,
          })}
          description={t({
            uz: 'Bugungi holat — 5 soniyada tushunarli',
            en: 'Today’s status — clear in 5 seconds',
            ru: 'Статус на сегодня — понятно за 5 секунд',
          })}
        />
        <div className="flex flex-wrap gap-2 lg:pt-1">
          {quickActions.map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium shadow-sm transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <a.icon size={13} strokeWidth={2} />
              {a.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Story strip — "nima bo'lyapti?" */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <StoryTile
          loading={homeOverviewLoading || summaryLoading}
          icon={<Activity size={14} />}
          label={t({ uz: 'Faol foydalanuvchi', en: 'Active users', ru: 'Активные' })}
          value={(summary?.activeUsers7d ?? 0).toLocaleString()}
          hint={<DeltaBadge percent={insight?.loginDeltaPercent} />}
          tone="blue"
        />
        <StoryTile
          loading={homeOverviewLoading}
          icon={<AlertTriangle size={14} />}
          label={t({ uz: 'Yangi xato (30 kun)', en: 'Errors (30d)', ru: 'Ошибки (30д)' })}
          value={(insight?.errors30d ?? 0).toLocaleString()}
          hint={<DeltaBadge percent={insight?.errorDeltaPercent} invert />}
          tone="rose"
        />
        <StoryTile
          loading={homeOverviewLoading}
          icon={<Wifi size={14} />}
          label={t({ uz: 'Online', en: 'Online', ru: 'Онлайн' })}
          value={(insight?.onlineHint ?? 0).toLocaleString()}
          hint={t({ uz: 'hozir sessiyada', en: 'in session now', ru: 'сейчас в сессии' })}
          tone="cyan"
        />
      </div>

      {/* KPI — larger visual weight */}
      <Card className="!border-border !shadow-none">
        <div className="mb-1 flex items-center justify-between px-1">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {t({
              uz: 'Asosiy ko‘rsatkichlar',
              en: 'Core metrics',
              ru: 'Ключевые метрики',
            })}
          </p>
          <p className="text-[11px] tabular-nums text-muted-foreground">
            {new Date().toLocaleDateString()}
          </p>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-3 lg:grid-cols-6">
          {KPI_META.map(({ key, icon, tone }) => {
            const spark =
              key === 'activeUsers7d'
                ? weekSpark
                : key === 'totalUsers'
                  ? planSpark
                  : undefined;
            return (
              <KpiCell
                key={key}
                label={t(KPI_LABELS[key])}
                icon={icon}
                tone={tone}
                loading={summaryLoading}
                value={summary?.[key] ?? 0}
                sparkValues={spark}
                deltaPercent={
                  key === 'activeUsers7d' ? insight?.loginDeltaPercent : null
                }
              />
            );
          })}
        </div>
      </Card>

      <Card
        className="!border-border !shadow-none"
        title={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <CalendarDays
                size={15}
                strokeWidth={1.75}
                className="text-[var(--shell-rail)]"
              />
              {t({
                uz:
                  period === 'yearly'
                    ? 'Xodimlar — yillik reja'
                    : period === 'daily'
                      ? 'Xodimlar — kunlik reja'
                      : 'Xodimlar — oylik reja',
                en:
                  period === 'yearly'
                    ? 'Employees — yearly plan'
                    : period === 'daily'
                      ? 'Employees — daily plan'
                      : 'Employees — monthly plan',
                ru:
                  period === 'yearly'
                    ? 'Сотрудники — годовой план'
                    : period === 'daily'
                      ? 'Сотрудники — дневной план'
                      : 'Сотрудники — месячный план',
              })}
            </span>
            <div className="flex flex-wrap items-center gap-2">
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
              ) : (
                <DatePicker
                  picker="month"
                  value={dayjs(`${month}-01`)}
                  onChange={(d) => d && setMonth(d.format('YYYY-MM'))}
                  allowClear={false}
                  className="w-[140px]"
                />
              )}
            </div>
          </div>
        }
      >
        {period === 'yearly' ? (
          yearMatrixLoading ? (
            <Skeleton active paragraph={{ rows: 8 }} />
          ) : (
            <PlanMatrixTable
              data={yearMatrix}
              period="yearly"
              hideOrgColumn={Boolean(orgFilter)}
              reportsHref="/dashboard/reports"
              pageSize={30}
            />
          )
        ) : planMatrixLoading ? (
          <Skeleton active paragraph={{ rows: 8 }} />
        ) : (
          <PlanMatrixTable
            data={planMatrix}
            period={period}
            highlightDate={homeToday}
            hideOrgColumn={Boolean(orgFilter)}
            reportsHref={
              orgFilter
                ? `/dashboard/reports?orgId=${orgFilter}`
                : '/dashboard/reports'
            }
            pageSize={30}
          />
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card
          className="xl:col-span-8 !border-border !shadow-none min-h-[320px]"
          title={
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Activity
                size={15}
                strokeWidth={1.75}
                className="text-[var(--shell-rail)]"
              />
              {t({
                uz: 'Filial bo‘yicha faollik (12 hafta)',
                en: 'Branch activity (12 weeks)',
                ru: 'Активность филиалов (12 недель)',
              })}
            </span>
          }
          extra={
            <span className="text-xs text-muted-foreground">
              {homeOverview?.scopeLabel}
            </span>
          }
        >
          {homeOverviewLoading ? (
            <Skeleton active paragraph={{ rows: 6 }} />
          ) : (
            <BranchActivityHeatmap rows={homeOverview?.branchHeatmap ?? []} />
          )}
        </Card>

        <div className="xl:col-span-4 space-y-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  {t({ uz: 'Profil', ru: 'Профиль', en: 'Profile' })}
                </p>
                {meLoading ? (
                  <Skeleton active title={false} paragraph={{ rows: 2 }} />
                ) : (
                  <>
                    <Title level={4} className="!mb-0 !mt-1 !text-base">
                      {me?.firstName} {me?.lastName}
                    </Title>
                    <Text className="text-sm text-muted-foreground">
                      {me?.email} · {me?.role}
                    </Text>
                  </>
                )}
              </div>
              <Avatar
                size={44}
                className="!rounded-md"
                style={{ backgroundColor: 'var(--primary)' }}
                icon={<ShieldCheck size={20} />}
              />
            </div>
            <div className="mt-3 border-t border-border pt-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                {t({
                  uz: 'Ruxsat holati',
                  en: 'Permissions',
                  ru: 'Права доступа',
                })}
              </p>
              <div className="mt-2 flex items-center justify-between">
                <Badge
                  color="green"
                  text={
                    me?.role === 'SUPERADMIN'
                      ? adminPing?.message || 'OK'
                      : 'Limited'
                  }
                />
                {me?.role === 'SUPERADMIN' ? (
                  <Button type="primary" onClick={() => void refetchMe()}>
                    {t({ uz: 'Yangilash', ru: 'Обновить', en: 'Refresh' })}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <AlertTriangle
                size={15}
                strokeWidth={1.75}
                className="text-destructive"
              />
              {t({
                uz: 'Filial xatolari (30 kun)',
                en: 'Branch errors (30d)',
                ru: 'Ошибки филиалов (30д)',
              })}
            </div>
            {homeOverviewLoading ? (
              <Skeleton active paragraph={{ rows: 4 }} />
            ) : (homeOverview?.topErrorBranches?.length ?? 0) === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">
                {t({ uz: 'Maʼlumot yoʻq', en: 'No data', ru: 'Нет данных' })}
              </p>
            ) : (
              <ul className="divide-y divide-border">
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
                        <span className="text-[10px] tabular-nums text-muted-foreground">
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
                        <p className="text-[11px] text-muted-foreground">
                          {t({
                            uz: `Oldingi: ${prev.toLocaleString()}`,
                            en: `Prev: ${prev.toLocaleString()}`,
                            ru: `Было: ${prev.toLocaleString()}`,
                          })}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="block rounded bg-destructive/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-destructive">
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

      {(funnelLoading || (funnel?.length ?? 0) > 0) && (
        <Card
          title={
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Layers
                size={15}
                strokeWidth={1.75}
                className="text-[var(--shell-rail)]"
              />
              {t({
                uz: 'Modul funnel',
                en: 'Module funnel',
                ru: 'Воронка модулей',
              })}
            </span>
          }
          className="!border-border !shadow-none"
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
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300">
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
          className="!border-border !shadow-none"
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

function StoryTile({
  loading,
  icon,
  label,
  value,
  hint,
  tone,
  title,
  className,
}: {
  loading?: boolean;
  icon: ReactNode;
  label: string;
  value: string;
  hint?: ReactNode;
  tone: 'blue' | 'rose' | 'amber' | 'cyan';
  title?: string;
  className?: string;
}) {
  const toneMap = {
    blue: 'border-blue-500/20 bg-blue-500/[0.06] text-blue-700 dark:text-blue-300',
    rose: 'border-rose-500/20 bg-rose-500/[0.06] text-rose-700 dark:text-rose-300',
    amber:
      'border-amber-500/25 bg-amber-500/[0.07] text-amber-800 dark:text-amber-300',
    cyan: 'border-cyan-500/20 bg-cyan-500/[0.06] text-cyan-700 dark:text-cyan-300',
  };
  return (
    <div
      title={title}
      className={cn(
        'rounded-lg border px-3 py-3',
        toneMap[tone],
        className,
      )}
    >
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide opacity-80">
        {icon}
        {label}
      </div>
      {loading ? (
        <Skeleton.Input active size="small" className="mt-2 !w-20" />
      ) : (
        <>
          <p className="mt-1 truncate text-xl font-semibold tracking-tight text-foreground">
            {value}
          </p>
          {hint ? (
            <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>
          ) : null}
        </>
      )}
    </div>
  );
}
