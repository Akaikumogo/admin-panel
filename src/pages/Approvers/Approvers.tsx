import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Form,
  Modal,
  Select,
  Tag,
  Popconfirm,
  message,
  Avatar,
  Table,
} from '@/components/ui';
import type { DefaultOptionType } from '@/components/ui';
import { Plus, Mail, BadgeCheck, Filter, UserMinus } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useQueryParams } from '@/hooks/useQueryParams';
import { useFetch, usePaginatedFetch } from '@/hooks/useFetch';
import HighlightText from '@/components/HighlightText';
import NoData from '@/components/NoData';
import { PageHeader } from '@/components/PageHeader';
import apiService, {
  resolveAssetUrl,
  type Organization,
  type UserProfile,
} from '@/services/api';
import { filterSelectOption } from '@/utils/selectSearch.util';

const PAGE_SIZE = 50;
const QP_DEFAULTS = { orgId: '', orgMode: '', page: '', limit: '' };

const T = {
  title: {
    uz: 'Tasdiqlovchilar',
    en: 'Approvers',
    ru: 'Утверждающие',
  },
  add: {
    uz: 'Filialga tasdiqlovchi berish',
    en: 'Assign branch approver',
    ru: 'Назначить утверждающего',
  },
  filial: { uz: 'Filial', en: 'Branch', ru: 'Филиал' },
  login: { uz: 'Login', en: 'Login', ru: 'Логин' },
  save: { uz: 'Saqlash', en: 'Save', ru: 'Сохранить' },
  cancel: { uz: 'Bekor qilish', en: 'Cancel', ru: 'Отмена' },
  demoteConfirm: {
    uz: 'Tasdiqlovchilikdan olib tashlansinmi? Xodim USER bo`lib qoladi.',
    en: 'Remove approver role? User becomes USER again.',
    ru: 'Снять роль утверждающего?',
  },
  demote: { uz: 'Olib tashlash', en: 'Remove', ru: 'Снять' },
  noData: {
    uz: 'Tasdiqlovchilar yo`q',
    en: 'No approvers',
    ru: 'Нет утверждающих',
  },
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
  total: { uz: 'Jami', en: 'Total', ru: 'Всего' },
  actions: { uz: 'Amallar', en: 'Actions', ru: 'Действия' },
  name: { uz: 'F.I.O', en: 'Full name', ru: 'Ф.И.О' },
  role: { uz: 'Rol', en: 'Role', ru: 'Роль' },
  employee: { uz: 'Xodim', en: 'Employee', ru: 'Сотрудник' },
  selectOrg: {
    uz: 'Filial tanlang (majburiy)',
    en: 'Select branch (required)',
    ru: 'Выберите филиал (обязательно)',
  },
  employeeHint: {
    uz: 'Faqat Energo ID orqali kelgan xodimlar (USER) ko‘rinadi. Ular moderator kiritgan jadvallarni tasdiqlaydi.',
    en: 'Only Energo ID employees (USER). They approve tables entered by moderators.',
    ru: 'Только сотрудники из Energo ID (USER). Утверждают таблицы модераторов.',
  },
  employeeSearch: {
    uz: 'Ism, login, tabel №, email yoki filial...',
    en: 'Name, login, personnel #, email or branch...',
    ru: 'Имя, логин, табельный №, email или филиал...',
  },
  requiredOrg: {
    uz: 'Filial majburiy',
    en: 'Branch is required',
    ru: 'Филиал обязателен',
  },
  requiredEmployee: {
    uz: 'Xodimni tanlang',
    en: 'Select an employee',
    ru: 'Выберите сотрудника',
  },
} as const;

function orgLabel(u: UserProfile) {
  return (u.organizations ?? []).map((o) => o.name).filter(Boolean).join(', ');
}

