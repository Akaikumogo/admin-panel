import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Form, Input, Modal, Spin, Switch, Tag, message } from 'antd';
import { ArrowLeft, ArrowLeftRight, Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useFetch } from '@/hooks/useFetch';
import apiService from '@/services/api';
import type { Question, QuestionType } from '@/services/api';
import { can } from '@/utils/can';

const T = {
  title: { uz: 'Savol', en: 'Question', ru: 'Вопрос' },
  back: { uz: 'Orqaga', en: 'Back', ru: 'Назад' },
  save: { uz: 'Saqlash', en: 'Save', ru: 'Сохранить' },
  prompt: { uz: 'Savol matni', en: 'Question text', ru: 'Текст вопроса' },
  questionType: { uz: 'Savol turi', en: 'Question type', ru: 'Тип вопроса' },
  active: { uz: 'Faol', en: 'Active', ru: 'Активный' },
  options: { uz: 'Javob variantlari', en: 'Options', ru: 'Варианты' },
  optionText: { uz: 'Javob matni', en: 'Option text', ru: 'Текст варианта' },
  matchText: { uz: 'Mos javob', en: 'Match', ru: 'Соответствие' },
  correct: { uz: 'To`g`ri', en: 'Correct', ru: 'Верный' },
  addOption: { uz: 'Variant qo`shish', en: 'Add option', ru: 'Добавить вариант' },
  module: { uz: 'Modul', en: 'Module', ru: 'Модуль' },
  theory: { uz: 'Nazariya', en: 'Theory', ru: 'Теория' },
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

export default function QuestionDetail() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [form] = Form.useForm();

  const [saving, setSaving] = useState(false);
  const [selectedType, setSelectedType] = useState<QuestionType>('SINGLE_CHOICE');
  const [editMode, setEditMode] = useState(false);

  const questionId = id || '';

  const {
    data: question,
    initialLoading,
    refetch,
  } = useFetch(
    ['question-by-id', questionId],
    async () => {
      if (!questionId) throw new Error('Missing id');
      const res = await apiService.getQuestionById(questionId);
      return res;
    },
    null as unknown as Question,
  );

  useEffect(() => {
    if (!questionId) return;
    setEditMode(false);
  }, [questionId]);

  useEffect(() => {
    if (!question) return;
    const qType = (question.type || 'SINGLE_CHOICE') as QuestionType;
    setSelectedType(qType);
    form.setFieldsValue({
      prompt: question.prompt,
      type: qType,
      isActive: question.isActive,
      options: (question.options ?? []).map((o) => ({
        id: o.id,
        optionText: o.optionText,
        isCorrect: o.isCorrect,
        matchText: o.matchText ?? '',
      })),
    });
  }, [question, form]);

  const headerMeta = useMemo(() => {
    const levelTitle = question?.level?.title || '';
    const theoryTitle = question?.theory?.title || '';
    return { levelTitle, theoryTitle };
  }, [question?.level?.title, question?.theory?.title]);

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
    if (!questionId) return;
    if (!can('contentQuestions', 'update')) return;
    if (!editMode) return;
    try {
      const values = await form.validateFields();
      setSaving(true);
      await apiService.updateQuestion(questionId, {
        prompt: values.prompt,
        type: values.type,
        isActive: values.isActive,
        options: values.options,
      });
      message.success(t({ uz: 'Saqlandi', en: 'Saved', ru: 'Сохранено' }));
      refetch();
      setEditMode(false);
    } catch {
      // validation / network
    } finally {
      setSaving(false);
    }
  };

  if (!questionId) {
    return (
      <div className="p-6">
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-300">ID topilmadi</span>
            <Button onClick={() => navigate(-1)}>{t(T.back)}</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <Modal
      open
      title={
        <div className="min-w-0">
          <div className="text-base font-semibold truncate">
            {t(T.title)} — {question?.prompt || '...'}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Tag color={QUESTION_TYPE_COLORS[selectedType]}>
              {t(QUESTION_TYPE_LABELS[selectedType])}
            </Tag>
            {question?.levelId && (
              <span className="truncate">
                {t(T.module)}: {headerMeta.levelTitle || question.levelId}
              </span>
            )}
            {question?.theoryId && (
              <span className="truncate">
                {t(T.theory)}: {headerMeta.theoryTitle || question.theoryId}
              </span>
            )}
          </div>
        </div>
      }
      onCancel={() => navigate(-1)}
      width={860}
      footer={
        editMode
          ? [
              <Button
                key="cancel"
                onClick={() => {
                  if (!question) return;
                  const qType = (question.type || 'SINGLE_CHOICE') as QuestionType;
                  setSelectedType(qType);
                  form.setFieldsValue({
                    prompt: question.prompt,
                    type: qType,
                    isActive: question.isActive,
                    options: (question.options ?? []).map((o) => ({
                      id: o.id,
                      optionText: o.optionText,
                      isCorrect: o.isCorrect,
                      matchText: o.matchText ?? '',
                    })),
                  });
                  setEditMode(false);
                }}
              >
                {t({ uz: 'Bekor qilish', en: 'Cancel', ru: 'Отмена' })}
              </Button>,
              <Button
                key="save"
                type="primary"
                icon={<Save size={16} />}
                loading={saving}
                onClick={handleSave}
                disabled={!can('contentQuestions', 'update')}
              >
                {t(T.save)}
              </Button>,
            ]
          : [
              <Button
                key="back"
                icon={<ArrowLeft size={16} />}
                onClick={() => navigate(-1)}
              >
                {t(T.back)}
              </Button>,
              <Button
                key="edit"
                icon={<Pencil size={16} />}
                onClick={() => setEditMode(true)}
                disabled={!can('contentQuestions', 'update') || initialLoading || !question}
              >
                {t({ uz: 'Tahrirlash', en: 'Edit', ru: 'Редактировать' })}
              </Button>,
            ]
      }
    >
      <Card className="!border-slate-200 dark:!border-slate-700/60">
        {initialLoading ? (
          <div className="flex items-center justify-center h-32">
            <Spin />
          </div>
        ) : !editMode ? (
          <div className="space-y-3">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t(T.questionType)}</p>
              <p className="text-base font-semibold text-slate-900 dark:text-white">
                {t(QUESTION_TYPE_LABELS[selectedType])}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t(T.prompt)}</p>
              <div className="mt-1 whitespace-pre-wrap rounded-lg border border-slate-200/70 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700/60 dark:bg-[#141414] dark:text-slate-200">
                {question?.prompt || '—'}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t(T.active)}</p>
              <p className="text-base font-semibold text-slate-900 dark:text-white">
                {question?.isActive ? t(T.active) : 'Inactive'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t(T.options)}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(question?.options ?? []).map((o) => (
                  <Tag key={o.id} color={selectedType === 'MATCHING' ? 'purple' : o.isCorrect ? 'green' : 'default'}>
                    {selectedType === 'MATCHING' ? `${o.optionText} ↔ ${o.matchText ?? ''}` : o.optionText}
                  </Tag>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <Form form={form} layout="vertical">
            <Form.Item name="type" label={t(T.questionType)} rules={[{ required: true }]}>
              <Input.Group compact>
                <Form.Item name="type" noStyle>
                  <SelectQuestionType
                    value={selectedType}
                    onChange={handleTypeChange}
                    disabled={!editMode}
                  />
                </Form.Item>
              </Input.Group>
            </Form.Item>

            <Form.Item name="prompt" label={t(T.prompt)} rules={[{ required: true }]}>
              <Input.TextArea rows={3} disabled={!editMode} />
            </Form.Item>

            <Form.Item name="isActive" label={t(T.active)} valuePropName="checked" initialValue={true}>
              <Switch disabled={!editMode} />
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
                        <Input
                          placeholder={t(T.optionText)}
                          disabled={!editMode || selectedType === 'YES_NO'}
                        />
                      </Form.Item>

                      {selectedType === 'MATCHING' && (
                        <Form.Item
                          {...restField}
                          name={[name, 'matchText']}
                          className="flex-1 !mb-0"
                          rules={[{ required: true }]}
                        >
                          <Input placeholder={t(T.matchText)} disabled={!editMode} />
                        </Form.Item>
                      )}

                      {selectedType === 'YES_NO' ? (
                        <Form.Item
                          {...restField}
                          name={[name, 'isCorrect']}
                          valuePropName="checked"
                          className="!mb-0"
                        >
                          <Switch
                            checkedChildren={t(T.correct)}
                            disabled={!editMode}
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
                        <Form.Item
                          {...restField}
                          name={[name, 'isCorrect']}
                          valuePropName="checked"
                          className="!mb-0"
                        >
                          <Switch checkedChildren={t(T.correct)} disabled={!editMode} />
                        </Form.Item>
                      )}

                      {selectedType !== 'YES_NO' && fields.length > 2 && (
                        <Button
                          size="small"
                          danger
                          icon={<Trash2 size={12} />}
                          onClick={() => remove(name)}
                          disabled={!editMode}
                        />
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
                      disabled={!editMode}
                    >
                      {t(T.addOption)}
                    </Button>
                  )}
                </div>
              )}
            </Form.List>

            {selectedType === 'MATCHING' && (
              <div className="pt-3 text-xs text-slate-500 dark:text-slate-400">
                <ArrowLeftRight size={12} className="inline-block -mt-0.5 mr-1 opacity-70" />
                {t({ uz: 'Moslashtirish savollarida har bir variant uchun “Mos javob” to‘ldiring.', en: 'Fill “Match” for each option.', ru: 'Заполните “Соответствие” для каждого варианта.' })}
              </div>
            )}
          </Form>
        )}
      </Card>
    </Modal>
  );
}

function SelectQuestionType(props: {
  value: QuestionType;
  onChange: (v: QuestionType) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <select
      className="w-full h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#141414] px-3 text-sm text-slate-900 dark:text-white"
      value={props.value}
      disabled={props.disabled}
      onChange={(e) => props.onChange(e.target.value as QuestionType)}
    >
      <option value="SINGLE_CHOICE">{t(QUESTION_TYPE_LABELS.SINGLE_CHOICE)}</option>
      <option value="YES_NO">{t(QUESTION_TYPE_LABELS.YES_NO)}</option>
      <option value="MATCHING">{t(QUESTION_TYPE_LABELS.MATCHING)}</option>
    </select>
  );
}

