import { useCallback, useMemo, useState } from 'react';
import {
  Button,
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
import { FilterBar, ListSurface } from '@/components/FilterBar';
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
        width: 52,
        align: 'center',
        render: (_: unknown, __: Organization, index: number) => (
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {index + 1}
          </span>
        ),
      },
      {
        title: t(T.orgName),
        key: 'name',
        wrap: true,
        render: (_: unknown, org: Organization) => (
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground dark:bg-accent-500/15 dark:text-accent-300">
              <Building2 size={16} strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                <HighlightText text={org.name} highlight={qp.search} />
              </p>
              {org.branchCode ? (
                <p className="truncate font-mono text-[11px] text-muted-foreground">
                  Kod: {org.branchCode}
                </p>
              ) : null}
            </div>
          </div>
        ),
      },
      {
        title: t(T.members),
        key: 'members',
        width: 96,
        align: 'right',
        render: (_: unknown, org: Organization) => (
          <span className="font-mono text-sm tabular-nums text-foreground">
            {(org.users?.length ?? 0).toLocaleString()}
          </span>
        ),
      },
      {
        title: t(T.moderators),
        key: 'moderators',
        width: 110,
        align: 'right',
        render: (_: unknown, org: Organization) => {
          const count = countModerators(org);
          return count > 0 ? (
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-muted px-2 font-mono text-xs tabular-nums text-foreground">
              {count}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
      {
        title: t(T.mainTag),
        key: 'isDefault',
        width: 108,
        align: 'center',
        render: (_: unknown, org: Organization) =>
          org.isDefault ? (
            <Tag color="gold" className="inline-flex w-fit items-center gap-1">
              <Star size={12} />
              {t(T.mainTag)}
            </Tag>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        title: t(T.actions),
        key: 'actions',
        width: 128,
        align: 'right',
        fixed: 'right',
        render: (_: unknown, org: Organization) => (
          <div
            className="flex items-center justify-end gap-0.5"
            onClick={(e) => e.stopPropagation()}
            data-stop-row-click
          >
            <Button
              size="small"
              variant="ghost"
              icon={<Eye size={14} />}
              title={t(T.view)}
              onClick={() => navigate(`/dashboard/organizations/${org.id}`)}
            />
            <Button
              size="small"
              variant="ghost"
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
                variant="ghost"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
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
    <div className="space-y-6">
      <PageHeader
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

      <ListSurface
        loading={loading && !initialLoading}
        toolbar={
          <FilterBar>
            <Search size={16} className="shrink-0 text-muted-foreground" aria-hidden />
            <Input
              value={search.value}
              placeholder={t(T.search)}
              onChange={(e) => search.onChange(e.target.value)}
              className="h-8 max-w-xs flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:border-transparent focus-visible:ring-0"
            />
            <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">
              {organizations.length}
            </span>
          </FilterBar>
        }
      >
        {initialLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Spin />
          </div>
        ) : organizations.length === 0 && !loading ? (
          <NoData text={t(T.noData)} />
        ) : (
          <Table
            rowKey="id"
            dataSource={organizations}
            columns={columns}
            loading={false}
            variant="flat"
            className="!rounded-none !border-0"
            pagination={{
              pageSize: 20,
              showSizeChanger: false,
              showTotal: (total) => `${t(T.total)}: ${total}`,
            }}
            onRow={(record) => ({
              onClick: () => navigate(`/dashboard/organizations/${record.id}`),
              className: 'cursor-pointer hover:bg-muted/40',
            })}
          />
        )}
      </ListSurface>

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
