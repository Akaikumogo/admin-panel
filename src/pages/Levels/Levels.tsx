import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Switch,
  Tag,
  Collapse,
  message,
  Popconfirm,
  Spin
} from 'antd';
import {
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  BookOpen,
  HelpCircle,
  GripVertical,
  Filter,
  Search
} from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useQueryParams } from '@/hooks/useQueryParams';
import { useFetch } from '@/hooks/useFetch';
import HighlightText from '@/components/HighlightText';
import NoData from '@/components/NoData';
import apiService from '@/services/api';
import type { Level, Theory, Question } from '@/services/api';
import { can } from '@/utils/can';

const T = {
  title: { uz: 'Modullar', en: 'Modules', ru: 'Модули' },
  addLevel: { uz: 'Modul qo`shish', en: 'Add Module', ru: 'Добавить модуль' },
  editLevel: {
    uz: 'Modulni tahrirlash',
    en: 'Edit Module',
    ru: 'Редактировать модуль'
  },
  levelName: { uz: 'Modul nomi', en: 'Module name', ru: 'Название модуля' },
  active: { uz: 'Faol', en: 'Active', ru: 'Активный' },
  search: { uz: 'Qidirish...', en: 'Search...', ru: 'Поиск...' },
  allStatuses: { uz: 'Barcha holatlar', en: 'All statuses', ru: 'Все статусы' },
  activeOnly: { uz: 'Faqat faol', en: 'Active only', ru: 'Только активные' },
  inactiveOnly: {
    uz: 'Faqat nofaol',
    en: 'Inactive only',
    ru: 'Только неактивные'
  },
  save: { uz: 'Saqlash', en: 'Save', ru: 'Сохранить' },
  cancel: { uz: 'Bekor qilish', en: 'Cancel', ru: 'Отмена' },
  delete: { uz: 'O`chirish', en: 'Delete', ru: 'Удалить' },
  deleteConfirm: {
    uz: 'Rostdan o`chirmoqchimisiz?',
    en: 'Are you sure?',
    ru: 'Вы уверены?'
  },
  theories: { uz: 'Nazariyalar', en: 'Theories', ru: 'Теории' },
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
  content: {
    uz: 'Mazmun (markdown)',
    en: 'Content (markdown)',
    ru: 'Содержание (markdown)'
  },
  questions: { uz: 'Savollar', en: 'Questions', ru: 'Вопросы' },
  addQuestion: {
    uz: 'Savol qo`shish',
    en: 'Add Question',
    ru: 'Добавить вопрос'
  },
  editQuestion: {
    uz: 'Savolni tahrirlash',
    en: 'Edit Question',
    ru: 'Редактировать вопрос'
  },
  questionPrompt: {
    uz: 'Savol matni',
    en: 'Question prompt',
    ru: 'Текст вопроса'
  },
  options: {
    uz: 'Javob variantlari',
    en: 'Answer options',
    ru: 'Варианты ответов'
  },
  optionText: { uz: 'Javob matni', en: 'Option text', ru: 'Текст варианта' },
  correct: { uz: 'To`g`ri', en: 'Correct', ru: 'Верный' },
  addOption: {
    uz: 'Variant qo`shish',
    en: 'Add Option',
    ru: 'Добавить вариант'
  },
  noData: { uz: 'Ma`lumot yo`q', en: 'No data', ru: 'Нет данных' },
  loading: { uz: 'Yuklanmoqda...', en: 'Loading...', ru: 'Загрузка...' }
} as const;

const QP_DEFAULTS = { search: undefined, status: undefined } as const;

