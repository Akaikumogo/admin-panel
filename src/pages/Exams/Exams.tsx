import { useMemo, useState } from 'react';
import { Button, Card, Form, Input, Modal, Select, Spin, Switch, Table, Tag, message, Popconfirm } from 'antd';
import { ClipboardList, Plus, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useFetch } from '@/hooks/useFetch';
import apiService from '@/services/api';
import type { Exam, ExamType, UserProfile } from '@/services/api';

const T = {
  title: { uz: 'Imtihonlar', en: 'Exams', ru: 'Экзамены' },
  add: { uz: 'Qo‘shish', en: 'Add', ru: 'Добавить' },
  edit: { uz: 'Tahrirlash', en: 'Edit', ru: 'Редактировать' },
  examType: { uz: 'Turi', en: 'Type', ru: 'Тип' },
  scheduled: { uz: 'Navbatdagi', en: 'Scheduled', ru: 'Плановый' },
  extra: { uz: 'Navbatdan tashqari', en: 'Extra', ru: 'Внеплановый' },
  active: { uz: 'Aktiv', en: 'Active', ru: 'Активный' },
  titleField: { uz: 'Nomi', en: 'Title', ru: 'Название' },
  desc: { uz: 'Izoh', en: 'Description', ru: 'Описание' },
} as const;

export default function ExamsPage() {
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Exam | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const { data: me } = useFetch<UserProfile | null>(['me'], () => apiService.me(), null);
  const { data: rows, loading, initialLoading, refetch } = useFetch(
    ['exams'],
    () => apiService.getExams(),
    [] as Exam[],
  );

  const openModal = (row?: Exam) => {
    setEditing(row ?? null);
    setModalOpen(true);
    if (row) {
      form.setFieldsValue({
        title: row.title,
        description: row.description ?? undefined,
        examType: row.examType,
        isActive: row.isActive,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ examType: 'SCHEDULED', isActive: true });
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      if (editing) {
        await apiService.updateExam(editing.id, values);
        message.success('Imtihon yangilandi');
      } else {
        await apiService.createExam(values);
        message.success('Imtihon yaratildi');
      }
      setModalOpen(false);
      setEditing(null);
      refetch();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await apiService.deleteExam(id);
    message.success('Imtihon o‘chirildi');
    refetch();
  };

  const columns = useMemo(
    () => [
      { title: '#', dataIndex: 'idx', key: 'idx', width: 60, render: (_: unknown, __: Exam, i: number) => i + 1 },
      { title: t(T.titleField), dataIndex: 'title', key: 'title' },
      {
        title: t(T.examType),
        dataIndex: 'examType',
        key: 'examType',
        width: 150,
        render: (v: ExamType) => (
          <Tag color={v === 'SCHEDULED' ? 'blue' : 'purple'}>
            {v === 'SCHEDULED' ? t(T.scheduled) : t(T.extra)}
          </Tag>
        ),
      },
      {
        title: t(T.active),
        dataIndex: 'isActive',
        key: 'isActive',
        width: 90,
        render: (v: boolean) => (v ? <Tag color="green">ON</Tag> : <Tag>OFF</Tag>),
      },
      {
        title: t({ uz: 'Amallar', en: 'Actions', ru: 'Действия' }),
        key: 'actions',
        width: 140,
        render: (_: unknown, r: Exam) => (
          <div className="flex items-center gap-2">
            <Button size="small" icon={<Pencil size={14} />} onClick={() => openModal(r)} />
            <Popconfirm title="O‘chirish?" onConfirm={() => handleDelete(r.id)}>
              <Button size="small" danger icon={<Trash2 size={14} />} />
            </Popconfirm>
          </div>
        ),
      },
    ],
    [t],
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
          <span className="flex items-center gap-2">
            <ClipboardList size={16} />
            {t(T.title)}
          </span>
        }
        extra={
          <Button type="primary" icon={<Plus size={16} />} onClick={() => openModal()}>
            {t(T.add)}
          </Button>
        }
      >
        <Table rowKey="id" loading={loading} dataSource={rows} columns={columns} pagination={false} size="small" />
      </Card>

      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
        title={editing ? t(T.edit) : t(T.add)}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label={t(T.titleField)} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label={t(T.desc)}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="examType" label={t(T.examType)} rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'SCHEDULED', label: t(T.scheduled) },
                { value: 'EXTRA', label: t(T.extra) },
              ]}
            />
          </Form.Item>
          <Form.Item name="isActive" label={t(T.active)} valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

