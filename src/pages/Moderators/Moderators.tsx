import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Form,
  Input,
  Modal,
  Select,
  Spin,
  Tag,
  Popconfirm,
  message,
  Tooltip,
  Avatar,
  Divider,
  Switch,
  Table,
} from '@/components/ui';
import type { DefaultOptionType } from '@/components/ui';
import {
  Plus,
  Mail,
  Shield,
  Filter,
  Settings,
  Star,
  Table2,
  UserMinus,
} from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useQueryParams } from '@/hooks/useQueryParams';
import { useFetch, usePaginatedFetch } from '@/hooks/useFetch';
import HighlightText from '@/components/HighlightText';
import NoData from '@/components/NoData';
import { PageHeader } from '@/components/PageHeader';
import apiService, {
  resolveAssetUrl,
  type Organization,
  type StudentSummary,
  type UserProfile,
} from '@/services/api';
import { filterSelectOption } from '@/utils/selectSearch.util';

const T = {
  title: { uz: 'Moderatorlar', en: 'Moderators', ru: 'Модераторы' },
  addModerator: {
    uz: 'Rol berish',
    en: 'Assign role',
    ru: 'Назначить роль',
  },
  assignRole: { uz: 'Rol', en: 'Role', ru: 'Роль' },
  roleModerator: { uz: 'Moderator', en: 'Moderator', ru: 'Модератор' },
  roleApprover: {
    uz: 'Tasdiqlovchi shaxs',
    en: 'Approver',
    ru: 'Утверждающий',
  },
  roleAccounting: {
    uz: 'Hisob bo‘limi xodimi',
    en: 'Accounting staff',
    ru: 'Сотрудник бухгалтерии',
  },
  tabModerators: { uz: 'Moderatorlar', en: 'Moderators', ru: 'Модераторы' },
  tabAccounting: {
    uz: 'Hisob bo‘limi',
    en: 'Accounting',
    ru: 'Бухгалтерия',
  },
  organization: { uz: 'Tashkilot', en: 'Organization', ru: 'Организация' },
  filial: { uz: 'Filial', en: 'Branch', ru: 'Филиал' },
  login: { uz: 'Login', en: 'Login', ru: 'Логин' },
  save: { uz: 'Saqlash', en: 'Save', ru: 'Сохранить' },
  cancel: { uz: 'Bekor qilish', en: 'Cancel', ru: 'Отмена' },
  demoteConfirm: {
    uz: 'Rol olib tashlansinmi? Xodim USER bo`lib qoladi.',
    en: 'Remove role? User becomes USER again.',
    ru: 'Снять роль?',
  },
  demote: { uz: 'Olib tashlash', en: 'Remove', ru: 'Снять' },
  noData: {
    uz: 'Ro‘yxat bo‘sh',
    en: 'No staff found',
    ru: 'Список пуст',
  },
  search: {
    uz: 'Ism, login, email...',
    en: 'Name, login, email...',
    ru: 'Имя, логин, email...',
  },
  searchLabel: { uz: 'Qidiruv', en: 'Search', ru: 'Поиск' },
  filialFilter: {
    uz: 'Filial bo‘yicha',
    en: 'Filter by branch',
    ru: 'Фильтр по филиалу',
  },
  allFiliallar: {
    uz: 'Barcha filiallar',
    en: 'All branches',
    ru: 'Все филиалы',
  },
  orgModeInclude: {
    uz: 'Faqat tanlangan filial',
    en: 'Selected branch only',
    ru: 'Только выбранный филиал',
  },
  orgModeExclude: {
    uz: 'Tanlanganlardan tashqari',
    en: 'Except selected',
    ru: 'Кроме выбранного',
  },
  filterMode: { uz: 'Filtr rejimi', en: 'Filter mode', ru: 'Режим фильтра' },
  optional: { uz: 'Ixtiyoriy', en: 'Optional', ru: 'Необязательно' },
  required: { uz: 'Majburiy', en: 'Required', ru: 'Обязательно' },
  total: { uz: 'Jami', en: 'Total', ru: 'Всего' },
  permissions: { uz: 'Ruxsatlar', en: 'Permissions', ru: 'Права' },
  actions: { uz: 'Amallar', en: 'Actions', ru: 'Действия' },
  name: { uz: 'F.I.O', en: 'Full name', ru: 'Ф.И.О' },
  role: { uz: 'Rol', en: 'Role', ru: 'Роль' },
  employee: { uz: 'Xodim', en: 'Employee', ru: 'Сотрудник' },
  selectOrg: {
    uz: 'Filial tanlang',
    en: 'Select branch',
    ru: 'Выберите филиал',
  },
  notFound: {
    uz: 'Filial topilmadi',
    en: 'Branch not found',
    ru: 'Филиал не найден',
  },
  orgUpdated: {
    uz: 'Filial yangilandi',
    en: 'Branch updated',
    ru: 'Филиал обновлён',
  },
  orgSaveError: {
    uz: 'Filialni saqlashda xato',
    en: 'Failed to save branch',
    ru: 'Ошибка сохранения филиала',
  },
  employeeSearch: {
    uz: 'Ism, login, tabel №, email yoki filial...',
    en: 'Name, login, personnel #, email or branch...',
    ru: 'Имя, логин, табельный №, email или филиал...',
  },
  permissionsPage: {
    uz: 'Ruxsatlar (jadval)',
    en: 'Permissions (table)',
    ru: 'Права (таблица)',
  },
  mainBranchModerator: {
    uz: 'Bosh filial moderatori',
    en: 'Main branch moderator',
    ru: 'Модератор главного филиала',
  },
} as const;

