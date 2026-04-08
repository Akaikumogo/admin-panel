import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Form, Input, Modal, Select, Spin, Switch, Table, Tag, message, Popconfirm } from 'antd';
import { ArrowLeft, HelpCircle, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useFetch } from '@/hooks/useFetch';
import apiService from '@/services/api';
import type {
  ExamQuestion,
  ExamQuestionCatalog,
  ExamQuestionDifficulty,
  ExamQuestionSection,
  Position,
  QuestionType,
  UserProfile,
} from '@/services/api';
import { can } from '@/utils/can';

const T = {
  title: { uz: 'Imtihon savollari', en: 'Exam questions', ru: 'Вопросы экзамена' },
  add: { uz: 'Qo‘shish', en: 'Add', ru: 'Добавить' },
  catalog: { uz: 'Katalog', en: 'Catalog', ru: 'Каталог' },
  prompt: { uz: 'Savol', en: 'Prompt', ru: 'Вопрос' },
  type: { uz: 'Turi', en: 'Type', ru: 'Тип' },
  active: { uz: 'Aktiv', en: 'Active', ru: 'Активный' },
  positions: { uz: 'Lavozimlar', en: 'Positions', ru: 'Должности' },
  options: { uz: 'Variantlar (to‘g‘ri javob)', en: 'Options (correct)', ru: 'Варианты' },
} as const;

