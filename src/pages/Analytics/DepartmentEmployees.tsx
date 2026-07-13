import { useParams } from 'react-router-dom';
import { User } from 'lucide-react';
import { Card, Skeleton, Table, Tag, Typography } from '@/components/ui';
import { useFetch } from '@/hooks/useFetch';
import { useTranslation } from '@/hooks/useTranslation';
import apiService from '@/services/api';
import type { EmployeeRankingRow } from '@/services/api';
import { AnalyticsFilters, useAnalyticsFilters } from './components/AnalyticsFilters';
import { BreadcrumbNav } from './components/BreadcrumbNav';
import { PercentBar } from './components/PercentBar';
import { StatusBadge } from './components/StatusBadge';
import { decodeDivision, formatNumber } from './analytics-utils';

const { Title, Text } = Typography;

export default function DepartmentEmployees() {
  const { orgId = '', division: divisionParam } = useParams();
  const { date, userId: userIdFilter } = useAnalyticsFilters();
  const { t } = useTranslation();
  const division = divisionParam ? decodeDivision(divisionParam) : undefined;

  const { data: divData } = useFetch(
    ['division-summary', orgId, date],
    () => apiService.getDivisionSummary({ orgId, date }),
    {
      orgId,
      orgName: '',
      planDate: date,
      dailyGoalCorrect: 10,
      totalEmployees: 0,
      plan: 0,
      completed: 0,
      percent: 0,
      divisions: [],
    },
    { enabled: !!orgId },
  );

  const { data, initialLoading } = useFetch(
    ['employee-ranking', orgId, date, division],
    () =>
      apiService.getEmployeeRanking({
        orgId,
        date,
        division: division ? encodeURIComponent(division) : undefined,
      }),
    {
      orgId,
      planDate: date,
      division: division ?? null,
      dailyGoalCorrect: 10,
      employees: [],
    },
    { enabled: !!orgId },
  );

  const filteredEmployees = userIdFilter
    ? data.employees.filter((e) => e.userId === userIdFilter)
    : data.employees;

  const columns = [
    {
      title: '#',
      dataIndex: 'rank',
      key: 'rank',
      fixed: 'left' as const,
      width: 56,
      align: 'center' as const,
    },
    {
      title: t({ uz: 'Xodim', en: 'Employee', ru: 'Сотрудник' }),
      dataIndex: 'fullName',
      key: 'fullName',
      fixed: 'left' as const,
      width: 260,
      ellipsis: true,
      render: (name: string) => (
        <span className="inline-flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          {name}
        </span>
      ),
    },
    {
      title: t({ uz: 'Natija', en: 'Result', ru: 'Результат' }),
      key: 'result',
      render: (_: unknown, row: EmployeeRankingRow) => (
        <span>
          {row.correct} / {row.goal}
        </span>
      ),
    },
    {
      title: t({ uz: 'Plandan tashqari', en: 'Beyond plan', ru: 'Сверх плана' }),
      key: 'extraCorrect',
      width: 130,
      render: (_: unknown, row: EmployeeRankingRow) =>
        (row.extraCorrect ?? 0) > 0 ? (
          <Tag color="purple">+{row.extraCorrect}</Tag>
        ) : (
          '—'
        ),
    },
    {
      title: '%',
      dataIndex: 'percent',
      key: 'percent',
      width: 160,
      render: (p: number, row: EmployeeRankingRow) => (
        <div className="space-y-1">
          <StatusBadge status={row.status} percent={p} />
          <PercentBar percent={p} status={row.status} height="sm" />
        </div>
      ),
    },
    {
      title: t({ uz: 'Holat', en: 'Status', ru: 'Статус' }),
      key: 'completed',
      render: (_: unknown, row: EmployeeRankingRow) =>
        row.completed ? (
          <Tag color="success">{t({ uz: 'Bajarildi', en: 'Done', ru: 'Выполнено' })}</Tag>
        ) : (
          <Tag color="warning">{t({ uz: 'Jarayonda', en: 'In progress', ru: 'В процессе' })}</Tag>
        ),
    },
  ];

  const crumbs = [
    { label: divData.orgName, to: `/dashboard/analytics/branches/${orgId}` },
    ...(division
      ? [{ label: division }]
      : [{ label: t({ uz: 'Barcha xodimlar', en: 'All employees', ru: 'Все сотрудники' }) }]),
  ];

  return (
    <div className="space-y-6">
      <BreadcrumbNav items={crumbs} />
      <AnalyticsFilters lockOrgId />

      <div>
        <Title level={4} className="!mb-1">
          {division ?? t({ uz: 'Xodimlar reytingi', en: 'Employee ranking', ru: 'Рейтинг сотрудников' })}
        </Title>
        <Text type="secondary">{data.planDate}</Text>
      </div>

      {initialLoading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : (
        <Card className="shadow-sm">
          <div className="flex flex-wrap gap-3 mb-4 text-sm">
            <span className="rounded-full bg-emerald-100 dark:bg-emerald-950 px-3 py-1">🟢 100%+</span>
            <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1">🟢 90–99%</span>
            <span className="rounded-full bg-amber-50 dark:bg-amber-950/50 px-3 py-1">🟡 70–89%</span>
            <span className="rounded-full bg-red-50 dark:bg-red-950/50 px-3 py-1">🔴 &lt;70%</span>
          </div>
          <Table
            rowKey="userId"
            columns={columns}
            dataSource={filteredEmployees}
            scroll={{ x: 'max-content' }}
            pagination={{ pageSize: 20, showSizeChanger: true, pageSizeOptions: [20, 50, 100] }}
          />
        </Card>
      )}
    </div>
  );
}
