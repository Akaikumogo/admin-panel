import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Building2,
  CalendarDays,
  Download,
  FileSpreadsheet,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import dayjs from 'dayjs';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Row,
  Select,
  Skeleton,
  Table,
  Tag,
  Typography,
} from '@/components/ui';
import { PageHeader } from '@/components/PageHeader';
import { useFetch } from '@/hooks/useFetch';
import { useTranslation } from '@/hooks/useTranslation';
import apiService from '@/services/api';
import type { AnalyticsStatus, DailyReport, MonthlyReport } from '@/services/api';
import { StatusBadge } from '@/pages/Analytics/components/StatusBadge';
import { PercentBar } from '@/pages/Analytics/components/PercentBar';
import { formatNumber, todayStr } from '@/pages/Analytics/analytics-utils';

const { Text, Title } = Typography;

type PlanMode = 'daily' | 'monthly';
type EmployeeFilter = 'all' | 'inactive' | 'completed' | 'extra';

const PIE_COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#6366f1'];

const emptyDaily: DailyReport = {
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
  branches: [],
  employees: [],
};

export default function ReportsPage() {
  const { t } = useTranslation();
  const [planMode, setPlanMode] = useState<PlanMode>('daily');
  const [date, setDate] = useState(todayStr());
  const [orgFilter, setOrgFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState<EmployeeFilter>('all');
  const [downloading, setDownloading] = useState(false);

  const month = date.slice(0, 7);

  const { data: organizations } = useFetch(
    ['reports-orgs'],
    () => apiService.getOrganizations(),
    [],
  );

  const { data: dailyReport, initialLoading: dailyLoading } = useFetch(
    ['daily-report', date],
    () => apiService.getDailyReport({ date }),
    emptyDaily,
    { enabled: planMode === 'daily' },
  );

  const { data: monthlyReport, initialLoading: monthlyLoading } = useFetch(
    ['monthly-report', month],
    () => apiService.getMonthlyReport({ month }),
    {
      month,
      daysInMonth: 30,
      dailyGoalCorrect: 10,
      branches: [],
      trend: [],
      employees: [],
    } as MonthlyReport,
    { enabled: planMode === 'monthly' },
  );

  const loading = planMode === 'daily' ? dailyLoading : monthlyLoading;

  const orgOptions = useMemo(
    () => organizations.map((o) => ({ value: o.id, label: o.name })),
    [organizations],
  );

  const branchChartData = useMemo(() => {
    if (planMode === 'daily') {
      const list = orgFilter
        ? dailyReport.branches.filter((b) => b.orgId === orgFilter)
        : dailyReport.branches;
      return list.map((b) => ({
        name: b.orgName.length > 18 ? `${b.orgName.slice(0, 16)}…` : b.orgName,
        percent: b.percent,
        extra: b.extraCorrect ?? 0,
      }));
    }
    const list = orgFilter
      ? monthlyReport.branches.filter((b) => b.orgId === orgFilter)
      : monthlyReport.branches;
    return list.map((b) => ({
      name: b.orgName.length > 18 ? `${b.orgName.slice(0, 16)}…` : b.orgName,
      percent: b.averageMonthlyPercent,
      extra: b.extraCorrectTotal,
    }));
  }, [planMode, dailyReport, monthlyReport, orgFilter]);

  const pieData = useMemo(() => {
    if (planMode !== 'daily') return [];
    const total = dailyReport.totalEmployees;
    const completed = dailyReport.completedEmployees;
    const active = Math.max(0, dailyReport.activeEmployees - completed);
    const inactive = Math.max(0, total - dailyReport.activeEmployees);
    return [
      {
        name: t({ uz: 'Plan bajardi', en: 'Plan done', ru: 'План выполнен' }),
        value: completed,
      },
      {
        name: t({ uz: 'Faol (jarayonda)', en: 'Active', ru: 'Активные' }),
        value: active,
      },
      {
        name: t({ uz: 'Natija yo‘q', en: 'No activity', ru: 'Без активности' }),
        value: inactive,
      },
    ].filter((d) => d.value > 0);
  }, [planMode, dailyReport, t]);

  const filteredEmployees = useMemo(() => {
    const list =
      planMode === 'daily'
        ? orgFilter
          ? dailyReport.employees.filter((e) => e.orgId === orgFilter)
          : dailyReport.employees
        : orgFilter
          ? monthlyReport.employees.filter((e) => e.orgId === orgFilter)
          : monthlyReport.employees;

    if (planMode === 'daily') {
      switch (employeeFilter) {
        case 'inactive':
          return list.filter((e) => e.answeredCount === 0);
        case 'completed':
          return list.filter((e) => e.completed);
        case 'extra':
          return list.filter((e) => e.extraCorrect > 0);
        default:
          return list;
      }
    }
    switch (employeeFilter) {
      case 'inactive':
        return list.filter((e) => e.daysCompleted === 0);
      case 'completed':
        return list.filter(
          (e) => e.monthlyPercent >= 100,
        );
      case 'extra':
        return list.filter((e) => e.extraCorrectTotal > 0);
      default:
        return list;
    }
  }, [
    planMode,
    dailyReport.employees,
    monthlyReport.employees,
    orgFilter,
    employeeFilter,
  ]);

  const branchTableData =
    planMode === 'daily'
      ? orgFilter
        ? dailyReport.branches.filter((b) => b.orgId === orgFilter)
        : dailyReport.branches
      : orgFilter
        ? monthlyReport.branches.filter((b) => b.orgId === orgFilter)
        : monthlyReport.branches;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      if (planMode === 'daily') {
        await apiService.downloadDailyReportExcel({
          date,
          filename: `kunlik-${date}.xlsx`,
        });
      } else {
        await apiService.downloadMonthlyReportExcel({
          month,
          filename: `oylik-${month}.xlsx`,
        });
      }
    } finally {
      setDownloading(false);
    }
  };

  const dailyColumns = [
    {
      title: t({ uz: 'Filial', en: 'Branch', ru: 'Филиал' }),
      dataIndex: 'orgName',
      key: 'orgName',
      ellipsis: true,
    },
    {
      title: t({ uz: 'F.I.O', en: 'Name', ru: 'Ф.И.О' }),
      dataIndex: 'fullName',
      key: 'fullName',
      ellipsis: true,
    },
    {
      title: t({ uz: 'Plan', en: 'Plan', ru: 'План' }),
      key: 'plan',
      width: 90,
      render: (_: unknown, row: DailyReport['employees'][number]) =>
        `${row.planCorrect}/10`,
    },
    {
      title: t({ uz: 'Plandan tashqari', en: 'Beyond plan', ru: 'Сверх плана' }),
      dataIndex: 'extraCorrect',
      key: 'extraCorrect',
      width: 130,
      render: (v: number) =>
        v > 0 ? (
          <Tag color="purple">+{v}</Tag>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: '%',
      dataIndex: 'percent',
      key: 'percent',
      width: 160,
      render: (p: number, row: DailyReport['employees'][number]) => (
        <StatusBadge status={row.status} percent={p} />
      ),
    },
    {
      title: t({ uz: 'Holat', en: 'Status', ru: 'Статус' }),
      key: 'status',
      width: 120,
      render: (_: unknown, row: DailyReport['employees'][number]) =>
        row.answeredCount === 0 ? (
          <Tag color="default">
            {t({ uz: 'Natija yo‘q', en: 'No activity', ru: 'Нет активности' })}
          </Tag>
        ) : row.completed ? (
          <Tag color="success">
            {t({ uz: 'Bajarildi', en: 'Done', ru: 'Выполнено' })}
          </Tag>
        ) : (
          <Tag color="processing">
            {t({ uz: 'Jarayonda', en: 'In progress', ru: 'В процессе' })}
          </Tag>
        ),
    },
  ];

  const monthlyColumns = [
    {
      title: t({ uz: 'Filial', en: 'Branch', ru: 'Филиал' }),
      dataIndex: 'orgName',
      key: 'orgName',
    },
    {
      title: t({ uz: 'F.I.O', en: 'Name', ru: 'Ф.И.О' }),
      dataIndex: 'fullName',
      key: 'fullName',
    },
    {
      title: t({ uz: 'Bajarilgan kunlar', en: 'Days done', ru: 'Дней' }),
      dataIndex: 'daysCompleted',
      key: 'daysCompleted',
      width: 120,
    },
    {
      title: t({ uz: 'Oylik %', en: 'Monthly %', ru: 'Месяц %' }),
      dataIndex: 'monthlyPercent',
      key: 'monthlyPercent',
      width: 140,
      render: (p: number) => {
        const status: AnalyticsStatus =
          p >= 90 ? 'green' : p >= 70 ? 'yellow' : 'red';
        return <StatusBadge status={status} percent={p} />;
      },
    },
    {
      title: t({ uz: 'Plandan tashqari', en: 'Beyond plan', ru: 'Сверх плана' }),
      dataIndex: 'extraCorrectTotal',
      key: 'extraCorrectTotal',
      width: 130,
      render: (v: number) =>
        v > 0 ? <Tag color="purple">+{v}</Tag> : <Text type="secondary">—</Text>,
    },
  ];

  const branchColumns =
    planMode === 'daily'
      ? [
          {
            title: '#',
            dataIndex: 'rank',
            key: 'rank',
            width: 56,
          },
          {
            title: t({ uz: 'Filial', en: 'Branch', ru: 'Филиал' }),
            dataIndex: 'orgName',
            key: 'orgName',
          },
          {
            title: t({ uz: 'Xodimlar', en: 'Employees', ru: 'Сотрудники' }),
            dataIndex: 'totalEmployees',
            key: 'totalEmployees',
          },
          {
            title: '%',
            dataIndex: 'percent',
            key: 'percent',
            render: (p: number, row: DailyReport['branches'][number]) => (
              <div className="space-y-1 min-w-[120px]">
                <StatusBadge status={row.status} percent={p} />
                <PercentBar percent={p} status={row.status} height="sm" />
              </div>
            ),
          },
          {
            title: t({ uz: 'Plandan tashqari', en: 'Beyond plan', ru: 'Сверх' }),
            dataIndex: 'extraCorrect',
            key: 'extraCorrect',
            render: (v: number) => (v > 0 ? `+${v}` : '—'),
          },
        ]
      : [
          {
            title: '#',
            dataIndex: 'rank',
            key: 'rank',
            width: 56,
          },
          {
            title: t({ uz: 'Filial', en: 'Branch', ru: 'Филиал' }),
            dataIndex: 'orgName',
            key: 'orgName',
          },
          {
            title: t({ uz: 'Oylik %', en: 'Monthly %', ru: 'Месяц %' }),
            dataIndex: 'averageMonthlyPercent',
            key: 'averageMonthlyPercent',
            render: (p: number) => {
              const status: AnalyticsStatus =
                p >= 90 ? 'green' : p >= 70 ? 'yellow' : 'red';
              return <StatusBadge status={status} percent={p} />;
            },
          },
          {
            title: t({ uz: 'Plandan tashqari', en: 'Beyond plan', ru: 'Сверх' }),
            dataIndex: 'extraCorrectTotal',
            key: 'extraCorrectTotal',
            render: (v: number) => (v > 0 ? `+${v}` : '—'),
          },
        ];

  return (
    <div>
      <PageHeader
        title={t({ uz: 'Hisobotlar', en: 'Reports', ru: 'Отчёты' })}
        description={t({
          uz: 'Kunlik va oylik natijalar, diagrammalar va Excel yuklab olish',
          en: 'Daily and monthly results, charts, and Excel export',
          ru: 'Дневные и месячные результаты, диаграммы и Excel',
        })}
      />

      <Card className="mb-6 !rounded-xl">
        <div className="flex flex-wrap items-center gap-3">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          {planMode === 'daily' ? (
            <DatePicker
              value={dayjs(date)}
              onChange={(d) => d && setDate(d.format('YYYY-MM-DD'))}
              allowClear={false}
              className="w-[150px]"
            />
          ) : (
            <DatePicker
              picker="month"
              value={dayjs(`${month}-01`)}
              onChange={(d) => d && setDate(d.format('YYYY-MM-DD'))}
              allowClear={false}
              className="w-[150px]"
            />
          )}
          <Select
            value={planMode}
            onChange={(v) => setPlanMode(v as PlanMode)}
            className="min-w-[140px]"
            options={[
              { value: 'daily', label: t({ uz: 'Kunlik', en: 'Daily', ru: 'День' }) },
              { value: 'monthly', label: t({ uz: 'Oylik', en: 'Monthly', ru: 'Месяц' }) },
            ]}
          />
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <Select
            allowClear
            showSearch
            placeholder={t({ uz: 'Barcha filiallar', en: 'All branches', ru: 'Все филиалы' })}
            value={orgFilter || undefined}
            onChange={(v) => setOrgFilter(v ?? '')}
            className="min-w-[200px]"
            options={orgOptions}
          />
          <Button
            type="primary"
            icon={<Download className="h-4 w-4" />}
            loading={downloading}
            onClick={handleDownload}
          >
            {planMode === 'daily'
              ? t({ uz: 'Kunlik Excel', en: 'Daily Excel', ru: 'День Excel' })
              : t({ uz: 'Oylik Excel', en: 'Monthly Excel', ru: 'Месяц Excel' })}
          </Button>
        </div>
      </Card>

      {loading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : (
        <>
          <Row gutter={[16, 16]} className="mb-6">
            {planMode === 'daily' ? (
              <>
                <Col xs={24} sm={12} lg={6}>
                  <Card className="!rounded-xl border-l-4 border-l-blue-500">
                    <div className="flex items-center gap-3">
                      <Users className="h-8 w-8 text-blue-500" />
                      <div>
                        <Text type="secondary" className="text-xs">
                          {t({ uz: 'Jami xodimlar', en: 'Total staff', ru: 'Всего' })}
                        </Text>
                        <Title level={3} className="!mb-0">
                          {formatNumber(dailyReport.totalEmployees)}
                        </Title>
                      </div>
                    </div>
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card className="!rounded-xl border-l-4 border-l-emerald-500">
                    <div className="flex items-center gap-3">
                      <Target className="h-8 w-8 text-emerald-500" />
                      <div>
                        <Text type="secondary" className="text-xs">
                          {t({ uz: 'Plan %', en: 'Plan %', ru: 'План %' })}
                        </Text>
                        <Title level={3} className="!mb-0">
                          {dailyReport.completionPercent}%
                        </Title>
                      </div>
                    </div>
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card className="!rounded-xl border-l-4 border-l-violet-500">
                    <div className="flex items-center gap-3">
                      <Sparkles className="h-8 w-8 text-violet-500" />
                      <div>
                        <Text type="secondary" className="text-xs">
                          {t({
                            uz: 'Plandan tashqari',
                            en: 'Beyond plan',
                            ru: 'Сверх плана',
                          })}
                        </Text>
                        <Title level={3} className="!mb-0">
                          +{formatNumber(dailyReport.extraCorrectTotal)}
                        </Title>
                      </div>
                    </div>
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card className="!rounded-xl border-l-4 border-l-amber-500">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="h-8 w-8 text-amber-500" />
                      <div>
                        <Text type="secondary" className="text-xs">
                          {t({
                            uz: 'Plan bajargan',
                            en: 'Plan completed',
                            ru: 'Выполнили план',
                          })}
                        </Text>
                        <Title level={3} className="!mb-0">
                          {dailyReport.completedEmployees}/{dailyReport.totalEmployees}
                        </Title>
                      </div>
                    </div>
                  </Card>
                </Col>
              </>
            ) : (
              <>
                <Col xs={24} sm={12} lg={8}>
                  <Card className="!rounded-xl border-l-4 border-l-blue-500">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-8 w-8 text-blue-500" />
                      <div>
                        <Text type="secondary" className="text-xs">
                          {t({ uz: 'Filiallar', en: 'Branches', ru: 'Филиалы' })}
                        </Text>
                        <Title level={3} className="!mb-0">
                          {monthlyReport.branches.length}
                        </Title>
                      </div>
                    </div>
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={8}>
                  <Card className="!rounded-xl border-l-4 border-l-emerald-500">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-8 w-8 text-emerald-500" />
                      <div>
                        <Text type="secondary" className="text-xs">
                          {t({ uz: 'Oy', en: 'Month', ru: 'Месяц' })}
                        </Text>
                        <Title level={3} className="!mb-0">
                          {monthlyReport.month}
                        </Title>
                      </div>
                    </div>
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={8}>
                  <Card className="!rounded-xl border-l-4 border-l-violet-500">
                    <div className="flex items-center gap-3">
                      <Sparkles className="h-8 w-8 text-violet-500" />
                      <div>
                        <Text type="secondary" className="text-xs">
                          {t({
                            uz: 'Plandan tashqari (jami)',
                            en: 'Beyond plan (total)',
                            ru: 'Сверх плана',
                          })}
                        </Text>
                        <Title level={3} className="!mb-0">
                          +
                          {formatNumber(
                            monthlyReport.branches.reduce(
                              (s, b) => s + b.extraCorrectTotal,
                              0,
                            ),
                          )}
                        </Title>
                      </div>
                    </div>
                  </Card>
                </Col>
              </>
            )}
          </Row>

          <Row gutter={[16, 16]} className="mb-6">
            <Col xs={24} lg={planMode === 'daily' ? 14 : 24}>
              <Card
                title={t({
                  uz: 'Filiallar bo‘yicha natija (%)',
                  en: 'Results by branch (%)',
                  ru: 'Результаты по филиалам (%)',
                })}
                className="!rounded-xl"
              >
                {branchChartData.length === 0 ? (
                  <Text type="secondary">
                    {t({ uz: 'Ma’lumot yo‘q', en: 'No data', ru: 'Нет данных' })}
                  </Text>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={branchChartData} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="name" angle={-30} textAnchor="end" height={70} interval={0} />
                      <YAxis domain={[0, 100]} />
                      <ChartTooltip />
                      <Legend />
                      <Bar
                        dataKey="percent"
                        name={t({ uz: 'Plan %', en: 'Plan %', ru: 'План %' })}
                        fill="#3b82f6"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </Col>
            {planMode === 'daily' && pieData.length > 0 && (
              <Col xs={24} lg={10}>
                <Card
                  title={t({
                    uz: 'Xodimlar holati',
                    en: 'Employee status',
                    ru: 'Статус сотрудников',
                  })}
                  className="!rounded-xl"
                >
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <ChartTooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>
              </Col>
            )}
          </Row>

          <Card
            title={t({ uz: 'Filiallar', en: 'Branches', ru: 'Филиалы' })}
            className="!rounded-xl mb-6"
          >
            <Table
              rowKey={planMode === 'daily' ? 'orgId' : 'orgId'}
              dataSource={branchTableData}
              columns={branchColumns}
              pagination={{ pageSize: 10 }}
              size="small"
            />
          </Card>

          <Card
            title={t({ uz: 'Xodimlar', en: 'Employees', ru: 'Сотрудники' })}
            className="!rounded-xl"
            extra={
              <Select
                value={employeeFilter}
                onChange={(v) => setEmployeeFilter(v as EmployeeFilter)}
                className="min-w-[180px]"
                options={[
                  { value: 'all', label: t({ uz: 'Barchasi', en: 'All', ru: 'Все' }) },
                  {
                    value: 'inactive',
                    label: t({
                      uz: 'Natija ko‘rsatmagan',
                      en: 'No activity',
                      ru: 'Без активности',
                    }),
                  },
                  {
                    value: 'completed',
                    label: t({
                      uz: 'Plan bajarilgan',
                      en: 'Plan done',
                      ru: 'План выполнен',
                    }),
                  },
                  {
                    value: 'extra',
                    label: t({
                      uz: 'Plandan tashqari bor',
                      en: 'Has extra',
                      ru: 'Сверх плана',
                    }),
                  },
                ]}
              />
            }
          >
            <Table
              rowKey="userId"
              dataSource={filteredEmployees}
              columns={planMode === 'daily' ? dailyColumns : monthlyColumns}
              pagination={{ pageSize: 15 }}
              size="small"
            />
          </Card>
        </>
      )}
    </div>
  );
}
