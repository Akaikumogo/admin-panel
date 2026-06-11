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
} from 'antd';
import { Plus, Pencil, Trash2, Filter, Search, BookOpen, ChevronRight } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
  addTheory: { uz: 'Nazariya qo`shish', en: 'Add Theory', ru: 'Добавить теорию' },
  editTheory: { uz: 'Nazariyani tahrirlash', en: 'Edit Theory', ru: 'Редактировать теорию' },
  theoryName: { uz: 'Nazariya nomi', en: 'Theory name', ru: 'Название теории' },
  content: { uz: 'Mazmun', en: 'Content', ru: 'Содержание' },
  level: { uz: 'Modul', en: 'Module', ru: 'Модуль' },
  allLevels: { uz: 'Barcha modullar', en: 'All modules', ru: 'Все модули' },
  save: { uz: 'Saqlash', en: 'Save', ru: 'Сохранить' },
  cancel: { uz: 'Bekor qilish', en: 'Cancel', ru: 'Отмена' },
  deleteConfirm: { uz: 'Rostdan o`chirmoqchimisiz?', en: 'Are you sure?', ru: 'Вы уверены?' },
  noData: { uz: 'Nazariyalar yo`q', en: 'No theories', ru: 'Нет теорий' },
  search: { uz: 'Qidirish...', en: 'Search...', ru: 'Поиск...' },
  total: { uz: 'Jami', en: 'Total', ru: 'Всего' },
} as const;

const PAGE_SIZE = 15;
const QP_DEFAULTS = { search: undefined, levelId: undefined, lessonId: undefined } as const;

