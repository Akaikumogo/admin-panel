import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, GraduationCap, Search } from 'lucide-react';
import { Card, Input, Spin, Table, Tag } from '@/components/ui';
import type { ColumnsType } from '@/components/ui';
import { PageHeader } from '@/components/PageHeader';
import { FilterBar } from '@/components/FilterBar';
import NoData from '@/components/NoData';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { usePaginatedFetch } from '@/hooks/useFetch';
import { useQueryParams } from '@/hooks/useQueryParams';
import { useTranslation } from '@/hooks/useTranslation';
import apiService, { type TerminatedEmployee } from '@/services/api';

const nf = new Intl.NumberFormat('uz-UZ');
const QP_DEFAULTS = {
  search: undefined,
  page: undefined,
} as const;

export default function ArchiveEmployeesPage() {
  const { t } = useTranslation();
  const { params: qp, setParam, setParams } =
    useQueryParams<typeof QP_DEFAULTS>(QP_DEFAULTS);
  const currentPage = qp.page ? parseInt(qp.page, 10) : 1;
  const search = useDebouncedSearch(qp.search, (val) =>
    setParams({ search: val || undefined, page: undefined }),
  );

  const { data, total, loading, initialLoading } =
    usePaginatedFetch<TerminatedEmployee>(
      ['archive-employees', qp.search, currentPage],
      () =>
        apiService.getTerminatedEmployees({
          search: qp.search || undefined,
          page: currentPage,
          limit: 20,
        }),
    );

  const columns: ColumnsType<TerminatedEmployee> = useMemo(
    () => [
      {
        title: '#',
        width: 56,
        render: (_: unknown, __: TerminatedEmployee, i: number) =>
          (currentPage - 1) * 20 + i + 1,
      },
      {
        title: t({ uz: 'Xodim', en: 'Employee', ru: 'Сотрудник' }),
        key: 'name',
        render: (_: unknown, r: TerminatedEmployee) => (
          <div>
            <div className="font-medium text-foreground">
              {[r.lastName, r.firstName].filter(Boolean).join(' ') || '—'}
            </div>
            <div className="text-xs text-muted-foreground">{r.login}</div>
          </div>
        ),
      },
      {
        title: t({ uz: 'Tabel', en: 'Personnel #', ru: 'Табель' }),
        dataIndex: 'personnelNumber',
        key: 'personnelNumber',
        width: 140,
        render: (v: string | null) => v || '—',
      },
      {
        title: t({ uz: 'Tashkilot', en: 'Organization', ru: 'Организация' }),
        dataIndex: 'organizationName',
        key: 'organizationName',
        render: (v: string | null) => v || '—',
      },
      {
        title: t({ uz: 'Bo‘lim', en: 'Department', ru: 'Отдел' }),
        dataIndex: 'division',
        key: 'division',
        render: (v: string) => v || '—',
      },
      {
        title: t({ uz: 'Lavozim', en: 'Position', ru: 'Должность' }),
        dataIndex: 'post',
        key: 'post',
        render: (v: string) => v || '—',
      },
      {
        title: t({ uz: 'Arxiv sanasi', en: 'Archived at', ru: 'Дата архива' }),
        dataIndex: 'terminatedAt',
        key: 'terminatedAt',
        width: 180,
        render: (v: string) => new Date(v).toLocaleString(),
      },
    ],
    [t, currentPage],
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
      <div className="mb-1">
        <Link
          to="/dashboard/archive"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={14} />
          {t({ uz: 'Arxivga qaytish', en: 'Back to archive', ru: 'Назад в архив' })}
        </Link>
      </div>

      <PageHeader
        title={t({
          uz: 'Arxiv · Xodimlar',
          en: 'Archive · Employees',
          ru: 'Архив · Сотрудники',
        })}
        description={t({
          uz: 'Syncdan chiqarilgan xodimlar — asosiy ro‘yxatlarda ko‘rinmaydi',
          en: 'Employees removed from sync — not shown in main lists',
          ru: 'Исключённые из sync сотрудники',
        })}
        icon={GraduationCap}
        actions={<Tag>Jami: {nf.format(total)}</Tag>}
      />

      <FilterBar>
        <Input
          allowClear
          prefix={<Search size={14} />}
          placeholder={t({
            uz: 'Ism, login yoki tabel…',
            en: 'Name, login or personnel #…',
            ru: 'Имя, логин или табель…',
          })}
          value={search.value}
          onChange={(e) => search.onChange(e.target.value)}
          className="max-w-sm"
        />
      </FilterBar>

      <Card className="!border-slate-200 dark:!border-slate-700/60">
        {data.length === 0 && !loading ? (
          <NoData
            text={t({
              uz: 'Arxivda xodimlar yo‘q',
              en: 'No archived employees',
              ru: 'В архиве нет сотрудников',
            })}
          />
        ) : (
          <Table
            rowKey="id"
            loading={loading}
            dataSource={data}
            columns={columns}
            pagination={{
              current: currentPage,
              pageSize: 20,
              total,
              onChange: (page) => setParam('page', String(page)),
              showSizeChanger: false,
            }}
            size="small"
          />
        )}
      </Card>
    </div>
  );
}
