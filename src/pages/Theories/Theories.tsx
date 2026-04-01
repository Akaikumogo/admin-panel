import { useCallback, useEffect, useRef, useState } from 'react';
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
  Card
} from 'antd';
import { Plus, Pencil, Trash2, Filter, Search, BookOpen } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import { useQueryParams } from '@/hooks/useQueryParams';
import { useFetch } from '@/hooks/useFetch';
import { useInfiniteList } from '@/hooks/useInfiniteList';
import HighlightText from '@/components/HighlightText';
import NoData from '@/components/NoData';
import apiService from '@/services/api';
import type { Level, Theory } from '@/services/api';
import { can } from '@/utils/can';

const T = {
  title: { uz: 'Nazariyalar', en: 'Theories', ru: 'Теории' },
  addTheory: {
    uz: 'Nazariya qo`shish',
    en: 'Add Theory',
    ru: 'Добавить теорию'
  },
  editTheory: {
    uz: 'Nazariyani tahrirlash',
    en: 'Edit Theory',
    ru: 'Редактировать теорию'
  },
  theoryName: { uz: 'Nazariya nomi', en: 'Theory name', ru: 'Название теории' },
  content: { uz: 'Mazmun', en: 'Content', ru: 'Содержание' },
  level: { uz: 'Modul', en: 'Module', ru: 'Модуль' },
  allLevels: { uz: 'Barcha modullar', en: 'All modules', ru: 'Все модули' },
  active: { uz: 'Faol', en: 'Active', ru: 'Активный' },
  save: { uz: 'Saqlash', en: 'Save', ru: 'Сохранить' },
  cancel: { uz: 'Bekor qilish', en: 'Cancel', ru: 'Отмена' },
  deleteConfirm: {
    uz: 'Rostdan o`chirmoqchimisiz?',
    en: 'Are you sure?',
    ru: 'Вы уверены?'
  },
  noData: { uz: 'Nazariyalar yo`q', en: 'No theories', ru: 'Нет теорий' },
  search: { uz: 'Qidirish...', en: 'Search...', ru: 'Поиск...' },
  total: { uz: 'Jami', en: 'Total', ru: 'Всего' }
} as const;

const PAGE_SIZE = 15;

const QP_DEFAULTS = { search: undefined, levelId: undefined } as const;

