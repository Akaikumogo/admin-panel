import { useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Building2, CalendarDays, Filter, Layers, Target, User } from 'lucide-react';
import { DatePicker, Select, Typography } from '@/components/ui';
import { useFetch } from '@/hooks/useFetch';
import { useTranslation } from '@/hooks/useTranslation';
import apiService from '@/services/api';
import { encodeDivision, todayStr } from '../analytics-utils';
import dayjs from 'dayjs';

export type PlanType = 'daily' | 'monthly';

export type AnalyticsFilterState = {
  date: string;
  orgId: string;
  division: string;
  userId: string;
  planType: PlanType;
};

function useFilterParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const patch = (updates: Partial<AnalyticsFilterState>) => {
    const next = new URLSearchParams(searchParams);
    const entries: [string, string | undefined][] = [
      ['date', updates.date],
      ['orgId', updates.orgId],
      ['division', updates.division],
      ['userId', updates.userId],
      ['planType', updates.planType],
    ];
    for (const [key, val] of entries) {
      if (val === undefined) continue;
      if (val) next.set(key, val);
      else next.delete(key);
    }
    setSearchParams(next, { replace: true });
  };

  return { searchParams, patch };
}

export function useAnalyticsFilters(): AnalyticsFilterState {
  const [searchParams] = useSearchParams();
  const { orgId: routeOrgId } = useParams();
  const planType = searchParams.get('planType');
  return {
    date: searchParams.get('date') || todayStr(),
    orgId: searchParams.get('orgId') || routeOrgId || '',
    division: searchParams.get('division') || '',
    userId: searchParams.get('userId') || '',
    planType: planType === 'monthly' ? 'monthly' : 'daily',
  };
}

export function useAnalyticsDate(): string {
  return useAnalyticsFilters().date;
}

export function useAnalyticsQueryString(): string {
  const [searchParams] = useSearchParams();
  const qs = searchParams.toString();
  return qs ? `?${qs}` : `?date=${todayStr()}`;
}

type Props = {
  showEmployeeFilter?: boolean;
  lockOrgId?: boolean;
};

