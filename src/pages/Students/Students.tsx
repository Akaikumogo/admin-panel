import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Input,
  Segmented,
  Select,
  Spin,
  Switch,
  Table,
  Tag,
  message,
} from '@/components/ui';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ChevronDown,
  ChevronRight,
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
import type { StudentSummary, Level, Organization, UserProfile } from '@/services/api';
import { can } from '@/utils/can';
import { isSuperAdmin, readCachedUserRole } from '@/utils/isSuperAdmin';
import { EmployeesHierarchy } from './EmployeesHierarchy';
import { EmployeeListExpandPanel } from './EmployeeListExpandPanel';
import { cn } from '@/lib/utils';
import { formatPersonName } from '@/lib/person-name';

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


type FieldDraft = {
  firstName: string;
  lastName: string;
  middleName: string;
  division: string;
  post: string;
};

function fieldsFromStudent(s: StudentSummary): FieldDraft {
  return {
    firstName: s.firstName ?? '',
    lastName: s.lastName ?? '',
    middleName: s.middleName ?? '',
    division: s.division ?? '',
    post: s.post ?? '',
  };
}

function fieldsEqual(a: FieldDraft, b: FieldDraft) {
  return (
    a.firstName === b.firstName &&
    a.lastName === b.lastName &&
    a.middleName === b.middleName &&
    a.division === b.division &&
    a.post === b.post
  );
}

function fieldsMissing(d: FieldDraft) {
  const empty: string[] = [];
  if (!d.firstName.trim()) empty.push('Ism');
  if (!d.lastName.trim()) empty.push('Familiya');
  if (!d.middleName.trim()) empty.push('Otasining ismi');
  if (!d.division.trim()) empty.push("Bo‘lim");
  if (!d.post.trim()) empty.push('Lavozim');
  return empty;
}