const Theories = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { params: qp, setParam, setParams } = useQueryParams<typeof QP_DEFAULTS>(QP_DEFAULTS);

  const { data: levels } = useFetch(['levels'], () => apiService.getLevels(), [] as Level[]);

  const lessonsQ = useQuery({
    queryKey: ['lessons-for-theories-filter', qp.levelId],
    queryFn: async () => {
      if (!qp.levelId) return [] as Theory[];
      const tree = await apiService.getTheoryTreeByLevel(qp.levelId);
      return tree.filter((t) => t.theoryRole === 'lesson' || !t.parentTheoryId);
    },
    enabled: !!qp.levelId && !qp.lessonId,
  });

  const lessonQ = useQuery({
    queryKey: ['theory-lesson-context', qp.lessonId],
    queryFn: () => apiService.getTheoryById(qp.lessonId!),
    enabled: !!qp.lessonId,
  });

  const { data: theories, total, loading, initialLoading, loadingMore, hasMore, loadMore, refetch } =
    useInfiniteList(
      ['theories', qp.levelId, qp.search, qp.lessonId],
      (pg) =>
        apiService.getTheories({
          levelId: qp.lessonId ? undefined : qp.levelId,
          parentTheoryId: qp.lessonId || undefined,
          search: qp.search || undefined,
          page: pg,
          limit: PAGE_SIZE,
        }),
    );

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Theory | null>(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [parentOptions, setParentOptions] = useState<{ value: string; label: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleSearchChange = (value: string) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setParam('search', value || undefined), 400);
  };

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || loadingMore || !hasMore) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) loadMore();
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
        parentTheoryId: theory.parentTheoryId ?? null,
        title: theory.title,
        content: theory.content,
      });
    } else {
      form.resetFields();
      if (qp.lessonId && lessonQ.data) {
        form.setFieldsValue({ levelId: lessonQ.data.levelId, parentTheoryId: qp.lessonId });
      } else if (qp.levelId) {
        form.setFieldValue('levelId', qp.levelId);
      }
    }
  };

  const buildParentOptions = async (levelId?: string, excludeId?: string) => {
    if (!levelId) { setParentOptions([]); return; }
    const list = await apiService.getTheoriesByLevel(levelId);
    setParentOptions(
      list
        .filter((x) => x.id !== excludeId)
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((x) => ({ value: x.id, label: `#${x.orderIndex + 1} — ${x.title}` })),
    );
  };

  useEffect(() => {
    if (!modalOpen) return;
    const lvlId = editing?.levelId ?? form.getFieldValue('levelId');
    buildParentOptions(lvlId, editing?.id);
  }, [modalOpen, editing]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (editing && !can('contentTheories', 'update')) return;
    if (!editing && !can('contentTheories', 'create')) return;
    try {
      const values = await form.validateFields();
      setSaving(true);
      if (editing) {
        await apiService.updateTheory(editing.id, {
          parentTheoryId: values.parentTheoryId ?? null,
          title: values.title,
          content: values.content,
        });
        message.success(t({ uz: 'Nazariya yangilandi', en: 'Theory updated', ru: 'Теория обновлена' }));
      } else {
        await apiService.createTheory({
          levelId: values.levelId,
          parentTheoryId: values.parentTheoryId ?? null,
          title: values.title,
          content: values.content,
          theoryRole: values.parentTheoryId ? 'nazariya' : undefined,
        });
        message.success(t({ uz: 'Nazariya yaratildi', en: 'Theory created', ru: 'Теория создана' }));
      }
      setModalOpen(false);
      setEditing(null);
      refetch();
    } catch { /* validation */ } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!can('contentTheories', 'delete')) return;
    await apiService.deleteTheory(id);
    message.success(t({ uz: 'Nazariya o`chirildi', en: 'Theory deleted', ru: 'Теория удалена' }));
    refetch();
  };

  return (
    <div ref={scrollRef} className="p-6 space-y-4 overflow-y-auto h-[calc(100vh-100px)]">
      {qp.lessonId && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm dark:border-slate-700/60 dark:bg-white/5">
          <Button size="small" onClick={() => navigate('/dashboard/lessons')}>
            ← {t({ uz: 'Darslar', en: 'Lessons', ru: 'Уроки' })}
          </Button>
          {lessonQ.data && (
            <span className="text-slate-700 dark:text-slate-200">
              {t({ uz: 'Dars:', en: 'Lesson:', ru: 'Урок:' })} <strong>{lessonQ.data.title}</strong>
            </span>
          )}
          <Button type="link" size="small" className="ml-auto" onClick={() => setParam('lessonId', undefined)}>
            {t({ uz: 'Barcha nazariyalar', en: 'All theories', ru: 'Все теории' })}
          </Button>
        </div>
      )}

      {/* Filter toolbar */}
      <div className="flex items-center gap-3 flex-wrap bg-white dark:bg-[#141414] border border-slate-200 dark:border-slate-700/60 rounded-xl px-4 py-3">
        <Filter size={16} className="text-slate-400 flex-shrink-0" />
        <Input
          allowClear
          defaultValue={qp.search}
          prefix={<Search size={14} className="text-slate-400" />}
          placeholder={t(T.search)}
          style={{ width: 200 }}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
        {!qp.lessonId && (
          <Select
            allowClear
            placeholder={t(T.allLevels)}
            style={{ width: 220 }}
            value={qp.levelId}
            onChange={(v) => setParams({ levelId: v, search: qp.search, lessonId: qp.lessonId })}
            options={levels.map((l) => ({ value: l.id, label: l.title }))}
          />
        )}
        {!qp.lessonId && qp.levelId && (
          <Select
            allowClear
            placeholder={t({ uz: 'Dars', en: 'Lesson', ru: 'Урок' })}
            style={{ width: 260 }}
            value={qp.lessonId}
            loading={lessonsQ.isLoading}
            onChange={(v) => setParams({ levelId: qp.levelId, search: qp.search, lessonId: v })}
            options={(lessonsQ.data ?? []).map((l) => ({
              value: l.id,
              label: `#${l.orderIndex + 1} — ${l.title}`,
            }))}
          />
        )}
        <Tag className="text-xs font-medium">{total} ta</Tag>
        <div className="ml-auto">
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={() => openModal()}
            disabled={
              !can('contentTheories', 'create') ||
              (!!qp.lessonId && (lessonQ.isPending || lessonQ.isError || !lessonQ.data))
            }
          >
            {t(T.addTheory)}
          </Button>
        </div>
      </div>

      {/* List */}
      {initialLoading ? (
        <div className="flex items-center justify-center h-40"><Spin size="large" /></div>
      ) : theories.length === 0 && !loading ? (
        <NoData text={t(T.noData)} />
      ) : (
        <div className={`space-y-2 transition-opacity duration-150 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
          <AnimatePresence mode="popLayout">
            {theories.map((th, idx) => (
              <motion.div
                key={th.id}
                layoutId={th.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.18 }}
              >
                <div className="group flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-[#141414] px-4 py-3 hover:border-blue-300 dark:hover:border-blue-600/60 transition-colors">
                  {/* Number badge */}
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                      <BookOpen size={15} className="text-blue-500" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Title row */}
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        className="flex-1 min-w-0 text-left font-semibold text-slate-900 dark:text-white text-sm hover:text-blue-600 dark:hover:text-blue-400 transition-colors leading-snug"
                        onClick={() => navigate(`/dashboard/theories/${th.id}`)}
                      >
                        <span className="text-slate-400 mr-1.5">{idx + 1}.</span>
                        <HighlightText text={th.title} highlight={qp.search} />
                      </button>

                      {/* Actions — always visible on the right */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Button
                          size="small"
                          icon={<Pencil size={13} />}
                          onClick={() => openModal(th)}
                          disabled={!can('contentTheories', 'update')}
                          title={t(T.editTheory)}
                        />
                        <Popconfirm
                          title={t(T.deleteConfirm)}
                          onConfirm={() => handleDelete(th.id)}
                          disabled={!can('contentTheories', 'delete')}
                        >
                          <Button
                            size="small"
                            danger
                            icon={<Trash2 size={13} />}
                            disabled={!can('contentTheories', 'delete')}
                          />
                        </Popconfirm>
                        <Button
                          size="small"
                          type="text"
                          icon={<ChevronRight size={14} className="text-slate-400" />}
                          onClick={() => navigate(`/dashboard/theories/${th.id}`)}
                          title="Ochish"
                        />
                      </div>
                    </div>

                    {/* Meta row */}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {th.level && (
                        <Tag color="blue" className="!text-xs !m-0">{th.level.title}</Tag>
                      )}
                      {th.createdBy && (
                        <span className="text-xs text-slate-400">
                          {th.createdBy.firstName} {th.createdBy.lastName}
                        </span>
                      )}
                    </div>

                    {/* Content preview */}
                    {th.content && (
                      <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        <HighlightText text={th.content} highlight={qp.search} />
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {loadingMore && (
            <div className="flex justify-center py-4"><Spin /></div>
          )}
          {!hasMore && theories.length > 0 && (
            <p className="text-center text-xs text-slate-400 py-2">
              {total} ta nazariyadan {theories.length} tasi ko'rsatildi
            </p>
          )}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        title={
          <span className="font-semibold text-base">
            {editing ? t(T.editTheory) : t(T.addTheory)}
          </span>
        }
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditing(null); }}
        onOk={handleSave}
        confirmLoading={saving}
        okText={t(T.save)}
        cancelText={t(T.cancel)}
        width={700}
        styles={{ body: { maxHeight: '72vh', overflowY: 'auto', paddingTop: 8 } }}
        okButtonProps={{
          disabled: editing ? !can('contentTheories', 'update') : !can('contentTheories', 'create'),
        }}
      >
        <Form form={form} layout="vertical" size="middle">
          {!editing && qp.lessonId && lessonQ.data ? (
            <>
              <Form.Item name="levelId" hidden rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item name="parentTheoryId" hidden rules={[{ required: true }]}><Input /></Form.Item>
              <div className="mb-4 rounded-lg bg-blue-50 dark:bg-blue-500/10 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 border border-blue-100 dark:border-blue-500/20">
                {t({ uz: 'Dars:', en: 'Lesson:', ru: 'Урок:' })}{' '}
                <strong>{lessonQ.data.title}</strong>
              </div>
            </>
          ) : null}

          {!editing && !qp.lessonId && (
            <Form.Item name="levelId" label={t(T.level)} rules={[{ required: true }]}>
              <Select
                placeholder={t(T.level)}
                options={levels.map((l) => ({ value: l.id, label: l.title }))}
                onChange={(v) => {
                  form.setFieldValue('parentTheoryId', null);
                  buildParentOptions(v, undefined);
                }}
              />
            </Form.Item>
          )}

          {(editing || !qp.lessonId) && (
            <Form.Item name="parentTheoryId" label="Sub-nazariya (parent, ixtiyoriy)">
              <Select
                allowClear
                placeholder="Root nazariya (parent yo'q)"
                options={parentOptions}
                disabled={!form.getFieldValue('levelId') && !editing}
              />
            </Form.Item>
          )}

          <Form.Item name="title" label={t(T.theoryName)} rules={[{ required: true, message: 'Nom kiritilishi shart' }]}>
            <Input placeholder="Nazariya nomini kiriting..." size="large" />
          </Form.Item>

          <Form.Item name="content" label={t(T.content)}>
            <Input.TextArea
              rows={10}
              placeholder="Nazariya mazmunini yozing (ixtiyoriy)..."
              style={{ resize: 'vertical' }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Theories;