export function AnalyticsFilters({ showEmployeeFilter = true, lockOrgId = false }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { orgId: routeOrgId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { patch } = useFilterParams();
  const filters = useAnalyticsFilters();

  const { data: organizations } = useFetch(
    ['analytics-orgs'],
    () => apiService.getOrganizations(),
    [],
  );

  const effectiveOrgId = lockOrgId && routeOrgId ? routeOrgId : filters.orgId;

  const { data: divisionData } = useFetch(
    ['analytics-divisions', effectiveOrgId, filters.date],
    () => apiService.getDivisionSummary({ orgId: effectiveOrgId, date: filters.date }),
    {
      orgId: effectiveOrgId,
      orgName: '',
      planDate: filters.date,
      dailyGoalCorrect: 10,
      totalEmployees: 0,
      plan: 0,
      completed: 0,
      percent: 0,
      divisions: [],
    },
    { enabled: !!effectiveOrgId },
  );

  const { data: employeeData } = useFetch(
    ['analytics-employees-filter', effectiveOrgId, filters.date, filters.division],
    () =>
      apiService.getEmployeeRanking({
        orgId: effectiveOrgId,
        date: filters.date,
        division: filters.division ? encodeURIComponent(filters.division) : undefined,
      }),
    {
      orgId: effectiveOrgId,
      planDate: filters.date,
      division: filters.division || null,
      dailyGoalCorrect: 10,
      employees: [],
    },
    { enabled: !!effectiveOrgId && showEmployeeFilter },
  );

  const divisionOptions = useMemo(
    () =>
      divisionData.divisions.map((d) => ({
        value: d.division,
        label: `${d.division} (${d.percent}%)`,
      })),
    [divisionData.divisions],
  );

  const orgOptions = useMemo(
    () => organizations.map((o) => ({ value: o.id, label: o.name })),
    [organizations],
  );

  const employeeOptions = useMemo(
    () =>
      employeeData.employees.map((e) => ({
        value: e.userId,
        label: `${e.fullName} — ${e.correct}/${e.goal}`,
      })),
    [employeeData.employees],
  );

  useEffect(() => {
    if (lockOrgId && routeOrgId && filters.orgId !== routeOrgId) {
      const next = new URLSearchParams(searchParams);
      next.set('orgId', routeOrgId);
      setSearchParams(next, { replace: true });
    }
  }, [lockOrgId, routeOrgId, filters.orgId, searchParams, setSearchParams]);

  const onOrgChange = (id: string) => {
    patch({ orgId: id, division: '', userId: '' });
    if (id) {
      navigate(`/dashboard/analytics/branches/${id}?date=${filters.date}&orgId=${id}&planType=${filters.planType}`);
    } else {
      navigate(`/dashboard/analytics?date=${filters.date}&planType=${filters.planType}`);
    }
  };

  const onDivisionChange = (division: string) => {
    patch({ division, userId: '' });
    if (division && effectiveOrgId) {
      navigate(
        `/dashboard/analytics/branches/${effectiveOrgId}/dept/${encodeDivision(division)}?date=${filters.date}&orgId=${effectiveOrgId}&division=${encodeURIComponent(division)}&planType=${filters.planType}`,
      );
    } else if (effectiveOrgId) {
      navigate(
        `/dashboard/analytics/branches/${effectiveOrgId}?date=${filters.date}&orgId=${effectiveOrgId}&planType=${filters.planType}`,
      );
    }
  };

  return (
    <div className="mb-6 p-4 rounded-xl border bg-card space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Filter className="h-4 w-4" />
        {t({ uz: 'Filtrlar', en: 'Filters', ru: 'Фильтры' })}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <Typography.Text className="text-sm">
            {t({ uz: 'Sana', en: 'Date', ru: 'Дата' })}
          </Typography.Text>
          <DatePicker
            value={dayjs(filters.date)}
            onChange={(d) => d && patch({ date: d.format('YYYY-MM-DD') })}
            allowClear={false}
            className="w-[150px]"
          />
        </div>

        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-muted-foreground" />
          <Typography.Text className="text-sm">
            {t({ uz: 'Reja turi', en: 'Plan type', ru: 'Тип плана' })}
          </Typography.Text>
          <Select
            value={filters.planType}
            onChange={(v) => patch({ planType: v as PlanType })}
            className="min-w-[140px]"
            options={[
              { value: 'daily', label: t({ uz: 'Kunlik reja', en: 'Daily plan', ru: 'Дневной план' }) },
              { value: 'monthly', label: t({ uz: 'Oylik reja', en: 'Monthly plan', ru: 'Месячный план' }) },
            ]}
          />
        </div>

        {!lockOrgId && (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <Typography.Text className="text-sm">
              {t({ uz: 'Filial', en: 'Branch', ru: 'Филиал' })}
            </Typography.Text>
            <Select
              allowClear
              showSearch
              placeholder={t({ uz: 'Barcha filiallar', en: 'All branches', ru: 'Все филиалы' })}
              value={filters.orgId || undefined}
              onChange={onOrgChange}
              className="min-w-[200px]"
              options={orgOptions}
            />
          </div>
        )}

        {effectiveOrgId && (
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <Typography.Text className="text-sm">
              {t({ uz: "Bo'lim", en: 'Department', ru: 'Отдел' })}
            </Typography.Text>
            <Select
              allowClear
              showSearch
              placeholder={t({ uz: "Barcha bo'limlar", en: 'All departments', ru: 'Все отделы' })}
              value={filters.division || undefined}
              onChange={onDivisionChange}
              className="min-w-[200px]"
              options={divisionOptions}
            />
          </div>
        )}

        {showEmployeeFilter && effectiveOrgId && (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <Typography.Text className="text-sm">
              {t({ uz: 'Xodim', en: 'Employee', ru: 'Сотрудник' })}
            </Typography.Text>
            <Select
              allowClear
              showSearch
              placeholder={t({ uz: 'Barcha xodimlar', en: 'All employees', ru: 'Все сотрудники' })}
              value={filters.userId || undefined}
              onChange={(userId) => patch({ userId })}
              className="min-w-[220px]"
              options={employeeOptions}
            />
          </div>
        )}
      </div>
    </div>
  );
}
