import { useMemo } from 'react';
import { Card, Input, Spin, Table, Tag } from '@/components/ui';
import type { ColumnsType } from '@/components/ui';
import { Building, Search } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useFetch } from '@/hooks/useFetch';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { useQueryParams } from '@/hooks/useQueryParams';
import apiService, { type NesDepartment } from '@/services/api';
import { PageHeader } from '@/components/PageHeader';
import { FilterBar } from '@/components/FilterBar';
import NoData from '@/components/NoData';

const nf = new Intl.NumberFormat('uz-UZ');
const QP_DEFAULTS = { search: undefined } as const;

export default function DepartmentsPage() {
  const { t } = useTranslation();
  const { params: qp, setParam } = useQueryParams<typeof QP_DEFAULTS>(QP_DEFAULTS);
  const search = useDebouncedSearch(qp.search, (val) =>
    setParam('search', val || undefined),
  );

  const { data, loading, initialLoading } = useFetch(
    ['nes-departments', qp.search],
    () => apiService.getNesDepartments({ search: qp.search || undefined }),
    { data: [] as NesDepartment[], total: 0 },
  );

  const columns: ColumnsType<NesDepartment> = useMemo(
    () => [
      {
        title: '#',
        width: 56,
        render: (_: unknown, __: NesDepartment, i: number) => i + 1,
      },
      {
        title: t({ uz: 'Bo‘lim', en: 'Department', ru: 'Отдел' }),
        dataIndex: 'name',
        key: 'name',
      },
      {
        title: t({ uz: 'Xodimlar', en: 'Employees', ru: 'Сотрудники' }),
        dataIndex: 'employeeCount',
        key: 'employeeCount',
        width: 120,
        render: (v: number) => nf.format(v ?? 0),
      },
      {
        title: t({ uz: 'Oxirgi sync', en: 'Last sync', ru: 'Последний sync' }),
        dataIndex: 'lastSyncedAt',
        key: 'lastSyncedAt',
        width: 180,
        render: (v: string | null) =>
          v ? new Date(v).toLocaleString() : '—',
      },
    ],
    [t],
  );

  if (initialLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-4 overflow-y-auto p-6 h-[calc(100vh-100px)]">
      <PageHeader
        title={t({ uz: 'Bo‘limlar', en: 'Departments', ru: 'Отделы' })}
        description={t({
          uz: 'Energo ID dan sinxronlangan bo‘limlar katalogi',
          en: 'Departments catalog synced from Energo ID',
          ru: 'Каталог отделов из Energo ID',
        })}
        icon={Building}
      />

      <FilterBar>
        <Input
          allowClear
          prefix={<Search size={14} />}
          placeholder={t({
            uz: 'Bo‘lim qidirish…',
            en: 'Search department…',
            ru: 'Поиск отдела…',
          })}
          value={search.value}
          onChange={(e) => search.onChange(e.target.value)}
          className="max-w-sm"
        />
        <Tag>Jami: {nf.format(data.total)}</Tag>
      </FilterBar>

      <Card className="!border-slate-200 dark:!border-slate-700/60">
        {data.data.length === 0 && !loading ? (
          <NoData
            text={t({
              uz: 'Bo‘limlar yo‘q — ENERGO ID sinxronlashni ishga tushiring',
              en: 'No departments — run ENERGO ID sync',
              ru: 'Нет отделов — запустите синхронизацию',
            })}
          />
        ) : (
          <Table
            rowKey="id"
            loading={loading}
            dataSource={data.data}
            columns={columns}
            pagination={{ pageSize: 50, showSizeChanger: true }}
            size="small"
          />
        )}
      </Card>
    </div>
  );
}
