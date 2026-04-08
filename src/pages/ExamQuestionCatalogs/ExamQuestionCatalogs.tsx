import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Form, Input, InputNumber, Modal, Select, Spin, Table, Tag, message, Popconfirm } from 'antd';
import { FolderTree, Plus, Pencil, Trash2, List } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useFetch } from '@/hooks/useFetch';
import apiService from '@/services/api';
import type { ExamQuestionCatalog, ExamQuestionSection, UserProfile } from '@/services/api';
import { can } from '@/utils/can';

const T = {
  title: { uz: 'Savol kataloglari', en: 'Question catalogs', ru: 'Каталоги вопросов' },
  add: { uz: 'Qo‘shish', en: 'Add', ru: 'Добавить' },
  edit: { uz: 'Tahrirlash', en: 'Edit', ru: 'Редактировать' },
  name: { uz: 'Nomi', en: 'Title', ru: 'Название' },
  section: { uz: 'Bo‘lim (PT/TB)', en: 'Section', ru: 'Раздел' },
  sort: { uz: 'Tartib', en: 'Order', ru: 'Порядок' },
  questions: { uz: 'Savollar', en: 'Questions', ru: 'Вопросы' },
} as const;

export default function ExamQuestionCatalogsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ExamQuestionCatalog | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const { data: me } = useFetch<UserProfile | null>(['me'], () => apiService.me(), null);
  const { data: rows, loading, initialLoading, refetch } = useFetch(
    ['exam-question-catalogs'],
    () => apiService.getExamQuestionCatalogs(),
    [] as ExamQuestionCatalog[],
  );

  const openModal = (row?: ExamQuestionCatalog) => {
    setEditing(row ?? null);
    setModalOpen(true);
    if (row) {
      form.setFieldsValue({
        title: row.title,
        section: row.section,
        sortOrder: row.sortOrder,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ section: 'PT' as ExamQuestionSection, sortOrder: 0 });
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (!can('exams', 'create')) return;
      setSaving(true);
      if (editing) {
        await apiService.updateExamQuestionCatalog(editing.id, values);
        message.success('Yangilandi');
      } else {
        await apiService.createExamQuestionCatalog(values);
        message.success('Yaratildi');
      }
      setModalOpen(false);
      setEditing(null);
      refetch();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!can('exams', 'delete')) return;
    await apiService.deleteExamQuestionCatalog(id);
    message.success('O‘chirildi');
    refetch();
  };

  const columns = useMemo(
    () => [
      { title: '#', key: 'idx', width: 50, render: (_: unknown, __: ExamQuestionCatalog, i: number) => i + 1 },
      { title: t(T.name), dataIndex: 'title', key: 'title' },
      {
        title: t(T.section),
        dataIndex: 'section',
        key: 'section',
        width: 80,
        render: (v: ExamQuestionSection) => <Tag color="geekblue">{v}</Tag>,
      },
      { title: t(T.sort), dataIndex: 'sortOrder', key: 'sortOrder', width: 72 },
      {
        title: t(T.questions),
        key: 'q',
        width: 120,
        render: (_: unknown, r: ExamQuestionCatalog) => (
          <Button
            size="small"
            icon={<List size={14} />}
            onClick={() => navigate(`/dashboard/exam-questions/catalog/${r.id}`)}
          >
            Savollar
          </Button>
        ),
      },
      {
        title: t({ uz: 'Amallar', en: 'Actions', ru: 'Действия' }),
        key: 'actions',
        width: 120,
        render: (_: unknown, r: ExamQuestionCatalog) => (
          <div className="flex items-center gap-2">
            <Button size="small" icon={<Pencil size={14} />} disabled={!can('exams', 'update')} onClick={() => openModal(r)} />
            <Popconfirm title="O‘chirish?" onConfirm={() => handleDelete(r.id)}>
              <Button size="small" danger icon={<Trash2 size={14} />} disabled={!can('exams', 'delete')} />
            </Popconfirm>
          </div>
        ),
      },
    ],
    [t, navigate],
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
            <FolderTree size={16} />
            {t(T.title)}
          </span>
        }
        extra={
          <Button type="primary" icon={<Plus size={16} />} disabled={!can('exams', 'create')} onClick={() => openModal()}>
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
          <Form.Item name="title" label={t(T.name)} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="section" label={t(T.section)} rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'PT', label: 'PT' },
                { value: 'TB', label: 'TB' },
              ]}
            />
          </Form.Item>
          <Form.Item name="sortOrder" label={t(T.sort)}>
            <InputNumber className="w-full" min={0} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