type StaffRoleTab = 'MODERATOR' | 'ACCOUNTING';
type AssignableRole = 'MODERATOR' | 'APPROVER' | 'ACCOUNTING';

const PAGE_SIZE = 20;

const QP_DEFAULTS = {
  orgId: undefined,
  orgMode: undefined,
  page: undefined,
  limit: undefined,
  staffRole: undefined,
} as const;

type OrgRow = { id: string; name: string };

function resolveUserOrganizations(mod: UserProfile): OrgRow[] {
  const rows = mod.organizations ?? [];
  const mapped = rows
    .map((row) => {
      const nested = row as OrgRow & { organization?: OrgRow };
      if (nested.organization?.id && nested.organization?.name) {
        return {
          id: nested.organization.id,
          name: nested.organization.name,
        };
      }
      if (row.id && row.name) {
        return { id: row.id, name: row.name };
      }
      return null;
    })
    .filter((v): v is OrgRow => v !== null);

  if (mapped.length > 0) return mapped;
  if (mod.organizationIds?.length) {
    return mod.organizationIds.map((id) => ({ id, name: id }));
  }
  return [];
}

function resolveModeratorOrgId(mod: UserProfile): string | undefined {
  return mod.organizationIds?.[0] ?? resolveUserOrganizations(mod)[0]?.id;
}

const ModeratorOrgSelect = memo(function ModeratorOrgSelect({
  value,
  options,
  loading,
  placeholder,
  notFoundText,
  onChange,
}: {
  value?: string;
  options: DefaultOptionType[];
  loading?: boolean;
  placeholder: string;
  notFoundText: string;
  onChange: (next: string | null) => void;
}) {
  const selected = options.find((o) => o.value === value);
  const selectedLabel =
    typeof selected?.label === 'string' ? selected.label : '';

  return (
    <Tooltip
      title={selectedLabel || undefined}
      placement="topLeft"
      mouseEnterDelay={0.35}
    >
      <Select
        allowClear
        showSearch
        size="middle"
        className="moderator-filial-select"
        popupClassName="moderator-filial-popup"
        placeholder={placeholder}
        value={value ?? undefined}
        loading={loading}
        optionFilterProp="label"
        filterOption={filterSelectOption}
        options={options}
        listHeight={300}
        virtual
        labelRender={(item) => (
          <span className="moderator-filial-select-label">
            {String(item.label ?? '')}
          </span>
        )}
        optionRender={(option) => (
          <span className="moderator-filial-option">{option.label}</span>
        )}
        onChange={(next) => onChange(next ?? null)}
        notFoundContent={notFoundText}
      />
    </Tooltip>
  );
});

