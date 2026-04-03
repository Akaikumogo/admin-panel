import { useMemo, useState } from 'react';
import { Button, Card, Form, Input, Modal, Spin, Table, message, Popconfirm } from 'antd';
import { BriefcaseBusiness, Plus, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useFetch } from '@/hooks/useFetch';
import apiService from '@/services/api';
import type { Position, UserProfile } from '@/services/api';
import { can } from '@/utils/can';

const T = {
  title: { uz: 'Lavozimlar', en: 'Positions', ru: 'Должности' },
  add: { uz: 'Qo‘shish', en: 'Add', ru: 'Добавить' },
  edit: { uz: 'Tahrirlash', en: 'Edit', ru: 'Редактировать' },
  name: { uz: 'Lavozim nomi', en: 'Title', ru: 'Название' },
} as const;

export default function PositionsPage() {
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Position | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const { data: me } = useFetch<UserProfile | null>(['me'], () => apiService.me(), null);

  const { data: rows, loading, initialLoading, refetch } = useFetch(
    ['positions'],
    () => apiService.getPositions(),
    [] as Position[],
  );

  const openModal = (row?: Position) => {
    setEditing(row ?? null);
    setModalOpen(true);
    if (row) form.setFieldsValue({ title: row.title });
    else form.resetFields();
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editing && !can('exams', 'update')) return;
      if (!editing && !can('exams', 'create')) return;
      setSaving(true);
      if (editing) {
        await apiService.updatePosition(editing.id, values);
        message.success('Lavozim yangilandi');
      } else {
        await apiService.createPosition(values);
        message.success('Lavozim yaratildi');
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
    await apiService.deletePosition(id);
    message.success('Lavozim o‘chirildi');
    refetch();
  };

  const columns = useMemo(
    () => [
      { title: '#', dataIndex: 'idx', key: 'idx', width: 60, render: (_: unknown, __: Position, i: number) => i + 1 },
      { title: t(T.name), dataIndex: 'title', key: 'title' },
      {
        title: t({ uz: 'Amallar', en: 'Actions', ru: 'Действия' }),
        key: 'actions',
        width: 140,
        render: (_: unknown, r: Position) => (
          <div className="flex items-center gap-2">
            <Button
              size="small"
              icon={<Pencil size={14} />}
              disabled={!can('exams', 'update')}
              onClick={() => openModal(r)}
            />
            <Popconfirm title="O‘chirish?" onConfirm={() => handleDelete(r.id)}>
              <Button
                size="small"
                danger
                icon={<Trash2 size={14} />}
                disabled={!can('exams', 'delete')}
              />
            </Popconfirm>
          </div>
        ),
      },
    ],
    [t],
  );

  // This page is meaningful only for SuperAdmin / default-org moderators. Backend will enforce anyway.
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
            <BriefcaseBusiness size={16} />
            {t(T.title)}
          </span>
        }
        extra={
          <Button
            type="primary"
            icon={<Plus size={16} />}
            disabled={!can('exams', 'create')}
            onClick={() => openModal()}
          >
            {t(T.add)}
          </Button>
        }
      >
        <Table
          rowKey="id"
          loading={loading}
          dataSource={rows}
          columns={columns}
          pagination={false}
          size="small"
        />
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
        </Form>
      </Modal>
    </div>
  );
}

