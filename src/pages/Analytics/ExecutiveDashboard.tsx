import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Activity,
  Building2,
  CheckCircle2,
  Target,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';
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
import {
  Card,
  Col,
  Row,
  Skeleton,
  Table,
  Tag,
  Typography,
} from '@/components/ui';
import { useFetch } from '@/hooks/useFetch';
import { useTranslation } from '@/hooks/useTranslation';
import apiService from '@/services/api';
import type { BranchRankingRow, AnalyticsStatus } from '@/services/api';
import { PageHeader } from '@/components/PageHeader';
import { AnalyticsFilters, useAnalyticsFilters } from './components/AnalyticsFilters';
import { BranchWeekdayHeatmap } from './components/BranchWeekdayHeatmap';
import { PercentBar } from './components/PercentBar';
import { StatusBadge } from './components/StatusBadge';
import {
  formatNumber,
  statusTextColor,
  todayStr,
} from './analytics-utils';

const { Title, Text } = Typography;

const emptyDashboard = {
  planDate: todayStr(),
  dailyGoalCorrect: 10,
  totalPlan: 0,
  completedTotal: 0,
  remaining: 0,
  completionPercent: 0,
  totalEmployees: 0,
  activeEmployees: 0,
  completedEmployees: 0,
  branchCount: 0,
};

