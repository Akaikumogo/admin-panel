import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Segmented,
  Select,
  Spin,
  Table,
  Tag,
  message,
} from '@/components/ui';
import {
  Download,
  GraduationCap,
  Mail,
  Trophy,
  Zap,
} from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useQueryParams } from '@/hooks/useQueryParams';
import { useFetch, usePaginatedFetch } from '@/hooks/useFetch';
import HighlightText from '@/components/HighlightText';
import NoData from '@/components/NoData';
import { PageHeader } from '@/components/PageHeader';
import { FilterBar, ContentCard } from '@/components/FilterBar';
import { EmployeeAvatarUpload } from '@/components/EmployeeAvatarUpload';
import { downloadCsv } from '@/lib/csv';
import apiService from '@/services/api';
import type { StudentSummary, Level, Organization } from '@/services/api';
import { isSuperAdmin } from '@/utils/isSuperAdmin';
import { EmployeesHierarchy } from './EmployeesHierarchy';

const T = {
  title: { uz: 'Xodimlar', en: 'Employees', ru: 'Сотрудники' },
  name: { uz: 'Ism', en: 'Name', ru: 'Имя' },
  email: { uz: 'Email', en: 'Email', ru: 'Email' },
  xp: { uz: 'XP', en: 'XP', ru: 'XP' },
  level: { uz: 'Joriy daraja', en: 'Current level', ru: 'Текущий уровень' },
  completed: { uz: 'Tugallangan', en: 'Completed', ru: 'Завершено' },
  org: { uz: 'Tashkilot', en: 'Organization', ru: 'Организация' },
  allOrgs: { uz: 'Barcha tashkilotlar', en: 'All organizations', ru: 'Все организации' },
  allLevels: { uz: 'Barcha darajalar', en: 'All levels', ru: 'Все уровни' },
  search: { uz: 'Qidirish...', en: 'Search...', ru: 'Поиск...' },
  noData: { uz: 'Xodimlar yo`q', en: 'No employees', ru: 'Нет сотрудников' },
  total: { uz: 'Jami', en: 'Total', ru: 'Всего' },
  export: { uz: 'Eksport CSV', en: 'Export CSV', ru: 'Экспорт CSV' },
  exporting: { uz: 'Eksport...', en: 'Exporting...', ru: 'Экспорт...' },
  flat: { uz: 'Ro‘yxat', en: 'List', ru: 'Список' },
  tree: { uz: 'Ierarxiya', en: 'Hierarchy', ru: 'Иерархия' },
  subtitle: {
    uz: 'Energo ID orqali sinxronlangan xodimlar',
    en: 'Employees synced from Energo ID',
    ru: 'Сотрудники из Energo ID',
  },
} as const;

const QP_DEFAULTS = {
  orgId: undefined,
  levelId: undefined,
  page: undefined,
  limit: undefined,
  view: undefined,
} as const;

