import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Spin,
  Switch,
  Tag,
  Popconfirm,
  message,
} from 'antd';
import { Plus, Pencil, Trash2, Filter, ArrowLeftRight, Search } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import { useQueryParams } from '@/hooks/useQueryParams';
import { useFetch } from '@/hooks/useFetch';
import { useInfiniteList } from '@/hooks/useInfiniteList';
import HighlightText from '@/components/HighlightText';
import NoData from '@/components/NoData';
import apiService from '@/services/api';
import type { Level, Theory, Question, QuestionType } from '@/services/api';
import { can } from '@/utils/can';

const T = {
  title: { uz: 'Savollar', en: 'Questions', ru: 'Вопросы' },
  addQuestion: { uz: 'Savol qo`shish', en: 'Add Question', ru: 'Добавить вопрос' },
  editQuestion: { uz: 'Savolni tahrirlash', en: 'Edit Question', ru: 'Редактировать вопрос' },
  prompt: { uz: 'Savol matni', en: 'Question text', ru: 'Текст вопроса' },
  level: { uz: 'Modul', en: 'Module', ru: 'Модуль' },
  theory: { uz: 'Nazariya', en: 'Theory', ru: 'Теория' },
  createdBy: { uz: 'Yaratgan', en: 'Created by', ru: 'Создатель' },
  options: { uz: 'Javob variantlari', en: 'Options', ru: 'Варианты' },
  optionText: { uz: 'Javob matni', en: 'Option text', ru: 'Текст варианта' },
  matchText: { uz: 'Mos javob', en: 'Match', ru: 'Соответствие' },
  correct: { uz: 'To`g`ri', en: 'Correct', ru: 'Верный' },
  addOption: { uz: 'Variant qo`shish', en: 'Add Option', ru: 'Добавить вариант' },
  active: { uz: 'Faol', en: 'Active', ru: 'Активный' },
  save: { uz: 'Saqlash', en: 'Save', ru: 'Сохранить' },
  cancel: { uz: 'Bekor qilish', en: 'Cancel', ru: 'Отмена' },
  deleteConfirm: { uz: 'Rostdan o`chirmoqchimisiz?', en: 'Are you sure?', ru: 'Вы уверены?' },
  noData: { uz: 'Ma`lumot yo`q', en: 'No data', ru: 'Нет данных' },
  allLevels: { uz: 'Barcha modullar', en: 'All modules', ru: 'Все модули' },
  allTheories: { uz: 'Barcha nazariyalar', en: 'All theories', ru: 'Все теории' },
  filter: { uz: 'Filter', en: 'Filter', ru: 'Фильтр' },
  search: { uz: 'Qidirish...', en: 'Search...', ru: 'Поиск...' },
  questionType: { uz: 'Savol turi', en: 'Question type', ru: 'Тип вопроса' },
  loadMore: { uz: 'Ko`proq yuklash', en: 'Load more', ru: 'Загрузить ещё' },
} as const;

const QUESTION_TYPE_LABELS: Record<QuestionType, { uz: string; en: string; ru: string }> = {
  SINGLE_CHOICE: { uz: 'Test (tanlash)', en: 'Single choice', ru: 'Одиночный выбор' },
  YES_NO: { uz: 'Ha / Yo`q', en: 'Yes / No', ru: 'Да / Нет' },
  MATCHING: { uz: 'Moslashtirish', en: 'Matching', ru: 'Сопоставление' },
};

const QUESTION_TYPE_COLORS: Record<QuestionType, string> = {
  SINGLE_CHOICE: 'blue',
  YES_NO: 'orange',
  MATCHING: 'purple',
};

const PAGE_SIZE = 15;

const QP_DEFAULTS = { search: undefined, levelId: undefined, theoryId: undefined } as const;