export default function ExecutiveDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { date, orgId, planType } = useAnalyticsFilters();

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
              status: (b.averageMonthlyPercent >= 90 ? 'green' : b.averageMonthlyPercent >= 70 ? 'yellow' : 'red') as AnalyticsStatus,
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
    () => apiService.getWeekdayHeatmap({ to: date }),
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
    let list = ranking.branches;
    if (orgId) list = list.filter((b) => b.orgId === orgId);
    return list;
  }, [ranking.branches, orgId]);

  const top10 = useMemo(() => filteredBranches.slice(0, 10), [filteredBranches]);
  const bottom5 = useMemo(
    () => [...filteredBranches].sort((a, b) => a.percent - b.percent).slice(0, 5),
    [filteredBranches],
  );

  const branchColumns = [
    {
      title: t({ uz: 'Filial', en: 'Branch', ru: 'Филиал' }),
      dataIndex: 'orgName',
      key: 'orgName',
      render: (name: string, row: BranchRankingRow) => (
        <button
          type="button"
          className="text-left font-medium hover:text-primary transition-colors"
          onClick={() => navigate(`/dashboard/analytics/branches/${row.orgId}?date=${date}`)}
        >
          {name}
        </button>
      ),
    },
    {
      title: t({ uz: 'Reja', en: 'Plan', ru: 'План' }),
      dataIndex: 'plan',
      key: 'plan',
      render: (v: number) => formatNumber(v),
    },
    {
      title: t({ uz: 'Bajarildi', en: 'Done', ru: 'Выполнено' }),
      dataIndex: 'completed',
      key: 'completed',
      render: (v: number) => formatNumber(v),
    },
    {
      title: '%',
      dataIndex: 'percent',
      key: 'percent',
      width: 180,
      render: (p: number, row: BranchRankingRow) => (
        <div className="space-y-1 min-w-[140px]">
          <StatusBadge status={row.status} percent={p} />
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

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Activity}
        title={t({ uz: 'Analitika', en: 'Analytics', ru: 'Аналитика' })}
        description={t({
          uz: 'Kunlik reja — filial → bo\'lim → xodim',
          en: 'Daily plan — branch → department → employee',
          ru: 'Дневной план — филиал → отдел → сотрудник',
        })}
      />

      <AnalyticsFilters />

      {loading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : (
        <>
          <Card className="border-0 shadow-sm">
            <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Target className="h-4 w-4" />
              {t({ uz: 'Bugungi reja', en: "Today's plan", ru: 'План на сегодня' })} — {dashboard.planDate}
              {planType === 'monthly' && ` · ${date.slice(0, 7)}`}
            </div>
            {planType === 'daily' ? (
            <>
            <Row gutter={[16, 16]}>
              {[
                {
                  icon: Target,
                  label: t({ uz: 'Umumiy reja', en: 'Total plan', ru: 'Общий план' }),
                  value: formatNumber(dashboard.totalPlan),
                  color: 'text-slate-600 dark:text-slate-300',
                },
                {
                  icon: CheckCircle2,
                  label: t({ uz: 'Bajarildi', en: 'Completed', ru: 'Выполнено' }),
                  value: formatNumber(dashboard.completedTotal),
                  color: 'text-emerald-600',
                },
                {
                  icon: TrendingUp,
                  label: t({ uz: 'Bajarilish', en: 'Completion', ru: 'Выполнение' }),
                  value: `${dashboard.completionPercent}%`,
                  color: 'text-violet-600',
                },
                {
                  icon: XCircle,
                  label: t({ uz: 'Qoldi', en: 'Remaining', ru: 'Осталось' }),
                  value: formatNumber(dashboard.remaining),
                  color: 'text-amber-600',
                },
                {
                  icon: Users,
                  label: t({ uz: 'Faol xodimlar', en: 'Active employees', ru: 'Активные' }),
                  value: formatNumber(dashboard.activeEmployees),
                  color: 'text-cyan-600',
                },
                {
                  icon: Building2,
                  label: t({ uz: 'Filiallar', en: 'Branches', ru: 'Филиалы' }),
                  value: formatNumber(dashboard.branchCount),
                  color: 'text-rose-600',
                },
              ].map((kpi) => (
                <Col xs={24} sm={12} lg={8} xl={4} key={kpi.label}>
                  <div className="rounded-xl border bg-background p-4 h-full">
                    <kpi.icon className={`h-5 w-5 mb-2 ${kpi.color}`} />
                    <div className="text-2xl font-bold">{kpi.value}</div>
                    <div className="text-xs text-muted-foreground mt-1">{kpi.label}</div>
                  </div>
                </Col>
              ))}
            </Row>

            <div className="mt-6">
              <div className="flex justify-between text-sm mb-2">
                <span>{t({ uz: 'Umumiy progress', en: 'Overall progress', ru: 'Общий прогресс' })}</span>
                <span className="font-semibold">{dashboard.completionPercent}%</span>
              </div>
              <PercentBar percent={dashboard.completionPercent} height="lg" />
            </div>
            </>
            ) : monthlyKpi ? (
              <Row gutter={[16, 16]} className="mt-2">
                <Col xs={24} sm={8}>
                  <div className="rounded-xl border bg-background p-4">
                    <div className="text-2xl font-bold">{formatNumber(monthlyKpi.totalEmployees)}</div>
                    <div className="text-xs text-muted-foreground">{t({ uz: 'Xodimlar', en: 'Employees', ru: 'Сотрудники' })}</div>
                  </div>
                </Col>
                <Col xs={24} sm={8}>
                  <div className="rounded-xl border bg-background p-4">
                    <div className="text-2xl font-bold">{monthlyKpi.completionPercent}%</div>
                    <div className="text-xs text-muted-foreground">{t({ uz: 'O\'rtacha oylik', en: 'Avg monthly', ru: 'Средний за месяц' })}</div>
                  </div>
                </Col>
                <Col xs={24} sm={8}>
                  <div className="rounded-xl border bg-background p-4">
                    <div className="text-2xl font-bold">{monthlyKpi.branchCount}</div>
                    <div className="text-xs text-muted-foreground">{t({ uz: 'Filiallar', en: 'Branches', ru: 'Филиалы' })}</div>
                  </div>
                </Col>
              </Row>
            ) : null}
          </Card>

          {planType === 'daily' && (
          <button
            type="button"
            onClick={() => navigate(`/dashboard/analytics/underperformers?date=${date}`)}
            className="w-full text-left rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold mb-2">
              <AlertTriangle className="h-5 w-5" />
              {t({ uz: 'Rejani bajarmayotganlar', en: 'Underperformers', ru: 'Не выполняют план' })}
            </div>
            <div className="flex flex-wrap gap-6 text-sm">
              <span>{under.branchCount} {t({ uz: 'ta filial', en: 'branches', ru: 'филиалов' })}</span>
              <span>{under.divisionCount} {t({ uz: 'ta bo\'lim', en: 'departments', ru: 'отделов' })}</span>
              <span>{formatNumber(under.employeeCount)} {t({ uz: 'ta xodim', en: 'employees', ru: 'сотрудников' })}</span>
            </div>
          </button>
          )}

          <Row gutter={[16, 16]}>
            <Col xs={24} xl={14}>
              <Card
                title={t({ uz: 'Filiallar reytingi', en: 'Branch ranking', ru: 'Рейтинг филиалов' })}
                className="shadow-sm"
              >
                <Table
                  size="small"
                  rowKey="orgId"
                  columns={branchColumns}
                  dataSource={filteredBranches}
                  pagination={{ pageSize: 10, showSizeChanger: true }}
                />
              </Card>
            </Col>
            <Col xs={24} xl={10}>
              <Card
                title={t({ uz: 'Top 10 filial', en: 'Top 10 branches', ru: 'Топ 10 филиалов' })}
                className="shadow-sm mb-4"
              >
                <div className="space-y-3">
                  {top10.map((b) => (
                    <button
                      key={b.orgId}
                      type="button"
                      className="w-full text-left"
                      onClick={() => navigate(`/dashboard/analytics/branches/${b.orgId}?date=${date}`)}
                    >
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium truncate pr-2">{b.orgName}</span>
                        <span className={statusTextColor(b.status)}>{b.percent}%</span>
                      </div>
                      <PercentBar percent={b.percent} status={b.status} height="sm" />
                    </button>
                  ))}
                </div>
              </Card>
              <Card
                title={t({ uz: 'Eng orqada', en: 'Bottom performers', ru: 'Отстающие' })}
                className="shadow-sm border-red-100 dark:border-red-900/40"
              >
                <div className="space-y-3">
                  {bottom5.map((b) => (
                    <button
                      key={b.orgId}
                      type="button"
                      className="w-full text-left"
                      onClick={() => navigate(`/dashboard/analytics/branches/${b.orgId}?date=${date}`)}
                    >
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-red-600 dark:text-red-400">{b.orgName}</span>
                        <span>{b.percent}%</span>
                      </div>
                      <PercentBar percent={b.percent} status="red" height="sm" />
                    </button>
                  ))}
                </div>
              </Card>
            </Col>
          </Row>

          {planType === 'daily' && (
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card
                title={t({ uz: 'Kun davomida bajarilish', en: 'Hourly progress', ru: 'Почасовой прогресс' })}
                className="shadow-sm"
              >
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={hourly.points}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <ChartTooltip />
                    <Bar dataKey="completedEmployees" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card
                title={t({ uz: 'Kunlik trend (30 kun)', en: 'Daily trend (30d)', ru: 'Тренд (30 дн.)' })}
                className="shadow-sm"
              >
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={trend.points}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => v.slice(5)}
                    />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <ChartTooltip formatter={(v: number) => [`${v}%`, '']} />
                    <Area
                      type="monotone"
                      dataKey="percent"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.15}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>
          )}

          {planType === 'daily' && <BranchWeekdayHeatmap data={heatmap} />}
        </>
      )}
    </div>
  );
}