const Students = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { params: qp, setParams } = useQueryParams<typeof QP_DEFAULTS>(QP_DEFAULTS);
  const [exporting, setExporting] = useState(false);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const currentPage = qp.page ? parseInt(qp.page, 10) : 1;
  const pageSize = qp.limit ? parseInt(qp.limit, 10) : 20;
  const viewMode = qp.view === 'tree' ? 'tree' : 'flat';

  const columnSearch = useMemo(
    () =>
      Object.values(columnFilters)
        .map((v) => v.trim())
        .filter(Boolean)
        .join(' '),
    [columnFilters],
  );

  const { data: students, total, loading, initialLoading, refetch } =
    usePaginatedFetch<StudentSummary>(
      ['students', qp.orgId, qp.levelId, columnSearch, currentPage, pageSize],
      () =>
        apiService.getStudents({
          orgId: qp.orgId,
          levelId: qp.levelId,
          search: columnSearch || undefined,
          page: currentPage,
          limit: pageSize,
        }),
    );

  const {
    data: treeStudents,
    initialLoading: treeLoading,
    loading: treeFetching,
    refetch: refetchTree,
  } = useFetch<StudentSummary[]>(
    ['students-tree', qp.orgId, qp.levelId, columnSearch],
    async () => {
      const res = await apiService.getStudents({
        orgId: qp.orgId,
        levelId: qp.levelId,
        search: columnSearch || undefined,
        light: true,
      });
      return res.data ?? [];
    },
    [],
    { enabled: viewMode === 'tree', keepPrevious: true },
  );

  const {
    data: reportingActivation,
    refetch: refetchActivation,
  } = useFetch<{
    organizations: Array<{ id: string; reportActive: boolean }>;
    divisions: Array<{
      organizationId: string;
      division: string;
      isActive: boolean;
    }>;
  }>(
    ['reporting-activation', qp.orgId],
    () => apiService.getReportingActivation(qp.orgId),
    { organizations: [], divisions: [] },
    { enabled: viewMode === 'tree' },
  );

  const { data: orgs } = useFetch<Organization[]>(
    ['organizations-list'],
    () => apiService.getOrganizations(),
    [],
  );

  const { data: levels } = useFetch<Level[]>(
    ['levels-list'],
    () => apiService.getLevels(),
    [],
  );

  const handleColumnFiltersChange = (filters: Record<string, string>) => {
    setColumnFilters(filters);
    setParams({ page: undefined });
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const res = await apiService.getStudents({
        orgId: qp.orgId,
        levelId: qp.levelId,
        search: columnSearch || undefined,
        page: 1,
        limit: 10000,
      });
      const rows = res.data ?? [];
      downloadCsv(`xodimlar-${new Date().toISOString().slice(0, 10)}.csv`, [
        ['Tabel', 'Ism', 'Email', 'Bo‘lim', 'Lavozim', 'XP', 'Daraja', 'Tashkilot'],
        ...rows.map((row) => [
          row.personnelNumber ?? '',
          `${row.firstName ?? ''} ${row.lastName ?? ''}`.trim(),
          row.email ?? '',
          row.division ?? '',
          row.post ?? '',
          row.totalXp ?? 0,
          row.currentLevelTitle ?? '',
          row.organizations?.map((o) => o.name).join('; ') ?? '',
        ]),
      ]);
      message.success(
        t({ uz: 'CSV yuklandi', en: 'CSV downloaded', ru: 'CSV загружен' }),
      );
    } catch {
      message.error(
        t({ uz: 'Eksport xatosi', en: 'Export failed', ru: 'Ошибка экспорта' }),
      );
    } finally {
      setExporting(false);
    }
  };

  const columns = [
    {
      title: '№',
      key: 'rowNumber',
      width: 64,
      filterable: false,
      render: (_: unknown, __: StudentSummary, index: number) => (
        <span className="text-sm font-medium text-muted-foreground">
          {(currentPage - 1) * pageSize + index + 1}
        </span>
      ),
    },
    {
      title: 'Tabel',
      key: 'personnelNumber',
      width: 120,
      filterable: true,
      filterPlaceholder: 'Tabel...',
      getFilterValue: (record: StudentSummary) => record.personnelNumber ?? '',
      render: (_: unknown, record: StudentSummary) => (
        <Tag>{record.personnelNumber || '—'}</Tag>
      ),
    },
    {
      title: t(T.name),
      key: 'name',
      filterable: true,
      filterPlaceholder: 'Ism...',
      getFilterValue: (record: StudentSummary) =>
        `${record.firstName ?? ''} ${record.lastName ?? ''}`.trim(),
      render: (_: unknown, record: StudentSummary) => (
        <div className="flex items-center gap-3">
          <EmployeeAvatarUpload
            userId={record.id}
            firstName={record.firstName}
            lastName={record.lastName}
            avatarUrl={record.avatarUrl}
            size={36}
            onUploaded={() => refetch()}
          />
          <div>
            <p className="font-medium text-foreground">
              <HighlightText
                text={`${record.firstName} ${record.lastName}`}
              />
            </p>
            <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
              {'⚡'.repeat(record.badge.bolts)} {record.badge.label}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: t(T.email),
      key: 'email',
      filterable: true,
      filterPlaceholder: 'Email...',
      dataIndex: 'email',
      render: (_: unknown, record: StudentSummary) => (
        <span className="text-muted-foreground flex items-center gap-1">
          <Mail size={12} />
          <HighlightText text={record.email} />
        </span>
      ),
    },
    {
      title: t(T.xp),
      key: 'xp',
      width: 100,
      filterable: true,
      filterPlaceholder: 'XP...',
      getFilterValue: (record: StudentSummary) => String(record.totalXp ?? ''),
      render: (_: unknown, record: StudentSummary) => (
        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
          <Zap size={14} /> {record.totalXp}
        </span>
      ),
    },
    {
      title: t(T.completed),
      key: 'completed',
      width: 120,
      filterable: false,
      render: (_: unknown, record: StudentSummary) => (
        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
          <Trophy size={14} /> {record.completedLevels}
        </span>
      ),
    },
    {
      title: t(T.level),
      key: 'level',
      filterable: true,
      filterPlaceholder: 'Daraja...',
      getFilterValue: (record: StudentSummary) =>
        record.currentLevelTitle ?? '',
      render: (_: unknown, record: StudentSummary) => (
        <Tag color="default">{record.currentLevelTitle ?? '—'}</Tag>
      ),
    },
    {
      title: t(T.org),
      key: 'org',
      filterable: true,
      filterPlaceholder: 'Tashkilot...',
      getFilterValue: (record: StudentSummary) =>
        record.organizations.map((o) => o.name).join(' '),
      render: (_: unknown, record: StudentSummary) =>
        record.organizations.map((o) => <Tag key={o.id}>{o.name}</Tag>),
    },
  ];

  const showTree = viewMode === 'tree';
  const busy = showTree ? treeLoading : initialLoading;
  const empty = showTree
    ? treeStudents.length === 0 && !treeFetching
    : students.length === 0 && !loading;

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden p-4 md:p-6">
      <PageHeader
        icon={GraduationCap}
        title={t(T.title)}
        description={t(T.subtitle)}
        actions={
          <Button
            variant="outline"
            onClick={handleExportCsv}
            disabled={exporting}
          >
            <Download size={16} className="mr-2" />
            {exporting ? t(T.exporting) : t(T.export)}
          </Button>
        }
      />

      <FilterBar showIcon>
        <Segmented<'flat' | 'tree'>
          value={viewMode}
          onChange={(v) =>
            setParams({
              view: v === 'tree' ? 'tree' : undefined,
              page: undefined,
            })
          }
          options={[
            { value: 'flat', label: t(T.flat) },
            { value: 'tree', label: t(T.tree) },
          ]}
        />
        <Select
          allowClear
          placeholder={t(T.allOrgs)}
          style={{ width: 220 }}
          value={qp.orgId}
          onChange={(v) => setParams({ orgId: v, page: undefined })}
          options={orgs.map((o) => ({ value: o.id, label: o.name }))}
        />
        {!showTree ? (
          <Select
            allowClear
            placeholder={t(T.allLevels)}
            style={{ width: 200 }}
            value={qp.levelId}
            onChange={(v) => setParams({ levelId: v, page: undefined })}
            options={levels.map((l) => ({ value: l.id, label: l.title }))}
          />
        ) : null}
        <Tag className="text-sm ml-auto">
          {t(T.total)}: {showTree ? treeStudents.length : total}
        </Tag>
      </FilterBar>

      {busy ? (
        <div className="flex h-32 items-center justify-center">
          <Spin />
        </div>
      ) : empty ? (
        <NoData text={t(T.noData)} />
      ) : showTree ? (
        <ContentCard loading={treeFetching && !treeLoading}>
          <EmployeesHierarchy
            students={treeStudents}
            organizations={reportingActivation.organizations}
            divisions={reportingActivation.divisions}
            canEdit={isSuperAdmin()}
            onActivationChange={() => {
              void refetchTree();
              void refetchActivation();
            }}
          />
        </ContentCard>
      ) : (
        <ContentCard loading={loading}>
          <Table
            dataSource={students}
            columns={columns}
            rowKey="id"
            loading={false}
            columnFilters={columnFilters}
            onColumnFiltersChange={handleColumnFiltersChange}
            onRow={(record) => ({
              onClick: () => navigate(`/dashboard/employees/${record.id}`),
              className: 'cursor-pointer',
            })}
            pagination={{
              current: currentPage,
              pageSize,
              total,
              showSizeChanger: true,
              hideOnSinglePage: false,
              onChange: (pg, size) => {
                setParams({
                  page: pg > 1 ? String(pg) : undefined,
                  limit: size && size !== 20 ? String(size) : undefined,
                });
              },
            }}
            size="middle"
          />
        </ContentCard>
      )}
    </div>
  );
};

export default Students;
