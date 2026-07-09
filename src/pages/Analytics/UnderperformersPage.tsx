import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { Card, Skeleton, Typography } from '@/components/ui';
import { useFetch } from '@/hooks/useFetch';
import { useTranslation } from '@/hooks/useTranslation';
import apiService from '@/services/api';
import { AnalyticsFilters, useAnalyticsFilters } from './components/AnalyticsFilters';
import { BreadcrumbNav } from './components/BreadcrumbNav';
import { encodeDivision, formatNumber } from './analytics-utils';

const { Title, Text } = Typography;

export default function UnderperformersPage() {
  const { date } = useAnalyticsFilters();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data, initialLoading } = useFetch(
    ['underperformers-full', date],
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

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[{ label: t({ uz: 'Rejani bajarmayotganlar', en: 'Underperformers', ru: 'Не выполняют план' }) }]}
      />
      <AnalyticsFilters />

      <div className="flex items-center gap-3">
        <AlertTriangle className="h-6 w-6 text-amber-500" />
        <div>
          <Title level={4} className="!mb-0">
            {t({ uz: 'Rejani bajarmayotganlar', en: 'Underperformers', ru: 'Не выполняют план' })}
          </Title>
          <Text type="secondary">
            {data.planDate} · &lt; {data.threshold}%
          </Text>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: t({ uz: 'Filiallar', en: 'Branches', ru: 'Филиалы' }), value: data.branchCount },
          { label: t({ uz: 'Bo\'limlar', en: 'Departments', ru: 'Отделы' }), value: data.divisionCount },
          { label: t({ uz: 'Xodimlar', en: 'Employees', ru: 'Сотрудники' }), value: data.employeeCount },
        ].map((s) => (
          <Card key={s.label} className="text-center shadow-sm">
            <div className="text-3xl font-bold text-amber-600">{formatNumber(s.value)}</div>
            <div className="text-sm text-muted-foreground">{s.label}</div>
          </Card>
        ))}
      </div>

      {initialLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : data.branches.length === 0 ? (
        <Card>
          <Text type="secondary">
            {t({ uz: 'Barcha filiallar rejada', en: 'All branches on track', ru: 'Все филиалы в плане' })}
          </Text>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.branches.map((b) => (
            <Card key={b.orgId} className="shadow-sm">
              <button
                type="button"
                className="w-full flex items-center justify-between text-left mb-3"
                onClick={() => navigate(`/dashboard/analytics/branches/${b.orgId}?date=${date}`)}
              >
                <div>
                  <div className="font-semibold text-red-600 dark:text-red-400">{b.orgName}</div>
                  <div className="text-sm text-muted-foreground">{b.percent}%</div>
                </div>
                <ChevronRight className="h-5 w-5" />
              </button>
              {b.divisions.length > 0 && (
                <div className="space-y-2 border-t pt-3">
                  {b.divisions.map((d) => (
                    <button
                      key={d.division}
                      type="button"
                      className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted text-left text-sm"
                      onClick={() =>
                        navigate(
                          `/dashboard/analytics/branches/${b.orgId}/dept/${encodeDivision(d.division)}?date=${date}`,
                        )
                      }
                    >
                      <span>{d.division}</span>
                      <span className="text-red-500">{d.percent}% · {d.employees} xodim</span>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