const Theories = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    params: qp,
    setParam,
    setParams
  } = useQueryParams<typeof QP_DEFAULTS>(QP_DEFAULTS);

  const { data: levels } = useFetch(
    ['levels'],
    () => apiService.getLevels(),
    [] as Level[]
  );
  const {
    data: theories,
    total,
    loading,
    initialLoading,
    loadingMore,
    hasMore,
    loadMore,
    refetch
  } = useInfiniteList(
    ['theories', qp.levelId, qp.search],
    (pg) =>
      apiService.getTheories({
        levelId: qp.levelId,
        search: qp.search || undefined,
        page: pg,
        limit: PAGE_SIZE
      }),
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Theory | null>(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleSearchChange = (value: string) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setParam('search', value || undefined);
    }, 400);
  };

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || loadingMore || !hasMore) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
      loadMore();
    }
  }, [loadingMore, hasMore, loadMore]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const openModal = (theory?: Theory) => {
    if (theory && !can('contentTheories', 'update')) return;
    if (!theory && !can('contentTheories', 'create')) return;
    setEditing(theory ?? null);
    setModalOpen(true);
    if (theory) {
      form.setFieldsValue({
        levelId: theory.levelId,
        title: theory.title,
        content: theory.content
      });
    } else {
      form.resetFields();
      if (qp.levelId) {
        form.setFieldValue('levelId', qp.levelId);
      }
    }
  };

  const handleSave = async () => {
    if (editing && !can('contentTheories', 'update')) return;
    if (!editing && !can('contentTheories', 'create')) return;
    try {
      const values = await form.validateFields();
      setSaving(true);
      if (editing) {
        await apiService.updateTheory(editing.id, {
          title: values.title,
          content: values.content
        });
        message.success(
          t({
            uz: 'Nazariya yangilandi',
            en: 'Theory updated',
            ru: 'Теория обновлена'
          })
        );
      } else {
        await apiService.createTheory({
          levelId: values.levelId,
          title: values.title,
          content: values.content
        });
        message.success(
          t({
            uz: 'Nazariya yaratildi',
            en: 'Theory created',
            ru: 'Теория создана'
          })
        );
      }
      setModalOpen(false);
      setEditing(null);
      refetch();
    } catch {
      /* validation */
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!can('contentTheories', 'delete')) return;
    await apiService.deleteTheory(id);
    message.success(
      t({
        uz: 'Nazariya o`chirildi',
        en: 'Theory deleted',
        ru: 'Теория удалена'
      })
    );
    refetch();
  };

  return (
    <div
      ref={scrollRef}
      className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-100px)]"
    >
      <div className="flex items-center gap-3 flex-wrap bg-white dark:bg-[#141414] border border-slate-200 dark:border-slate-700/60 rounded-lg px-4 py-3">
        <Filter size={16} className="text-slate-400" />
        <Input
          allowClear
          defaultValue={qp.search}
          prefix={<Search size={14} className="text-slate-400" />}
          placeholder={t(T.search)}
          style={{ width: 200 }}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
        <Select
          allowClear
          placeholder={t(T.allLevels)}
          style={{ width: 220 }}
          value={qp.levelId}
          onChange={(v) => setParams({ levelId: v, search: qp.search })}
          options={levels.map((l) => ({ value: l.id, label: l.title }))}
        />
        <Tag className="text-xs">{total} ta</Tag>
        <div className="ml-auto">
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={() => openModal()}
            disabled={!can('contentTheories', 'create')}
          >
            {t(T.addTheory)}
          </Button>
        </div>
      </div>

      {initialLoading ? (
        <div className="flex items-center justify-center h-32">
          <Spin />
        </div>
      ) : theories.length === 0 && !loading ? (
        <NoData text={t(T.noData)} />
      ) : (
        <div
          className={`space-y-3 transition-opacity duration-150 ${loading ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <AnimatePresence mode="popLayout">
            {theories.map((th, idx) => (
              <motion.div
                key={th.id}
                layoutId={th.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Card
                  className="!border-slate-200 dark:!border-slate-700/60"
                  bodyStyle={{ padding: '16px 20px' }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <BookOpen
                          size={16}
                          className="text-blue-500 flex-shrink-0"
                        />
                        <button
                          type="button"
                          className="font-medium text-slate-900 dark:text-white text-base truncate hover:underline text-left"
                          onClick={() => navigate(`/dashboard/theories/${th.id}`)}
                        >
                          {idx + 1}.{' '}
                          <HighlightText
                            text={th.title}
                            highlight={qp.search}
                          />
                        </button>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        {th.level && <Tag color="blue">{th.level.title}</Tag>}
                        {th.createdBy && (
                          <span className="text-slate-500 dark:text-slate-400">
                            {th.createdBy.firstName} {th.createdBy.lastName}
                          </span>
                        )}
                      </div>
                      {th.content && (
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                          <HighlightText
                            text={th.content}
                            highlight={qp.search}
                          />
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                      <Button
                        size="small"
                        icon={<Pencil size={14} />}
                        onClick={() => openModal(th)}
                        disabled={!can('contentTheories', 'update')}
                      />
                      <Popconfirm
                        title={t(T.deleteConfirm)}
                        onConfirm={() => handleDelete(th.id)}
                        disabled={!can('contentTheories', 'delete')}
                      >
                        <Button
                          size="small"
                          danger
                          icon={<Trash2 size={14} />}
                          disabled={!can('contentTheories', 'delete')}
                        />
                      </Popconfirm>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
          {loadingMore && (
            <div className="flex justify-center py-4">
              <Spin />
            </div>
          )}
          {!hasMore && theories.length > 0 && (
            <p className="text-center text-xs text-slate-400 py-2">
              {total} ta nazariyadan {theories.length} tasi ko'rsatildi
            </p>
          )}
        </div>
      )}

      <Modal
        title={editing ? t(T.editTheory) : t(T.addTheory)}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onOk={handleSave}
        confirmLoading={saving}
        okText={t(T.save)}
        cancelText={t(T.cancel)}
        width={640}
        okButtonProps={{
          disabled: editing
            ? !can('contentTheories', 'update')
            : !can('contentTheories', 'create'),
        }}
      >
        <Form form={form} layout="vertical">
          {!editing && (
            <Form.Item
              name="levelId"
              label={t(T.level)}
              rules={[{ required: true }]}
            >
              <Select
                placeholder={t(T.level)}
                options={levels.map((l) => ({ value: l.id, label: l.title }))}
              />
            </Form.Item>
          )}
          <Form.Item
            name="title"
            label={t(T.theoryName)}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="content" label={t(T.content)}>
            <Input.TextArea rows={8} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Theories;
