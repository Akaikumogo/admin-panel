import { useMemo, useState } from 'react';
import {
  Avatar,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Spin,
  Switch,
  Table,
  Tag,
  Tabs,
  message,
} from '@/components/ui';
import type { ColumnsType } from '@/components/ui';
import {
  ArrowLeft,
  BarChart3,
  Building2,
  Mail,
  Pencil,
  Star,
  UserMinus,
  UserPlus,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFetch, usePaginatedFetch } from '@/hooks/useFetch';
import { useQueryParams } from '@/hooks/useQueryParams';
import apiService, {
  userActivityApi,
  type EmployeeOnlineSummary,
  type NesEmployee,
  type Organization,
  type StudentSummary,
} from '@/services/api';
import { can } from '@/utils/can';
import { DateTimeDisplay } from '@/components/DateTimeDisplay';
import { fmtDateTime } from '@/lib/format';
import { formatPersonName } from '@/lib/person-name';

const QP_DEFAULTS = {
  tab: 'app' as 'app' | 'moderators' | 'analytics',
  appPage: undefined,
} as const;

const PAGE_SIZE = 20;

/** Online soniyalarni qisqa "Hs Mm" ko'rinishida formatlash. */
function formatOnlineDuration(sec?: number): string {
  if (!sec || sec < 60) return '—';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h} s ${m} m`;
  return `${m} m`;
}

function formatLastSeen(iso?: string | null): string {
  return fmtDateTime(iso);
}

function moderatorUsers(org: Organization | null) {
  return (org?.users ?? []).filter((u) => u.user.role !== 'USER');
}

export default function OrganizationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { params: qp, setParam, setParams } = useQueryParams(QP_DEFAULTS);
  const appPage = qp.appPage ? parseInt(qp.appPage, 10) : 1;

  const {
    data: org,
    loading: orgLoading,
    refetch: refetchOrg,
  } = useFetch<Organization | null>(
    ['organization-detail', id],
    () => apiService.getOrganizationById(id!),
    null,
  );

  // ENERGO ID xodimlar ro'yxati tab sifatida olib tashlandi; bu yerda faqat
  // sarlavhadagi "ENERGO ID: N ta" chip uchun umumiy son olinadi.
  const { total: nesTotal } = usePaginatedFetch<NesEmployee>(
    ['org-nes-count', org?.name],
    () => {
      if (!org?.name) return Promise.resolve({ data: [], total: 0, page: 1, limit: 1 });
      return apiService.getNesEmployees({
        organizationName: org.name,
        page: 1,
        limit: 1,
      });
    },
  );

  const {
    data: appEmployees,
    total: appTotal,
    loading: appLoading,
    initialLoading: appInitialLoading,
  } = usePaginatedFetch<StudentSummary>(
    ['org-app-employees', id, appPage],
    () => {
      if (!id) return Promise.resolve({ data: [], total: 0, page: 1, limit: PAGE_SIZE });
      return apiService.getStudents({ orgId: id, page: appPage, limit: PAGE_SIZE });
    },
  );

  // Filial xodimlarining online xulosasi (hozir online, oxirgi online,
  // bugun/kecha/hafta/oy). userId bo'yicha map qilib, jadval qatorlariga ulanadi.
  const { data: onlineSummary } = useFetch<EmployeeOnlineSummary[]>(
    ['org-online-summary', id],
    () =>
      id ? userActivityApi.onlineSummary({ organizationId: id }) : Promise.resolve([]),
    [],
  );
  const summaryByUser = useMemo(() => {
    const map = new Map<string, EmployeeOnlineSummary>();
    for (const s of onlineSummary) map.set(s.userId, s);
    return map;
  }, [onlineSummary]);

  const { data: allUsers } = useFetch(
    ['employees-for-moderator-promote', id],
    async () => {
      const res = await apiService.getUsers({ role: 'USER', limit: 200 });
      return res.data;
    },
    [] as { id: string; firstName: string; lastName: string; email: string; role: string }[],
  );

  const [assignOpen, setAssignOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [assignForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const moderators = useMemo(() => moderatorUsers(org), [org]);

  const handleAssignUser = async () => {
    if (!id || !can('organizations', 'update')) return;
    try {
      const values = await assignForm.validateFields();
      await apiService.promoteModerator({
        userId: values.userId,
        organizationId: id,
      });
      message.success('Xodimga moderator statusi berildi');
      setAssignOpen(false);
      assignForm.resetFields();
      refetchOrg();
    } catch {
      /* validation */
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!id || !can('organizations', 'update')) return;
    await apiService.removeUserFromOrg(id, userId);
    message.success('Foydalanuvchi chiqarildi');
    refetchOrg();
  };

  const openEdit = () => {
    if (!org || !can('organizations', 'update')) return;
    editForm.setFieldsValue({
      name: org.name,
      isDefault: org.isDefault ?? false,
    });
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!id || !can('organizations', 'update')) return;
    try {
      const values = await editForm.validateFields();
      setSaving(true);
      await apiService.updateOrganization(id, values);
      message.success('Tashkilot yangilandi');
      setEditOpen(false);
      refetchOrg();
    } catch {
      /* validation */
    } finally {
      setSaving(false);
    }
  };

  const appColumns: ColumnsType<StudentSummary> = [
    {
      title: '№',
      width: 64,
      render: (_: unknown, __: StudentSummary, index: number) =>
        (appPage - 1) * PAGE_SIZE + index + 1,
    },
    {
      title: 'F.I.O',
      key: 'name',
      render: (_: unknown, r: StudentSummary) => (
        <span className="font-medium text-slate-900 dark:text-white">
          {formatPersonName(r)}
        </span>
      ),
    },
    {
      title: 'Login',
      dataIndex: 'email',
      render: (value: string) => (
        <span className="flex items-center gap-1 text-slate-500">
          <Mail size={12} />
          {value}
        </span>
      ),
    },
    {
      title: 'Tabel',
      dataIndex: 'personnelNumber',
      width: 120,
      render: (v: string | null) => (v ? <Tag>{v}</Tag> : '—'),
    },
    {
      title: 'XP',
      dataIndex: 'totalXp',
      width: 80,
    },
    {
      title: 'Holat',
      key: 'online',
      width: 100,
      render: (_: unknown, r: StudentSummary) =>
        summaryByUser.get(r.id)?.isOnline ? (
          <Tag color="green">Online</Tag>
        ) : (
          <Tag>Offline</Tag>
        ),
    },
    {
      title: 'Oxirgi online',
      key: 'lastSeen',
      width: 160,
      render: (_: unknown, r: StudentSummary) => {
        const s = summaryByUser.get(r.id);
        if (s?.isOnline) {
          return <span className="text-emerald-600 dark:text-emerald-400">Hozir</span>;
        }
        return <span className="text-slate-500">{formatLastSeen(s?.lastSeenAt)}</span>;
      },
    },
    {
      title: 'Bugun',
      key: 'today',
      width: 90,
      render: (_: unknown, r: StudentSummary) =>
        formatOnlineDuration(summaryByUser.get(r.id)?.todaySeconds),
    },
    {
      title: 'Kecha',
      key: 'yesterday',
      width: 90,
      render: (_: unknown, r: StudentSummary) =>
        formatOnlineDuration(summaryByUser.get(r.id)?.yesterdaySeconds),
    },
    {
      title: 'Hafta',
      key: 'week',
      width: 90,
      render: (_: unknown, r: StudentSummary) =>
        formatOnlineDuration(summaryByUser.get(r.id)?.weekSeconds),
    },
    {
      title: 'Oy',
      key: 'month',
      width: 90,
      render: (_: unknown, r: StudentSummary) =>
        formatOnlineDuration(summaryByUser.get(r.id)?.monthSeconds),
    },
    {
      title: '',
      key: 'actions',
      width: 100,
      align: 'right',
      fixed: 'right',
      render: (_: unknown, r: StudentSummary) => (
        <Button size="small" onClick={() => navigate(`/dashboard/students/${r.id}`)}>
          Profil
        </Button>
      ),
    },
  ];

  const moderatorColumns: ColumnsType<(typeof moderators)[number]> = [
    {
      title: 'Foydalanuvchi',
      key: 'user',
      render: (_: unknown, row) => (
        <div className="flex items-center gap-2">
          <Avatar size={32} className="bg-blue-500">
            {(row.user.firstName?.[0] || '') + (row.user.lastName?.[0] || '')}
          </Avatar>
          <div>
            <p className="font-medium text-slate-900 dark:text-white">
              {formatPersonName(row.user)}
            </p>
            <p className="text-xs text-slate-500">{row.user.email}</p>
          </div>
        </div>
      ),
    },
    {
      title: 'Rol',
      key: 'role',
      width: 140,
      render: (_: unknown, row) => <Tag color="blue">{row.user.role}</Tag>,
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      align: 'right',
      render: (_: unknown, row) => (
        <Popconfirm
          title="Chiqarilsinmi?"
          onConfirm={() => handleRemoveUser(row.user.id)}
          disabled={!can('organizations', 'update')}
        >
          <Button
            size="small"
            danger
            type="text"
            icon={<UserMinus size={14} />}
            disabled={!can('organizations', 'update')}
          />
        </Popconfirm>
      ),
    },
  ];

  if (orgLoading && !org) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-100px)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button icon={<ArrowLeft size={16} />} onClick={() => navigate('/dashboard/organizations')}>
          Orqaga
        </Button>
        <div className="flex flex-wrap gap-2">
          {can('organizations', 'update') && (
            <Button icon={<Pencil size={16} />} onClick={openEdit}>
              Tahrirlash
            </Button>
          )}
        </div>
      </div>

      <Card className="!border-slate-200 dark:!border-slate-700/60">
        <div className="flex flex-wrap items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
            <Building2 size={26} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white truncate">
                {org?.name || 'Tashkilot'}
              </h1>
              {org?.isDefault && (
                <Tag color="gold" className="flex items-center gap-1">
                  <Star size={12} />
                  Asosiy
                </Tag>
              )}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
              <div>
                <div className="text-xs text-slate-500">ID</div>
                <div className="font-mono text-xs break-all">{org?.id}</div>
              </div>
              {org?.branchCode && (
                <div>
                  <div className="text-xs text-slate-500">Filial kodi</div>
                  <div>{org.branchCode}</div>
                </div>
              )}
              {org?.energoExternalId && (
                <div>
                  <div className="text-xs text-slate-500">Energo ID (1C)</div>
                  <div className="font-mono text-xs">{org.energoExternalId}</div>
                </div>
              )}
              <div>
                <div className="text-xs text-slate-500">Yaratilgan</div>
                <div>
                  {org?.createdAt ? <DateTimeDisplay value={org.createdAt} showRelative={false} /> : '—'}
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Tag>ENERGO ID: {nesTotal} ta</Tag>
              <Tag color="blue">App: {appTotal} ta</Tag>
              <Tag color="purple">Moderator: {moderators.length} ta</Tag>
            </div>
          </div>
        </div>
      </Card>

      <Card className="!border-slate-200 dark:!border-slate-700/60">
        <Tabs
          activeKey={
            (['app', 'moderators', 'analytics'] as const).includes(
              qp.tab as 'app' | 'moderators' | 'analytics',
            )
              ? qp.tab
              : 'app'
          }
          onChange={(key) =>
            setParams({
              tab: key as typeof qp.tab,
              appPage: undefined,
            })
          }
          items={[
            {
              key: 'app',
              label: `App xodimlar (${appTotal})`,
              children: (
                <Table
                  rowKey="id"
                  loading={appInitialLoading || appLoading}
                  dataSource={appEmployees}
                  columns={appColumns}
                  scroll={{ x: 'max-content' }}
                  onRow={(record) => ({
                    onClick: () => navigate(`/dashboard/students/${record.id}`),
                    className: 'cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5',
                  })}
                  pagination={{
                    current: appPage,
                    pageSize: PAGE_SIZE,
                    total: appTotal,
                    showSizeChanger: false,
                    onChange: (page) => setParam('appPage', page > 1 ? String(page) : undefined),
                  }}
                />
              ),
            },
            {
              key: 'moderators',
              label: `Moderatorlar (${moderators.length})`,
              children: (
                <>
                  {can('organizations', 'update') && (
                    <div className="mb-3">
                      <Button
                        type="primary"
                        icon={<UserPlus size={16} />}
                        onClick={() => {
                          setAssignOpen(true);
                          assignForm.resetFields();
                        }}
                      >
                        Moderator biriktirish
                      </Button>
                    </div>
                  )}
                  <Table
                    rowKey={(row) => row.id}
                    dataSource={moderators}
                    columns={moderatorColumns}
                    pagination={false}
                    locale={{ emptyText: 'Moderator biriktirilmagan' }}
                  />
                </>
              ),
            },
            {
              key: 'analytics',
              label: 'Analitika',
              children: (
                <div className="py-2">
                  <Button
                    type="primary"
                    icon={<BarChart3 size={16} />}
                    onClick={() => navigate(`/dashboard/branch-analytics?orgId=${id}`)}
                  >
                    Filial analitikasini ochish
                  </Button>
                  <p className="mt-3 text-sm text-slate-500">
                    Kunlik plan, xodimlar aktivligi va offline kunlar statistikasi.
                  </p>
                </div>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title="Moderator biriktirish"
        open={assignOpen}
        onCancel={() => setAssignOpen(false)}
        onOk={handleAssignUser}
        okText="Saqlash"
        cancelText="Bekor qilish"
        okButtonProps={{ disabled: !can('organizations', 'update') }}
      >
        <Form form={assignForm} layout="vertical">
          <Form.Item
            name="userId"
            label="Foydalanuvchi"
            rules={[{ required: true, message: 'Tanlang' }]}
          >
            <Select
              showSearch
              placeholder="Foydalanuvchini tanlang"
              optionFilterProp="label"
              options={allUsers.map((u) => ({
                  value: u.id,
                  label: `${u.firstName} ${u.lastName} (${u.email})`,
                }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Tashkilotni tahrirlash"
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={handleEditSave}
        confirmLoading={saving}
        okText="Saqlash"
        cancelText="Bekor qilish"
        okButtonProps={{ disabled: !can('organizations', 'update') }}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="name" label="Tashkilot nomi" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="isDefault"
            label={
              <span className="flex items-center gap-2">
                <Star size={14} className="text-amber-500" />
                Asosiy tashkilot
              </span>
            }
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