export default function ApproversPage() {
  const { t } = useTranslation();
  const { params: qp, setParams } =
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

  const {
    data: approvers,
    total,
    initialLoading,
    refetch,
  } = usePaginatedFetch(
    ['approvers', qp.orgId, qp.orgMode],
    () =>
      apiService.getApprovers({
        organizationId: qp.orgId || undefined,
        organizationMode: qp.orgMode === 'exclude' ? 'exclude' : 'include',
        page: 1,
        limit: 500,
      }),
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeOptions, setEmployeeOptions] = useState<UserProfile[]>([]);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [demotingId, setDemotingId] = useState<string | null>(null);

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

  useEffect(() => {
    if (!modalOpen) return;
    const timer = setTimeout(() => {
      void loadEmployees(employeeSearch);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeSearch, modalOpen]);

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
      await apiService.promoteApprover({
        userId: values.userId,
        organizationId: values.organizationId,
      });
      message.success(
        t({
          uz: 'Tasdiqlovchi tayinlandi',
          en: 'Approver assigned',
          ru: 'Утверждающий назначен',
        }),
      );
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
      await apiService.demoteApprover(id);
      message.success(
        t({
          uz: 'Tasdiqlovchilik olib tashlandi',
          en: 'Approver role removed',
          ru: 'Роль снята',
        }),
      );
      refetch();
    } finally {
      setDemotingId(null);
    }
  };

  const employeeSelectOptions = useMemo(
    () =>
      employeeOptions.map((u) => ({
        value: u.id,
        label: `${u.lastName ?? ''} ${u.firstName ?? ''} — ${orgLabel(u) || '—'} (${u.email})`.trim(),
      })),
    [employeeOptions],
  );

  const columns = useMemo(
    () => [
      {
        title: '№',
        key: 'rowNumber',
        width: 64,
        render: (_: unknown, __: UserProfile, index: number) => (
          <span className="text-sm text-muted-foreground">
            {(currentPage - 1) * pageSize + index + 1}
          </span>
        ),
      },
      {
        title: t(T.name),
        key: 'name',
        render: (_: unknown, row: UserProfile) => (
          <div className="flex items-center gap-3 min-w-[180px]">
            <Avatar
              size={36}
              src={row.avatarUrl ? resolveAssetUrl(row.avatarUrl) : undefined}
              className="flex-shrink-0 bg-gradient-to-br from-emerald-600 to-slate-800"
            >
              {(row.firstName?.[0] || '') + (row.lastName?.[0] || '')}
            </Avatar>
            <span className="font-medium text-foreground">
              <HighlightText text={`${row.lastName} ${row.firstName}`} />
            </span>
          </div>
        ),
      },
      {
        title: t(T.login),
        key: 'email',
        render: (_: unknown, row: UserProfile) => (
          <span className="text-muted-foreground flex items-center gap-1">
            <Mail size={12} />
            <HighlightText text={row.email} />
          </span>
        ),
      },
      {
        title: t(T.filial),
        key: 'organization',
        render: (_: unknown, row: UserProfile) => (
          <span className="text-sm">{orgLabel(row) || '—'}</span>
        ),
      },
      {
        title: t(T.role),
        key: 'role',
        width: 160,
        render: () => (
          <Tag color="green">
            <span className="inline-flex items-center gap-1">
              <BadgeCheck size={13} />
              APPROVER
            </span>
          </Tag>
        ),
      },
      {
        title: t(T.actions),
        key: 'actions',
        width: 72,
        align: 'right' as const,
        render: (_: unknown, row: UserProfile) => (
          <Popconfirm
            title={t(T.demoteConfirm)}
            description={`${row.lastName} ${row.firstName}`}
            okText={t(T.demote)}
            cancelText={t(T.cancel)}
            okButtonProps={{ danger: true, loading: demotingId === row.id }}
            onConfirm={() => void handleDemote(row.id)}
          >
            <Button
              size="small"
              danger
              icon={<UserMinus size={14} />}
              loading={demotingId === row.id}
              disabled={!!demotingId && demotingId !== row.id}
            />
          </Popconfirm>
        ),
      },
    ],
    [currentPage, pageSize, demotingId, t],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        icon={BadgeCheck}
        title={t(T.title)}
        description={t({
          uz: 'Filial bo‘yicha tasdiqlovchi shaxslar — moderator kiritgan xavfsizlik jadvallarini tasdiqlaydi',
          en: 'Branch approvers — confirm safety tables entered by moderators',
          ru: 'Утверждающие по филиалам — подтверждают таблицы модераторов',
        })}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Tag className="text-xs tabular-nums">
              {t(T.total)}: {total}
            </Tag>
            <Button
              type="primary"
              icon={<Plus size={16} />}
              onClick={openCreateModal}
            >
              {t(T.add)}
            </Button>
          </div>
        }
      />

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          <Filter size={14} />
          {t({ uz: 'Filtrlar', en: 'Filters', ru: 'Фильтры' })}
        </div>
        <div className="max-w-md flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            {t(T.filialFilter)}
          </span>
          <Select
            allowClear
            showSearch
            placeholder={t(T.allFiliallar)}
            value={qp.orgId || undefined}
            onChange={(value) =>
              setParams({ orgId: value || undefined, page: undefined })
            }
            optionFilterProp="label"
            filterOption={filterSelectOption}
            options={orgOptions}
          />
        </div>
      </div>

      {initialLoading ? (
        <div className="py-16 text-center text-muted-foreground">…</div>
      ) : approvers.length === 0 ? (
        <NoData text={t(T.noData)} />
      ) : (
        <Table
          rowKey="id"
          dataSource={approvers}
          columns={columns}
          pagination={false}
        />
      )}

      <Modal
        title={t(T.add)}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => void handlePromote()}
        okText={t(T.save)}
        cancelText={t(T.cancel)}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={form} layout="vertical" className="mt-2">
          <Form.Item
            name="userId"
            label={t(T.employee)}
            rules={[{ required: true, message: t(T.requiredEmployee) }]}
            extra={t(T.employeeHint)}
          >
            <Select
              showSearch
              placeholder={t(T.employeeSearch)}
              loading={employeeLoading}
              filterOption={false}
              onSearch={setEmployeeSearch}
              options={employeeSelectOptions}
              notFoundContent={
                employeeLoading ? '…' : t({ uz: 'Topilmadi', en: 'Not found', ru: 'Не найдено' })
              }
            />
          </Form.Item>
          <Form.Item
            name="organizationId"
            label={t(T.filial)}
            rules={[{ required: true, message: t(T.requiredOrg) }]}
          >
            <Select
              showSearch
              placeholder={t(T.selectOrg)}
              optionFilterProp="label"
              filterOption={filterSelectOption}
              options={orgOptions}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
