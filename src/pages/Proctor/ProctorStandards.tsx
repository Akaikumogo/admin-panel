import { useMemo, useState } from 'react';
import { Button, Form, Input, Modal, Spin, Table, message } from '@/components/ui';
import { Pencil, Plus } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { ListSurface } from '@/components/FilterBar';
import { useFetch } from '@/hooks/useFetch';
import { useTranslation } from '@/hooks/useTranslation';
import apiService, { apiErrorMessage } from '@/services/api';
import { can } from '@/utils/can';

type StandardRow = {
  id: string;
  name: string;
  code: string;
  durationMs: number;
  passPercent: number;
  questionIds: string[];
};

function codeFromName(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 20);
  return `${slug || 'imtihon'}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function ProctorStandardsPage() {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StandardRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const questions = useFetch(
    ['proctor-q-all'],
    () => apiService.getProctorQuestions({ page: 1, limit: 100 }),
    { total: 0, data: [] },
  );
  const standards = useFetch(['proctor-standards'], () => apiService.getProctorStandards(), [] as StandardRow[]);

  const openModal = (row?: StandardRow) => {
    if (row && !can('exams', 'update')) return;
    if (!row && !can('exams', 'create')) return;
    setEditing(row ?? null);
    setPicked(row?.questionIds ?? []);
    setOpen(true);
    if (row) {
      form.setFieldsValue({
        name: row.name,
        durationMin: Math.round(row.durationMs / 60000),
        passPercent: row.passPercent,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ durationMin: 40, passPercent: 70 });
    }
  };

  const save = async () => {
    try {
      const values = await form.validateFields();
      const minutes = Number(values.durationMin);
      const pass = Number(values.passPercent);
      if (!Number.isFinite(minutes) || minutes < 1) {
        message.error('Daqiqani kiriting');
        return;
      }
      if (!Number.isFinite(pass) || pass < 1 || pass > 100) {
        message.error('O‘tish foizi 1 dan 100 gacha');
        return;
      }
      if (!picked.length) {
        message.error('Kamida bitta savolni belgilang');
        return;
      }
      if (editing && !can('exams', 'update')) return;
      if (!editing && !can('exams', 'create')) return;
      setSaving(true);
      await apiService.saveProctorStandard(
        {
          name: String(values.name).trim(),
          code: editing?.code || codeFromName(String(values.name)),
          subject: 'Umumiy',
          durationMs: minutes * 60 * 1000,
          passPercent: pass,
          maxRecordingMb: 500,
          totalQuestions: picked.length,
          randomizeQuestions: true,
          randomizeOptions: true,
          recordingRequired: true,
          questionIds: picked,
          nextExamRule: { kind: 'months', months: 12 },
        },
        editing?.id,
      );
      message.success(editing ? 'Standart yangilandi' : 'Standart saqlandi');
      setOpen(false);
      standards.refetch();
    } catch (err) {
      if (err instanceof Error || (err as { response?: unknown })?.response) {
        message.error(apiErrorMessage(err, 'Standart saqlanmadi'));
      }
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        title: '#',
        key: 'idx',
        width: 56,
        render: (_: unknown, __: StandardRow, index: number) => index + 1,
      },
      { title: t({ uz: 'Nomi', en: 'Name', ru: 'Название' }), dataIndex: 'name', key: 'name' },
      {
        title: t({ uz: 'Daqiqa', en: 'Minutes', ru: 'Минуты' }),
        key: 'duration',
        width: 100,
        render: (_: unknown, row: StandardRow) => Math.round(row.durationMs / 60000),
      },
      {
        title: t({ uz: 'Savollar', en: 'Questions', ru: 'Вопросы' }),
        key: 'questions',
        width: 110,
        render: (_: unknown, row: StandardRow) => row.questionIds.length,
      },
      {
        title: t({ uz: 'O‘tish', en: 'Pass', ru: 'Проход' }),
        dataIndex: 'passPercent',
        key: 'passPercent',
        width: 90,
        render: (value: number) => `${value}%`,
      },
      {
        title: t({ uz: 'Amallar', en: 'Actions', ru: 'Действия' }),
        key: 'actions',
        width: 80,
        render: (_: unknown, row: StandardRow) => (
          <Button size="small" icon={<Pencil size={14} />} disabled={!can('exams', 'update')} onClick={() => openModal(row)} />
        ),
      },
    ],
    [t],
  );

  if (standards.initialLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  const bank = questions.data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t({ uz: 'Imtihon standartlari', en: 'Exam standards', ru: 'Стандарты экзамена' })}
        actions={
          <Button type="primary" icon={<Plus size={16} />} disabled={!can('exams', 'create')} onClick={() => openModal()}>
            {t({ uz: 'Standart qo‘shish', en: 'Add standard', ru: 'Добавить стандарт' })}
          </Button>
        }
      />
      <ListSurface loading={standards.loading}>
        <Table
          rowKey="id"
          loading={standards.loading}
          dataSource={standards.data ?? []}
          columns={columns}
          variant="flat"
          className="!rounded-none !border-0"
          pagination={{ pageSize: 20 }}
          size="small"
        />
      </ListSurface>

      <Modal
        open={open}
        title={editing ? t({ uz: 'Standartni tahrirlash', en: 'Edit standard', ru: 'Изменить стандарт' }) : t({ uz: 'Yangi standart', en: 'New standard', ru: 'Новый стандарт' })}
        onCancel={() => setOpen(false)}
        onOk={save}
        confirmLoading={saving}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t({ uz: 'Nomi', en: 'Name', ru: 'Название' })} rules={[{ required: true, message: 'Nomini yozing' }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="durationMin"
            label={t({ uz: 'Daqiqa', en: 'Minutes', ru: 'Минуты' })}
            rules={[{ required: true, message: 'Vaqtni yozing' }]}
          >
            <Input type="number" min={1} />
          </Form.Item>
          <Form.Item
            name="passPercent"
            label={t({ uz: 'O‘tish foizi', en: 'Pass percent', ru: 'Проходной процент' })}
            rules={[{ required: true, message: 'Foizni yozing' }]}
          >
            <Input type="number" min={1} max={100} />
          </Form.Item>
        </Form>
        <p className="mb-2 text-sm font-medium">{t({ uz: 'Savollar', en: 'Questions', ru: 'Вопросы' })}</p>
        <div className="max-h-56 space-y-1 overflow-auto">
          {bank.length ? (
            bank.map((question) => (
              <label key={question.id} className="flex items-start gap-2 py-1 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={picked.includes(question.id)}
                  onChange={(e) =>
                    setPicked((prev) =>
                      e.target.checked ? [...prev, question.id] : prev.filter((id) => id !== question.id),
                    )
                  }
                />
                <span>{question.prompt}</span>
              </label>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              {t({ uz: 'Avval savol qo‘shing', en: 'Add a question first', ru: 'Сначала добавьте вопрос' })}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
