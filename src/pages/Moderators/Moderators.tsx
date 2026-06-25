import { useEffect, useRef, useState } from 'react';
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
import {
  Plus,
  Mail,
  Shield,
  Filter,
  Search,
  Settings,
  Table2,
  Pencil,
  UserMinus,
} from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useQueryParams } from '@/hooks/useQueryParams';
import { useFetch, usePaginatedFetch } from '@/hooks/useFetch';
import HighlightText from '@/components/HighlightText';
import NoData from '@/components/NoData';
import apiService, { BACKEND_ORIGIN } from '@/services/api';
import type { ModeratorPermissions, Organization, UserProfile } from '@/services/api';

const T = {
  title: { uz: 'Moderatorlar', en: 'Moderators', ru: 'Модераторы' },
  addModerator: {
    uz: 'Xodimga moderator berish',
    en: 'Promote employee',
    ru: 'Назначить модератора',
  },
  organization: { uz: 'Tashkilot', en: 'Organization', ru: 'Организация' },
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
  search: { uz: 'Qidirish...', en: 'Search...', ru: 'Поиск...' },
  optional: { uz: 'Ixtiyoriy', en: 'Optional', ru: 'Необязательно' },
  total: { uz: 'Jami', en: 'Total', ru: 'Всего' },
  permissionsPage: {
    uz: 'Ruxsatlar (jadval)',
    en: 'Permissions (table)',
    ru: 'Права (таблица)',
  },
  editModerator: {
    uz: 'Moderator filiali',
    en: 'Moderator branch',
    ru: 'Филиал модератора',
  },
  actions: { uz: 'Amallar', en: 'Actions', ru: 'Действия' },
  name: { uz: 'F.I.O', en: 'Full name', ru: 'Ф.И.О' },
  role: { uz: 'Rol', en: 'Role', ru: 'Роль' },
  employee: { uz: 'Xodim', en: 'Employee', ru: 'Сотрудник' },
} as const;

const PAGE_SIZE = 20;

