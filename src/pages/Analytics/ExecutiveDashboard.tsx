import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
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
  Tooltip,
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
import type { BranchRankingRow } from '@/services/api';
import { AnalyticsFilters, useAnalyticsDate } from './components/AnalyticsFilters';
import { PercentBar } from './components/PercentBar';
import {
  formatNumber,
  statusEmoji,
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
  const date = useAnalyticsDate();

  const { data: dashboard, initialLoading: dashLoading } = useFetch(
    ['executive-dashboard', date],
    () => apiService.getExecutiveDashboard({ date }),
    emptyDashboard,
  );

  const { data: ranking, initialLoading: rankLoading } = useFetch(
    ['branch-ranking', date],
    () => apiService.getBranchRanking({ date }),
    { planDate: date, dailyGoalCorrect: 10, branches: [] },
  );

  const { data: hourly } = useFetch(
    ['hourly-progress', date],
    () => apiService.getHourlyProgress({ date }),
    { planDate: date, orgId: null, points: [], maxCompleted: 1 },
  );

  const { data: trend } = useFetch(
    ['daily-trend', date],
    () => apiService.getDailyTrend({ to: date }),
    { dailyGoalCorrect: 10, points: [] },
  );

  const { data: heatmap } = useFetch(
    ['weekday-heatmap', date],
    () => apiService.getWeekdayHeatmap({ to: date }),
    { weekdays: [], branches: [] },
  );

  const { data: under } = useFetch(
    ['underperformers', date],
    () => apiService.getUnderperformers({ date, threshold: 70 }),
    {
      planDate: date,
      threshold: 70,
      branchCount: 0,
      divisionCount: 0,
      employeeCount: 0,
      branches: [],
    },
  );

  const top10 = useMemo(() => ranking.branches.slice(0, 10), [ranking.branches]);
  const bottom5 = useMemo(
    () => [...ranking.branches].sort((a, b) => a.percent - b.percent).slice(0, 5),
    [ranking.branches],
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
          <div className="flex items-center justify-between text-sm">
            <span className={statusTextColor(row.status)}>
              {statusEmoji(row.status)} {p}%
            </span>
          </div>
          <PercentBar percent={p} status={row.status} height="sm" />
        </div>
      ),
    },
  ];

  const loading = dashLoading || rankLoading;

  return (
    <div className="space-y-6">
      <div>
        <Title level={3} className="!mb-1">
          {t({ uz: 'Analitika', en: 'Analytics', ru: 'Аналитика' })}
        </Title>
        <Text type="secondary">
          {t({
            uz: 'Kunlik reja — filial → bo\'lim → xodim',
            en: 'Daily plan — branch → department → employee',
            ru: 'Дневной план — филиал → отдел → сотрудник',
          })}
        </Text>
      </div>

      <AnalyticsFilters />

      {loading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : (
        <>
          <Card className="border-0 shadow-sm">
            <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Target className="h-4 w-4" />
              {t({ uz: 'Bugungi reja', en: "Today's plan", ru: 'План на сегодня' })} — {dashboard.planDate}
            </div>
            <Row gutter={[16, 16]}>
              {[
                {
                  icon: Target,
                  label: t({ uz: 'Umumiy reja', en: 'Total plan', ru: 'Общий план' }),
                  value: formatNumber(dashboard.totalPlan),
                  color: 'text-blue-600',
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
          </Card>

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
                  dataSource={ranking.branches}
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
                    <Tooltip />
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
                    <Tooltip formatter={(v: number) => [`${v}%`, '']} />
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

          <Card
            title={t({ uz: 'HeatMap — filial × hafta kuni', en: 'Heatmap — branch × weekday', ru: 'Тепловая карта' })}
            className="shadow-sm overflow-x-auto"
          >
            {heatmap.branches.length === 0 ? (
              <Text type="secondary">{t({ uz: 'Ma\'lumot yo\'q', en: 'No data', ru: 'Нет данных' })}</Text>
            ) : (
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr>
                    <th className="text-left p-2 font-medium">
                      {t({ uz: 'Filial', en: 'Branch', ru: 'Филиал' })}
                    </th>
                    {heatmap.weekdays.map((w) => (
                      <th key={w} className="p-2 text-center font-medium">{w}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatmap.branches.slice(0, 20).map((b) => (
                    <tr key={b.orgId} className="border-t">
                      <td className="p-2">
                        <button
                          type="button"
                          className="hover:text-primary text-left"
                          onClick={() => navigate(`/dashboard/analytics/branches/${b.orgId}?date=${date}`)}
                        >
                          {b.orgName}
                        </button>
                      </td>
                      {b.cells.map((c) => (
                        <td key={c.dow} className="p-2 text-center">
                          <Tag color={c.status === 'green' ? 'success' : c.status === 'yellow' ? 'warning' : 'error'}>
                            {statusEmoji(c.status)} {c.percent}%
                          </Tag>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
