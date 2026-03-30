import { useRef, useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Spin,
  Tag,
  Popconfirm,
  message,
  Avatar
} from 'antd';
import { Plus, Trash2, Mail, Shield, Filter, Search } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from '@/hooks/useTranslation';
import { useQueryParams } from '@/hooks/useQueryParams';
import { useFetch, usePaginatedFetch } from '@/hooks/useFetch';
import HighlightText from '@/components/HighlightText';
import NoData from '@/components/NoData';
import apiService from '@/services/api';
import type { Organization } from '@/services/api';

const T = {
  title: { uz: 'Moderatorlar', en: 'Moderators', ru: 'Модераторы' },
  addModerator: {
    uz: 'Moderator qo`shish',
    en: 'Add Moderator',
    ru: 'Добавить модератора'
  },
  email: { uz: 'Email', en: 'Email', ru: 'Email' },
  password: { uz: 'Parol', en: 'Password', ru: 'Пароль' },
  firstName: { uz: 'Ism', en: 'First name', ru: 'Имя' },
  lastName: { uz: 'Familiya', en: 'Last name', ru: 'Фамилия' },
  organization: { uz: 'Tashkilot', en: 'Organization', ru: 'Организация' },
  save: { uz: 'Saqlash', en: 'Save', ru: 'Сохранить' },
  cancel: { uz: 'Bekor qilish', en: 'Cancel', ru: 'Отмена' },
  deleteConfirm: {
    uz: 'Rostdan o`chirmoqchimisiz?',
    en: 'Are you sure?',
    ru: 'Вы уверены?'
  },
  noData: {
    uz: 'Moderatorlar yo`q',
    en: 'No moderators',
    ru: 'Нет модераторов'
  },
  search: { uz: 'Qidirish...', en: 'Search...', ru: 'Поиск...' },
  optional: { uz: 'Ixtiyoriy', en: 'Optional', ru: 'Необязательно' },
  total: { uz: 'Jami', en: 'Total', ru: 'Всего' }
} as const;

const QP_DEFAULTS = { search: undefined } as const;

const Moderators = () => {
  const { t } = useTranslation();
  const { params: qp, setParam } =
    useQueryParams<typeof QP_DEFAULTS>(QP_DEFAULTS);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const { data: organizations } = useFetch(
    ['organizations'],
    () => apiService.getOrganizations(),
    [] as Organization[]
  );
  const {
    data: moderators,
    total,
    loading,
    initialLoading,
    refetch
  } = usePaginatedFetch(['moderators', qp.search], () =>
    apiService.getModerators({ search: qp.search || undefined })
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const handleSearchChange = (value: string) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setParam('search', value || undefined);
    }, 400);
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await apiService.createModerator(values);
      message.success('Moderator yaratildi');
      setModalOpen(false);
      form.resetFields();
      refetch();
    } catch {
      /* validation */
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await apiService.deleteUser(id);
    message.success('Moderator o`chirildi');
    refetch();
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
          onChange={(e) => handleSearchChange(e.target.value)}
        />
        <Tag className="text-xs">
          {t(T.total)}: {total}
        </Tag>
        <div className="ml-auto">
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={() => {
              setModalOpen(true);
              form.resetFields();
            }}
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
        <div
          className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 transition-opacity duration-150 ${loading ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <AnimatePresence mode="popLayout">
            {moderators.map((mod) => (
              <motion.div
                key={mod.id}
                layoutId={mod.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <Card
                  className="!border-slate-200 dark:!border-slate-700/60 h-full"
                  bodyStyle={{ padding: '16px 20px' }}
                >
                  <div className="flex items-start gap-4">
                    <Avatar
                      size={48}
                      src={
                        mod.avatarUrl
                          ? `http://localhost:3000${mod.avatarUrl}`
                          : undefined
                      }
                      className="flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-700"
                    >
                      {(mod.firstName?.[0] || '') + (mod.lastName?.[0] || '')}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                        <HighlightText
                          text={`${mod.firstName} ${mod.lastName}`}
                          highlight={qp.search}
                        />
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                        <Mail size={12} />{' '}
                        <HighlightText text={mod.email} highlight={qp.search} />
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <Tag color="blue">
                          <div className="flex items-center px-2 gap-1">
                            <Shield size={15} />
                            <span>MODERATOR</span>
                          </div>
                        </Tag>
                      </div>
                    </div>
                    <Popconfirm
                      title={t(T.deleteConfirm)}
                      onConfirm={() => handleDelete(mod.id)}
                    >
                      <Button size="small" danger icon={<Trash2 size={14} />} />
                    </Popconfirm>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <Modal
        title={t(T.addModerator)}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleCreate}
        confirmLoading={saving}
        okText={t(T.save)}
        cancelText={t(T.cancel)}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="firstName"
            label={t(T.firstName)}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="lastName"
            label={t(T.lastName)}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label={t(T.email)}
            rules={[{ required: true, type: 'email' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="password"
            label={t(T.password)}
            rules={[{ required: true, min: 6 }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="organizationId"
            label={`${t(T.organization)} (${t(T.optional)})`}
          >
            <Select
              allowClear
              placeholder={t(T.organization)}
              options={organizations.map((o) => ({
                value: o.id,
                label: o.name
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Moderators;
