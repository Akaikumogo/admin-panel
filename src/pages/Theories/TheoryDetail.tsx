import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Form, Input, InputNumber, Spin, Switch, message } from 'antd';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useFetch } from '@/hooks/useFetch';
import apiService, {
  type Question,
  type Theory,
  type TheorySlide,
} from '@/services/api';
import { can } from '@/utils/can';

const T = {
  title: { uz: 'Nazariya', en: 'Theory', ru: 'Теория' },
  back: { uz: 'Orqaga', en: 'Back', ru: 'Назад' },
  theoryName: { uz: 'Nazariya nomi', en: 'Theory name', ru: 'Название теории' },
  orderIndex: { uz: 'Tartib raqami', en: 'Order index', ru: 'Порядок' },
  content: { uz: 'Mazmun (markdown)', en: 'Content (markdown)', ru: 'Содержание (markdown)' },
  save: { uz: 'Saqlash', en: 'Save', ru: 'Сохранить' },
  module: { uz: 'Modul', en: 'Module', ru: 'Модуль' },
  questions: { uz: 'Savollar', en: 'Questions', ru: 'Вопросы' },
  open: { uz: 'Ochish', en: 'Open', ru: 'Открыть' },
  slides: { uz: 'Slaydlar', en: 'Slides', ru: 'Слайды' },
  slideHead: { uz: 'Sarlavha', en: 'Heading', ru: 'Заголовок' },
  slideItems: {
    uz: 'Qatorlar (har qator — alohida punkt)',
    en: 'Lines (one bullet per line)',
    ru: 'Строки (каждая — отдельный пункт)',
  },
  warn: { uz: 'Ogohlantirish', en: 'Warning', ru: 'Предупреждение' },
  addSlide: { uz: 'Slayd qo‘shish', en: 'Add slide', ru: 'Добавить слайд' },
} as const;

function isNazariyaTheory(t: Pick<Theory, 'title'> | null | undefined) {
  return Boolean(t?.title?.trimEnd().endsWith(' · Nazariya'));
}

function slidesToForm(
  slides: TheorySlide[] | null | undefined
): { head: string; warn: boolean; itemsText: string }[] {
  return (slides ?? []).map((s) => ({
    head: s.head ?? '',
    warn: Boolean(s.warn),
    itemsText: (s.items ?? []).join('\n'),
  }));
}

function formToSlides(
  rows: { head: string; warn: boolean; itemsText: string }[]
): TheorySlide[] {
  return rows
    .map((r) => ({
      head: r.head.trim(),
      warn: r.warn,
      items: r.itemsText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean),
    }))
    .filter((s) => s.head.length > 0 || s.items.length > 0);
}

