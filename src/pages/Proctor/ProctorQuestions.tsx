import { useEffect, useMemo, useState } from 'react';
import { Button, Form, Input, Modal, Popconfirm, Select, Spin, Table, Tag, message } from '@/components/ui';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { ListSurface } from '@/components/FilterBar';
import { useFetch } from '@/hooks/useFetch';
import { useTranslation } from '@/hooks/useTranslation';
import apiService, { apiErrorMessage } from '@/services/api';
import { can } from '@/utils/can';

type OptionDraft = { text: string; isCorrect: boolean };
type QuestionRow = {
  id: string;
  prompt: string;
  type: 'SINGLE' | 'MULTIPLE';
  options: { id: string; text: string; isCorrect: boolean }[];
};

const emptyOptions = (): OptionDraft[] => [
  { text: '', isCorrect: true },
  { text: '', isCorrect: false },
];

export default function ProctorQuestionsPage() {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<QuestionRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<OptionDraft[]>(emptyOptions());
  const [kind, setKind] = useState<'SINGLE' | 'MULTIPLE'>('SINGLE');
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  const list = useFetch(
    ['proctor-questions', query],
    () => apiService.getProctorQuestions({ search: query || undefined, limit: 100 }),
    { total: 0, data: [] },
  );

  const openModal = (row?: QuestionRow) => {
    if (row && !can('exams', 'update')) return;
    if (!row && !can('exams', 'create')) return;
    setEditing(row ?? null);
    setKind(row?.type ?? 'SINGLE');
    setOptions(
      row?.options?.length
        ? row.options.map((opt) => ({ text: opt.text, isCorrect: opt.isCorrect }))
        : emptyOptions(),
    );
    setOpen(true);
    if (row) form.setFieldsValue({ prompt: row.prompt, type: row.type });
    else {
      form.resetFields();
      form.setFieldsValue({ type: 'SINGLE' });
    }
  };

  const markCorrect = (index: number, checked: boolean) => {
    setOptions((prev) =>
      prev.map((item, i) => {
        if (kind === 'SINGLE') return { ...item, isCorrect: i === index };
        return i === index ? { ...item, isCorrect: checked } : item;
      }),
    );
  };

  const save = async () => {
    try {
      const values = await form.validateFields();
      const filled = options.map((opt) => ({ ...opt, text: opt.text.trim() })).filter((opt) => opt.text);
      if (filled.length < 2) {
        message.error('Kamida ikkita variant yozing');
        return;
      }
      const correct = filled.filter((opt) => opt.isCorrect).length;
      if (values.type === 'SINGLE' && correct !== 1) {
        message.error('Bitta to‘g‘ri javobni belgilang');
        return;
      }
      if (values.type === 'MULTIPLE' && correct < 1) {
        message.error('Kamida bitta to‘g‘ri javobni belgilang');
        return;
      }
      if (editing && !can('exams', 'update')) return;
      if (!editing && !can('exams', 'create')) return;
      setSaving(true);
      await apiService.saveProctorQuestion(
        {
          prompt: String(values.prompt).trim(),
          type: values.type,
          subject: 'Umumiy',
          category: 'Umumiy',
          options: filled,
        },
        editing?.id,
      );
      message.success(editing ? 'Savol yangilandi' : 'Savol saqlandi');
      setOpen(false);
      list.refetch();
    } catch (err) {
      if (err instanceof Error || (err as { response?: unknown })?.response) {
        message.error(apiErrorMessage(err, 'Savol saqlanmadi'));
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!can('exams', 'delete')) return;
    try {
      await apiService.deleteProctorQuestion(id);
      message.success('Savol o‘chirildi');
      list.refetch();
    } catch (err) {
      message.error(apiErrorMessage(err, 'O‘chirilmadi'));
    }
  };

  const columns = useMemo(
    () => [
      {
        title: '#',
        key: 'idx',
        width: 56,
        render: (_: unknown, __: QuestionRow, index: number) => index + 1,
      },
      { title: t({ uz: 'Savol', en: 'Question', ru: 'Вопрос' }), dataIndex: 'prompt', key: 'prompt' },
      {
        title: t({ uz: 'Javob', en: 'Answer', ru: 'Ответ' }),
        dataIndex: 'type',
        key: 'type',
        width: 160,
        render: (value: QuestionRow['type']) => (
          <Tag color={value === 'MULTIPLE' ? 'blue' : 'default'}>
            {value === 'MULTIPLE'
              ? t({ uz: 'Bir nechta', en: 'Several', ru: 'Несколько' })
              : t({ uz: 'Bitta', en: 'One', ru: 'Один' })}
          </Tag>
        ),
      },
      {
        title: t({ uz: 'Amallar', en: 'Actions', ru: 'Действия' }),
        key: 'actions',
        width: 120,
        render: (_: unknown, row: QuestionRow) => (
          <div className="flex items-center gap-2">
            <Button size="small" icon={<Pencil size={14} />} disabled={!can('exams', 'update')} onClick={() => openModal(row)} />
            <Popconfirm title="O‘chirish?" onConfirm={() => remove(row.id)}>
              <Button size="small" danger icon={<Trash2 size={14} />} disabled={!can('exams', 'delete')} />
            </Popconfirm>
          </div>
        ),
      },
    ],
    [t],
  );

  if (list.initialLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  const rows = list.data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t({ uz: 'Imtihon savollari', en: 'Exam questions', ru: 'Вопросы экзамена' })}
        actions={
          <Button type="primary" icon={<Plus size={16} />} disabled={!can('exams', 'create')} onClick={() => openModal()}>
            {t({ uz: 'Savol qo‘shish', en: 'Add question', ru: 'Добавить вопрос' })}
          </Button>
        }
      />
      <ListSurface
        loading={list.loading}
        toolbar={
          <>
            <Input
              value={search}
              placeholder={t({ uz: 'Qidirish', en: 'Search', ru: 'Поиск' })}
              className="max-w-xs"
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className="font-mono text-xs tabular-nums text-muted-foreground">{rows.length}</span>
          </>
        }
      >
        <Table
          rowKey="id"
          loading={list.loading}
          dataSource={rows}
          columns={columns}
          variant="flat"
          className="!rounded-none !border-0"
          pagination={{ pageSize: 20, showSizeChanger: true }}
          size="small"
        />
      </ListSurface>

      <Modal
        open={open}
        title={editing ? t({ uz: 'Savolni tahrirlash', en: 'Edit question', ru: 'Изменить вопрос' }) : t({ uz: 'Yangi savol', en: 'New question', ru: 'Новый вопрос' })}
        onCancel={() => setOpen(false)}
        onOk={save}
        confirmLoading={saving}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="prompt"
            label={t({ uz: 'Savol matni', en: 'Question', ru: 'Текст вопроса' })}
            rules={[{ required: true, message: 'Savolni yozing' }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="type" label={t({ uz: 'Javob turi', en: 'Answer type', ru: 'Тип ответа' })} rules={[{ required: true }]}>
            <Select
              value={kind}
              options={[
                { value: 'SINGLE', label: t({ uz: 'Bitta javob', en: 'One answer', ru: 'Один ответ' }) },
                { value: 'MULTIPLE', label: t({ uz: 'Bir nechta javob', en: 'Several answers', ru: 'Несколько ответов' }) },
              ]}
              onChange={(value) => {
                const next = value === 'MULTIPLE' ? 'MULTIPLE' : 'SINGLE';
                setKind(next);
                form.setFieldsValue({ type: next });
                if (next === 'SINGLE') {
                  setOptions((prev) => {
                    const keep = Math.max(0, prev.findIndex((row) => row.isCorrect));
                    return prev.map((item, index) => ({ ...item, isCorrect: index === keep }));
                  });
                }
              }}
            />
          </Form.Item>
        </Form>
        <div className="space-y-2">
          <p className="text-sm font-medium">{t({ uz: 'Variantlar', en: 'Options', ru: 'Варианты' })}</p>
          {options.map((opt, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={opt.text}
                placeholder={`${t({ uz: 'Variant', en: 'Option', ru: 'Вариант' })} ${index + 1}`}
                onChange={(e) =>
                  setOptions((prev) => prev.map((item, i) => (i === index ? { ...item, text: e.target.value } : item)))
                }
              />
              <label className="flex shrink-0 items-center gap-2 text-sm">
                <input
                  type={kind === 'MULTIPLE' ? 'checkbox' : 'radio'}
                  name="correct-option"
                  checked={opt.isCorrect}
                  onChange={(e) => markCorrect(index, e.target.checked)}
                />
                {t({ uz: 'To‘g‘ri', en: 'Correct', ru: 'Верный' })}
              </label>
            </div>
          ))}
          <Button
            htmlType="button"
            onClick={() => setOptions((prev) => [...prev, { text: '', isCorrect: false }])}
          >
            {t({ uz: 'Variant qo‘shish', en: 'Add option', ru: 'Добавить вариант' })}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