export default function ExamQuestionsPage() {
  const { catalogId: catalogIdParam } = useParams<{ catalogId?: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const { data: me } = useFetch<UserProfile | null>(['me'], () => apiService.me(), null);
  const { data: catalogs } = useFetch(
    ['exam-question-catalogs'],
    () => apiService.getExamQuestionCatalogs(),
    [] as ExamQuestionCatalog[],
  );
  const { data: questions, loading, initialLoading, refetch } = useFetch(
    ['exam-questions', catalogIdParam ?? 'all'],
    () => apiService.getExamQuestions(catalogIdParam),
    [] as ExamQuestion[],
  );
  const { data: positions } = useFetch(['positions-for-exam-q'], () => apiService.getPositions(), [] as Position[]);

  const catalogTitle = useMemo(
    () => catalogs.find((c) => c.id === catalogIdParam)?.title,
    [catalogs, catalogIdParam],
  );

  const openModal = () => {
    setModalOpen(true);
    form.resetFields();
    const base = {
      type: 'SINGLE_CHOICE',
      isActive: true,
      difficulty: 'MEDIUM' as ExamQuestionDifficulty,
      options: [{ optionText: 'Ha' }, { optionText: 'Yo‘q' }],
    };
    if (catalogIdParam) {
      form.setFieldsValue({ ...base, catalogId: catalogIdParam });
    } else {
      form.setFieldsValue(base);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (!can('exams', 'create')) return;
      setSaving(true);
      const { catalogId, ...rest } = values;
      await apiService.createExamQuestion({
        ...rest,
        catalogId: catalogId as string,
      });
      message.success('Savol yaratildi');
      setModalOpen(false);
      refetch();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!can('exams', 'delete')) return;
    await apiService.deleteExamQuestion(id);
    message.success('Savol o‘chirildi');
    refetch();
  };

  const columns = useMemo(
    () => [
      { title: '#', dataIndex: 'idx', key: 'idx', width: 48, render: (_: unknown, __: ExamQuestion, i: number) => i + 1 },
      ...(catalogIdParam
        ? []
        : [
            {
              title: t(T.catalog),
              key: 'cat',
              width: 120,
              render: (_: unknown, r: ExamQuestion) => r.catalog?.title ?? '—',
            },
          ]),
      { title: t(T.prompt), dataIndex: 'prompt', key: 'prompt' },
      {
        title: t(T.type),
        dataIndex: 'type',
        key: 'type',
        width: 130,
        render: (v: QuestionType) => <Tag>{v}</Tag>,
      },
      {
        title: t({ uz: 'Bo‘lim', en: 'Section', ru: 'Раздел' }),
        dataIndex: 'section',
        key: 'section',
        width: 64,
        render: (v: ExamQuestionSection | undefined) => (v ? <Tag color="geekblue">{v}</Tag> : '—'),
      },
      {
        title: t({ uz: 'Qiyinlik', en: 'Difficulty', ru: 'Сложность' }),
        dataIndex: 'difficulty',
        key: 'difficulty',
        width: 88,
        render: (v: ExamQuestionDifficulty | undefined) => (v ? <Tag>{v}</Tag> : '—'),
      },
      {
        title: t(T.active),
        dataIndex: 'isActive',
        key: 'isActive',
        width: 72,
        render: (v: boolean) => (v ? <Tag color="green">ON</Tag> : <Tag>OFF</Tag>),
      },
      {
        title: t({ uz: 'Amallar', en: 'Actions', ru: 'Действия' }),
        key: 'actions',
        width: 88,
        render: (_: unknown, r: ExamQuestion) => (
          <Popconfirm title="O‘chirish?" onConfirm={() => handleDelete(r.id)}>
            <Button size="small" danger icon={<Trash2 size={14} />} disabled={!can('exams', 'delete')} />
          </Popconfirm>
        ),
      },
    ],
    [t, catalogIdParam],
  );

  if (me && me.role === 'USER') return null;

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-100px)]">
      <Card
        className="!border-slate-200 dark:!border-slate-700/60"
        title={
          <span className="flex items-center gap-2 flex-wrap">
            <HelpCircle size={16} />
            {t(T.title)}
            {catalogTitle ? (
              <Tag color="blue">
                {catalogTitle}
              </Tag>
            ) : null}
          </span>
        }
        extra={
          <div className="flex items-center gap-2">
            {catalogIdParam ? (
              <Button icon={<ArrowLeft size={16} />} onClick={() => navigate('/dashboard/exam-question-catalogs')}>
                Kataloglar
              </Button>
            ) : null}
            <Button type="primary" icon={<Plus size={16} />} disabled={!can('exams', 'create')} onClick={openModal}>
              {t(T.add)}
            </Button>
          </div>
        }
      >
        <Table rowKey="id" loading={loading} dataSource={questions} columns={columns} pagination={false} size="small" />
      </Card>

      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
        title={t(T.add)}
        width={720}
      >
        <Form form={form} layout="vertical">
          {catalogIdParam ? (
            <Form.Item name="catalogId" hidden>
              <Input type="hidden" />
            </Form.Item>
          ) : (
            <Form.Item name="catalogId" label={t(T.catalog)} rules={[{ required: true, message: 'Katalog tanlang' }]}>
              <Select
                placeholder="PT / TB yoki boshqa"
                options={catalogs.map((c) => ({
                  value: c.id,
                  label: `${c.title} (${c.section})`,
                }))}
              />
            </Form.Item>
          )}
          <Form.Item name="prompt" label={t(T.prompt)} rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="type" label={t(T.type)} rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'SINGLE_CHOICE', label: 'SINGLE_CHOICE' },
                { value: 'YES_NO', label: 'YES_NO' },
                { value: 'MATCHING', label: 'MATCHING' },
              ]}
            />
          </Form.Item>
          <Form.Item name="difficulty" label={t({ uz: 'Qiyinlik', en: 'Difficulty', ru: 'Сложность' })} rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'EASY', label: 'EASY' },
                { value: 'MEDIUM', label: 'MEDIUM' },
                { value: 'HARD', label: 'HARD' },
              ]}
            />
          </Form.Item>
          <Form.Item name="positionIds" label={t(T.positions)}>
            <Select mode="multiple" allowClear options={positions.map((p) => ({ value: p.id, label: p.title }))} />
          </Form.Item>
          <Form.Item name="isActive" label={t(T.active)} valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.List name="options">
            {(fields, { add, remove }) => (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{t(T.options)}</div>
                  <Button onClick={() => add({ optionText: '' })}>+ Variant</Button>
                </div>
                {fields.map((f) => (
                  <div key={f.key} className="grid grid-cols-12 gap-2 items-center">
                    <Form.Item className="col-span-7 mb-0" name={[f.name, 'optionText']} rules={[{ required: true }]}>
                      <Input placeholder="Variant matni" />
                    </Form.Item>
                    <Form.Item className="col-span-3 mb-0" name={[f.name, 'matchText']}>
                      <Input placeholder="matchText (ixtiyoriy)" />
                    </Form.Item>
                    <Form.Item className="col-span-1 mb-0" name={[f.name, 'isCorrect']} valuePropName="checked">
                      <Switch size="small" />
                    </Form.Item>
                    <div className="col-span-1">
                      <Button danger onClick={() => remove(f.name)} icon={<Trash2 size={14} />} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  );
}