const Levels = () => {
  const { t } = useTranslation();
  const { params: qp, setParam } = useQueryParams<typeof QP_DEFAULTS>(QP_DEFAULTS);
  const navigate = useNavigate();

  const {
    data: levels, loading, initialLoading, refetch: refetchLevels,
  } = useFetch(
    ['levels', qp.search],
    () => apiService.getLevels({ search: qp.search || undefined }),
    [] as Level[],
  );

  const [levelModal, setLevelModal] = useState<{ open: boolean; editing: Level | null }>({ open: false, editing: null });
  const [theoryModal, setTheoryModal] = useState<{ open: boolean; editing: Theory | null; levelId: string }>({ open: false, editing: null, levelId: '' });
  const [questionModal, setQuestionModal] = useState<{ open: boolean; editing: Question | null; levelId: string; theoryId: string }>({ open: false, editing: null, levelId: '', theoryId: '' });
  const [expandedLevel, setExpandedLevel] = useState<string | null>(null);
  const [theories, setTheories] = useState<Record<string, Theory[]>>({});
  const [questions, setQuestions] = useState<Record<string, Question[]>>({});
  const [levelForm] = Form.useForm();
  const [theoryForm] = Form.useForm();
  const [questionForm] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchTheories = useCallback(async (levelId: string) => {
    try {
      const data = await apiService.getTheoriesByLevel(levelId);
      setTheories((prev) => ({ ...prev, [levelId]: data }));
    } catch { /* empty */ }
  }, []);

  const fetchQuestions = useCallback(async (theoryId: string) => {
    try {
      const res = await apiService.getQuestions({ theoryId, limit: 100 });
      setQuestions((prev) => ({ ...prev, [theoryId]: res.data }));
    } catch { /* empty */ }
  }, []);

  useEffect(() => {
    if (expandedLevel) fetchTheories(expandedLevel);
  }, [expandedLevel, fetchTheories]);

  // Level CRUD
  const openLevelModal = (level?: Level) => {
    if (level && !can('contentLevels', 'update')) return;
    if (!level && !can('contentLevels', 'create')) return;
    setLevelModal({ open: true, editing: level ?? null });
    if (level) {
      levelForm.setFieldsValue({
        title: level.title,
        isActive: level.isActive
      });
    } else {
      levelForm.resetFields();
    }
  };

  const handleLevelSave = async () => {
    if (levelModal.editing && !can('contentLevels', 'update')) return;
    if (!levelModal.editing && !can('contentLevels', 'create')) return;
    try {
      const values = await levelForm.validateFields();
      setSaving(true);
      if (levelModal.editing) {
        await apiService.updateLevel(levelModal.editing.id, values);
        message.success('Modul yangilandi');
      } else {
        await apiService.createLevel(values);
        message.success('Modul yaratildi');
      }
      setLevelModal({ open: false, editing: null });
      refetchLevels();
    } catch {
      /* validation error */
    } finally {
      setSaving(false);
    }
  };

  const handleLevelDelete = async (id: string) => {
    if (!can('contentLevels', 'delete')) return;
    await apiService.deleteLevel(id);
    message.success('Modul o`chirildi');
    refetchLevels();
  };

  // Theory CRUD
  const openTheoryModal = (levelId: string, theory?: Theory) => {
    if (theory && !can('contentTheories', 'update')) return;
    if (!theory && !can('contentTheories', 'create')) return;
    setTheoryModal({ open: true, editing: theory ?? null, levelId });
    if (theory) {
      theoryForm.setFieldsValue({
        title: theory.title,
        content: theory.content
      });
    } else {
      theoryForm.resetFields();
    }
  };

  const handleTheorySave = async () => {
    if (theoryModal.editing && !can('contentTheories', 'update')) return;
    if (!theoryModal.editing && !can('contentTheories', 'create')) return;
    try {
      const values = await theoryForm.validateFields();
      setSaving(true);
      if (theoryModal.editing) {
        await apiService.updateTheory(theoryModal.editing.id, values);
        message.success('Nazariya yangilandi');
      } else {
        await apiService.createTheory({
          ...values,
          levelId: theoryModal.levelId
        });
        message.success('Nazariya yaratildi');
      }
      setTheoryModal({ open: false, editing: null, levelId: '' });
      fetchTheories(theoryModal.levelId);
    } catch {
      /* validation */
    } finally {
      setSaving(false);
    }
  };

  const handleTheoryDelete = async (id: string, levelId: string) => {
    if (!can('contentTheories', 'delete')) return;
    await apiService.deleteTheory(id);
    message.success('Nazariya o`chirildi');
    fetchTheories(levelId);
  };

  // Question CRUD
  const openQuestionModal = (
    levelId: string,
    theoryId: string,
    question?: Question
  ) => {
    if (question && !can('contentQuestions', 'update')) return;
    if (!question && !can('contentQuestions', 'create')) return;
    setQuestionModal({
      open: true,
      editing: question ?? null,
      levelId,
      theoryId
    });
    if (question) {
      questionForm.setFieldsValue({
        prompt: question.prompt,
        isActive: question.isActive,
        options: question.options.map((o) => ({
          id: o.id,
          optionText: o.optionText,
          isCorrect: o.isCorrect
        }))
      });
    } else {
      questionForm.resetFields();
      questionForm.setFieldsValue({
        options: [
          { optionText: '', isCorrect: false },
          { optionText: '', isCorrect: false }
        ]
      });
    }
  };

  const handleQuestionSave = async () => {
    if (questionModal.editing && !can('contentQuestions', 'update')) return;
    if (!questionModal.editing && !can('contentQuestions', 'create')) return;
    try {
      const values = await questionForm.validateFields();
      setSaving(true);
      if (questionModal.editing) {
        await apiService.updateQuestion(questionModal.editing.id, {
          prompt: values.prompt,
          isActive: values.isActive,
          options: values.options
        });
        message.success('Savol yangilandi');
      } else {
        await apiService.createQuestion({
          levelId: questionModal.levelId,
          theoryId: questionModal.theoryId,
          prompt: values.prompt,
          isActive: values.isActive ?? true,
          options: values.options
        });
        message.success('Savol yaratildi');
      }
      setQuestionModal({
        open: false,
        editing: null,
        levelId: '',
        theoryId: ''
      });
      fetchQuestions(questionModal.theoryId);
    } catch {
      /* validation */
    } finally {
      setSaving(false);
    }
  };

  const handleQuestionDelete = async (id: string, theoryId: string) => {
    if (!can('contentQuestions', 'delete')) return;
    await apiService.deleteQuestion(id);
    message.success('Savol o`chirildi');
    fetchQuestions(theoryId);
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-100px)]">
      {/* Filter Bar */}
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
        <Select
          allowClear
          placeholder={t(T.allStatuses)}
          style={{ width: 180 }}
          value={qp.status}
          onChange={(v) => setParam('status', v)}
          options={[
            { value: 'active', label: t(T.activeOnly) },
            { value: 'inactive', label: t(T.inactiveOnly) }
          ]}
        />
        <div className="ml-auto">
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={() => openLevelModal()}
            disabled={!can('contentLevels', 'create')}
          >
            {t(T.addLevel)}
          </Button>
        </div>
      </div>

      {/* Levels List */}
      {levels.filter((l) => {
        if (qp.status === 'active' && !l.isActive) return false;
        if (qp.status === 'inactive' && l.isActive) return false;
        return true;
      }).length === 0 && !loading ? (
        <NoData text={t(T.noData)} />
      ) : (
        <div
          className={`space-y-3 transition-opacity duration-150 ${loading ? 'opacity-50 pointer-events-none' : ''}`}
        >
          {levels
            .filter((l) => {
              if (qp.status === 'active' && !l.isActive) return false;
              if (qp.status === 'inactive' && l.isActive) return false;
              return true;
            })
            .map((level) => (
              <div key={level.id}>
                  <Card
                    className="!border-slate-200 dark:!border-slate-700/60"
                    bodyStyle={{ padding: 0 }}
                  >
                    {/* Level Header */}
                    <div
                      className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors rounded-lg"
                      onClick={() =>
                        setExpandedLevel(
                          expandedLevel === level.id ? null : level.id
                        )
                      }
                    >
                      <div className="flex items-center gap-3">
                        <GripVertical size={16} className="text-slate-400" />
                        <ChevronRight
                          size={16}
                          className={`text-slate-400 transition-transform ${expandedLevel === level.id ? 'rotate-90' : ''}`}
                        />
                        <button
                          type="button"
                          className="font-semibold text-slate-900 dark:text-white hover:underline text-left"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/dashboard/levels/${level.id}`);
                          }}
                        >
                          #{level.orderIndex + 1} —{' '}
                          <HighlightText
                            text={level.title}
                            highlight={qp.search}
                          />
                        </button>
                        <Tag color={level.isActive ? 'green' : 'default'}>
                          {level.isActive ? t(T.active) : 'Inactive'}
                        </Tag>
                      </div>
                      <div
                        className="flex items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          size="small"
                          icon={<Pencil size={14} />}
                          onClick={() => openLevelModal(level)}
                          disabled={!can('contentLevels', 'update')}
                        />
                        <Popconfirm
                          title={t(T.deleteConfirm)}
                          onConfirm={() => handleLevelDelete(level.id)}
                          disabled={!can('contentLevels', 'delete')}
                        >
                          <Button
                            size="small"
                            danger
                            icon={<Trash2 size={14} />}
                            disabled={!can('contentLevels', 'delete')}
                          />
                        </Popconfirm>
                      </div>
                    </div>

                    {/* Expanded: Theories */}
                    {expandedLevel === level.id && (
                      <div className="border-t border-slate-200 dark:border-slate-700/60 px-6 py-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-2">
                            <BookOpen size={14} /> {t(T.theories)}
                          </h4>
                          <Button
                            size="small"
                            icon={<Plus size={12} />}
                            onClick={() => openTheoryModal(level.id)}
                            disabled={!can('contentTheories', 'create')}
                          >
                            {t(T.addTheory)}
                          </Button>
                        </div>

                        {!theories[level.id] ? (
                          <Spin size="small" />
                        ) : !Array.isArray(theories[level.id]) ||
                          theories[level.id].length === 0 ? (
                          <p className="text-sm text-slate-400">
                            {t(T.noData)}
                          </p>
                        ) : (
                          <Collapse
                            accordion
                            ghost
                            onChange={(key) => {
                              const theoryId = Array.isArray(key)
                                ? key[0]
                                : key;
                              if (theoryId) fetchQuestions(theoryId);
                            }}
                            items={theories[level.id].map((theory) => ({
                              key: theory.id,
                              label: (
                                <div className="flex items-center justify-between w-full">
                                  <button
                                    type="button"
                                    className="font-medium hover:underline text-left"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/dashboard/theories/${theory.id}`);
                                    }}
                                  >
                                    #{theory.orderIndex + 1} —{' '}
                                    <HighlightText
                                      text={theory.title}
                                      highlight={qp.search}
                                    />
                                  </button>
                                  <div
                                    className="flex items-center gap-2"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Button
                                      size="small"
                                      icon={<Pencil size={12} />}
                                      onClick={() =>
                                        openTheoryModal(level.id, theory)
                                      }
                                      disabled={!can('contentTheories', 'update')}
                                    />
                                    <Popconfirm
                                      title={t(T.deleteConfirm)}
                                      onConfirm={() =>
                                        handleTheoryDelete(theory.id, level.id)
                                      }
                                      disabled={!can('contentTheories', 'delete')}
                                    >
                                      <Button
                                        size="small"
                                        danger
                                        icon={<Trash2 size={12} />}
                                        disabled={!can('contentTheories', 'delete')}
                                      />
                                    </Popconfirm>
                                  </div>
                                </div>
                              ),
                              children: (
                                <div className="space-y-3">
                                  {theory.content && (
                                    <div className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-black/20 p-3 rounded-lg max-h-[min(70vh,720px)] overflow-y-auto whitespace-pre-wrap">
                                      {theory.content}
                                    </div>
                                  )}
                                  <div className="flex items-center justify-between">
                                    <h5 className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-2">
                                      <HelpCircle size={14} /> {t(T.questions)}
                                    </h5>
                                    <Button
                                      size="small"
                                      icon={<Plus size={12} />}
                                      onClick={() =>
                                        openQuestionModal(level.id, theory.id)
                                      }
                                      disabled={!can('contentQuestions', 'create')}
                                    >
                                      {t(T.addQuestion)}
                                    </Button>
                                  </div>
                                  {!questions[theory.id] ? (
                                    <Spin size="small" />
                                  ) : !Array.isArray(questions[theory.id]) ||
                                    questions[theory.id].length === 0 ? (
                                    <p className="text-xs text-slate-400">
                                      {t(T.noData)}
                                    </p>
                                  ) : (
                                    <div className="space-y-2">
                                      {questions[theory.id].map((q, idx) => (
                                        <div
                                          key={q.id}
                                          className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-lg p-3"
                                        >
                                          <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                              <button
                                                type="button"
                                                className="text-sm font-medium text-slate-900 dark:text-white hover:underline text-left"
                                                onClick={() => navigate(`/dashboard/questions/${q.id}`)}
                                              >
                                                {idx + 1}.{' '}
                                                <HighlightText
                                                  text={q.prompt}
                                                  highlight={qp.search}
                                                />
                                              </button>
                                              <div className="mt-2 flex flex-wrap gap-1">
                                                {q.options.map((opt) => (
                                                  <Tag
                                                    key={opt.id}
                                                    color={
                                                      opt.isCorrect
                                                        ? 'green'
                                                        : 'default'
                                                    }
                                                    className="text-xs"
                                                  >
                                                    {opt.optionText}
                                                  </Tag>
                                                ))}
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-1 ml-2">
                                              <Button
                                                size="small"
                                                icon={<Pencil size={12} />}
                                                onClick={() =>
                                                  openQuestionModal(
                                                    level.id,
                                                    theory.id,
                                                    q
                                                  )
                                                }
                                                disabled={!can('contentQuestions', 'update')}
                                              />
                                              <Popconfirm
                                                title={t(T.deleteConfirm)}
                                                onConfirm={() =>
                                                  handleQuestionDelete(
                                                    q.id,
                                                    theory.id
                                                  )
                                                }
                                                disabled={!can('contentQuestions', 'delete')}
                                              >
                                                <Button
                                                  size="small"
                                                  danger
                                                  icon={<Trash2 size={12} />}
                                                  disabled={!can('contentQuestions', 'delete')}
                                                />
                                              </Popconfirm>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )
                            }))}
                          />
                        )}
                      </div>
                    )}
                  </Card>
              </div>
            ))}
        </div>
      )}

      {/* Level Modal */}
      <Modal
        title={levelModal.editing ? t(T.editLevel) : t(T.addLevel)}
        open={levelModal.open}
        onCancel={() => setLevelModal({ open: false, editing: null })}
        onOk={handleLevelSave}
        confirmLoading={saving}
        okText={t(T.save)}
        cancelText={t(T.cancel)}
        okButtonProps={{
          disabled: levelModal.editing
            ? !can('contentLevels', 'update')
            : !can('contentLevels', 'create'),
        }}
      >
        <Form
          form={levelForm}
          layout="vertical"
          initialValues={{ isActive: true }}
        >
          <Form.Item
            name="title"
            label={t(T.levelName)}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="isActive"
            label={t(T.active)}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* Theory Modal */}
      <Modal
        title={theoryModal.editing ? t(T.editTheory) : t(T.addTheory)}
        open={theoryModal.open}
        onCancel={() =>
          setTheoryModal({ open: false, editing: null, levelId: '' })
        }
        onOk={handleTheorySave}
        confirmLoading={saving}
        okText={t(T.save)}
        cancelText={t(T.cancel)}
        width={640}
        okButtonProps={{
          disabled: theoryModal.editing
            ? !can('contentTheories', 'update')
            : !can('contentTheories', 'create'),
        }}
      >
        <Form form={theoryForm} layout="vertical">
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

      {/* Question Modal */}
      <Modal
        title={questionModal.editing ? t(T.editQuestion) : t(T.addQuestion)}
        open={questionModal.open}
        onCancel={() =>
          setQuestionModal({
            open: false,
            editing: null,
            levelId: '',
            theoryId: ''
          })
        }
        onOk={handleQuestionSave}
        confirmLoading={saving}
        okText={t(T.save)}
        cancelText={t(T.cancel)}
        width={640}
        okButtonProps={{
          disabled: questionModal.editing
            ? !can('contentQuestions', 'update')
            : !can('contentQuestions', 'create'),
        }}
      >
        <Form form={questionForm} layout="vertical">
          <Form.Item
            name="prompt"
            label={t(T.questionPrompt)}
            rules={[{ required: true }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item
            name="isActive"
            label={t(T.active)}
            valuePropName="checked"
            initialValue={true}
          >
            <Switch />
          </Form.Item>
          <Form.List name="options">
            {(fields, { add, remove }) => (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t(T.options)}</label>
                {fields.map(({ key, name, ...restField }) => (
                  <div key={key} className="flex items-center gap-2">
                    <Form.Item
                      {...restField}
                      name={[name, 'optionText']}
                      className="flex-1 !mb-0"
                      rules={[{ required: true }]}
                    >
                      <Input placeholder={t(T.optionText)} />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'isCorrect']}
                      valuePropName="checked"
                      className="!mb-0"
                    >
                      <Switch checkedChildren={t(T.correct)} />
                    </Form.Item>
                    {fields.length > 2 && (
                      <Button
                        size="small"
                        danger
                        icon={<Trash2 size={12} />}
                        onClick={() => remove(name)}
                      />
                    )}
                  </div>
                ))}
                <Button
                  type="dashed"
                  onClick={() => add({ optionText: '', isCorrect: false })}
                  icon={<Plus size={14} />}
                  block
                >
                  {t(T.addOption)}
                </Button>
              </div>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  );
};

export default Levels;
