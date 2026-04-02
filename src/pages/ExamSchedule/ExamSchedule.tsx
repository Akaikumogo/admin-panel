import { useMemo, useState } from 'react';
import { Button, Card, DatePicker, Modal, Spin, Table, Tag, message } from 'antd';
import { CalendarClock } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useFetch } from '@/hooks/useFetch';
import apiService from '@/services/api';
import type { UpcomingExamAssignment, UserProfile } from '@/services/api';

export default function ExamSchedulePage() {
  const { t } = useTranslation();
  const { data: me } = useFetch<UserProfile | null>(['me'], () => apiService.me(), null);

  const { data: rows, loading, initialLoading, refetch } = useFetch(
    ['upcoming-exams'],
    () => apiService.getUpcomingExams(),
    [] as UpcomingExamAssignment[],
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [active, setActive] = useState<UpcomingExamAssignment | null>(null);
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);

  const openSchedule = (r: UpcomingExamAssignment) => {
    setActive(r);
    setModalOpen(true);
    setScheduledAt(r.scheduledAt ? new Date(r.scheduledAt) : null);
  };

  const handleSave = async () => {
    if (!active || !scheduledAt) return;
    try {
      setSaving(true);
      await apiService.scheduleExamAssignment(active.id, scheduledAt.toISOString());
      message.success('Imtihon sanasi belgilandi');
      setModalOpen(false);
      setActive(null);
      refetch();
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        title: t({ uz: 'Xodim', en: 'Employee', ru: 'Сотрудник' }),
        key: 'user',
        render: (_: unknown, r: UpcomingExamAssignment) =>
          r.user ? `${r.user.firstName} ${r.user.lastName} (${r.user.email})` : r.userId,
      },
      {
        title: t({ uz: 'Imtihon', en: 'Exam', ru: 'Экзамен' }),
        key: 'exam',
        render: (_: unknown, r: UpcomingExamAssignment) => r.exam?.title || r.examId,
      },
      {
        title: t({ uz: 'Suggested', en: 'Suggested', ru: 'Рекомендовано' }),
        dataIndex: 'suggestedAt',
        key: 'suggestedAt',
        width: 180,
        render: (v: string) => new Date(v).toLocaleString(),
      },
      {
        title: t({ uz: 'Oyna', en: 'Window', ru: 'Окно' }),
        key: 'window',
        width: 260,
        render: (_: unknown, r: UpcomingExamAssignment) =>
          `${new Date(r.windowStart).toLocaleString()} → ${new Date(r.windowEnd).toLocaleString()}`,
      },
      {
        title: t({ uz: 'Belgilangan', en: 'Scheduled', ru: 'Назначено' }),
        dataIndex: 'scheduledAt',
        key: 'scheduledAt',
        width: 180,
        render: (v: string | null) => (v ? new Date(v).toLocaleString() : '—'),
      },
      {
        title: t({ uz: 'Status', en: 'Status', ru: 'Статус' }),
        dataIndex: 'status',
        key: 'status',
        width: 120,
        render: (v: string) => <Tag>{v}</Tag>,
      },
      {
        title: t({ uz: 'Amal', en: 'Action', ru: 'Действие' }),
        key: 'action',
        width: 160,
        render: (_: unknown, r: UpcomingExamAssignment) => (
          <Button type="primary" size="small" onClick={() => openSchedule(r)}>
            {t({ uz: 'Sana belgilash', en: 'Schedule', ru: 'Назначить' })}
          </Button>
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

  const minDate = active ? new Date(active.windowStart) : null;
  const maxDate = active ? new Date(active.windowEnd) : null;

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-100px)]">
      <Card
        className="!border-slate-200 dark:!border-slate-700/60"
        title={
          <span className="flex items-center gap-2">
            <CalendarClock size={16} />
            {t({ uz: 'Imtihon belgilash', en: 'Exam scheduling', ru: 'Назначение экзамена' })}
          </span>
        }
      >
        <Table rowKey="id" loading={loading} dataSource={rows} columns={columns} pagination={false} size="small" />
      </Card>

      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
        okButtonProps={{ disabled: !scheduledAt }}
        title={t({ uz: 'Imtihon sanasi', en: 'Exam date', ru: 'Дата экзамена' })}
      >
        <div className="space-y-2">
          <div className="text-sm text-slate-600 dark:text-slate-300">
            {minDate && maxDate ? `Ruxsat: ${minDate.toLocaleString()} → ${maxDate.toLocaleString()}` : ''}
          </div>
          <DatePicker
            showTime
            style={{ width: '100%' }}
            value={scheduledAt ? (scheduledAt as any) : null}
            onChange={(v) => setScheduledAt(v ? v.toDate() : null)}
            disabledDate={(current) => {
              if (!minDate || !maxDate || !current) return false;
              const d = current.toDate();
              return d < minDate || d > maxDate;
            }}
          />
        </div>
      </Modal>
    </div>
  );
}

