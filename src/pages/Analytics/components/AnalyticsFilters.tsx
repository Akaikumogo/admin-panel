import { CalendarDays, Building2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { DatePicker, Select, Typography } from '@/components/ui';
import { useTranslation } from '@/hooks/useTranslation';
import { todayStr } from '../analytics-utils';
import dayjs from 'dayjs';

type OrgOption = { id: string; name: string };

type Props = {
  organizations?: OrgOption[];
  showOrgFilter?: boolean;
};

export function AnalyticsFilters({ organizations = [], showOrgFilter = false }: Props) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const date = searchParams.get('date') || todayStr();
  const orgId = searchParams.get('orgId') || '';

  const setDate = (d: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('date', d);
    setSearchParams(next, { replace: true });
  };

  const setOrg = (id: string) => {
    const next = new URLSearchParams(searchParams);
    if (id) next.set('orgId', id);
    else next.delete('orgId');
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6 p-4 rounded-xl border bg-card">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <Typography.Text className="text-sm font-medium">
          {t({ uz: 'Sana', en: 'Date', ru: 'Дата' })}
        </Typography.Text>
        <DatePicker
          value={dayjs(date)}
          onChange={(d) => d && setDate(d.format('YYYY-MM-DD'))}
          allowClear={false}
          className="w-[160px]"
        />
      </div>

      {showOrgFilter && organizations.length > 0 && (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <Typography.Text className="text-sm font-medium">
            {t({ uz: 'Filial', en: 'Branch', ru: 'Филиал' })}
          </Typography.Text>
          <Select
            allowClear
            placeholder={t({ uz: 'Barcha filiallar', en: 'All branches', ru: 'Все филиалы' })}
            value={orgId || undefined}
            onChange={setOrg}
            className="min-w-[200px]"
            options={organizations.map((o) => ({ value: o.id, label: o.name }))}
          />
        </div>
      )}
    </div>
  );
}

export function useAnalyticsDate(): string {
  const [searchParams] = useSearchParams();
  return searchParams.get('date') || todayStr();
}
