import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Modal,
  Select,
  Spin,
  Switch,
  Table,
  Tag,
  message,
} from 'antd';
import { Bell, CalendarClock, QrCode, UserPlus } from 'lucide-react';
import { io, type Socket } from 'socket.io-client';
import QRCode from 'qrcode';
import { useTranslation } from '@/hooks/useTranslation';
import { useFetch } from '@/hooks/useFetch';
import apiService, {
  getExamLiveSocketUrl,
  type ExamLiveAwaitingOralRow,
  type ExamLivePendingSession,
  type OralResult,
  type PaginatedResponse,
  type UpcomingExamAssignment,
  type UserProfile,
} from '@/services/api';
import { can } from '@/utils/can';

export default function ExamSchedulePage() {
  const { t } = useTranslation();
  const { data: me } = useFetch<UserProfile | null>(['me'], () => apiService.me(), null);

  const { data: rows, loading, initialLoading, refetch } = useFetch(
    ['upcoming-exams'],
    () => apiService.getUpcomingExams(),
    [] as UpcomingExamAssignment[],
  );

  const {
    data: pending,
    loading: pendingLoading,
    refetch: refetchPending,
  } = useFetch(['exam-live-pending'], () => apiService.getExamLivePending(), [] as ExamLivePendingSession[]);

  const {
    data: awaitingOral,
    loading: oralLoading,
    refetch: refetchOral,
  } = useFetch(
    ['exam-live-awaiting-oral'],
    () => apiService.getExamLiveAwaitingOral(),
    [] as ExamLiveAwaitingOralRow[],
  );

  const emptyUsers = useMemo<PaginatedResponse<UserProfile>>(
    () => ({ data: [], total: 0, page: 1, limit: 200 }),
    [],
  );
  const { data: usersPage } = useFetch(
    ['users-for-extra-exam', me?.id ?? '—'],
    () =>
      me && me.role !== 'USER'
        ? apiService.getUsers({ role: 'USER', limit: 200 })
        : Promise.resolve(emptyUsers),
    emptyUsers,
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [active, setActive] = useState<UpcomingExamAssignment | null>(null);
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);

  const [qrOpen, setQrOpen] = useState(false);
  const [qrRow, setQrRow] = useState<UpcomingExamAssignment | null>(null);
  const [qrImg, setQrImg] = useState<string | null>(null);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectSessionId, setRejectSessionId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const [codeOpen, setCodeOpen] = useState(false);
  const [issuedCode, setIssuedCode] = useState('');
  const [codeExpires, setCodeExpires] = useState('');

  const [oralOpen, setOralOpen] = useState(false);
  const [oralAttemptId, setOralAttemptId] = useState<string | null>(null);
  const [oralSaving, setOralSaving] = useState(false);
  const [oralForm] = Form.useForm<{
    oralResult: OralResult;
    oralFeedback: string;
    nextExamMonths: number;
  }>();

  const [extraOpen, setExtraOpen] = useState(false);
  const [extraSaving, setExtraSaving] = useState(false);
  const [extraForm] = Form.useForm<{
    userId: string;
    organizationId: string;
    includesPt: boolean;
    includesTb: boolean;
    reason: string;
  }>();

  const openSchedule = (r: UpcomingExamAssignment) => {
    setActive(r);
    setModalOpen(true);
    setScheduledAt(r.scheduledAt ? new Date(r.scheduledAt) : null);
  };

  const handleSave = async () => {
    if (!active || !scheduledAt) return;
    if (!can('exams', 'update')) return;
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

  const openQr = useCallback(async (r: UpcomingExamAssignment) => {
    setQrRow(r);
    setQrOpen(true);
    setQrImg(null);
    const token = r.qrToken?.trim();
    if (!token) {
      message.warning('QR token yo‘q');
      return;
    }
    try {
      const url = await QRCode.toDataURL(token, { margin: 1, width: 280 });
      setQrImg(url);
    } catch {
      message.error('QR yaratilmadi');
    }
  }, []);

  useEffect(() => {
    if (!me || (me.role !== 'MODERATOR' && me.role !== 'SUPERADMIN')) return;
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const socket: Socket = io(`${getExamLiveSocketUrl()}/exam-live`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    const orgs = me.organizations ?? [];
    for (const o of orgs) {
      socket.emit('join_org', { organizationId: o.id });
    }

    const onPending = () => {
      void refetchPending();
      message.info(
        t({
          uz: 'Yangi imtihon so‘rovi',
          en: 'New exam check-in',
          ru: 'Новый запрос на экзамен',
        }),
      );
    };
    socket.on('exam_pending', onPending);

    const interval = window.setInterval(() => {
      void refetchPending();
      void refetchOral();
    }, 30000);

    return () => {
      socket.off('exam_pending', onPending);
      socket.disconnect();
      window.clearInterval(interval);
    };
  }, [me, refetchPending, refetchOral, t]);

  const approveSession = async (sessionId: string) => {
    if (!can('exams', 'update')) return;
    try {
      const res = await apiService.approveExamSession(sessionId);
      setIssuedCode(res.code);
      setCodeExpires(res.expiresAt);
      setCodeOpen(true);
      void refetchPending();
      message.success(
        t({
          uz: 'Kod berildi — xodimga ayting',
          en: 'Code issued — tell the employee',
          ru: 'Код выдан — сообщите сотруднику',
        }),
      );
    } catch {
      /* apiService shows notification */
    }
  };

  const submitReject = async () => {
    if (!rejectSessionId || !rejectReason.trim()) return;
    if (!can('exams', 'update')) return;
    try {
      setRejecting(true);
      await apiService.rejectExamSession(rejectSessionId, rejectReason.trim());
      message.success('Rad etildi');
      setRejectOpen(false);
      setRejectSessionId(null);
      setRejectReason('');
      void refetchPending();
    } finally {
      setRejecting(false);
    }
  };

  const submitOral = async () => {
    if (!oralAttemptId) return;
    if (!can('exams', 'update')) return;
    try {
      const v = await oralForm.validateFields();
      setOralSaving(true);
      await apiService.finalizeExamOral(oralAttemptId, v);
      message.success('Yakunlandi');
      setOralOpen(false);
      setOralAttemptId(null);
      oralForm.resetFields();
      void refetchOral();
      refetch();
    } finally {
      setOralSaving(false);
    }
  };

  const submitExtra = async () => {
    if (!can('exams', 'create')) return;
    try {
      const v = await extraForm.validateFields();
      if (!v.includesPt && !v.includesTb) {
        message.error('PT yoki TB dan kamida bittasini tanlang');
        return;
      }
      setExtraSaving(true);
      await apiService.createExtraExamAssignment(v);
      message.success('Navbatdan tashqari tayinlandi');
      setExtraOpen(false);
      extraForm.resetFields();
      refetch();
    } finally {
      setExtraSaving(false);
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
        title: t({ uz: 'Tarkib', en: 'Content', ru: 'Состав' }),
        key: 'types',
        width: 100,
        render: (_: unknown, r: UpcomingExamAssignment) => (
          <span className="flex flex-wrap gap-1">
            {r.includesPt !== false ? <Tag color="blue">PT</Tag> : null}
            {r.includesTb !== false ? <Tag color="cyan">TB</Tag> : null}
          </span>
        ),
      },
      {
        title: t({ uz: 'Taklif', en: 'Suggested', ru: 'Рекоменд.' }),
        dataIndex: 'suggestedAt',
        key: 'suggestedAt',
        width: 160,
        render: (v: string) => new Date(v).toLocaleString(),
      },
      {
        title: t({ uz: 'Oyna', en: 'Window', ru: 'Окно' }),
        key: 'window',
        width: 220,
        render: (_: unknown, r: UpcomingExamAssignment) =>
          `${new Date(r.windowStart).toLocaleDateString()} → ${new Date(r.windowEnd).toLocaleDateString()}`,
      },
      {
        title: t({ uz: 'Belgilangan', en: 'Scheduled', ru: 'Назначено' }),
        dataIndex: 'scheduledAt',
        key: 'scheduledAt',
        width: 150,
        render: (v: string | null) => (v ? new Date(v).toLocaleString() : '—'),
      },
      {
        title: t({ uz: 'Status', en: 'Status', ru: 'Статус' }),
        dataIndex: 'status',
        key: 'status',
        width: 110,
        render: (v: string) => <Tag>{v}</Tag>,
      },
      {
        title: 'QR',
        key: 'qr',
        width: 88,
        render: (_: unknown, r: UpcomingExamAssignment) => (
          <Button
            size="small"
            icon={<QrCode size={14} />}
            disabled={!r.qrToken}
            onClick={() => void openQr(r)}
          >
            QR
          </Button>
        ),
      },
      {
        title: t({ uz: 'Amal', en: 'Action', ru: 'Действие' }),
        key: 'action',
        width: 140,
        render: (_: unknown, r: UpcomingExamAssignment) => (
          <Button
            type="primary"
            size="small"
            disabled={!can('exams', 'update')}
            onClick={() => openSchedule(r)}
          >
            {t({ uz: 'Sana', en: 'Schedule', ru: 'Дата' })}
          </Button>
        ),
      },
    ],
    [t, openQr],
  );

  const pendingCols = useMemo(
    () => [
      {
        title: t({ uz: 'Xodim', en: 'Employee', ru: 'Сотрудник' }),
        key: 'user',
        render: (_: unknown, r: ExamLivePendingSession) =>
          r.user ? `${r.user.firstName} ${r.user.lastName}` : '—',
      },
      {
        title: t({ uz: 'Tashkilot', en: 'Org', ru: 'Орг.' }),
        dataIndex: 'organizationName',
        key: 'organizationName',
      },
      {
        title: t({ uz: 'Imtihon', en: 'Exam', ru: 'Экзамен' }),
        dataIndex: 'examTitle',
        key: 'examTitle',
      },
      {
        title: 'PT/TB',
        key: 'tb',
        width: 90,
        render: (_: unknown, r: ExamLivePendingSession) => (
          <span className="flex gap-1">
            {r.includesPt ? <Tag>PT</Tag> : null}
            {r.includesTb ? <Tag>TB</Tag> : null}
          </span>
        ),
      },
      {
        title: t({ uz: 'Amallar', en: 'Actions', ru: 'Действия' }),
        key: 'a',
        width: 200,
        render: (_: unknown, r: ExamLivePendingSession) => (
          <div className="flex gap-2">
            <Button
              type="primary"
              size="small"
              disabled={!can('exams', 'update')}
              onClick={() => void approveSession(r.sessionId)}
            >
              {t({ uz: 'Tasdiqlash', en: 'Approve', ru: 'Подтвердить' })}
            </Button>
            <Button
              danger
              size="small"
              disabled={!can('exams', 'update')}
              onClick={() => {
                setRejectSessionId(r.sessionId);
                setRejectReason('');
                setRejectOpen(true);
              }}
            >
              {t({ uz: 'Rad', en: 'Reject', ru: 'Отклонить' })}
            </Button>
          </div>
        ),
      },
    ],
    [t],
  );

  const oralCols = useMemo(
    () => [
      {
        title: t({ uz: 'Xodim', en: 'Employee', ru: 'Сотрудник' }),
        key: 'user',
        render: (_: unknown, r: ExamLiveAwaitingOralRow) =>
          r.user ? `${r.user.firstName} ${r.user.lastName}` : '—',
      },
      {
        title: t({ uz: 'Imtihon', en: 'Exam', ru: 'Экзамен' }),
        dataIndex: 'examTitle',
        key: 'examTitle',
      },
      {
        title: '%',
        key: 'sc',
        width: 140,
        render: (_: unknown, r: ExamLiveAwaitingOralRow) => (
          <span className="text-xs">
            PT {r.ptScorePercent ?? '—'} / TB {r.tbScorePercent ?? '—'} / ∑ {r.scorePercent ?? '—'}
          </span>
        ),
      },
      {
        title: t({ uz: 'Og‘zaki', en: 'Oral', ru: 'Устный' }),
        key: 'o',
        width: 120,
        render: (_: unknown, r: ExamLiveAwaitingOralRow) => (
          <Button
            type="primary"
            size="small"
            disabled={!r.attemptId || !can('exams', 'update')}
            onClick={() => {
              if (!r.attemptId) return;
              setOralAttemptId(r.attemptId);
              oralForm.setFieldsValue({
                oralResult: 'SATISFACTORY',
                oralFeedback: '',
                nextExamMonths: 3,
              });
              setOralOpen(true);
            }}
          >
            {t({ uz: 'Baholash', en: 'Grade', ru: 'Оценить' })}
          </Button>
        ),
      },
    ],
    [oralForm, t],
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

  const userOptions =
    usersPage?.data?.map((u) => ({
      value: u.id,
      label: `${u.firstName} ${u.lastName} (${u.email})`,
    })) ?? [];

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-100px)]">
      <Card
        className="!border-slate-200 dark:!border-slate-700/60"
        title={
          <span className="flex items-center gap-2">
            <Bell size={16} />
            {t({
              uz: 'Kutish — moderator tasdiqi',
              en: 'Waiting — moderator approval',
              ru: 'Ожидание — подтверждение',
            })}
          </span>
        }
      >
        <Table
          rowKey="sessionId"
          loading={pendingLoading}
          dataSource={pending}
          columns={pendingCols}
          pagination={false}
          size="small"
        />
      </Card>

      <Card
        className="!border-slate-200 dark:!border-slate-700/60"
        title={
          <span className="flex items-center gap-2">
            <CalendarClock size={16} />
            {t({ uz: 'Og‘zaki baho kutilmoqda', en: 'Awaiting oral grade', ru: 'Устная оценка' })}
          </span>
        }
      >
        <Table
          rowKey="sessionId"
          loading={oralLoading}
          dataSource={awaitingOral}
          columns={oralCols}
          pagination={false}
          size="small"
        />
      </Card>

      <Card
        className="!border-slate-200 dark:!border-slate-700/60"
        title={
          <span className="flex items-center gap-2">
            <CalendarClock size={16} />
            {t({ uz: 'Imtihon belgilash', en: 'Exam scheduling', ru: 'Назначение экзамена' })}
          </span>
        }
        extra={
          <Button
            type="default"
            icon={<UserPlus size={16} />}
            disabled={!can('exams', 'create')}
            onClick={() => {
              extraForm.resetFields();
              extraForm.setFieldsValue({
                includesPt: true,
                includesTb: true,
                organizationId: me?.organizations?.[0]?.id,
              });
              setExtraOpen(true);
            }}
          >
            {t({ uz: 'Navbatdan tashqari', en: 'Extra exam', ru: 'Внеплановый' })}
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
        okButtonProps={{ disabled: !scheduledAt || !can('exams', 'update') }}
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

      <Modal
        open={qrOpen}
        onCancel={() => setQrOpen(false)}
        footer={null}
        title={t({ uz: 'Imtihon QR', en: 'Exam QR', ru: 'QR экзамена' })}
      >
        {qrImg ? (
          <div className="flex flex-col items-center gap-3">
            <img src={qrImg} alt="QR" className="rounded-lg border border-slate-200" />
            <p className="break-all text-center font-mono text-xs text-slate-600 dark:text-slate-300">
              {qrRow?.qrToken}
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate-500">{t({ uz: 'Yuklanmoqda…', en: 'Loading…', ru: 'Загрузка…' })}</p>
        )}
      </Modal>

      <Modal
        open={codeOpen}
        onCancel={() => setCodeOpen(false)}
        onOk={() => setCodeOpen(false)}
        title={t({ uz: 'Xodim kodi', en: 'Employee code', ru: 'Код сотрудника' })}
      >
        <p className="mb-2 text-sm text-slate-600 dark:text-slate-300">
          {t({
            uz: '10 belgili kod (5 daqiqa). Xodimga ayting yoki ularning ilovasida ko‘rinadi.',
            en: '10-character code (5 min). Tell the employee or it appears in their app.',
            ru: '10 символов (5 мин). Сообщите сотруднику.',
          })}
        </p>
        <div className="rounded-lg bg-slate-100 p-4 text-center font-mono text-2xl font-bold tracking-widest dark:bg-slate-800">
          {issuedCode}
        </div>
        <p className="mt-2 text-xs text-slate-500">TTL: {codeExpires ? new Date(codeExpires).toLocaleString() : '—'}</p>
      </Modal>

      <Modal
        open={rejectOpen}
        onCancel={() => setRejectOpen(false)}
        onOk={submitReject}
        confirmLoading={rejecting}
        okButtonProps={{ disabled: !rejectReason.trim() }}
        title={t({ uz: 'Rad etish sababi', en: 'Rejection reason', ru: 'Причина отказа' })}
      >
        <Input.TextArea rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
      </Modal>

      <Modal
        open={oralOpen}
        onCancel={() => setOralOpen(false)}
        onOk={submitOral}
        confirmLoading={oralSaving}
        title={t({ uz: 'Og‘zaki baho', en: 'Oral grade', ru: 'Устная оценка' })}
      >
        <Form form={oralForm} layout="vertical">
          <Form.Item name="oralResult" label="Natija" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'SATISFACTORY', label: 'Qoniqarli' },
                { value: 'UNSATISFACTORY', label: 'Qoniqarsiz' },
              ]}
            />
          </Form.Item>
          <Form.Item name="oralFeedback" label="Izoh" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="nextExamMonths" label="Keyingi imtihon (oy)" rules={[{ required: true }]}>
            <Select
              options={[1, 2, 3, 4, 5, 6].map((n) => ({ value: n, label: String(n) }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={extraOpen}
        onCancel={() => setExtraOpen(false)}
        onOk={submitExtra}
        confirmLoading={extraSaving}
        title={t({ uz: 'Navbatdan tashqari imtihon', en: 'Extra exam', ru: 'Внеплановый экзамен' })}
        okButtonProps={{ disabled: !can('exams', 'create') }}
      >
        <Form form={extraForm} layout="vertical">
          <Form.Item name="userId" label={t({ uz: 'Xodim', en: 'Employee', ru: 'Сотрудник' })} rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label" options={userOptions} placeholder="USER" />
          </Form.Item>
          <Form.Item name="organizationId" label={t({ uz: 'Tashkilot', en: 'Organization', ru: 'Организация' })} rules={[{ required: true }]}>
            <Select
              options={(me?.organizations ?? []).map((o) => ({ value: o.id, label: o.name }))}
            />
          </Form.Item>
          <Form.Item name="includesPt" label="PT" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="includesTb" label="TB" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="reason" label={t({ uz: 'Sabab', en: 'Reason', ru: 'Причина' })} rules={[{ required: true }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
