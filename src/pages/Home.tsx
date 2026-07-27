import { useMemo } from 'react';
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
} from 'lucide-react';
import {
  Card,
  Button,
  Badge,
  Typography,
  Avatar,
  Skeleton,
  Table,
  Tag,
  Progress,
} from '@/components/ui';
import { useTranslation } from '@/hooks/useTranslation';
import { useFetch } from '@/hooks/useFetch';
import apiService from '@/services/api';
import type {
  AnalyticsSummary,
  HomeOverview,
  LevelFunnelItem,
  QuestionError,
  UserProfile,
} from '@/services/api';
import { BranchActivityHeatmap } from './Home/BranchActivityHeatmap';
import { PageHeader } from '@/components/PageHeader';
import { cn } from '@/lib/utils';

const { Title, Text } = Typography;

const KPI_META = [
  { key: 'totalUsers' as const, icon: Users },
  { key: 'activeUsers7d' as const, icon: Activity },
  { key: 'totalOrganizations' as const, icon: Building2 },
  { key: 'totalModerators' as const, icon: Shield },
  { key: 'totalLevels' as const, icon: Layers },
  { key: 'totalQuestions' as const, icon: HelpCircle },
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

function KpiCell({
  label,
  value,
  icon: Icon,
  loading,
}: {
  label: string;
  value: number | string;
  icon: typeof Users;
  loading: boolean;
}) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </p>
        <Icon
          size={15}
          strokeWidth={1.75}
          className="shrink-0 text-[var(--shell-rail)] opacity-80"
        />
      </div>
      {loading ? (
        <Skeleton.Input active size="small" className="mt-2 !w-16" />
      ) : (
        <p className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums text-foreground">
          {value}
        </p>
      )}
    </div>
  );
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

  const errorColumns = useMemo(
    () => [
      {
        title: t({ uz: 'Savol', en: 'Question', ru: 'Вопрос' }),
        dataIndex: 'prompt',
        key: 'prompt',
        ellipsis: true,
        width: '35%',
      },
      {
        title: t({ uz: 'Modul', en: 'Module', ru: 'Модуль' }),
        dataIndex: 'levelTitle',
        key: 'levelTitle',
      },
      {
        title: t({ uz: 'Nazariya', en: 'Theory', ru: 'Теория' }),
        dataIndex: 'theoryTitle',
        key: 'theoryTitle',
      },
      {
        title: t({ uz: 'Urinishlar', en: 'Attempts', ru: 'Попытки' }),
        dataIndex: 'totalAttempts',
        key: 'totalAttempts',
        width: 100,
        render: (v: number) => (
          <span className="tabular-nums">{v}</span>
        ),
      },
      {
        title: t({ uz: 'Xatolik %', en: 'Error %', ru: 'Ошибки %' }),
        dataIndex: 'errorRate',
        key: 'errorRate',
        width: 120,
        render: (val: number) => (
          <Tag color={val > 50 ? 'red' : val > 30 ? 'orange' : 'green'}>
            <span className="tabular-nums">{val}%</span>
          </Tag>
        ),
      },
    ],
    [t],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        icon={HomeIcon}
        title={t({
          uz: `Xush kelibsiz${me?.firstName ? `, ${me.firstName}` : ''}`,
          en: `Welcome${me?.firstName ? `, ${me.firstName}` : ''}`,
          ru: `Добро пожаловать${me?.firstName ? `, ${me.firstName}` : ''}`,
        })}
        description={t({
          uz: 'Operatsion holat: KPI, filial faolligi va xatolik markazlari',
          en: 'Operational status: KPIs, branch activity, and error hotspots',
          ru: 'Операционный статус: KPI, активность филиалов и зоны ошибок',
        })}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-8 !border-border !shadow-none">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {t({ uz: 'Asosiy ko‘rsatkichlar', en: 'Core metrics', ru: 'Ключевые метрики' })}
            </p>
            <p className="text-[11px] text-muted-foreground tabular-nums">
              {new Date().toLocaleDateString()}
            </p>
          </div>
          <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-3 lg:grid-cols-6">
            {KPI_META.map(({ key, icon }) => (
              <KpiCell
                key={key}
                label={t(KPI_LABELS[key])}
                icon={icon}
                loading={summaryLoading}
                value={summary?.[key] ?? 0}
              />
            ))}
          </div>
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
                    <Text className="text-muted-foreground text-sm">
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
                {t({ uz: 'Ruxsat holati', en: 'Permissions', ru: 'Права доступа' })}
              </p>
              <div className="mt-2 flex items-center justify-between">
                <Badge
                  color="green"
                  text={me?.role === 'SUPERADMIN' ? adminPing?.message || 'OK' : 'Limited'}
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
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
                <Building2 size={16} strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  {t({
                    uz: 'Eng aktiv filial (7 kun)',
                    en: 'Most active branch (7d)',
                    ru: 'Самый активный филиал (7д)',
                  })}
                </p>
                {homeOverviewLoading ? (
                  <Skeleton.Input active size="small" className="mt-2 !w-40" />
                ) : homeOverview?.mostActiveBranch ? (
                  <>
                    <p className="mt-1 text-sm font-semibold leading-snug text-foreground">
                      {homeOverview.mostActiveBranch.isDefault ? '★ ' : null}
                      {homeOverview.mostActiveBranch.orgName}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                      {homeOverview.mostActiveBranch.value} ta login
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t({ uz: 'Maʼlumot yoʻq', en: 'No data', ru: 'Нет данных' })}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card
          className="xl:col-span-8 !border-border !shadow-none"
          title={
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Activity size={15} strokeWidth={1.75} className="text-[var(--shell-rail)]" />
              {t({
                uz: 'Filial bo‘yicha faollik (12 hafta)',
                en: 'Branch activity (12 weeks)',
                ru: 'Активность филиалов (12 недель)',
              })}
            </span>
          }
          extra={<span className="text-xs text-muted-foreground">{homeOverview?.scopeLabel}</span>}
        >
          {homeOverviewLoading ? (
            <Skeleton active paragraph={{ rows: 6 }} />
          ) : (
            <BranchActivityHeatmap rows={homeOverview?.branchHeatmap ?? []} />
          )}
        </Card>

        <div className="xl:col-span-4 rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <AlertTriangle size={15} strokeWidth={1.75} className="text-destructive" />
            {t({ uz: 'Filial xatolari (30 kun)', en: 'Branch errors (30d)', ru: 'Ошибки филиалов (30д)' })}
          </div>
          {homeOverviewLoading ? (
            <Skeleton active paragraph={{ rows: 4 }} />
          ) : (homeOverview?.topErrorBranches?.length ?? 0) === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">
              {t({ uz: 'Maʼlumot yoʻq', en: 'No data', ru: 'Нет данных' })}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {(homeOverview?.topErrorBranches ?? []).map((row, idx) => (
                <li
                  key={row.orgId}
                  className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <span className="text-[10px] text-muted-foreground tabular-nums">#{idx + 1}</span>
                    <p className="truncate text-sm font-medium">
                      {row.isDefault ? (
                        <span className="mr-1 text-amber-600 dark:text-amber-400">★</span>
                      ) : null}
                      {row.orgName}
                    </p>
                  </div>
                  <span className="shrink-0 rounded bg-destructive/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-destructive">
                    {row.value}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {(funnelLoading || (funnel?.length ?? 0) > 0) && (
        <Card
          title={
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Layers size={15} strokeWidth={1.75} className="text-[var(--shell-rail)]" />
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
              {funnel.map((item) => {
                const pct =
                  item.totalStarted > 0
                    ? Math.round(
                        (item.totalCompleted / item.totalStarted) * 100,
                      )
                    : 0;
                return (
                  <div
                    key={item.levelId}
                    className="flex items-center gap-4"
                  >
                    <div className="w-48 truncate text-sm font-medium text-foreground">
                      #{item.orderIndex + 1} {item.levelTitle}
                    </div>
                    <Progress
                      percent={pct}
                      size="small"
                      className="flex-1"
                      strokeColor="var(--primary)"
                    />
                    <div
                      className={cn(
                        'w-28 text-right text-xs text-muted-foreground tabular-nums',
                      )}
                    >
                      {item.totalCompleted}/{item.totalStarted} ({pct}%)
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
              dataSource={errorQuestions}
              columns={errorColumns}
              rowKey="questionId"
              pagination={false}
              size="small"
            />
          )}
        </Card>
      )}
    </div>
  );
}
