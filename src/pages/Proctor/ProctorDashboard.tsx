import { useMemo, useState } from 'react';
import { Button, Form, Input, Modal, Select, Spin, Table, Tag, message } from '@/components/ui';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { ListSurface } from '@/components/FilterBar';
import { useFetch } from '@/hooks/useFetch';
import { useTranslation } from '@/hooks/useTranslation';
import apiService, { apiErrorMessage, type EmployeeSafetySection } from '@/services/api';
import { formatPersonName } from '@/lib/person-name';
import { can } from '@/utils/can';
import { isSuperAdmin } from '@/utils/isSuperAdmin';

type RoomRow = {
  id: string;
  standardName: string;
  employeeName: string;
  scheduledAt: string;
  status: string;
  notificationStatus: string;
};

const STATUS_LABEL: Record<string, { uz: string; en: string; ru: string }> = {
  SCHEDULED: { uz: 'Rejada', en: 'Scheduled', ru: 'Запланирован' },
  READY: { uz: 'Tayyor', en: 'Ready', ru: 'Готов' },
  IN_PROGRESS: { uz: 'Davom etmoqda', en: 'In progress', ru: 'Идёт' },
  INTERRUPTED: { uz: 'Uzilgan', en: 'Interrupted', ru: 'Прерван' },
  COMPLETED: { uz: 'Yakunlangan', en: 'Finished', ru: 'Завершён' },
  CANCELLED: { uz: 'Bekor', en: 'Cancelled', ru: 'Отменён' },
  EXPIRED: { uz: 'Muddati o‘tgan', en: 'Expired', ru: 'Истёк' },
};

