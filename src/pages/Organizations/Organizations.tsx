import { useRef, useState } from 'react';
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
  Avatar,
  Select
} from 'antd';
import {
  Plus,
  Pencil,
  Trash2,
  Building2,
  UserPlus,
  UserMinus,
  Filter,
  Search
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from '@/hooks/useTranslation';
import { useQueryParams } from '@/hooks/useQueryParams';
import { useFetch } from '@/hooks/useFetch';
import HighlightText from '@/components/HighlightText';
import NoData from '@/components/NoData';
import apiService from '@/services/api';
import type { Organization } from '@/services/api';

const T = {
  title: { uz: 'Tashkilotlar', en: 'Organizations', ru: 'Организации' },
  addOrg: {
    uz: 'Tashkilot qo`shish',
    en: 'Add Organization',
    ru: 'Добавить организацию'
  },
  editOrg: {
    uz: 'Tashkilotni tahrirlash',
    en: 'Edit Organization',
    ru: 'Редактировать'
  },
  orgName: { uz: 'Tashkilot nomi', en: 'Organization name', ru: 'Название' },
  members: { uz: 'A`zolar', en: 'Members', ru: 'Участники' },
  addMember: { uz: 'A`zo qo`shish', en: 'Add Member', ru: 'Добавить' },
  removeMember: { uz: 'Chiqarish', en: 'Remove', ru: 'Удалить' },
  save: { uz: 'Saqlash', en: 'Save', ru: 'Сохранить' },
  cancel: { uz: 'Bekor qilish', en: 'Cancel', ru: 'Отмена' },
  deleteConfirm: {
    uz: 'Rostdan o`chirmoqchimisiz?',
    en: 'Are you sure?',
    ru: 'Вы уверены?'
  },
  noData: {
    uz: 'Tashkilotlar yo`q',
    en: 'No organizations',
    ru: 'Нет организаций'
  },
  search: { uz: 'Qidirish...', en: 'Search...', ru: 'Поиск...' },
  selectUser: {
    uz: 'Foydalanuvchini tanlang',
    en: 'Select user',
    ru: 'Выберите пользователя'
  }
} as const;

const QP_DEFAULTS = { search: undefined } as const;

const Organizations = () => {
  const { t } = useTranslation();
  const { params: qp, setParam } = useQueryParams<typeof QP_DEFAULTS>(QP_DEFAULTS);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const {
    data: organizations, loading, initialLoading, refetch: refetchOrgs,
  } = useFetch(
    ['organizations', qp.search],
    () => apiService.getOrganizations({ search: qp.search || undefined }),
    [] as Organization[],
  );
  const { data: allUsers } = useFetch(
    ['all-users'],
    async () => { const res = await apiService.getUsers(); return res.data; },
    [] as { id: string; firstName: string; lastName: string; email: string }[],
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Organization | null>(null);
  const [assignModal, setAssignModal] = useState<{ open: boolean; orgId: string }>({ open: false, orgId: '' });
  const [form] = Form.useForm();
  const [assignForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const openModal = (org?: Organization) => {
    setEditing(org ?? null);
    setModalOpen(true);
    if (org) {
      form.setFieldsValue({ name: org.name });
    } else {
      form.resetFields();
    }
  };

  const handleSave = async () => {
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
    await apiService.deleteOrganization(id);
    message.success('Tashkilot o`chirildi');
    refetchOrgs();
  };

  const handleAssignUser = async () => {
    try {
      const values = await assignForm.validateFields();
      await apiService.assignUserToOrg(assignModal.orgId, values.userId);
      message.success('Foydalanuvchi biriktirildi');
      setAssignModal({ open: false, orgId: '' });
      assignForm.resetFields();
      refetchOrgs();
    } catch {
      /* validation */
    }
  };

  const handleRemoveUser = async (orgId: string, userId: string) => {
    await apiService.removeUserFromOrg(orgId, userId);
    message.success('Foydalanuvchi chiqarildi');
    refetchOrgs();
  };

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
          onChange={(e) => {
            if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
            const val = e.target.value;
            searchTimerRef.current = setTimeout(
              () => setParam('search', val || undefined),
              400
            );
          }}
        />
        <div className="ml-auto">
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={() => openModal()}
          >
            {t(T.addOrg)}
          </Button>
        </div>
      </div>

      {initialLoading ? (
        <div className="flex items-center justify-center h-32">
          <Spin />
        </div>
      ) : organizations.length === 0 && !loading ? (
        <NoData text={t(T.noData)} />
      ) : (
        <div
          className={`grid grid-cols-1 lg:grid-cols-2 gap-4 transition-opacity duration-150 ${loading ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <AnimatePresence mode="popLayout">
            {organizations.map((org) => (
              <motion.div
                key={org.id}
                layoutId={org.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="!border-slate-200 dark:!border-slate-700/60 h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                        <Building2 size={20} className="text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          <HighlightText
                            text={org.name}
                            highlight={qp.search}
                          />
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {org.users?.length || 0} {t(T.members).toLowerCase()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="small"
                        icon={<UserPlus size={14} />}
                        onClick={() => {
                          setAssignModal({ open: true, orgId: org.id });
                          assignForm.resetFields();
                        }}
                      />
                      <Button
                        size="small"
                        icon={<Pencil size={14} />}
                        onClick={() => openModal(org)}
                      />
                      <Popconfirm
                        title={t(T.deleteConfirm)}
                        onConfirm={() => handleDelete(org.id)}
                      >
                        <Button
                          size="small"
                          danger
                          icon={<Trash2 size={14} />}
                        />
                      </Popconfirm>
                    </div>
                  </div>

                  {org.users && org.users.length > 0 && (
                    <div className="space-y-2">
                      {org.users.map((uo) => (
                        <div
                          key={uo.id}
                          className="flex items-center justify-between bg-slate-50 dark:bg-black/20 rounded-lg px-3 py-2"
                        >
                          <div className="flex items-center gap-2">
                            <Avatar size={28} className="bg-blue-500 text-xs">
                              {(uo.user.firstName?.[0] || '') +
                                (uo.user.lastName?.[0] || '')}
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium text-slate-900 dark:text-white">
                                {uo.user.firstName} {uo.user.lastName}
                              </p>
                              <p className="text-xs text-slate-400">
                                {uo.user.email}
                              </p>
                            </div>
                            <Tag className="text-xs">{uo.user.role}</Tag>
                          </div>
                          <Popconfirm
                            title={t(T.deleteConfirm)}
                            onConfirm={() =>
                              handleRemoveUser(org.id, uo.user.id)
                            }
                          >
                            <Button
                              size="small"
                              danger
                              type="text"
                              icon={<UserMinus size={12} />}
                            />
                          </Popconfirm>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
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
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label={t(T.orgName)}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t(T.addMember)}
        open={assignModal.open}
        onCancel={() => setAssignModal({ open: false, orgId: '' })}
        onOk={handleAssignUser}
        okText={t(T.save)}
        cancelText={t(T.cancel)}
      >
        <Form form={assignForm} layout="vertical">
          <Form.Item
            name="userId"
            label={t(T.selectUser)}
            rules={[{ required: true }]}
          >
            <Select
              showSearch
              placeholder={t(T.selectUser)}
              optionFilterProp="label"
              options={allUsers.map((u) => ({
                value: u.id,
                label: `${u.firstName} ${u.lastName} (${u.email})`
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Organizations;
