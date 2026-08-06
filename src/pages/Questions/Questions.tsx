import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Button,
  Form,
  Input,
  Modal,
  Select,
  Spin,
  Switch,
  Tag,
  Popconfirm,
  message,
  Radio,
} from '@/components/ui';
import {
  Plus,
  Pencil,
  Trash2,
  Filter,
  ArrowLeftRight,
  Search,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from '@/hooks/useTranslation';
import { useQueryParams } from '@/hooks/useQueryParams';
import { useFetch } from '@/hooks/useFetch';
import { useInfiniteList } from '@/hooks/useInfiniteList';
import HighlightText from '@/components/HighlightText';
import NoData from '@/components/NoData';
import apiService from '@/services/api';
import type { Level, Theory, Question, QuestionType } from '@/services/api';
import { can } from '@/utils/can';
import { latinizeQuestionPayload } from '@/utils/cyrillicToLatin';

const T = {
  title: { uz: 'Savollar', en: 'Questions', ru: 'Вопросы' },
  addQuestion: { uz: 'Savol qo`shish', en: 'Add Question', ru: 'Добавить вопрос' },
  editQuestion: { uz: 'Savolni tahrirlash', en: 'Edit Question', ru: 'Редактировать вопрос' },
  prompt: { uz: 'Savol matni', en: 'Question text', ru: 'Текст вопроса' },
  level: { uz: 'Modul', en: 'Module', ru: 'Модуль' },
  theory: { uz: 'Nazariya', en: 'Theory', ru: 'Теория' },
  createdBy: { uz: 'Yaratgan', en: 'Created by', ru: 'Создатель' },
  options: { uz: 'Javob variantlari', en: 'Answer options', ru: 'Варианты ответа' },
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
  search: { uz: 'Qidirish...', en: 'Search...', ru: 'Поиск...' },
  questionType: { uz: 'Savol turi', en: 'Question type', ru: 'Тип вопроса' },
  positions: { uz: 'Lavozimlar', en: 'Positions', ru: 'Должности' },
  positionsHint: {
    uz: 'Bo`sh qoldirilsa — savol barcha xodimlarga tushadi. Tanlansa — faqat shu lavozimdagi xodimlarga.',
    en: 'Leave empty — the question is shown to everyone. Select — only for these positions.',
    ru: 'Пусто — вопрос виден всем. Выбрано — только этим должностям.',
  },
  allEmployees: { uz: 'Barcha xodimlarga', en: 'All employees', ru: 'Все сотрудники' },
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
  const { params: qp, setParam, setParams } = useQueryParams<typeof QP_DEFAULTS>(QP_DEFAULTS);

  const { data: levels } = useFetch(['levels'], () => apiService.getLevels(), [] as Level[]);
  const { data: theories } = useFetch(
    ['theories-by-level', qp.levelId],
    () => (qp.levelId ? apiService.getTheoriesByLevel(qp.levelId) : Promise.resolve([])),
    [] as Theory[],
  );

  const [form] = Form.useForm();
  const formLevelId = Form.useWatch('levelId', form);
  const { data: modalTheories, loading: loadingModalTheories } = useFetch(
    ['theories-by-level', 'modal', formLevelId],
    () => (formLevelId ? apiService.getTheoriesByLevel(formLevelId) : Promise.resolve([])),
    [] as Theory[],
  );

  const { data: questions, total, loading, initialLoading, loadingMore, hasMore, loadMore, refetch } =
    useInfiniteList(
      ['questions', qp.levelId, qp.theoryId, qp.search],
      (pg) =>
        apiService.getQuestions({
          levelId: qp.levelId,
          theoryId: qp.theoryId,
          search: qp.search || undefined,
          page: pg,
          limit: PAGE_SIZE,
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

  const fillQuestionForm = (question: Question) => {
    const qType = question.type || 'SINGLE_CHOICE';
    setSelectedType(qType);
    form.resetFields();
    form.setFieldsValue({
      levelId: question.levelId,
      theoryId: question.theoryId,
      prompt: question.prompt,
      type: qType,
      isActive: question.isActive,
      options: (question.options ?? []).map((o) => ({
        id: o.id,
        optionText: o.optionText ?? '',
        isCorrect: !!o.isCorrect,
        matchText: o.matchText ?? '',
      })),
    });
  };

  const openModal = (question?: Question) => {
    if (question && !can('contentQuestions', 'update')) return;
    if (!question && !can('contentQuestions', 'create')) return;
    setEditing(question ?? null);
    setModalOpen(true);
    if (!question) {
      setSelectedType('SINGLE_CHOICE');
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
    } else {
      const currentOpts: { optionText: string; isCorrect: boolean; matchText: string }[] =
        form.getFieldValue('options') || [];
      if (currentOpts.length < 2) {
        form.setFieldsValue({
          options: [
            { optionText: '', isCorrect: false, matchText: '' },
            { optionText: '', isCorrect: false, matchText: '' },
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
        await apiService.updateQuestion(
          editing.id,
          latinizeQuestionPayload({
            prompt: values.prompt,
            type: values.type,
            isActive: values.isActive,
            options: values.options,
          }),
        );
        message.success('Savol yangilandi');
      } else {
        await apiService.createQuestion(
          latinizeQuestionPayload({
            levelId: values.levelId,
            theoryId: values.theoryId,
            prompt: values.prompt,
            type: values.type,
            isActive: values.isActive ?? true,
            options: values.options,
          }),
        );
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

  return (
    <div ref={scrollRef} className="p-6 space-y-4 overflow-y-auto h-[calc(100vh-100px)]">
      {/* Filter toolbar */}
      <div className="flex items-center gap-3 flex-wrap bg-card border border-border rounded-xl px-4 py-3">
        <Filter size={16} className="text-slate-400 flex-shrink-0" />
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
          options={levels.map((l) => ({ value: l.id, label: l.title }))}
        />
        <Select
          allowClear
          placeholder={t(T.allTheories)}
          style={{ width: 200 }}
          value={qp.theoryId}
          onChange={(v) => setParam('theoryId', v)}
          disabled={!qp.levelId}
          options={theories.map((th) => ({ value: th.id, label: th.title }))}
        />
        <Tag className="text-xs font-medium">{total} ta</Tag>
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

      {/* Question list */}
      {initialLoading ? (
        <div className="flex items-center justify-center h-40"><Spin size="large" /></div>
      ) : questions.length === 0 && !loading ? (
        <NoData text={t(T.noData)} />
      ) : (
        <div className={`space-y-2 transition-opacity duration-150 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
          <AnimatePresence mode="popLayout">
            {questions.map((q, idx) => (
              <motion.div
                key={q.id}
                layoutId={q.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.18 }}
              >
                <div className="group rounded-xl border border-slate-200 dark:border-slate-700/60 bg-card px-4 py-3 hover:border-blue-300 dark:hover:border-blue-600/60 transition-colors">
                  {/* Top row: number + type + actions */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      {/* Question number */}
                      <span className="flex-shrink-0 mt-0.5 text-xs font-bold text-slate-400 w-6 text-right">
                        {idx + 1}.
                      </span>
                      {/* Question text — wraps naturally */}
                      <p className="text-sm font-medium text-slate-900 dark:text-white leading-snug">
                        <HighlightText text={q.prompt} highlight={qp.search} />
                      </p>
                    </div>

                    {/* Actions — always visible, never pushed off */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Button
                        size="small"
                        icon={<Pencil size={13} />}
                        onClick={() => openModal(q)}
                        disabled={!can('contentQuestions', 'update')}
                        title={t(T.editQuestion)}
                      />
                      <Popconfirm
                        title={t(T.deleteConfirm)}
                        onConfirm={() => handleDelete(q.id)}
                        disabled={!can('contentQuestions', 'delete')}
                      >
                        <Button
                          size="small"
                          danger
                          icon={<Trash2 size={13} />}
                          disabled={!can('contentQuestions', 'delete')}
                        />
                      </Popconfirm>
                    </div>
                  </div>

                  {/* Meta: module, theory, type, author */}
                  <div className="mt-2 ml-8 flex flex-wrap items-center gap-1.5">
                    {q.level && <Tag className="!text-xs !m-0">{q.level.title}</Tag>}
                    {q.theory && <Tag className="!text-xs !m-0">{q.theory.title}</Tag>}
                    <Tag color={QUESTION_TYPE_COLORS[q.type || 'SINGLE_CHOICE']} className="!text-xs !m-0">
                      {t(QUESTION_TYPE_LABELS[q.type || 'SINGLE_CHOICE'])}
                    </Tag>
                    <Tag color={q.isActive ? 'green' : 'default'} className="!text-xs !m-0">
                      {q.isActive ? t(T.active) : 'Nofaol'}
                    </Tag>
                    {q.positionLinks?.length ? (
                      q.positionLinks.map((l) => (
                        <Tag key={l.id} color="geekblue" className="!text-xs !m-0">
                          {l.position?.title ?? '—'}
                        </Tag>
                      ))
                    ) : (
                      <Tag color="default" className="!text-xs !m-0">
                        {t(T.allEmployees)}
                      </Tag>
                    )}
                    {q.createdBy && (
                      <span className="text-xs text-slate-400">
                        {q.createdBy.firstName} {q.createdBy.lastName}
                      </span>
                    )}
                  </div>

                  {/* Options display */}
                  {q.options.length > 0 && (
                    <div className="mt-2.5 ml-8 flex flex-wrap gap-1.5">
                      {q.type === 'MATCHING'
                        ? q.options.map((opt) => (
                            <div
                              key={opt.id}
                              className="inline-flex items-center gap-1.5 rounded-md border border-purple-200 dark:border-purple-700/50 bg-purple-50 dark:bg-purple-500/10 px-2.5 py-1 text-xs text-purple-800 dark:text-purple-200"
                            >
                              <span className="font-medium">{opt.optionText}</span>
                              <ArrowLeftRight size={11} className="opacity-50" />
                              <span>{opt.matchText}</span>
                            </div>
                          ))
                        : q.options.map((opt) => (
                            <div
                              key={opt.id}
                              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                                opt.isCorrect
                                  ? 'border-green-200 dark:border-green-700/50 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-300'
                                  : 'border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {opt.isCorrect ? (
                                <CheckCircle2 size={11} className="text-green-500 flex-shrink-0" />
                              ) : (
                                <XCircle size={11} className="text-slate-300 dark:text-slate-600 flex-shrink-0" />
                              )}
                              {opt.optionText}
                            </div>
                          ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {loadingMore && <div className="flex justify-center py-4"><Spin /></div>}
          {!hasMore && questions.length > 0 && (
            <p className="text-center text-xs text-slate-400 py-2">
              {total} ta savoldan {questions.length} tasi ko'rsatildi
            </p>
          )}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        title={
          <span className="font-semibold text-base">
            {editing ? t(T.editQuestion) : t(T.addQuestion)}
          </span>
        }
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditing(null); }}
        afterOpenChange={(open) => {
          if (!open) return;
          if (editing) {
            fillQuestionForm(editing);
          } else {
            setSelectedType('SINGLE_CHOICE');
            form.resetFields();
            form.setFieldsValue({
              type: 'SINGLE_CHOICE',
              isActive: true,
              options: [
                { optionText: '', isCorrect: false, matchText: '' },
                { optionText: '', isCorrect: false, matchText: '' },
                { optionText: '', isCorrect: false, matchText: '' },
              ],
            });
          }
        }}
        onOk={handleSave}
        confirmLoading={saving}
        okText={t(T.save)}
        cancelText={t(T.cancel)}
        width={720}
        destroyOnClose
        styles={{ body: { maxHeight: '75vh', overflowY: 'auto', paddingTop: 8 } }}
        okButtonProps={{
          disabled: editing ? !can('contentQuestions', 'update') : !can('contentQuestions', 'create'),
        }}
      >
        <Form form={form} layout="vertical" size="middle" preserve={false}>
          {/* Module + Theory — only when creating */}
          {!editing && (
            <div className="grid grid-cols-2 gap-4">
              <Form.Item name="levelId" label={t(T.level)} rules={[{ required: true, message: 'Modulni tanlang' }]}>
                <Select
                  placeholder={t(T.allLevels)}
                  options={levels.map((l) => ({ value: l.id, label: l.title }))}
                  onChange={() => {
                    form.setFieldValue('theoryId', undefined);
                  }}
                />
              </Form.Item>
              <Form.Item name="theoryId" label={t(T.theory)} rules={[{ required: true, message: 'Nazariyani tanlang' }]}>
                <Select
                  placeholder={t(T.allTheories)}
                  disabled={!formLevelId}
                  loading={!!formLevelId && loadingModalTheories}
                  options={modalTheories.map((th) => ({ value: th.id, label: th.title }))}
                />
              </Form.Item>
            </div>
          )}

          {/* Question type */}
          <Form.Item name="type" label={t(T.questionType)} rules={[{ required: true }]}>
            <Radio.Group onChange={(e) => handleTypeChange(e.target.value as QuestionType)} buttonStyle="solid">
              <Radio.Button value="SINGLE_CHOICE">
                <span className="flex items-center gap-1.5">
                  <HelpCircle size={13} />
                  {t(QUESTION_TYPE_LABELS.SINGLE_CHOICE)}
                </span>
              </Radio.Button>
              <Radio.Button value="YES_NO">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} />
                  {t(QUESTION_TYPE_LABELS.YES_NO)}
                </span>
              </Radio.Button>
              <Radio.Button value="MATCHING">
                <span className="flex items-center gap-1.5">
                  <ArrowLeftRight size={13} />
                  {t(QUESTION_TYPE_LABELS.MATCHING)}
                </span>
              </Radio.Button>
            </Radio.Group>
          </Form.Item>

          {/* Question text */}
          <Form.Item
            name="prompt"
            label={t(T.prompt)}
            rules={[{ required: true, message: 'Savol matni kiritilishi shart' }]}
          >
            <Input.TextArea
              rows={3}
              placeholder="Savol matnini kiriting..."
              style={{ resize: 'vertical' }}
            />
          </Form.Item>

          {/* Positions — bo'sh bo'lsa savol hammaga tushadi */}
          {/* Active toggle */}
          <Form.Item name="isActive" label={t(T.active)} valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>

          {/* Options */}
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
              {t(T.options)}
            </p>

            {selectedType === 'MATCHING' && (
              <div className="mb-3 rounded-lg bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 px-3 py-2 text-xs text-purple-700 dark:text-purple-300">
                Chap tomonda variant matni, o'ng tomonda mos javobni yozing.
              </div>
            )}

            <Form.List name="options">
              {(fields, { add, remove }) => (
                <div className="space-y-2">
                  {fields.map(({ key, name, ...restField }) => (
                    <div
                      key={key}
                      className={`rounded-xl border px-3 py-3 transition-colors ${
                        selectedType === 'MATCHING'
                          ? 'border-purple-200 dark:border-purple-700/40 bg-purple-50/50 dark:bg-purple-500/5'
                          : 'border-slate-200 dark:border-slate-700/40 bg-slate-50/50 dark:bg-slate-800/20'
                      }`}
                    >
                      {selectedType === 'MATCHING' ? (
                        /* Matching: A → B layout */
                        <div className="flex items-center gap-2">
                          <Form.Item
                            {...restField}
                            name={[name, 'optionText']}
                            className="flex-1 !mb-0"
                            rules={[{ required: true, message: '' }]}
                          >
                            <Input placeholder="Variant (chap)" />
                          </Form.Item>
                          <ArrowLeftRight size={16} className="flex-shrink-0 text-slate-400" />
                          <Form.Item
                            {...restField}
                            name={[name, 'matchText']}
                            className="flex-1 !mb-0"
                            rules={[{ required: true, message: '' }]}
                          >
                            <Input placeholder="Mos javob (o'ng)" />
                          </Form.Item>
                          {fields.length > 2 && (
                            <Button
                              size="small"
                              danger
                              type="text"
                              icon={<Trash2 size={14} />}
                              onClick={() => remove(name)}
                              className="flex-shrink-0"
                            />
                          )}
                        </div>
                      ) : (
                        /* Single choice / Yes-No layout */
                        <div className="flex items-center gap-3">
                          {/* Correct indicator / toggle */}
                          <div className="flex-shrink-0">
                            {selectedType === 'YES_NO' ? (
                              <Form.Item
                                {...restField}
                                name={[name, 'isCorrect']}
                                valuePropName="checked"
                                className="!mb-0"
                              >
                                <Switch
                                  size="small"
                                  checkedChildren="✓"
                                  unCheckedChildren="✗"
                                  onChange={(checked) => {
                                    if (checked) {
                                      const opts = form.getFieldValue('options');
                                      form.setFieldsValue({
                                        options: opts.map(
                                          (o: Record<string, unknown>, i: number) => ({
                                            ...o,
                                            isCorrect: i === name,
                                          }),
                                        ),
                                      });
                                    }
                                  }}
                                />
                              </Form.Item>
                            ) : (
                              <Form.Item
                                {...restField}
                                name={[name, 'isCorrect']}
                                valuePropName="checked"
                                className="!mb-0"
                              >
                                <Switch
                                  size="small"
                                  checkedChildren={<CheckCircle2 size={11} />}
                                  unCheckedChildren={<XCircle size={11} />}
                                  onChange={(checked) => {
                                    if (checked) {
                                      const opts = form.getFieldValue('options');
                                      form.setFieldsValue({
                                        options: opts.map(
                                          (o: Record<string, unknown>, i: number) => ({
                                            ...o,
                                            isCorrect: i === name,
                                          }),
                                        ),
                                      });
                                    }
                                  }}
                                />
                              </Form.Item>
                            )}
                          </div>

                          {/* Option text */}
                          <Form.Item
                            {...restField}
                            name={[name, 'optionText']}
                            className="flex-1 !mb-0"
                            rules={[{ required: true, message: '' }]}
                          >
                            <Input
                              placeholder={`${name + 1}-variant matni`}
                              disabled={selectedType === 'YES_NO'}
                            />
                          </Form.Item>

                          {/* Remove button */}
                          {selectedType !== 'YES_NO' && fields.length > 2 && (
                            <Button
                              size="small"
                              danger
                              type="text"
                              icon={<Trash2 size={14} />}
                              onClick={() => remove(name)}
                              className="flex-shrink-0"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {selectedType !== 'YES_NO' && (
                    <Button
                      type="dashed"
                      onClick={() =>
                        add({
                          optionText: '',
                          isCorrect: selectedType === 'MATCHING',
                          matchText: '',
                        })
                      }
                      icon={<Plus size={14} />}
                      block
                    >
                      {t(T.addOption)}
                    </Button>
                  )}
                </div>
              )}
            </Form.List>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default Questions;