const QP_DEFAULTS = {
  search: undefined,
  orgId: undefined,
  orgMode: undefined,
  page: undefined,
} as const;

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
  const [editingModerator, setEditingModerator] = useState<UserProfile | null>(
    null,
  );
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeOptions, setEmployeeOptions] = useState<UserProfile[]>([]);
  const [employeeLoading, setEmployeeLoading] = useState(false);

  const [permOpen, setPermOpen] = useState(false);
  const [permLoading, setPermLoading] = useState(false);
  const [permSaving, setPermSaving] = useState(false);
  const [permUserId, setPermUserId] = useState<string | null>(null);
  const [permUserName, setPermUserName] = useState<string>('');
  const [permissions, setPermissions] = useState<ModeratorPermissions | null>(null);

  const setCrud = (
    moduleKey: keyof ModeratorPermissions,
    field: keyof ModeratorPermissions[keyof ModeratorPermissions],
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
    setEditingModerator(null);
    form.resetFields();
    setEmployeeSearch('');
    void loadEmployees();
    setModalOpen(true);
  };

  const openEditModal = (mod: UserProfile) => {
    setEditingModerator(mod);
    form.setFieldsValue({
      organizationId: mod.organizations?.[0]?.id,
    });
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

  const handleEditOrganization = async () => {
    if (!editingModerator) return;
    try {
      const values = await form.validateFields();
      setSaving(true);
      await apiService.updateModerator(editingModerator.id, {
        organizationId: values.organizationId ?? null,
      });
      message.success('Filial yangilandi');
      setModalOpen(false);
      setEditingModerator(null);
      form.resetFields();
      refetch();
    } catch {
      /* validation */
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (editingModerator) {
      await handleEditOrganization();
      return;
    }
    await handlePromote();
  };

  const handleDemote = async (id: string) => {
    await apiService.demoteModerator(id);
    message.success('Moderatorlik olib tashlandi');
    refetch();
  };

  useEffect(() => {
    if (!modalOpen || editingModerator) return;
    const timer = setTimeout(() => {
      void loadEmployees(employeeSearch);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeSearch, modalOpen, editingModerator]);

  const columns = [
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
      title: 'Email',
      key: 'email',
      render: (_: unknown, mod: UserProfile) => (
        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
          <Mail size={12} />
          <HighlightText text={mod.email} highlight={qp.search} />
        </span>
      ),
    },
    {
      title: t(T.organization),
      key: 'organization',
      ellipsis: true,
      render: (_: unknown, mod: UserProfile) =>
        mod.organizations?.length ? (
          <span
            className="text-sm text-slate-600 dark:text-slate-300"
            title={mod.organizations.map((o) => o.name).join(', ')}
          >
            {mod.organizations.map((o) => o.name).join(', ')}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
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
      width: 110,
      align: 'right' as const,
      render: (_: unknown, mod: UserProfile) => (
        <div className="flex justify-end gap-1">
          <Button
            size="small"
            icon={<Pencil size={14} />}
            onClick={() => openEditModal(mod)}
          />
          <Button
            size="small"
            icon={<Settings size={14} />}
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
  ];

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-100px)]">
      <div className="flex items-center gap-3 flex-wrap bg-white dark:bg-[#141414] border border-slate-200 dark:border-slate-700/60 rounded-lg px-4 py-3">
        <Filter size={16} className="text-slate-400" />
        <Input
          allowClear
          defaultValue={qp.search}
          prefix={<Search size={14} className="text-slate-400" />}
          placeholder={t(T.search)}
          style={{ width: 220 }}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
        <Select
          allowClear
          showSearch
          placeholder={t(T.organization)}
          value={qp.orgId}
          onChange={handleOrgChange}
          optionFilterProp="label"
          style={{ minWidth: 260, maxWidth: 360 }}
          options={organizations.map((o) => ({
            value: o.id,
            label: o.name,
          }))}
        />
        <Select
          value={qp.orgMode === 'exclude' ? 'exclude' : 'include'}
          onChange={handleOrgModeChange}
          disabled={!qp.orgId}
          style={{ width: 230 }}
          options={[
            { value: 'include', label: 'Faqat tanlangan filial' },
            { value: 'exclude', label: 'Tanlanganlardan tashqari' },
          ]}
        />
        <Tag className="text-xs">
          {t(T.total)}: {total}
        </Tag>
        <div className="ml-auto flex items-center gap-2">
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
          scroll={{ x: 900 }}
          className="bg-white dark:bg-[#141414] rounded-lg border border-slate-200 dark:border-slate-700/60"
        />
      )}

      <Modal
        title={
          editingModerator ? t(T.editModerator) : t(T.addModerator)
        }
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditingModerator(null);
        }}
        onOk={handleSave}
        confirmLoading={saving}
        okText={t(T.save)}
        cancelText={t(T.cancel)}
      >
        <Form form={form} layout="vertical">
          {!editingModerator ? (
            <Form.Item
              name="userId"
              label={t(T.employee)}
              rules={[{ required: true, message: 'Xodimni tanlang' }]}
              extra="Faqat Energo ID orqali kelgan xodimlar (USER) ko'rinadi"
            >
              <Select
                showSearch
                placeholder="Ism, login, tabel №, email yoki filial..."
                filterOption={false}
                loading={employeeLoading}
                onSearch={setEmployeeSearch}
                notFoundContent={
                  employeeLoading ? 'Qidirilmoqda...' : 'Xodim topilmadi'
                }
                options={employeeOptions.map((u) => {
                  const org = u.organizations?.map((o) => o.name).join(', ');
                  const name = `${u.lastName} ${u.firstName}`.trim();
                  const label = org
                    ? `${name} — ${org} (${u.email})`
                    : `${name} (${u.email})`;
                  return { value: u.id, label };
                })}
              />
            </Form.Item>
          ) : null}
          <Form.Item
            name="organizationId"
            label={`${t(T.organization)} (${t(T.optional)})`}
          >
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder={t(T.organization)}
              options={organizations.map((o) => ({
                value: o.id,
                label: o.name,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Permissions: ${permUserName || ''}`}
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
