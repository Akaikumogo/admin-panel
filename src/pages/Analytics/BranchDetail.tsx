import { useNavigate, useParams } from 'react-router-dom';
import { Building2, ChevronRight, Users } from 'lucide-react';
import { Card, Col, Row, Skeleton, Typography } from '@/components/ui';
import { useFetch } from '@/hooks/useFetch';
import { useTranslation } from '@/hooks/useTranslation';
import apiService from '@/services/api';
import { AnalyticsFilters, useAnalyticsFilters } from './components/AnalyticsFilters';
import { BreadcrumbNav } from './components/BreadcrumbNav';
import { PercentBar } from './components/PercentBar';
import { StatusBadge } from './components/StatusBadge';
import {
  encodeDivision,
  formatNumber,
  statusTextColor,
} from './analytics-utils';

const { Title, Text } = Typography;

export default function BranchDetail() {
  const { orgId = '' } = useParams();
  const navigate = useNavigate();
  const { date } = useAnalyticsFilters();
  const { t } = useTranslation();

  const { data, initialLoading } = useFetch(
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

  if (!orgId) return null;

  return (
    <div className="space-y-6">
      <BreadcrumbNav items={[{ label: data.orgName || '...' }]} />
      <AnalyticsFilters lockOrgId showEmployeeFilter={false} />

      {initialLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : (
        <>
          <Card className="shadow-sm">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-primary/10 p-3">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <Title level={3} className="!mb-1">{data.orgName}</Title>
                <Text type="secondary">{data.planDate}</Text>
                <Row gutter={24} className="mt-4">
                  <Col>
                    <div className="text-sm text-muted-foreground">{t({ uz: 'Reja', en: 'Plan', ru: 'План' })}</div>
                    <div className="text-xl font-bold">{formatNumber(data.plan)}</div>
                  </Col>
                  <Col>
                    <div className="text-sm text-muted-foreground">{t({ uz: 'Bajarildi', en: 'Done', ru: 'Выполнено' })}</div>
                    <div className="text-xl font-bold">{formatNumber(data.completed)}</div>
                  </Col>
                  <Col>
                    <div className="text-sm text-muted-foreground">{t({ uz: 'Xodimlar', en: 'Employees', ru: 'Сотрудники' })}</div>
                    <div className="text-xl font-bold">{formatNumber(data.totalEmployees)}</div>
                  </Col>
                  <Col>
                    <div className="text-sm text-muted-foreground">%</div>
                    <div className={`text-xl font-bold ${statusTextColor(data.percent >= 90 ? 'green' : data.percent >= 70 ? 'yellow' : 'red')}`}>
                      {data.percent}%
                    </div>
                  </Col>
                </Row>
                <div className="mt-4">
                  <PercentBar
                    percent={data.percent}
                    status={data.percent >= 90 ? 'green' : data.percent >= 70 ? 'yellow' : 'red'}
                    height="lg"
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card
            title={t({ uz: 'Bo\'limlar', en: 'Departments', ru: 'Отделы' })}
            className="shadow-sm"
          >
            {data.divisions.length === 0 ? (
              <Text type="secondary">
                {t({ uz: 'Bo\'limlar topilmadi', en: 'No departments found', ru: 'Отделы не найдены' })}
              </Text>
            ) : (
              <div className="space-y-2">
                {data.divisions.map((d) => (
                  <button
                    key={d.division}
                    type="button"
                    className="w-full flex items-center gap-4 p-4 rounded-xl border hover:border-primary/50 hover:bg-muted/50 transition-all text-left"
                    onClick={() =>
                      navigate(
                        `/dashboard/analytics/branches/${orgId}/dept/${encodeDivision(d.division)}?date=${date}`,
                      )
                    }
                  >
                    <Users className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium truncate">{d.division}</span>
                        <StatusBadge status={d.status} percent={d.percent} />
                      </div>
                      <PercentBar percent={d.percent} status={d.status} height="sm" />
                      <div className="text-xs text-muted-foreground mt-1">
                        {d.totalEmployees} {t({ uz: 'xodim', en: 'employees', ru: 'сотрудников' })} ·{' '}
                        {formatNumber(d.completed)} / {formatNumber(d.plan)}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              className="mt-4 text-sm text-primary hover:underline"
              onClick={() => navigate(`/dashboard/analytics/branches/${orgId}/employees?date=${date}`)}
            >
              {t({ uz: 'Barcha xodimlarni ko\'rish', en: 'View all employees', ru: 'Все сотрудники' })}
            </button>
          </Card>
        </>
      )}
    </div>
  );
}