const Questions = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { params: qp, setParam, setParams } = useQueryParams<typeof QP_DEFAULTS>(QP_DEFAULTS);

  const { data: levels } = useFetch(['levels'], () => apiService.getLevels(), [] as Level[]);
  const { data: theories } = useFetch(
    ['theories-by-level', qp.levelId],
    () => qp.levelId ? apiService.getTheoriesByLevel(qp.levelId) : Promise.resolve([]),
    [] as Theory[],
  );

  const [form] = Form.useForm();
  const formLevelId = Form.useWatch('levelId', form);
  const { data: modalTheories, loading: loadingModalTheories } = useFetch(
    ['theories-by-level', 'modal', formLevelId],
    () => formLevelId ? apiService.getTheoriesByLevel(formLevelId) : Promise.resolve([]),
    [] as Theory[],
  );
  
  const {
    data: questions, total, loading, initialLoading, loadingMore, hasMore, loadMore, refetch,
  } = useInfiniteList(
    ['questions', qp.levelId, qp.theoryId, qp.search],
    (pg) => apiService.getQuestions({
      levelId: qp.levelId, theoryId: qp.theoryId,
      search: qp.search || undefined, page: pg, limit: PAGE_SIZE,
    }),
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedType, setSelectedType] = useState<QuestionType>('SINGLE_CHOICE');
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

  const openModal = (question?: Question) => {
    if (question && !can('contentQuestions', 'update')) return;
    if (!question && !can('contentQuestions', 'create')) return;
    setEditing(question ?? null);
    setModalOpen(true);
    if (question) {
      const qType = question.type || 'SINGLE_CHOICE';
      setSelectedType(qType);
      form.setFieldsValue({
        levelId: question.levelId,
        theoryId: question.theoryId,
        prompt: question.prompt,
        type: qType,
        isActive: question.isActive,
        options: question.options.map(o => ({
          id: o.id,
          optionText: o.optionText,
          isCorrect: o.isCorrect,
          matchText: o.matchText ?? '',
        })),
      });
    } else {
      setSelectedType('SINGLE_CHOICE');
      form.resetFields();
      form.setFieldsValue({
        type: 'SINGLE_CHOICE',
        options: [
          { optionText: '', isCorrect: false, matchText: '' },
          { optionText: '', isCorrect: false, matchText: '' },
        ],
      });
    }
  };

  const handleTypeChange = (val: QuestionType) => {
    setSelectedType(val);
    if (val === 'YES_NO') {
      form.setFieldsValue({
        options: [
          { optionText: 'Ha', isCorrect: true, matchText: '' },
          { optionText: 'Yo`q', isCorrect: false, matchText: '' },
        ],
      });
    } else if (val === 'MATCHING') {
      const currentOpts = form.getFieldValue('options') || [];
      if (currentOpts.length < 2) {
        form.setFieldsValue({
          options: [
            { optionText: '', isCorrect: true, matchText: '' },
            { optionText: '', isCorrect: true, matchText: '' },
          ],
        });
      }
    }
  };

  const handleSave = async () => {
    if (editing && !can('contentQuestions', 'update')) return;
    if (!editing && !can('contentQuestions', 'create')) return;
    try {
      const values = await form.validateFields();
      setSaving(true);
      if (editing) {
        await apiService.updateQuestion(editing.id, {
          prompt: values.prompt,
          type: values.type,
          isActive: values.isActive,
          options: values.options,
        });
        message.success('Savol yangilandi');
      } else {
        await apiService.createQuestion({
          levelId: values.levelId,
          theoryId: values.theoryId,
          prompt: values.prompt,
          type: values.type,
          isActive: values.isActive ?? true,
          options: values.options,
        });
        message.success('Savol yaratildi');
      }
      setModalOpen(false);
      setEditing(null);
      refetch();
    } catch { /* validation */ } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!can('contentQuestions', 'delete')) return;
    await apiService.deleteQuestion(id);
    message.success('Savol o`chirildi');
    refetch();
  };

  const renderOptionTag = (q: Question) => {
    if (q.type === 'MATCHING') {
      return q.options.map((opt) => (
        <Tag key={opt.id} color="purple" className="!flex !items-center !gap-1 !w-fit">
          {opt.optionText} <ArrowLeftRight size={12} className="mx-1 opacity-60" /> {opt.matchText}
        </Tag>
      ));
    }
    return q.options.map((opt) => (
      <Tag key={opt.id} color={opt.isCorrect ? 'green' : 'default'}>
        {opt.optionText}
      </Tag>
    ));
  };

  return (
    <div ref={scrollRef} className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-100px)]">
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
          style={{ width: 200 }}
          value={qp.levelId}
          onChange={(v) => setParams({ levelId: v, theoryId: undefined })}
          options={levels.map(l => ({ value: l.id, label: l.title }))}
        />
        <Select
          allowClear
          placeholder={t(T.allTheories)}
          style={{ width: 200 }}
          value={qp.theoryId}
          onChange={(v) => setParam('theoryId', v)}
          disabled={!qp.levelId}
          options={theories.map(th => ({ value: th.id, label: th.title }))}
        />
        <Tag className="text-xs">{total} ta</Tag>
        <div className="ml-auto">
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={() => openModal()}
            disabled={!can('contentQuestions', 'create')}
          >
            {t(T.addQuestion)}
          </Button>
        </div>
      </div>

      {initialLoading ? (
        <div className="flex items-center justify-center h-32"><Spin /></div>
      ) : questions.length === 0 && !loading ? (
        <NoData text={t(T.noData)} />
      ) : (
        <div className={`space-y-3 transition-opacity duration-150 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
          <AnimatePresence mode="popLayout">
            {questions.map((q, idx) => (
              <motion.div
                key={q.id}
                layoutId={q.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="!border-slate-200 dark:!border-slate-700/60" bodyStyle={{ padding: '16px 20px' }}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <button
                        type="button"
                        className="font-medium text-slate-900 dark:text-white text-base hover:underline text-left"
                        onClick={() => navigate(`/dashboard/questions/${q.id}`)}
                      >
                        {idx + 1}. <HighlightText text={q.prompt} highlight={qp.search} />
                      </button>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <Tag>{q.level?.title || t(T.level)}</Tag>
                        <Tag>{q.theory?.title || t(T.theory)}</Tag>
                        <Tag color={QUESTION_TYPE_COLORS[q.type || 'SINGLE_CHOICE']}>
                          {t(QUESTION_TYPE_LABELS[q.type || 'SINGLE_CHOICE'])}
                        </Tag>
                        {q.createdBy && (
                          <span>{t(T.createdBy)}: {q.createdBy.firstName} {q.createdBy.lastName}</span>
                        )}
                        <Tag color={q.isActive ? 'green' : 'default'}>
                          {q.isActive ? t(T.active) : 'Inactive'}
                        </Tag>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {renderOptionTag(q)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        size="small"
                        icon={<Pencil size={14} />}
                        onClick={() => openModal(q)}
                        disabled={!can('contentQuestions', 'update')}
                      />
                      <Popconfirm
                        title={t(T.deleteConfirm)}
                        onConfirm={() => handleDelete(q.id)}
                        disabled={!can('contentQuestions', 'delete')}
                      >
                        <Button
                          size="small"
                          danger
                          icon={<Trash2 size={14} />}
                          disabled={!can('contentQuestions', 'delete')}
                        />
                      </Popconfirm>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
          {loadingMore && (
            <div className="flex justify-center py-4"><Spin /></div>
          )}
          {!hasMore && questions.length > 0 && (
            <p className="text-center text-xs text-slate-400 py-2">
              {total} ta savoldan {questions.length} tasi ko'rsatildi
            </p>
          )}
        </div>
      )}

      <Modal
        title={editing ? t(T.editQuestion) : t(T.addQuestion)}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditing(null); }}
        onOk={handleSave}
        confirmLoading={saving}
        okText={t(T.save)}
        cancelText={t(T.cancel)}
        width={640}
        okButtonProps={{
          disabled: editing
            ? !can('contentQuestions', 'update')
            : !can('contentQuestions', 'create'),
        }}
      >
        <Form form={form} layout="vertical">
          {!editing && (
            <>
              <Form.Item name="levelId" label={t(T.level)} rules={[{ required: true }]}>
                <Select
                  placeholder={t(T.level)}
                  options={levels.map(l => ({ value: l.id, label: l.title }))}
                  onChange={() => form.setFieldValue('theoryId', undefined)}
                />
              </Form.Item>
              <Form.Item name="theoryId" label={t(T.theory)} rules={[{ required: true }]}>
                <Select
                  placeholder={t(T.theory)}
                  disabled={!formLevelId}
                  loading={!!formLevelId && loadingModalTheories}
                  options={modalTheories.map(th => ({ value: th.id, label: th.title }))}
                />
              </Form.Item>
            </>
          )}

          <Form.Item name="type" label={t(T.questionType)} rules={[{ required: true }]}>
            <Select onChange={handleTypeChange} options={[
              { value: 'SINGLE_CHOICE', label: t(QUESTION_TYPE_LABELS.SINGLE_CHOICE) },
              { value: 'YES_NO', label: t(QUESTION_TYPE_LABELS.YES_NO) },
              { value: 'MATCHING', label: t(QUESTION_TYPE_LABELS.MATCHING) },
            ]} />
          </Form.Item>

          <Form.Item name="prompt" label={t(T.prompt)} rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="isActive" label={t(T.active)} valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>

          <Form.List name="options">
            {(fields, { add, remove }) => (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t(T.options)}</label>
                {fields.map(({ key, name, ...restField }) => (
                  <div key={key} className="flex items-center gap-2">
                    <Form.Item {...restField} name={[name, 'optionText']} className="flex-1 !mb-0" rules={[{ required: true }]}>
                      <Input placeholder={t(T.optionText)} disabled={selectedType === 'YES_NO'} />
                    </Form.Item>
                    {selectedType === 'MATCHING' && (
                      <Form.Item {...restField} name={[name, 'matchText']} className="flex-1 !mb-0" rules={[{ required: true }]}>
                        <Input placeholder={t(T.matchText)} />
                      </Form.Item>
                    )}
                    {selectedType === 'YES_NO' ? (
                      <Form.Item {...restField} name={[name, 'isCorrect']} valuePropName="checked" className="!mb-0">
                        <Switch
                          checkedChildren={t(T.correct)}
                          onChange={(checked) => {
                            if (checked) {
                              const opts = form.getFieldValue('options');
                              form.setFieldsValue({
                                options: opts.map((o: Record<string, unknown>, i: number) => ({
                                  ...o,
                                  isCorrect: i === name,
                                })),
                              });
                            }
                          }}
                        />
                      </Form.Item>
                    ) : (
                      <Form.Item {...restField} name={[name, 'isCorrect']} valuePropName="checked" className="!mb-0">
                        <Switch checkedChildren={t(T.correct)} />
                      </Form.Item>
                    )}
                    {selectedType !== 'YES_NO' && fields.length > 2 && (
                      <Button size="small" danger icon={<Trash2 size={12} />} onClick={() => remove(name)} />
                    )}
                  </div>
                ))}
                {selectedType !== 'YES_NO' && (
                  <Button
                    type="dashed"
                    onClick={() => add({ optionText: '', isCorrect: selectedType === 'MATCHING', matchText: '' })}
                    icon={<Plus size={14} />}
                    block
                  >
                    {t(T.addOption)}
                  </Button>
                )}
              </div>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  );
};

export default Questions;
