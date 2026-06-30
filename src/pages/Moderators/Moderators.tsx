import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Avatar,
  Divider,
  Switch,
  Table,
} from 'antd';
import type { DefaultOptionType } from 'antd/es/select';
import {
  Plus,
  Mail,
  Shield,
  Filter,
  Search,
  Settings,
  Table2,
  UserMinus,
} from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useQueryParams } from '@/hooks/useQueryParams';
import { useFetch, usePaginatedFetch } from '@/hooks/useFetch';
import HighlightText from '@/components/HighlightText';
import NoData from '@/components/NoData';
import apiService, { BACKEND_ORIGIN, type Organization, type UserProfile } from '@/services/api';
import { filterSelectOption } from '@/utils/selectSearch.util';

const T = {
  title: { uz: 'Moderatorlar', en: 'Moderators', ru: 'Модераторы' },
  addModerator: {
    uz: 'Xodimga moderator berish',
    en: 'Promote employee',
    ru: 'Назначить модератора',
  },
  organization: { uz: 'Tashkilot', en: 'Organization', ru: 'Организация' },
  filial: { uz: 'Filial', en: 'Branch', ru: 'Филиал' },
  login: { uz: 'Login', en: 'Login', ru: 'Логин' },
  save: { uz: 'Saqlash', en: 'Save', ru: 'Сохранить' },
  cancel: { uz: 'Bekor qilish', en: 'Cancel', ru: 'Отмена' },
  demoteConfirm: {
    uz: 'Moderatorlikdan olib tashlansinmi? Xodim USER bo`lib qoladi.',
    en: 'Remove moderator role? User becomes USER again.',
    ru: 'Снять роль модератора?',
  },
  noData: {
    uz: 'Moderatorlar yo`q',
    en: 'No moderators',
    ru: 'Нет модераторов',
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
} as const;

const PAGE_SIZE = 20;

const QP_DEFAULTS = {
  search: undefined,
  orgId: undefined,
  orgMode: undefined,
  page: undefined,
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
  const selectedLabel = options.find((o) => o.value === value)?.label;

  return (
    <Select
      allowClear
      showSearch
      size="small"
      className="moderator-filial-select w-full"
      placeholder={placeholder}
      value={value ?? undefined}
      loading={loading}
      optionFilterProp="label"
      filterOption={filterSelectOption}
      options={options}
      style={{ width: '100%', minWidth: 400 }}
      popupMatchSelectWidth={false}
      dropdownStyle={{ minWidth: 480, maxWidth: 640 }}
      listHeight={320}
      virtual
      title={typeof selectedLabel === 'string' ? selectedLabel : undefined}
      optionRender={(option) => (
        <span className="block whitespace-normal leading-snug py-0.5">
          {option.label}
        </span>
      )}
      onChange={(next) => onChange(next ?? null)}
      notFoundContent={notFoundText}
    />
  );
});

