import { useCallback, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Spin,
  Tag,
  Popconfirm,
  message,
  Switch,
  Table,
} from '@/components/ui';
import type { ColumnsType } from '@/components/ui';
import {
  Pencil,
  Trash2,
  Building2,
  Search,
  Star,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import { useQueryParams } from '@/hooks/useQueryParams';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { useFetch } from '@/hooks/useFetch';
import { useNavigate } from 'react-router-dom';
import HighlightText from '@/components/HighlightText';
import NoData from '@/components/NoData';
import apiService from '@/services/api';
import type { Organization } from '@/services/api';
import { PageHeader } from '@/components/PageHeader';
import { FilterBar } from '@/components/FilterBar';
import { can } from '@/utils/can';

const T = {
  title: { uz: 'Tashkilotlar', en: 'Organizations', ru: 'Организации' },
  addOrg: {
    uz: 'Tashkilot qo`shish',
    en: 'Add Organization',
    ru: 'Добавить организацию',
  },
  editOrg: {
    uz: 'Tashkilotni tahrirlash',
    en: 'Edit Organization',
    ru: 'Редактировать',
  },
  orgName: { uz: 'Tashkilot nomi', en: 'Organization name', ru: 'Название' },
  members: { uz: 'A`zolar', en: 'Members', ru: 'Участники' },
  moderators: { uz: 'Moderatorlar', en: 'Moderators', ru: 'Модераторы' },
  save: { uz: 'Saqlash', en: 'Save', ru: 'Сохранить' },
  cancel: { uz: 'Bekor qilish', en: 'Cancel', ru: 'Отмена' },
  deleteConfirm: {
    uz: 'Rostdan o`chirmoqchimisiz?',
    en: 'Are you sure?',
    ru: 'Вы уверены?',
  },
  noData: {
    uz: 'Tashkilotlar yo`q',
    en: 'No organizations',
    ru: 'Нет организаций',
  },
  search: { uz: 'Qidirish...', en: 'Search...', ru: 'Поиск...' },
  mainOrg: {
    uz: 'Asosiy tashkilot',
    en: 'Main organization',
    ru: 'Главная организация',
  },
  mainOrgHint: {
    uz: 'Faqat bitta tashkilot asosiy bo`la oladi. Yoqilsa, oldingi asosiy tashkilot avtomat o`chiriladi.',
    en: 'Only one organization can be main. Enabling will unset the previous main org.',
    ru: 'Только одна организация может быть главной. Включение снимет флаг с предыдущей.',
  },
  mainTag: { uz: 'Asosiy', en: 'Main', ru: 'Главная' },
  actions: { uz: 'Amallar', en: 'Actions', ru: 'Действия' },
  view: { uz: 'Batafsil', en: 'Details', ru: 'Подробнее' },
  total: { uz: 'Jami', en: 'Total', ru: 'Всего' },
  energoSyncHint: {
    uz: 'Tashkilotlar Energo ID dan keladi. Yangilash uchun ENERGO ID sahifasida sync qiling.',
    en: 'Organizations come from Energo ID. Run sync on the ENERGO ID page to refresh.',
    ru: 'Организации из Energo ID. Обновите через sync на странице ENERGO ID.',
  },
  openEnergoId: {
    uz: 'ENERGO ID sync',
    en: 'ENERGO ID sync',
    ru: 'ENERGO ID sync',
  },
} as const;

const QP_DEFAULTS = { search: undefined } as const;

function countModerators(org: Organization) {
  return org.users?.filter((u) => u.user.role !== 'USER').length ?? 0;
}

const Organizations = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { params: qp, setParam } = useQueryParams<typeof QP_DEFAULTS>(QP_DEFAULTS);
  const search = useDebouncedSearch(qp.search, (val) =>
    setParam('search', val || undefined),
  );

  const {
    data: organizations,
    loading,
    initialLoading,
    refetch: refetchOrgs,
  } = useFetch(
    ['organizations', qp.search],
    () => apiService.getOrganizations({ search: qp.search || undefined }),
    [] as Organization[],
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Organization | null>(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const openModal = useCallback((org?: Organization) => {
    if (org && !can('organizations', 'update')) return;
    if (!org && !can('organizations', 'create')) return;
    setEditing(org ?? null);
    setModalOpen(true);
    if (org) {
      form.setFieldsValue({
        name: org.name,
        isDefault: org.isDefault ?? false,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ isDefault: false });
    }
  }, [form]);

  const handleSave = async () => {
    if (editing && !can('organizations', 'update')) return;
    if (!editing && !can('organizations', 'create')) return;
    try {
      const values = await form.validateFields();
      setSaving(true);
      if (editing) {
        await apiService.updateOrganization(editing.id, values);
        message.success('Tashkilot yangilandi');
      } else {
        await apiService.createOrganization(values);
        message.success('Tashkilot yaratildi');
      }
      setModalOpen(false);
      setEditing(null);
      refetchOrgs();
    } catch {
      /* validation */
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!can('organizations', 'delete')) return;
    await apiService.deleteOrganization(id);
    message.success('Tashkilot o`chirildi');
    refetchOrgs();
  };

  const columns = useMemo<ColumnsType<Organization>>(
    () => [
      {
        title: '№',
        key: 'index',
        width: 64,
        render: (_: unknown, __: Organization, index: number) => (
          <span className="text-sm text-slate-500">{index + 1}</span>
        ),
      },
      {
        title: t(T.orgName),
        key: 'name',
        render: (_: unknown, org: Organization) => (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
              <Building2 size={16} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-900 dark:text-white truncate">
                <HighlightText text={org.name} highlight={qp.search} />
              </p>
              {org.branchCode && (
                <p className="text-xs text-slate-500 truncate">Kod: {org.branchCode}</p>
              )}
            </div>
          </div>
        ),
      },
      {
        title: t(T.members),
        key: 'members',
        width: 110,
        render: (_: unknown, org: Organization) => (
          <span className="text-sm">{org.users?.length ?? 0}</span>
        ),
      },
      {
        title: t(T.moderators),
        key: 'moderators',
        width: 120,
        render: (_: unknown, org: Organization) => {
          const count = countModerators(org);
          return count > 0 ? (
            <Tag color="blue">{count}</Tag>
          ) : (
            <span className="text-slate-400">—</span>
          );
        },
      },
      {
        title: t(T.mainTag),
        key: 'isDefault',
        width: 100,
        render: (_: unknown, org: Organization) =>
          org.isDefault ? (
            <Tag color="gold" className="flex items-center gap-1 w-fit">
              <Star size={12} />
              {t(T.mainTag)}
            </Tag>
          ) : (
            <span className="text-slate-400">—</span>
          ),
      },
      {
        title: t(T.actions),
        key: 'actions',
        width: 140,
        align: 'right',
        render: (_: unknown, org: Organization) => (
          <div
            className="flex items-center justify-end gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              size="small"
              icon={<Eye size={14} />}
              title={t(T.view)}
              onClick={() => navigate(`/dashboard/organizations/${org.id}`)}
            />
            <Button
              size="small"
              icon={<Pencil size={14} />}
              onClick={() => openModal(org)}
              disabled={
                !can('organizations', 'update') ||
                Boolean(org.energoBranchId || org.energoExternalId)
              }
            />
            <Popconfirm
              title={t(T.deleteConfirm)}
              onConfirm={() => handleDelete(org.id)}
              disabled={
                !can('organizations', 'delete') ||
                Boolean(org.energoBranchId || org.energoExternalId)
              }
            >
              <Button
                size="small"
                danger
                icon={<Trash2 size={14} />}
                disabled={
                  !can('organizations', 'delete') ||
                  Boolean(org.energoBranchId || org.energoExternalId)
                }
              />
            </Popconfirm>
          </div>
        ),
      },
    ],
    [navigate, openModal, qp.search, t],
  );

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-100px)]">
      <PageHeader
        icon={Building2}
        title={t(T.title)}
        description={t({
          uz: 'Energo ID filiallari — ro‘yxat sinxronizatsiyadan keladi',
          en: 'Energo ID branches — list is synced from Energo ID',
          ru: 'Филиалы Energo ID — список из синхронизации',
        })}
        actions={
          <Button type="primary" icon={<RefreshCw size={16} />} asChild>
            <Link to="/dashboard/nes-sync">{t(T.openEnergoId)}</Link>
          </Button>
        }
      />

      <p className="text-sm text-muted-foreground">{t(T.energoSyncHint)}</p>

      <FilterBar>
        <Input
          allowClear
          value={search.value}
          prefix={<Search size={14} className="text-slate-400" />}
          placeholder={t(T.search)}
          style={{ width: 220 }}
          onChange={(e) => search.onChange(e.target.value)}
        />
        <Tag className="text-sm ml-auto">{t(T.total)}: {organizations.length}</Tag>
      </FilterBar>

      {initialLoading ? (
        <div className="flex items-center justify-center h-32">
          <Spin />
        </div>
      ) : organizations.length === 0 && !loading ? (
        <NoData text={t(T.noData)} />
      ) : (
        <Card
          className={`!border-slate-200 dark:!border-slate-700/60 transition-opacity duration-150 ${loading ? 'opacity-50' : ''}`}
        >
          <Table
            rowKey="id"
            dataSource={organizations}
            columns={columns}
            loading={initialLoading}
            pagination={{
              pageSize: 20,
              showSizeChanger: false,
              showTotal: (total) => `${t(T.total)}: ${total}`,
            }}
            onRow={(record) => ({
              onClick: () => navigate(`/dashboard/organizations/${record.id}`),
              className: 'cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5',
            })}
          />
        </Card>
      )}

      <Modal
        title={editing ? t(T.editOrg) : t(T.addOrg)}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onOk={handleSave}
        confirmLoading={saving}
        okText={t(T.save)}
        cancelText={t(T.cancel)}
        okButtonProps={{
          disabled: editing
            ? !can('organizations', 'update')
            : !can('organizations', 'create'),
        }}
      >
        <Form form={form} layout="vertical" initialValues={{ isDefault: false }}>
          <Form.Item
            name="name"
            label={t(T.orgName)}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="isDefault"
            label={
              <span className="flex items-center gap-2">
                <Star size={14} className="text-amber-500" />
                {t(T.mainOrg)}
              </span>
            }
            valuePropName="checked"
            extra={t(T.mainOrgHint)}
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Organizations;
