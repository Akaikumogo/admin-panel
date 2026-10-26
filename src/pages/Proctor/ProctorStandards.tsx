import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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

  const watchedName = String(form.watch('name') ?? '').trim();
  const watchedMinutes = Number(form.watch('durationMin'));
  const watchedPass = Number(form.watch('passPercent'));

  const columns = useMemo(
    () => [
      {
        title: '#',
        key: 'idx',
        width: 56,
        render: (_: unknown, __: StandardRow, index: number) => index + 1,
      },
      {
        title: t({ uz: 'Imtihon nomi', en: 'Exam name', ru: 'Название экзамена' }),
        dataIndex: 'name',
        key: 'name',
      },
      {
        title: t({ uz: 'Imtihon vaqti', en: 'Time limit', ru: 'Время экзамена' }),
        key: 'duration',
        width: 140,
        render: (_: unknown, row: StandardRow) =>
          t({
            uz: `${Math.round(row.durationMs / 60000)} daqiqa`,
            en: `${Math.round(row.durationMs / 60000)} min`,
            ru: `${Math.round(row.durationMs / 60000)} мин`,
          }),
      },
      {
        title: t({ uz: 'Tushadigan savollar', en: 'Questions asked', ru: 'Вопросов в экзамене' }),
        key: 'questions',
        width: 170,
        render: (_: unknown, row: StandardRow) =>
          t({
            uz: `${row.questionIds.length} ta`,
            en: `${row.questionIds.length}`,
            ru: `${row.questionIds.length}`,
          }),
      },
      {
        title: t({ uz: 'O‘tgan hisoblanadi', en: 'Passes from', ru: 'Сдал, если' }),
        dataIndex: 'passPercent',
        key: 'passPercent',
        width: 170,
        render: (value: number) =>
          t({
            uz: `${value}% va yuqori`,
            en: `${value}% or higher`,
            ru: `${value}% и выше`,
          }),
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
        description={t({
          uz: 'Standart — bitta imtihon qoidasi. Xona ochilganda xodim shu vaqt, shu savollar va shu o‘tish foizi bilan topshiradi.',
          en: 'A standard is one exam rule: time, questions, and the score that counts as a pass.',
          ru: 'Стандарт — правило экзамена: время, вопросы и проходной процент.',
        })}
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
        width={640}
        title={editing ? t({ uz: 'Standartni tahrirlash', en: 'Edit standard', ru: 'Изменить стандарт' }) : t({ uz: 'Yangi standart', en: 'New standard', ru: 'Новый стандарт' })}
        onCancel={() => setOpen(false)}
        onOk={save}
        confirmLoading={saving}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label={t({ uz: 'Imtihon nomi', en: 'Exam name', ru: 'Название экзамена' })}
            extra={t({
              uz: 'Xona ro‘yxatida va xodim ekranida shu nom chiqadi.',
              en: 'Shown in the room list and on the employee screen.',
              ru: 'Это имя видит сотрудник и модератор.',
            })}
            rules={[{ required: true, message: 'Imtihon nomini yozing' }]}
          >
            <Input placeholder={t({ uz: 'Masalan: Elektr xavfsizligi, 3-guruh', en: 'Example: Electrical safety', ru: 'Например: Электробезопасность' })} />
          </Form.Item>
          <Form.Item
            name="durationMin"
            label={t({ uz: 'Imtihon necha daqiqa', en: 'How many minutes', ru: 'Сколько минут' })}
            extra={t({
              uz: 'Taymer shu daqiqadan boshlanadi. Vaqt tugasa javoblar o‘zi topshiriladi.',
              en: 'The timer starts from this many minutes. When it ends, answers are submitted.',
              ru: 'Таймер идёт столько минут. По окончании ответы сдаются сами.',
            })}
            rules={[{ required: true, message: 'Daqiqani yozing' }]}
          >
            <Input type="number" min={1} placeholder="40" />
          </Form.Item>
          <Form.Item
            name="passPercent"
            label={t({ uz: 'Necha foizdan o‘tgan', en: 'Pass from this percent', ru: 'С какого процента сдал' })}
            extra={t({
              uz: 'To‘g‘ri javoblar shu foizga yetsa, xodim o‘tgan. 70 bo‘lsa, 10 savoldan kamida 7 tasi to‘g‘ri bo‘lishi kerak.',
              en: 'The employee passes at this percent of correct answers. 70 means at least 7 of 10.',
              ru: 'Сотрудник сдал, если верных ответов не меньше этого процента.',
            })}
            rules={[{ required: true, message: 'Foizni yozing' }]}
          >
            <Input type="number" min={1} max={100} placeholder="70" />
          </Form.Item>
        </Form>
        <div className="mb-2">
          <p className="text-sm font-medium">
            {t({ uz: 'Qaysi savollar tushadi', en: 'Which questions are asked', ru: 'Какие вопросы попадут' })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t({
              uz: 'Belgilanganlarning hammasi tushadi, tartibi aralashadi.',
              en: 'Every ticked question is asked, in a shuffled order.',
              ru: 'Отмеченные вопросы попадут в экзамен в случайном порядке.',
            })}
          </p>
        </div>
        <div className="max-h-56 space-y-1 overflow-auto">
          {bank.length ? (
            bank.map((question) => (
              <label key={question.id} className="flex items-start gap-2 rounded-md px-1 py-1.5 text-sm hover:bg-muted/60">
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
              {t({ uz: 'Hali savol yo‘q. Avval ', en: 'No questions yet. First open ', ru: 'Вопросов нет. Сначала откройте ' })}
              <Link className="underline" to="/dashboard/proctor/questions">
                {t({ uz: 'Imtihon savollari', en: 'Exam questions', ru: 'Вопросы экзамена' })}
              </Link>
              {t({ uz: ' sahifasida qo‘shing.', en: '.', ru: '.' })}
            </p>
          )}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {t({
            uz: `Belgilandi: ${picked.length} ta savol.`,
            en: `Selected: ${picked.length}.`,
            ru: `Выбрано: ${picked.length}.`,
          })}
        </p>
        {watchedName && watchedMinutes > 0 && watchedPass > 0 && picked.length > 0 ? (
          <p className="mt-2 rounded-lg bg-muted/70 px-3 py-2 text-sm">
            {t({
              uz: `${watchedName}: xodim ${watchedMinutes} daqiqa ichida ${picked.length} ta savol yechadi. ${watchedPass}% va undan yuqori bo‘lsa, o‘tgan.`,
              en: `${watchedName}: ${watchedMinutes} minutes, ${picked.length} questions, pass from ${watchedPass}%.`,
              ru: `${watchedName}: ${watchedMinutes} мин, ${picked.length} вопросов, сдал от ${watchedPass}%.`,
            })}
          </p>
        ) : null}
      </Modal>
    </div>
  );
}