function localStamp(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultWindow() {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  return { scheduledAt: localStamp(start), expiresAt: localStamp(end) };
}

export default function ProctorDashboardPage() {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | undefined>();
  const [sections, setSections] = useState<EmployeeSafetySection[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const rooms = useFetch(
    ['proctor-rooms', status ?? ''],
    () => apiService.getProctorRooms({ status }),
    { total: 0, data: [] },
  );
  const standards = useFetch(['proctor-standards'], () => apiService.getProctorStandards(), []);
  const employees = useFetch(
    ['proctor-employees'],
    () => apiService.getStudents({ limit: 200, light: true }),
    { data: [], total: 0, page: 1, limit: 200 },
  );

  const openModal = () => {
    if (!can('exams', 'create')) return;
    setSections([]);
    setOpen(true);
    form.resetFields();
    form.setFieldsValue({ ...defaultWindow(), userId: undefined, safetyRecordId: undefined, standardId: undefined });
  };

  const onEmployee = async (userId: string) => {
    form.setFieldsValue({ userId, safetyRecordId: undefined });
    setSectionsLoading(true);
    try {
      const bundle = await apiService.getEmployeeSafetyRecords(userId);
      const next = bundle.sections.filter((section) => section.record?.id);
      setSections(next);
      if (next[0]?.record?.id) form.setFieldsValue({ safetyRecordId: next[0].record.id });
    } catch (err) {
      setSections([]);
      message.error(apiErrorMessage(err, 'Bo‘limlar yuklanmadi'));
    } finally {
      setSectionsLoading(false);
    }
  };

  const create = async () => {
    try {
      const values = await form.validateFields();
      const start = new Date(values.scheduledAt);
      const end = new Date(values.expiresAt);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
        message.error('Tugash vaqti boshlanishdan keyin bo‘lsin');
        return;
      }
      if (!can('exams', 'create')) return;
      setSaving(true);
      await apiService.createProctorRoom({
        userId: values.userId,
        safetyRecordId: values.safetyRecordId,
        standardId: values.standardId,
        scheduledAt: start.toISOString(),
        expiresAt: end.toISOString(),
      });
      message.success('Xona ochildi');
      setOpen(false);
      rooms.refetch();
    } catch (err) {
      if (err instanceof Error || (err as { response?: unknown })?.response) {
        message.error(apiErrorMessage(err, 'Xona ochilmadi'));
      }
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        title: t({ uz: 'Xodim', en: 'Employee', ru: 'Сотрудник' }),
        dataIndex: 'employeeName',
        key: 'employeeName',
        render: (value: string) => value || '—',
      },
      { title: t({ uz: 'Standart', en: 'Standard', ru: 'Стандарт' }), dataIndex: 'standardName', key: 'standardName' },
      {
        title: t({ uz: 'Sana', en: 'Date', ru: 'Дата' }),
        dataIndex: 'scheduledAt',
        key: 'scheduledAt',
        width: 180,
        render: (value: string) => new Date(value).toLocaleString(),
      },
      {
        title: t({ uz: 'Holat', en: 'Status', ru: 'Статус' }),
        dataIndex: 'status',
        key: 'status',
        width: 150,
        render: (value: string) => {
          const label = STATUS_LABEL[value];
          const color = value === 'IN_PROGRESS' ? 'green' : value === 'COMPLETED' ? 'blue' : value === 'INTERRUPTED' ? 'orange' : 'default';
          return <Tag color={color}>{label ? t(label) : value}</Tag>;
        },
      },
      {
        title: t({ uz: 'Amallar', en: 'Actions', ru: 'Действия' }),
        key: 'actions',
        width: 180,
        render: (_: unknown, row: RoomRow) => (
          <div className="flex items-center gap-2">
            {row.notificationStatus !== 'SENT' ? (
              <Button
                size="small"
                disabled={!can('exams', 'update')}
                onClick={() =>
                  apiService
                    .retryProctorNotify(row.id)
                    .then(() => {
                      message.success('Xabar yuborildi');
                      rooms.refetch();
                    })
                    .catch((err) => message.error(apiErrorMessage(err, 'Xabar yuborilmadi')))
                }
              >
                {t({ uz: 'Xabar', en: 'Notify', ru: 'Уведомить' })}
              </Button>
            ) : null}
            {isSuperAdmin() && row.status !== 'COMPLETED' ? (
              <Button
                size="small"
                onClick={() =>
                  apiService
                    .restartProctorRoom(row.id)
                    .then(() => {
                      message.success('Qayta boshlandi');
                      rooms.refetch();
                    })
                    .catch((err) => message.error(apiErrorMessage(err, 'Qayta boshlanmadi')))
                }
              >
                {t({ uz: 'Qayta', en: 'Restart', ru: 'Заново' })}
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [rooms, t],
  );

  if (rooms.initialLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t({ uz: 'Imtihon xonalari', en: 'Exam rooms', ru: 'Комнаты экзамена' })}
        actions={
          <Button type="primary" icon={<Plus size={16} />} disabled={!can('exams', 'create')} onClick={openModal}>
            {t({ uz: 'Xona ochish', en: 'Open room', ru: 'Открыть комнату' })}
          </Button>
        }
      />
      <ListSurface
        loading={rooms.loading}
        toolbar={
          <Select
            allowClear
            placeholder={t({ uz: 'Holat', en: 'Status', ru: 'Статус' })}
            style={{ width: 200 }}
            value={status}
            onChange={(value) => setStatus(value || undefined)}
            options={Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label: t(label) }))}
          />
        }
      >
        <Table
          rowKey="id"
          loading={rooms.loading}
          dataSource={rooms.data?.data ?? []}
          columns={columns}
          variant="flat"
          className="!rounded-none !border-0"
          pagination={{ pageSize: 20 }}
          size="small"
        />
      </ListSurface>

      <Modal
        open={open}
        title={t({ uz: 'Yangi xona', en: 'New room', ru: 'Новая комната' })}
        onCancel={() => setOpen(false)}
        onOk={create}
        confirmLoading={saving}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="userId" label={t({ uz: 'Xodim', en: 'Employee', ru: 'Сотрудник' })} rules={[{ required: true, message: 'Xodimni tanlang' }]}>
            <Select
              showSearch
              placeholder={t({ uz: 'Xodim', en: 'Employee', ru: 'Сотрудник' })}
              options={(employees.data?.data ?? []).map((employee) => ({
                value: employee.id,
                label: formatPersonName(employee),
              }))}
              onChange={(value) => void onEmployee(value)}
            />
          </Form.Item>
          <Form.Item name="safetyRecordId" label={t({ uz: 'Bo‘lim', en: 'Section', ru: 'Раздел' })} rules={[{ required: true, message: 'Bo‘limni tanlang' }]}>
            <Select
              loading={sectionsLoading}
              placeholder={t({ uz: 'Bo‘lim', en: 'Section', ru: 'Раздел' })}
              options={sections.map((section) => ({
                value: section.record?.id ?? '',
                label: section.type.titleUz,
              }))}
            />
          </Form.Item>
          <Form.Item name="standardId" label={t({ uz: 'Standart', en: 'Standard', ru: 'Стандарт' })} rules={[{ required: true, message: 'Standartni tanlang' }]}>
            <Select
              placeholder={t({ uz: 'Standart', en: 'Standard', ru: 'Стандарт' })}
              options={(standards.data ?? []).map((row) => ({ value: row.id, label: row.name }))}
            />
          </Form.Item>
          <Form.Item name="scheduledAt" label={t({ uz: 'Boshlanish', en: 'Starts', ru: 'Начало' })} rules={[{ required: true, message: 'Vaqtni tanlang' }]}>
            <Input type="datetime-local" />
          </Form.Item>
          <Form.Item name="expiresAt" label={t({ uz: 'Tugash', en: 'Ends', ru: 'Окончание' })} rules={[{ required: true, message: 'Vaqtni tanlang' }]}>
            <Input type="datetime-local" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