const Moderators = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { params: qp, setParam, setParams } =
    useQueryParams<typeof QP_DEFAULTS>(QP_DEFAULTS);
  const currentPage = qp.page ? parseInt(qp.page, 10) : 1;
  const pageSize = qp.limit ? parseInt(qp.limit, 10) : PAGE_SIZE;

  const { data: organizations } = useFetch(
    ['organizations'],
    () => apiService.getOrganizations(),
    [] as Organization[],
  );

  const orgOptions = useMemo<DefaultOptionType[]>(
    () => organizations.map((o) => ({ value: o.id, label: o.name })),
    [organizations],
  );

  const defaultOrgIds = useMemo(
    () => new Set(organizations.filter((o) => o.isDefault).map((o) => o.id)),
    [organizations],
  );

  const staffRoleTab: StaffRoleTab =
    qp.staffRole === 'ACCOUNTING' ? 'ACCOUNTING' : 'MODERATOR';

  const {
    data: moderators,
    total,
    loading,
    initialLoading,
    refetch,
  } = usePaginatedFetch(
    ['staff-roles', staffRoleTab, qp.orgId, qp.orgMode],
    () => {
      const filters = {
        organizationId: qp.orgId || undefined,
        organizationMode: (qp.orgMode === 'exclude' ? 'exclude' : 'include') as
          | 'include'
          | 'exclude',
        page: 1,
        limit: 500,
      };
      return staffRoleTab === 'ACCOUNTING'
        ? apiService.getAccountingStaff(filters)
        : apiService.getModerators(filters);
    },
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const assignRole = (Form.useWatch('assignRole', form) as AssignableRole | undefined) ?? 'MODERATOR';
  const orgRequired = assignRole === 'APPROVER' || assignRole === 'ACCOUNTING';
  const [saving, setSaving] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeOptions, setEmployeeOptions] = useState<StudentSummary[]>([]);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [orgOverrides, setOrgOverrides] = useState<Record<string, string | null>>({});
  const [orgUpdating, setOrgUpdating] = useState<Record<string, boolean>>({});
  const [demotingId, setDemotingId] = useState<string | null>(null);

  const [permOpen, setPermOpen] = useState(false);
  const [permLoading, setPermLoading] = useState(false);
  const [permSaving, setPermSaving] = useState(false);
  const [permUserId, setPermUserId] = useState<string | null>(null);
  const [permUserName, setPermUserName] = useState<string>('');
  const [permissions, setPermissions] = useState<import('@/services/api').ModeratorPermissions | null>(null);

  const getModeratorOrgId = useCallback(
    (mod: UserProfile) => {
      if (Object.prototype.hasOwnProperty.call(orgOverrides, mod.id)) {
        return orgOverrides[mod.id] ?? undefined;
      }
      return resolveModeratorOrgId(mod);
    },
    [orgOverrides],
  );

  // Bosh (default) filial moderatori — ro'yxatda yulduzcha bilan belgilanadi.
  const isMainBranchModerator = useCallback(
    (mod: UserProfile) => {
      const orgId = getModeratorOrgId(mod);
      if (!orgId) return false;
      if (defaultOrgIds.size > 0) return defaultOrgIds.has(orgId);
      return (mod.organizations ?? []).some(
        (o) => o.id === orgId && o.isDefault === true,
      );
    },
    [defaultOrgIds, getModeratorOrgId],
  );

  const handleInlineOrgChange = useCallback(
    async (moderatorId: string, organizationId: string | null) => {
      const mod = moderators.find((m) => m.id === moderatorId);
      const previous = mod ? getModeratorOrgId(mod) ?? null : null;
      if (previous === organizationId) return;

      setOrgOverrides((prev) => ({ ...prev, [moderatorId]: organizationId }));
      setOrgUpdating((prev) => ({ ...prev, [moderatorId]: true }));

      try {
        await apiService.updateModerator(moderatorId, { organizationId });
        message.success(t(T.orgUpdated));
      } catch {
        setOrgOverrides((prev) => ({ ...prev, [moderatorId]: previous }));
        message.error(t(T.orgSaveError));
      } finally {
        setOrgUpdating((prev) => {
          const next = { ...prev };
          delete next[moderatorId];
          return next;
        });
      }
    },
    [getModeratorOrgId, moderators, t],
  );

  const setCrud = (
    moduleKey: keyof import('@/services/api').ModeratorPermissions,
    field: keyof import('@/services/api').ModeratorPermissions[keyof import('@/services/api').ModeratorPermissions],
    value: boolean,
  ) => {
    setPermissions((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [moduleKey]: {
          ...prev[moduleKey],
          [field]: value,
        },
      };
    });
  };

  const openPermissions = async (userId: string, userName: string) => {
    setPermUserId(userId);
    setPermUserName(userName);
    setPermOpen(true);
    setPermLoading(true);
    try {
      const rec = await apiService.getModeratorPermissions(userId);
      setPermissions(rec.permissions);
    } finally {
      setPermLoading(false);
    }
  };

  const savePermissions = async () => {
    if (!permUserId || !permissions) return;
    setPermSaving(true);
    try {
      await apiService.updateModeratorPermissions(permUserId, permissions);
      message.success('Permissions saqlandi');
      setPermOpen(false);
    } finally {
      setPermSaving(false);
    }
  };

  const loadEmployees = async (search?: string) => {
    setEmployeeLoading(true);
    try {
      const res = await apiService.getStudents({
        search: search || undefined,
        limit: 100,
      });
      setEmployeeOptions(
        res.data.filter((s) => !s.role || s.role === 'USER'),
      );
    } finally {
      setEmployeeLoading(false);
    }
  };

  const handleOrgChange = (value: string | undefined) => {
    setParams({
      orgId: value || undefined,
      orgMode: value ? qp.orgMode || undefined : undefined,
      page: undefined,
    });
  };

  const handleOrgModeChange = (value: 'include' | 'exclude') => {
    setParams({ orgMode: value === 'include' ? undefined : value, page: undefined });
  };

  const openCreateModal = () => {
    form.resetFields();
    form.setFieldsValue({
      assignRole: staffRoleTab === 'ACCOUNTING' ? 'ACCOUNTING' : 'MODERATOR',
    });
    setEmployeeSearch('');
    void loadEmployees();
    setModalOpen(true);
  };

  const handlePromote = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const role = values.assignRole as AssignableRole;
      if (role === 'APPROVER') {
        await apiService.promoteApprover({
          userId: values.userId,
          organizationId: values.organizationId,
        });
        message.success('Tasdiqlovchi shaxs tayinlandi');
      } else if (role === 'ACCOUNTING') {
        await apiService.promoteAccounting({
          userId: values.userId,
          organizationId: values.organizationId,
        });
        message.success('Hisob bo‘limi roli berildi');
        if (staffRoleTab !== 'ACCOUNTING') {
          setParams({ staffRole: 'ACCOUNTING', page: undefined });
        }
      } else {
        await apiService.promoteModerator({
          userId: values.userId,
          organizationId: values.organizationId || undefined,
        });
        message.success('Xodimga moderator statusi berildi');
        if (staffRoleTab !== 'MODERATOR') {
          setParams({ staffRole: undefined, page: undefined });
        }
      }
      setModalOpen(false);
      form.resetFields();
      refetch();
    } catch {
      /* validation */
    } finally {
      setSaving(false);
    }
  };

  const handleDemote = async (id: string) => {
    if (demotingId) return;
    setDemotingId(id);
    try {
      if (staffRoleTab === 'ACCOUNTING') {
        await apiService.demoteAccounting(id);
        message.success({
          content: 'Hisob bo‘limi roli olib tashlandi',
          key: 'demote-staff',
        });
      } else {
        await apiService.demoteModerator(id);
        message.success({
          content: 'Moderatorlik olib tashlandi',
          key: 'demote-staff',
        });
      }
      setOrgOverrides((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      refetch();
    } finally {
      setDemotingId(null);
    }
  };

  useEffect(() => {
    if (!modalOpen) return;
    const timer = setTimeout(() => {
      void loadEmployees(employeeSearch);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeSearch, modalOpen]);

  const columns = useMemo(
    () => [
      {
        title: '№',
        key: 'rowNumber',
        width: 64,
        filterable: false,
        render: (_: unknown, __: UserProfile, index: number) => (
          <span className="text-sm font-medium text-muted-foreground">
            {(currentPage - 1) * pageSize + index + 1}
          </span>
        ),
      },
      {
        title: t(T.name),
        key: 'name',
        filterable: true,
        filterPlaceholder: 'Ism...',
        getFilterValue: (mod: UserProfile) =>
          `${mod.lastName ?? ''} ${mod.firstName ?? ''}`.trim(),
        render: (_: unknown, mod: UserProfile) => (
          <div className="flex items-center gap-3 min-w-[180px]">
            <Avatar
              size={36}
              src={
                mod.avatarUrl ? resolveAssetUrl(mod.avatarUrl) : undefined
              }
              className="flex-shrink-0 bg-gradient-to-br from-slate-600 to-slate-800"
            >
              {(mod.firstName?.[0] || '') + (mod.lastName?.[0] || '')}
            </Avatar>
            <span className="font-medium text-foreground inline-flex items-center gap-1.5">
              <HighlightText text={`${mod.lastName} ${mod.firstName}`} />
              {isMainBranchModerator(mod) ? (
                <Tooltip title={t(T.mainBranchModerator)}>
                  <Star
                    size={15}
                    className="flex-shrink-0 fill-amber-400 text-amber-500"
                  />
                </Tooltip>
              ) : null}
            </span>
          </div>
        ),
      },
      {
        title: t(T.login),
        key: 'email',
        filterable: true,
        filterPlaceholder: 'Login...',
        dataIndex: 'email',
        render: (_: unknown, mod: UserProfile) => (
          <span className="text-muted-foreground flex items-center gap-1">
            <Mail size={12} />
            <HighlightText text={mod.email} />
          </span>
        ),
      },
      {
        title: t(T.filial),
        key: 'organization',
        width: 420,
        ellipsis: false,
        filterable: true,
        filterPlaceholder: 'Filial...',
        getFilterValue: (mod: UserProfile) =>
          (mod.organizations ?? [])
            .map((o) => o.name)
            .filter(Boolean)
            .join(' '),
        render: (_: unknown, mod: UserProfile) => (
          <div className="moderator-filial-cell">
            <ModeratorOrgSelect
            value={getModeratorOrgId(mod)}
            options={orgOptions}
            loading={!!orgUpdating[mod.id]}
            placeholder={t(T.selectOrg)}
            notFoundText={t(T.notFound)}
            onChange={(next) => void handleInlineOrgChange(mod.id, next)}
            />
          </div>
        ),
      },
      {
        title: t(T.role),
        key: 'role',
        width: 130,
        filterable: false,
        render: () => (
          <Tag color={staffRoleTab === 'ACCOUNTING' ? 'blue' : 'default'}>
            <span className="inline-flex items-center gap-1">
              <Shield size={13} />
              {staffRoleTab === 'ACCOUNTING' ? 'ACCOUNTING' : 'MODERATOR'}
            </span>
          </Tag>
        ),
      },
      {
        title: t(T.actions),
        key: 'actions',
        width: staffRoleTab === 'MODERATOR' ? 88 : 48,
        align: 'right' as const,
        filterable: false,
        render: (_: unknown, mod: UserProfile) => (
          <div className="flex justify-end gap-1">
            {staffRoleTab === 'MODERATOR' ? (
              <Button
                size="small"
                icon={<Settings size={14} />}
                title={t(T.permissions)}
                onClick={() =>
                  void openPermissions(mod.id, `${mod.firstName} ${mod.lastName}`)
                }
              />
            ) : null}
            <Popconfirm
              title={t(T.demoteConfirm)}
              description={`${mod.lastName} ${mod.firstName}`}
              okText={t(T.demote)}
              cancelText={t(T.cancel)}
              okButtonProps={{ danger: true, loading: demotingId === mod.id }}
              onConfirm={() => void handleDemote(mod.id)}
            >
              <Button
                size="small"
                danger
                icon={<UserMinus size={14} />}
                loading={demotingId === mod.id}
                disabled={!!demotingId && demotingId !== mod.id}
              />
            </Popconfirm>
          </div>
        ),
      },
    ],
    [
      currentPage,
      pageSize,
      getModeratorOrgId,
      isMainBranchModerator,
      handleInlineOrgChange,
      orgOptions,
      orgUpdating,
      demotingId,
      staffRoleTab,
      t,
    ],
  );

  return (
    <div className="space-y-4 moderators-page">
      <PageHeader
        icon={Shield}
        title={t(T.title)}
        description={t({
          uz: 'Moderator, tasdiqlovchi yoki hisob bo‘limi rolini berish',
          en: 'Assign moderator, approver, or accounting role',
          ru: 'Назначение роли модератора, утверждающего или бухгалтерии',
        })}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Tag className="text-xs tabular-nums">
              {t(T.total)}: {total}
            </Tag>
            {staffRoleTab === 'MODERATOR' ? (
              <Button
                icon={<Table2 size={16} />}
                onClick={() => navigate('/dashboard/permissions')}
              >
                {t(T.permissionsPage)}
              </Button>
            ) : null}
            <Button
              type="primary"
              icon={<Plus size={16} />}
              onClick={openCreateModal}
            >
              {t(T.addModerator)}
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type={staffRoleTab === 'MODERATOR' ? 'primary' : 'default'}
          onClick={() => setParams({ staffRole: undefined, page: undefined })}
        >
          {t(T.tabModerators)}
        </Button>
        <Button
          type={staffRoleTab === 'ACCOUNTING' ? 'primary' : 'default'}
          onClick={() => setParams({ staffRole: 'ACCOUNTING', page: undefined })}
        >
          {t(T.tabAccounting)}
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          <Filter size={14} />
          {t({ uz: 'Filtrlar', en: 'Filters', ru: 'Фильтры' })}
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(320px,1fr)_260px]">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">{t(T.filialFilter)}</span>
            <Select
              allowClear
              showSearch
              placeholder={t(T.allFiliallar)}
              value={qp.orgId}
              onChange={handleOrgChange}
              optionFilterProp="label"
              filterOption={filterSelectOption}
              className="moderator-filial-filter"
              popupClassName="moderator-filial-popup"
              listHeight={300}
              virtual
              options={orgOptions}
              optionRender={(option) => (
                <span className="moderator-filial-option">{option.label}</span>
              )}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">{t(T.filterMode)}</span>
            <Select
              value={qp.orgMode === 'exclude' ? 'exclude' : 'include'}
              onChange={handleOrgModeChange}
              disabled={!qp.orgId}
              options={[
                { value: 'include', label: t(T.orgModeInclude) },
                { value: 'exclude', label: t(T.orgModeExclude) },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-2">
        {initialLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Spin />
          </div>
        ) : moderators.length === 0 && !loading ? (
          <NoData text={t(T.noData)} />
        ) : (
          <Table
            rowKey="id"
            columns={columns}
            dataSource={moderators}
            loading={loading}
            pagination={{
              current: currentPage,
              pageSize,
              showSizeChanger: true,
              hideOnSinglePage: false,
              pageSizeOptions: [20, 50, 100],
              onChange: (page, size) => {
                setParams({
                  page: page > 1 ? String(page) : undefined,
                  limit: size && size !== PAGE_SIZE ? String(size) : undefined,
                });
              },
            }}
            scroll={{ x: 1280 }}
            className="moderators-table"
          />
        )}
      </div>

      <Modal
        title={t(T.addModerator)}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => void handlePromote()}
        confirmLoading={saving}
        okText={t(T.save)}
        cancelText={t(T.cancel)}
      >
        <Form form={form} layout="vertical" initialValues={{ assignRole: 'MODERATOR' }}>
          <Form.Item
            name="assignRole"
            label={t(T.assignRole)}
            rules={[{ required: true, message: 'Rolni tanlang' }]}
          >
            <Select
              options={[
                { value: 'MODERATOR', label: t(T.roleModerator) },
                { value: 'APPROVER', label: t(T.roleApprover) },
                { value: 'ACCOUNTING', label: t(T.roleAccounting) },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="userId"
            label={t(T.employee)}
            rules={[{ required: true, message: 'Xodimni tanlang' }]}
            extra="Barcha xodimlar izlanadi (ism, login, tabel №, email, filial)"
          >
            <Select
              showSearch
              placeholder={t(T.employeeSearch)}
              filterOption={false}
              loading={employeeLoading}
              onSearch={setEmployeeSearch}
              notFoundContent={
                employeeLoading ? 'Qidirilmoqda...' : 'Xodim topilmadi'
              }
              options={employeeOptions.map((u) => {
                const org = (u.organizations ?? [])
                  .map((o) => o.name)
                  .join(', ');
                const name = `${u.lastName} ${u.firstName}`.trim();
                const tabel = u.personnelNumber
                  ? ` · №${u.personnelNumber}`
                  : '';
                const label = org
                  ? `${name}${tabel} — ${org} (${u.email})`
                  : `${name}${tabel} (${u.email})`;
                return { value: u.id, label };
              })}
            />
          </Form.Item>
          <Form.Item
            name="organizationId"
            label={`${t(T.filial)} (${orgRequired ? t(T.required) : t(T.optional)})`}
            rules={
              orgRequired
                ? [{ required: true, message: 'Filialni tanlang' }]
                : undefined
            }
            extra={
              assignRole === 'ACCOUNTING'
                ? 'Hisob bo‘limi: faqat Analitika, Hisobotlar va Xodimlar (read-only)'
                : assignRole === 'APPROVER'
                  ? 'Tasdiqlovchi uchun filial majburiy'
                  : undefined
            }
          >
            <Select
              allowClear={!orgRequired}
              showSearch
              optionFilterProp="label"
              filterOption={filterSelectOption}
              placeholder={t(T.selectOrg)}
              popupClassName="moderator-filial-popup"
              options={orgOptions}
              listHeight={300}
              virtual
              optionRender={(option) => (
                <span className="moderator-filial-option">{option.label}</span>
              )}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`${t(T.permissions)}: ${permUserName || ''}`}
        open={permOpen}
        onCancel={() => setPermOpen(false)}
        onOk={() => void savePermissions()}
        confirmLoading={permSaving}
        okText={t(T.save)}
        cancelText={t(T.cancel)}
        width={720}
      >
        {permLoading || !permissions ? (
          <div className="flex items-center justify-center h-40">
            <Spin />
          </div>
        ) : (
          <div>
            {(
              [
                ['contentLevels', 'Modullar (Levels)'],
                ['contentTheories', 'Nazariyalar (Theories)'],
                ['contentQuestions', 'Savollar (Questions)'],
                ['organizations', 'Tashkilotlar (Organizations)'],
                ['students', 'Xodimlar (Employees)'],
                ['users', 'Foydalanuvchilar (Users)'],
                ['moderators', 'Moderatorlar (Moderators)'],
                ['profile', 'Profil (Profile)'],
                ['exams', 'Imtihonlar (Exams)'],
                ['audioLibrary', 'Audio kutubxona (Audio library)'],
                ['analytics', 'Analitika (Analytics)'],
                ['permissions', 'Ruxsatlar sahifasi (Permissions)'],
                ['violations', 'Qoidabuzarliklar (Violations)'],
                ['logs', 'Tizim loglari (Logs)'],
                ['nesSync', '1C sinxronizatsiya (NES sync)'],
                ['aiAssistant', 'AI yordamchi (AI Assistant)'],
              ] as const
            ).map(([key, label], idx) => (
              <div key={key}>
                {idx > 0 ? <Divider /> : null}
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="font-semibold">{label}</div>
                  <div className="flex items-center gap-6 flex-wrap">
                    {(['view', 'create', 'update', 'delete'] as const).map(
                      (field) => (
                        <div key={field} className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 capitalize">
                            {field}
                          </span>
                          <Switch
                            checked={permissions[key][field]}
                            onChange={(v) => setCrud(key, field, v)}
                          />
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Moderators;