const Students = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { params: qp, setParams } = useQueryParams<typeof QP_DEFAULTS>(QP_DEFAULTS);
  const [exporting, setExporting] = useState(false);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [empActive, setEmpActive] = useState<Map<string, boolean>>(() => new Map());
  const [pendingOff, setPendingOff] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [fieldDrafts, setFieldDrafts] = useState<Record<string, FieldDraft>>({});
  const [savingFieldsId, setSavingFieldsId] = useState<string | null>(null);
  const [me, setMe] = useState<UserProfile | null>(() => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? (JSON.parse(raw) as UserProfile) : null;
    } catch {
      return null;
    }
  });
  const currentPage = qp.page ? parseInt(qp.page, 10) : 1;
  const pageSize = qp.limit ? parseInt(qp.limit, 10) : 20;
  const viewMode = qp.view === 'tree' ? 'tree' : 'flat';
  /** Xodim hisobot OFF/ON — barcha moderator + superadmin */
  const canToggleReport =
    isSuperAdmin() || readCachedUserRole() === 'MODERATOR';
  /** Energo display field edits — same gate as StudentDetail / StudentFieldsEditor */
  const canEditFields =
    me?.role === 'MODERATOR' || me?.role === 'SUPERADMIN';

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

  useEffect(() => {
    const m = new Map<string, boolean>();
    for (const s of students) m.set(s.id, s.reportActive !== false);
    setEmpActive(m);
  }, [students]);

  useEffect(() => {
    apiService
      .me()
      .then(setMe)
      .catch(() => undefined);
  }, []);

  // Collapse expand when page/filters change so stale panels don't linger
  useEffect(() => {
    setExpandedUserId(null);
    setFieldDrafts({});
  }, [currentPage, pageSize, columnSearch, qp.orgId, qp.levelId]);

  const applyEmployeeActive = async (userId: string, next: boolean) => {
    setBusyId(userId);
    try {
      await apiService.setEmployeeReportActive(userId, next);
      setEmpActive((prev) => {
        const m = new Map(prev);
        m.set(userId, next);
        return m;
      });
      message.success(
        next
          ? t({
              uz: 'Hisobotga qaytarildi',
              en: 'Included in reporting again',
              ru: 'Снова в отчётах',
            })
          : t({
              uz: 'Hisobotdan chiqarildi (ma’lumotlar saqlanadi)',
              en: 'Excluded from reporting (data kept)',
              ru: 'Исключено из отчётов (данные сохранены)',
            }),
      );
      void refetch();
    } catch {
      message.error(
        t({
          uz: 'Saqlashda xato',
          en: 'Could not save',
          ru: 'Не удалось сохранить',
        }),
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleEmployeeSwitch = (record: StudentSummary, next: boolean) => {
    if (!canToggleReport || busyId) return;
    const title = formatPersonName(record) || record.email;
    if (!next) {
      setPendingOff({ id: record.id, title });
      return;
    }
    void applyEmployeeActive(record.id, true);
  };

  const confirmOff = () => {
    if (!pendingOff) return;
    const { id } = pendingOff;
    setPendingOff(null);
    void applyEmployeeActive(id, false);
  };

  const getFieldDraft = (record: StudentSummary): FieldDraft =>
    fieldDrafts[record.id] ?? fieldsFromStudent(record);

  const updateFieldDraft = (
    record: StudentSummary,
    key: keyof FieldDraft,
    value: string,
  ) => {
    setFieldDrafts((prev) => ({
      ...prev,
      [record.id]: {
        ...(prev[record.id] ?? fieldsFromStudent(record)),
        [key]: value,
      },
    }));
  };

  const saveFieldDraft = async (record: StudentSummary) => {
    const draft = getFieldDraft(record);
    const missing = fieldsMissing(draft);
    if (missing.length) {
      message.error(`Bo‘sh maydon: ${missing.join(', ')}`);
      return;
    }
    if (fieldsEqual(draft, fieldsFromStudent(record))) return;
    setSavingFieldsId(record.id);
    try {
      await apiService.patchEmployeeFields(record.id, {
        firstName: draft.firstName.trim(),
        lastName: draft.lastName.trim(),
        middleName: draft.middleName.trim(),
        division: draft.division.trim(),
        post: draft.post.trim(),
      });
      setFieldDrafts((prev) => {
        const next = { ...prev };
        delete next[record.id];
        return next;
      });
      message.success(
        t({
          uz: 'Saqlandi',
          en: 'Saved',
          ru: 'Сохранено',
        }),
      );
      void refetch();
    } catch {
      message.error(
        t({
          uz: 'Saqlashda xato',
          en: 'Could not save',
          ru: 'Не удалось сохранить',
        }),
      );
    } finally {
      setSavingFieldsId(null);
    }
  };

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
          formatPersonName(row),
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
      title: '',
      key: 'expand',
      width: 48,
      fixed: 'left' as const,
      filterable: false,
      align: 'center' as const,
      render: (_: unknown, record: StudentSummary) => {
        const open = expandedUserId === record.id;
        return (
          <button
            type="button"
            data-stop-row-click
            aria-label={open ? 'Collapse safety' : 'Expand safety'}
            aria-expanded={open}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              setExpandedUserId((prev) => (prev === record.id ? null : record.id));
            }}
          >
            {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        );
      },
    },
    {
      title: '№',
      key: 'rowNumber',
      width: 56,
      fixed: 'left' as const,
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
      width: 220,
      fixed: 'left' as const,
      filterable: true,
      filterPlaceholder: 'Tabel / ism...',
      getFilterValue: (record: StudentSummary) =>
        [record.personnelNumber ?? '', formatPersonName(record)].filter(Boolean).join(' '),
      render: (_: unknown, record: StudentSummary) => (
        <div className="flex min-w-0 items-center gap-2 overflow-hidden">
          <EmployeeAvatarUpload
            userId={record.id}
            firstName={record.firstName}
            lastName={record.lastName}
            avatarUrl={record.avatarUrl}
            size={28}
            onUploaded={() => refetch()}
          />
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
            <Tag className="max-w-[110px] truncate">{record.personnelNumber || '—'}</Tag>
            {record.role === 'MODERATOR' ? (
              <Tag color="blue" className="shrink-0">Moderator</Tag>
            ) : null}
            <span
              className="min-w-0 truncate text-[10px] text-amber-600 dark:text-amber-400"
              title={record.badge?.label ?? 'Yangi ishchi'}
            >
              {'⚡'.repeat(record.badge?.bolts ?? 1)} {record.badge?.label ?? 'Yangi ishchi'}
            </span>
          </div>
        </div>
      ),
    },
    {
      title: 'Ism',
      key: 'firstName',
      width: 180,
      filterable: true,
      filterPlaceholder: 'Ism...',
      getFilterValue: (record: StudentSummary) => record.firstName ?? '',
      render: (_: unknown, record: StudentSummary) => {
        if (!canEditFields) {
          return (
            <span className="text-sm">{record.firstName || '—'}</span>
          );
        }
        const draft = getFieldDraft(record);
        return (
          <div data-stop-row-click onClick={(e) => e.stopPropagation()}>
            <Input
              value={draft.firstName}
              onChange={(e) => updateFieldDraft(record, 'firstName', e.target.value)}
              className="h-8 w-full text-xs"
            />
          </div>
        );
      },
    },
    {
      title: 'Familiya',
      key: 'lastName',
      width: 180,
      filterable: true,
      filterPlaceholder: 'Familiya...',
      getFilterValue: (record: StudentSummary) => record.lastName ?? '',
      render: (_: unknown, record: StudentSummary) => {
        if (!canEditFields) {
          return (
            <span className="text-sm">{record.lastName || '—'}</span>
          );
        }
        const draft = getFieldDraft(record);
        return (
          <div data-stop-row-click onClick={(e) => e.stopPropagation()}>
            <Input
              value={draft.lastName}
              onChange={(e) => updateFieldDraft(record, 'lastName', e.target.value)}
              className="h-8 w-full text-xs"
            />
          </div>
        );
      },
    },
    {
      title: 'Otasining ismi',
      key: 'middleName',
      width: 200,
      filterable: true,
      filterPlaceholder: 'Ota ismi...',
      getFilterValue: (record: StudentSummary) => record.middleName ?? '',
      render: (_: unknown, record: StudentSummary) => {
        if (!canEditFields) {
          return (
            <span className="text-sm">{record.middleName || '—'}</span>
          );
        }
        const draft = getFieldDraft(record);
        return (
          <div data-stop-row-click onClick={(e) => e.stopPropagation()}>
            <Input
              value={draft.middleName}
              onChange={(e) => updateFieldDraft(record, 'middleName', e.target.value)}
              className="h-8 w-full text-xs"
            />
          </div>
        );
      },
    },
    {
      title: "Bo‘lim",
      key: 'division',
      width: 240,
      filterable: true,
      filterPlaceholder: "Bo‘lim...",
      getFilterValue: (record: StudentSummary) => record.division ?? '',
      render: (_: unknown, record: StudentSummary) => {
        if (!canEditFields) {
          return (
            <span className="text-sm">{record.division || '—'}</span>
          );
        }
        const draft = getFieldDraft(record);
        return (
          <div data-stop-row-click onClick={(e) => e.stopPropagation()}>
            <Input
              value={draft.division}
              onChange={(e) => updateFieldDraft(record, 'division', e.target.value)}
              className="h-8 w-full text-xs"
            />
          </div>
        );
      },
    },
    {
      title: 'Lavozim',
      key: 'post',
      width: 240,
      filterable: true,
      filterPlaceholder: 'Lavozim...',
      getFilterValue: (record: StudentSummary) => record.post ?? '',
      render: (_: unknown, record: StudentSummary) => {
        if (!canEditFields) {
          return <span className="text-sm">{record.post || '—'}</span>;
        }
        const draft = getFieldDraft(record);
        return (
          <div data-stop-row-click onClick={(e) => e.stopPropagation()}>
            <Input
              value={draft.post}
              onChange={(e) => updateFieldDraft(record, 'post', e.target.value)}
              className="h-8 w-full text-xs"
            />
          </div>
        );
      },
    },
    {
      title: t(T.email),
      key: 'email',
      width: 240,
      ellipsis: true,
      filterable: true,
      filterPlaceholder: 'Email...',
      dataIndex: 'email',
      render: (_: unknown, record: StudentSummary) => (
        <span className="text-muted-foreground flex min-w-0 items-center gap-1 overflow-hidden" title={record.email}>
          <Mail size={12} className="shrink-0" />
          <span className="truncate">
            <HighlightText text={record.email} />
          </span>
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
      width: 160,
      ellipsis: true,
      filterable: true,
      filterPlaceholder: 'Daraja...',
      getFilterValue: (record: StudentSummary) =>
        record.currentLevelTitle ?? '',
      render: (_: unknown, record: StudentSummary) => (
        <Tag color="default" className="max-w-full truncate" title={record.currentLevelTitle ?? '—'}>
          {record.currentLevelTitle ?? '—'}
        </Tag>
      ),
    },
    {
      title: t(T.org),
      key: 'org',
      width: 280,
      ellipsis: true,
      filterable: true,
      filterPlaceholder: 'Tashkilot...',
      getFilterValue: (record: StudentSummary) =>
        record.organizations.map((o) => o.name).join(' '),
      render: (_: unknown, record: StudentSummary) => {
        const orgText =
          record.organizations.map((o) => o.name).join(', ') || '—';
        return (
          <span className="block max-w-full truncate whitespace-nowrap" title={orgText}>
            {orgText}
          </span>
        );
      },
    },
    {
      title: 'Saqlash',
      key: 'saveFields',
      width: 110,
      fixed: 'right' as const,
      filterable: false,
      render: (_: unknown, record: StudentSummary) => {
        if (!canEditFields) return null;
        const draft = getFieldDraft(record);
        const dirty = !fieldsEqual(draft, fieldsFromStudent(record));
        const missing = fieldsMissing(draft);
        const saving = savingFieldsId === record.id;
        return (
          <div data-stop-row-click onClick={(e) => e.stopPropagation()}>
            <Button
              type="primary"
              size="small"
              loading={saving}
              disabled={!dirty || missing.length > 0 || saving}
              onClick={() => void saveFieldDraft(record)}
            >
              Saqlash
            </Button>
          </div>
        );
      },
    },
    {
      title: t({
        uz: 'Hisobot',
        en: 'Report',
        ru: 'Отчёт',
      }),
      key: 'reportActive',
      width: 100,
      fixed: 'right' as const,
      filterable: false,
      render: (_: unknown, record: StudentSummary) => {
        const checked = empActive.get(record.id) ?? record.reportActive !== false;
        return (
          <div
            data-stop-row-click
            className="flex justify-end"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            title={
              checked
                ? 'ON — hisobotda hisobga olinadi'
                : 'OFF — reportingda hisobga olinmaydi'
            }
          >
            <Switch
              size="small"
              checked={checked}
              disabled={!canToggleReport || busyId === record.id}
              onCheckedChange={(next) => handleEmployeeSwitch(record, next)}
            />
          </div>
        );
      },
    },
  ];

  const showTree = viewMode === 'tree';
  const busy = showTree ? treeLoading : initialLoading;
  const treeEmpty = treeStudents.length === 0 && !treeFetching;

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

      {!showTree ? (
        <p className="text-right text-[11px] text-muted-foreground">
          {t({
            uz: 'Switch OFF = hisobotdan chiqarish (o‘chirish emas)',
            en: 'Switch OFF = exclude from reports (not delete)',
            ru: 'Switch OFF = исключить из отчётов (не удаление)',
          })}
        </p>
      ) : null}

      {showTree ? (
        busy ? (
          <div className="flex h-32 items-center justify-center">
            <Spin />
          </div>
        ) : treeEmpty ? (
          <NoData text={t(T.noData)} />
        ) : (
          <ContentCard loading={treeFetching && !treeLoading}>
            <EmployeesHierarchy
              students={treeStudents}
              organizations={reportingActivation.organizations}
              divisions={reportingActivation.divisions}
              canEditOrg={can('organizations', 'update')}
              canEditEmployee={canToggleReport}
              onActivationChange={() => {
                void refetchTree();
                void refetchActivation();
              }}
            />
          </ContentCard>
        )
      ) : (
        <ContentCard loading={loading || initialLoading}>
          <Table
            dataSource={students}
            columns={columns}
            rowKey="id"
            loading={false}
            emptyText={t(T.noData)}
            columnFilters={columnFilters}
            onColumnFiltersChange={handleColumnFiltersChange}
            expandedRowKey={expandedUserId}
            expandedRowRender={(record) => (
              <EmployeeListExpandPanel summary={record} me={me} />
            )}
            onRow={(record) => {
              const active =
                empActive.get(record.id) ?? record.reportActive !== false;
              return {
                onClick: () => navigate(`/dashboard/employees/${record.id}`),
                className: cn('cursor-pointer', !active && 'opacity-55'),
              };
            }}
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
            scroll={{ x: 2500 }}
            size="small"
          />
        </ContentCard>
      )}

      <AlertDialog
        open={!!pendingOff}
        onOpenChange={(v) => {
          if (!v) setPendingOff(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t({
                uz: 'Hisobotdan chiqarish',
                en: 'Exclude from reporting',
                ru: 'Исключить из отчётов',
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingOff
                ? t({
                    uz: `«${pendingOff.title}» reporting va KPI hisob-kitoblaridan chiqariladi. Ma’lumotlar o‘chirilmaydi.`,
                    en: `“${pendingOff.title}” will be excluded from reporting and KPI. Data is not deleted.`,
                    ru: `«${pendingOff.title}» будет исключён из отчётов и KPI. Данные не удаляются.`,
                  })
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t({ uz: 'Bekor', en: 'Cancel', ru: 'Отмена' })}
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmOff()}>
              {t({ uz: 'Chiqarish', en: 'Exclude', ru: 'Исключить' })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Students;