export default function TheoryDetail() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const theoryId = id || '';

  const {
    data: theory,
    initialLoading: theoryInitialLoading,
    refetch: refetchTheory,
  } = useFetch(
    ['theory-by-id', theoryId],
    async () => {
      if (!theoryId) throw new Error('Missing id');
      const res = await apiService.getTheoryById(theoryId);
      const naz = isNazariyaTheory(res);
      form.setFieldsValue({
        title: res.title,
        orderIndex: res.orderIndex,
        content: res.content,
        slides: naz ? slidesToForm(res.slides) : undefined,
      });
      return res;
    },
    null as unknown as Theory,
  );

  const {
    data: questions,
    initialLoading: questionsInitialLoading,
  } = useFetch(
    ['questions-by-theory', theoryId],
    async () => {
      if (!theoryId) return [];
      const res = await apiService.getQuestions({ theoryId, limit: 100 });
      return res.data;
    },
    [] as Question[],
  );

  const loading = theoryInitialLoading || questionsInitialLoading;
  const showSlides = isNazariyaTheory(theory);

  const moduleLabel = useMemo(() => {
    const lvl = theory?.level;
    if (!lvl) return '';
    return `#${lvl.orderIndex + 1} — ${lvl.title}`;
  }, [theory?.level]);

  const handleSave = async () => {
    if (!theoryId) return;
    if (!can('contentTheories', 'update')) return;
    try {
      const values = await form.validateFields();
      setSaving(true);
      const payload: Parameters<typeof apiService.updateTheory>[1] = {
        title: values.title,
        orderIndex: values.orderIndex,
        content: values.content,
      };
      const nazNow = isNazariyaTheory({ title: values.title });
      if (nazNow) {
        const built = formToSlides(values.slides ?? []);
        payload.slides = built.length > 0 ? built : null;
      } else if (isNazariyaTheory(theory)) {
        payload.slides = null;
      }
      await apiService.updateTheory(theoryId, payload);
      message.success(t({ uz: 'Saqlandi', en: 'Saved', ru: 'Сохранено' }));
      refetchTheory();
    } catch {
      // validation / network
    } finally {
      setSaving(false);
    }
  };

  if (!theoryId) {
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
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button icon={<ArrowLeft size={16} />} onClick={() => navigate(-1)}>
          {t(T.back)}
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white truncate">
            {t(T.title)} {theory?.orderIndex !== undefined ? `#${theory.orderIndex + 1}` : ''} — {theory?.title || '...'}
          </h1>
          {moduleLabel && (
            <button
              type="button"
              className="text-xs text-slate-500 dark:text-slate-400 hover:underline"
              onClick={() => navigate(`/dashboard/levels/${theory?.levelId}`)}
            >
              {t(T.module)}: {moduleLabel}
            </button>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            type="primary"
            icon={<Save size={16} />}
            loading={saving}
            onClick={handleSave}
            disabled={!can('contentTheories', 'update')}
          >
            {t(T.save)}
          </Button>
        </div>
      </div>

      <Card className="!border-slate-200 dark:!border-slate-700/60">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Spin />
          </div>
        ) : (
          <Form form={form} layout="vertical">
            <Form.Item name="title" label={t(T.theoryName)} rules={[{ required: true }]}>
              <Input size="large" />
            </Form.Item>
            <Form.Item name="orderIndex" label={t(T.orderIndex)} rules={[{ required: true }]}>
              <InputNumber className="w-full" min={0} />
            </Form.Item>
            <Form.Item name="content" label={t(T.content)}>
              <Input.TextArea rows={showSlides ? 4 : 10} />
            </Form.Item>
            {showSlides ? (
              <>
                <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  {t(T.slides)}
                </p>
                <Form.List name="slides">
                  {(fields, { add, remove }) => (
                    <div className="space-y-4">
                      {fields.map((field) => (
                        <Card
                          key={field.key}
                          size="small"
                          className="!border-slate-200 dark:!border-slate-700/60"
                          title={
                            <span className="text-sm font-semibold">
                              #{field.name + 1}
                            </span>
                          }
                          extra={
                            <Button
                              type="text"
                              danger
                              icon={<Trash2 size={16} />}
                              onClick={() => remove(field.name)}
                              aria-label="remove"
                            />
                          }
                        >
                          <Form.Item name={[field.name, 'head']} label={t(T.slideHead)}>
                            <Input />
                          </Form.Item>
                          <Form.Item name={[field.name, 'itemsText']} label={t(T.slideItems)}>
                            <Input.TextArea rows={5} />
                          </Form.Item>
                          <Form.Item
                            name={[field.name, 'warn']}
                            label={t(T.warn)}
                            valuePropName="checked"
                          >
                            <Switch />
                          </Form.Item>
                        </Card>
                      ))}
                      <Button
                        type="dashed"
                        onClick={() => add({ head: '', itemsText: '', warn: false })}
                        block
                        icon={<Plus size={16} />}
                      >
                        {t(T.addSlide)}
                      </Button>
                    </div>
                  )}
                </Form.List>
              </>
            ) : null}
          </Form>
        )}
      </Card>

      <Card
        title={<span className="font-semibold">{t(T.questions)}</span>}
        className="!border-slate-200 dark:!border-slate-700/60"
      >
        {questions.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t({ uz: 'Savollar yo‘q', en: 'No questions', ru: 'Нет вопросов' })}
          </p>
        ) : (
          <div className="space-y-2">
            {questions
              .slice()
              .sort((a, b) => a.orderIndex - b.orderIndex)
              .map((q) => (
                <div
                  key={q.id}
                  className="flex items-center gap-3 rounded-lg border border-slate-200/70 dark:border-slate-700/60 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      #{q.orderIndex + 1} — {q.prompt}
                    </p>
                  </div>
                  <Button onClick={() => navigate(`/dashboard/questions/${q.id}`)}>
                    {t(T.open)}
                  </Button>
                </div>
              ))}
          </div>
        )}
      </Card>
    </div>
  );
}