const Moderators = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { params: qp, setParam, setParams } =
    useQueryParams<typeof QP_DEFAULTS>(QP_DEFAULTS);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const currentPage = qp.page ? parseInt(qp.page, 10) : 1;

  const { data: organizations } = useFetch(
    ['organizations'],
    () => apiService.getOrganizations(),
    [] as Organization[],
  );

  const orgOptions = useMemo<DefaultOptionType[]>(
    () => organizations.map((o) => ({ value: o.id, label: o.name })),
    [organizations],
  );

  const {
    data: moderators,
    total,
    loading,
    initialLoading,
    refetch,
  } = usePaginatedFetch(
    ['moderators', qp.search, qp.orgId, qp.orgMode, currentPage],
    () =>
      apiService.getModerators({
        search: qp.search || undefined,
        organizationId: qp.orgId || undefined,
        organizationMode: qp.orgMode === 'exclude' ? 'exclude' : 'include',
        page: currentPage,
        limit: PAGE_SIZE,
      }),
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeOptions, setEmployeeOptions] = useState<UserProfile[]>([]);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [orgOverrides, setOrgOverrides] = useState<Record<string, string | null>>({});
  const [orgUpdating, setOrgUpdating] = useState<Record<string, boolean>>({});

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
      const res = await apiService.getUsers({
        role: 'USER',
        search: search || undefined,
        limit: 50,
      });
      setEmployeeOptions(res.data);
    } finally {
      setEmployeeLoading(false);
    }
  };

  const handleSearchChange = (value: string) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setParams({ search: value || undefined, page: undefined });
    }, 400);
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
    setEmployeeSearch('');
    void loadEmployees();
    setModalOpen(true);
  };

  const handlePromote = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await apiService.promoteModerator({
        userId: values.userId,
        organizationId: values.organizationId || undefined,
      });
      message.success('Xodimga moderator statusi berildi');
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
    await apiService.demoteModerator(id);
    message.success('Moderatorlik olib tashlandi');
    setOrgOverrides((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    refetch();
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
        render: (_: unknown, __: UserProfile, index: number) => (
          <span className="text-sm font-medium text-slate-500">
            {(currentPage - 1) * PAGE_SIZE + index + 1}
          </span>
        ),
      },
      {
        title: t(T.name),
        key: 'name',
        render: (_: unknown, mod: UserProfile) => (
          <div className="flex items-center gap-3 min-w-[180px]">
            <Avatar
              size={36}
              src={
                mod.avatarUrl ? `${BACKEND_ORIGIN}${mod.avatarUrl}` : undefined
              }
              className="flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-700"
            >
              {(mod.firstName?.[0] || '') + (mod.lastName?.[0] || '')}
            </Avatar>
            <span className="font-medium text-slate-900 dark:text-white">
              <HighlightText
                text={`${mod.lastName} ${mod.firstName}`}
                highlight={qp.search}
              />
            </span>
          </div>
        ),
      },
      {
        title: t(T.login),
        key: 'email',
        render: (_: unknown, mod: UserProfile) => (
          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Mail size={12} />
            <HighlightText text={mod.email} highlight={qp.search} />
          </span>
        ),
      },
      {
        title: t(T.filial),
        key: 'organization',
        width: 480,
        ellipsis: false,
        render: (_: unknown, mod: UserProfile) => (
          <div className="moderator-filial-cell py-1">
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
        render: () => (
          <Tag color="blue">
            <span className="inline-flex items-center gap-1">
              <Shield size={13} />
              MODERATOR
            </span>
          </Tag>
        ),
      },
      {
        title: t(T.actions),
        key: 'actions',
        width: 88,
        align: 'right' as const,
        render: (_: unknown, mod: UserProfile) => (
          <div className="flex justify-end gap-1">
            <Button
              size="small"
              icon={<Settings size={14} />}
              title={t(T.permissions)}
              onClick={() =>
                void openPermissions(mod.id, `${mod.firstName} ${mod.lastName}`)
              }
            />
            <Popconfirm
              title={t(T.demoteConfirm)}
              onConfirm={() => handleDemote(mod.id)}
            >
              <Button size="small" danger icon={<UserMinus size={14} />} />
            </Popconfirm>
          </div>
        ),
      },
    ],
    [
      currentPage,
      getModeratorOrgId,
      handleInlineOrgChange,
      orgOptions,
      orgUpdating,
      qp.search,
      t,
    ],
  );

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-100px)] moderators-page">
      <div className="flex items-end gap-3 flex-wrap bg-white dark:bg-[#141414] border border-slate-200 dark:border-slate-700/60 rounded-lg px-4 py-3">
        <Filter size={16} className="text-slate-400 mb-2" />
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-500">{t(T.searchLabel)}</span>
          <Input
            allowClear
            defaultValue={qp.search}
            prefix={<Search size={14} className="text-slate-400" />}
            placeholder={t(T.search)}
            style={{ width: 240 }}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-500">{t(T.filialFilter)}</span>
          <Select
            allowClear
            showSearch
            placeholder={t(T.allFiliallar)}
            value={qp.orgId}
            onChange={handleOrgChange}
            optionFilterProp="label"
            filterOption={filterSelectOption}
            style={{ minWidth: 280, maxWidth: 360 }}
            popupMatchSelectWidth={false}
            dropdownStyle={{ minWidth: 420, maxWidth: 520 }}
            listHeight={280}
            virtual
            options={orgOptions}
            optionRender={(option) => (
              <span className="block whitespace-normal leading-snug py-0.5">
                {option.label}
              </span>
            )}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-500">{t(T.filterMode)}</span>
          <Select
            value={qp.orgMode === 'exclude' ? 'exclude' : 'include'}
            onChange={handleOrgModeChange}
            disabled={!qp.orgId}
            style={{ width: 240 }}
            options={[
              { value: 'include', label: t(T.orgModeInclude) },
              { value: 'exclude', label: t(T.orgModeExclude) },
            ]}
          />
        </div>
        <Tag className="text-xs mb-0.5">
          {t(T.total)}: {total}
        </Tag>
        <div className="ml-auto flex items-center gap-2 mb-0.5">
          <Button
            icon={<Table2 size={16} />}
            onClick={() => navigate('/dashboard/permissions')}
          >
            {t(T.permissionsPage)}
          </Button>
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={openCreateModal}
          >
            {t(T.addModerator)}
          </Button>
        </div>
      </div>

      {initialLoading ? (
        <div className="flex items-center justify-center h-32">
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
            pageSize: PAGE_SIZE,
            total,
            showSizeChanger: false,
            onChange: (page) => setParam('page', page === 1 ? undefined : String(page)),
          }}
          scroll={{ x: 1280 }}
          className="bg-white dark:bg-[#141414] rounded-lg border border-slate-200 dark:border-slate-700/60 moderators-table"
        />
      )}

      <Modal
        title={t(T.addModerator)}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => void handlePromote()}
        confirmLoading={saving}
        okText={t(T.save)}
        cancelText={t(T.cancel)}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="userId"
            label={t(T.employee)}
            rules={[{ required: true, message: 'Xodimni tanlang' }]}
            extra="Faqat Energo ID orqali kelgan xodimlar (USER) ko'rinadi"
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
                const org = resolveUserOrganizations(u)
                  .map((o) => o.name)
                  .join(', ');
                const name = `${u.lastName} ${u.firstName}`.trim();
                const label = org
                  ? `${name} — ${org} (${u.email})`
                  : `${name} (${u.email})`;
                return { value: u.id, label };
              })}
            />
          </Form.Item>
          <Form.Item
            name="organizationId"
            label={`${t(T.filial)} (${t(T.optional)})`}
          >
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              filterOption={filterSelectOption}
              placeholder={t(T.selectOrg)}
              options={orgOptions}
              popupMatchSelectWidth={false}
              dropdownStyle={{ minWidth: 420 }}
              listHeight={280}
              virtual
              optionRender={(option) => (
                <span className="block whitespace-normal leading-snug py-0.5">
                  {option.label}
                </span>
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
