import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, Input, Spin, Tag } from '@/components/ui';
import { useTranslation } from '@/hooks/useTranslation';
import apiService, {
  type EmployeeSafetySection,
  type Role,
  type UpsertSafetyRecordPayload,
  type UserProfile,
} from '@/services/api';
import { notification } from '@/lib/toast';

type Props = {
  userId: string;
  me: UserProfile | null;
};

const T = {
  title: {
    uz: 'Xavfsizlik / sertifikat maʼlumotlari',
    en: 'Safety / certification',
    ru: 'Безопасность / сертификация',
  },
  pending: { uz: 'Tasdiq kutilmoqda', en: 'Pending approval', ru: 'Ожидает' },
  approved: { uz: 'Tasdiqlangan', en: 'Approved', ru: 'Утверждено' },
  rejected: { uz: 'Rad etilgan', en: 'Rejected', ru: 'Отклонено' },
  empty: { uz: 'Maʼlumot yoʻq', en: 'No data', ru: 'Нет данных' },
  save: { uz: 'Saqlash', en: 'Save', ru: 'Сохранить' },
  approve: { uz: 'Tasdiqlash', en: 'Approve', ru: 'Утвердить' },
  reject: { uz: 'Rad etish', en: 'Reject', ru: 'Отклонить' },
  examDate: { uz: 'Sinov sanasi', en: 'Exam date', ru: 'Дата испытания' },
  examReason: { uz: 'Sinov sababi', en: 'Reason', ru: 'Причина' },
  grade: { uz: 'Baho', en: 'Grade', ru: 'Оценка' },
  qualGroup: {
    uz: 'Malaka guruhi',
    en: 'Qualification group',
    ru: 'Группа',
  },
  nextExam: {
    uz: 'Keyingi sinov sanasi',
    en: 'Next exam date',
    ru: 'След. дата',
  },
  ruleName: { uz: 'Qoida nomi', en: 'Rule name', ru: 'Правило' },
  decision: {
    uz: 'Komissiya qarori',
    en: 'Commission decision',
    ru: 'Решение',
  },
  protocolNo: {
    uz: 'Bayonnoma raqami',
    en: 'Protocol number',
    ru: 'Протокол №',
  },
  protocolDate: {
    uz: 'Bayonnoma sanasi',
    en: 'Protocol date',
    ru: 'Дата протокола',
  },
  doctor: {
    uz: 'Shifokor xulosasi',
    en: 'Doctor conclusion',
    ru: 'Заключение врача',
  },
  medicalDate: {
    uz: 'Koʻrik sanasi',
    en: 'Exam date',
    ru: 'Дата осмотра',
  },
  updatedBy: { uz: 'Yangilagan', en: 'Updated by', ru: 'Обновил' },
  approvedBy: { uz: 'Tasdiqlagan', en: 'Approved by', ru: 'Утвердил' },
} as const;

function personName(p: { firstName?: string; lastName?: string; email?: string; id: string } | null | undefined) {
  if (!p) return '—';
  const n = `${p.lastName ?? ''} ${p.firstName ?? ''}`.trim();
  return n || p.email || p.id;
}

function statusTag(
  status: string | undefined,
  t: (x: { uz: string; en: string; ru: string }) => string,
) {
  if (status === 'PENDING') return <Tag color="orange">{t(T.pending)}</Tag>;
  if (status === 'APPROVED') return <Tag color="green">{t(T.approved)}</Tag>;
  if (status === 'REJECTED') return <Tag color="red">{t(T.rejected)}</Tag>;
  return null;
}

export function EmployeeSafetySection({ userId, me }: Props) {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const sectionParam = searchParams.get('section');
  const changeIdParam = searchParams.get('changeId');
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<EmployeeSafetySection[]>([]);
  const [editing, setEditing] = useState<Record<string, UpsertSafetyRecordPayload>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const refs = useRef<Record<string, HTMLDivElement | null>>({});

  const role: Role | undefined = me?.role;
  const canEdit = role === 'SUPERADMIN' || role === 'MODERATOR';
  const canApprove = role === 'SUPERADMIN' || role === 'APPROVER';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiService.getEmployeeSafetyRecords(userId);
      setSections(data);
      const draft: Record<string, UpsertSafetyRecordPayload> = {};
      for (const s of data) {
        const src = s.pendingChange?.newData ?? s.record;
        draft[s.type.code] = {
          examDate: (src as { examDate?: string | null })?.examDate ?? null,
          examReason: (src as { examReason?: string | null })?.examReason ?? null,
          grade: (src as { grade?: string | null })?.grade ?? null,
          qualificationGroup:
            (src as { qualificationGroup?: string | null })?.qualificationGroup ??
            null,
          nextExamDate:
            (src as { nextExamDate?: string | null })?.nextExamDate ?? null,
          ruleName: (src as { ruleName?: string | null })?.ruleName ?? null,
          commissionDecision:
            (src as { commissionDecision?: string | null })?.commissionDecision ??
            null,
          protocolNumber:
            (src as { protocolNumber?: string | null })?.protocolNumber ?? null,
          protocolDate:
            (src as { protocolDate?: string | null })?.protocolDate ?? null,
          doctorConclusion:
            (src as { doctorConclusion?: string | null })?.doctorConclusion ??
            null,
        };
      }
      setEditing(draft);
    } catch {
      notification.error({
        message: t({
          uz: 'Safety maʼlumotlarini yuklab boʻlmadi',
          en: 'Failed to load safety records',
          ru: 'Не удалось загрузить',
        }),
      });
    } finally {
      setLoading(false);
    }
    // `t` intentionally omitted — unstable identity previously caused infinite refetch
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!sectionParam || loading) return;
    const el = refs.current[sectionParam];
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('ring-2', 'ring-amber-400');
    const timer = window.setTimeout(() => {
      el.classList.remove('ring-2', 'ring-amber-400');
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [sectionParam, loading, sections]);

  const highlightChangeId = useMemo(
    () => changeIdParam,
    [changeIdParam],
  );

  const onSave = async (typeCode: string) => {
    setSaving(typeCode);
    try {
      await apiService.upsertEmployeeSafetyRecord(
        userId,
        typeCode,
        editing[typeCode] ?? {},
      );
      notification.success({
        message: t({
          uz: 'Saqlandi — tasdiq kutilmoqda',
          en: 'Saved — pending approval',
          ru: 'Сохранено — ожидает',
        }),
      });
      await load();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Error';
      notification.error({ message: String(msg) });
    } finally {
      setSaving(null);
    }
  };

  const onApprove = async (changeId: string) => {
    setActing(changeId);
    try {
      await apiService.approveSafetyChange(changeId);
      notification.success({ message: t(T.approve) });
      await load();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Error';
      notification.error({ message: String(msg) });
    } finally {
      setActing(null);
    }
  };

  const onReject = async (changeId: string) => {
    setActing(changeId);
    try {
      await apiService.rejectSafetyChange(changeId);
      notification.success({ message: t(T.reject) });
      await load();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Error';
      notification.error({ message: String(msg) });
    } finally {
      setActing(null);
    }
  };

  const setField = (
    typeCode: string,
    key: keyof UpsertSafetyRecordPayload,
    value: string,
  ) => {
    setEditing((prev) => ({
      ...prev,
      [typeCode]: { ...prev[typeCode], [key]: value || null },
    }));
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 flex justify-center">
        <Spin />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
        {t(T.title)}
      </h2>
      {sections.map((s) => {
        const code = s.type.code;
        const form = editing[code] ?? {};
        const pending = s.pendingChange;
        const isMedical = code === 'MEDICAL_EXAM';
        const isIndustrial = code === 'INDUSTRIAL_SAFETY';
        const isOccupational = code === 'OCCUPATIONAL_SAFETY';
        const showApprove =
          canApprove &&
          pending &&
          pending.approvalStatus === 'PENDING' &&
          (!highlightChangeId || highlightChangeId === pending.id);

        return (
          <div
            key={code}
            id={`safety-${s.type.sectionSlug}`}
            ref={(el) => {
              refs.current[s.type.sectionSlug] = el;
            }}
            className="bg-card border border-border rounded-lg p-5 transition-shadow"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {s.type.titleUz}
              </h3>
              {statusTag(
                pending?.approvalStatus ?? s.record?.approvalStatus,
                t,
              )}
            </div>

            {!s.record && !canEdit ? (
              <p className="text-sm text-slate-500">{t(T.empty)}</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {!isMedical && !isIndustrial && (
                  <>
                    <label className="text-sm space-y-1">
                      <span className="text-slate-500">{t(T.examDate)}</span>
                      <Input
                        type="date"
                        disabled={!canEdit}
                        value={form.examDate ?? ''}
                        onChange={(e) =>
                          setField(code, 'examDate', e.target.value)
                        }
                      />
                    </label>
                    <label className="text-sm space-y-1">
                      <span className="text-slate-500">{t(T.examReason)}</span>
                      <Input
                        disabled={!canEdit}
                        value={form.examReason ?? ''}
                        onChange={(e) =>
                          setField(code, 'examReason', e.target.value)
                        }
                      />
                    </label>
                    {isOccupational && (
                      <label className="text-sm space-y-1">
                        <span className="text-slate-500">{t(T.qualGroup)}</span>
                        <Input
                          disabled={!canEdit}
                          value={form.qualificationGroup ?? ''}
                          onChange={(e) =>
                            setField(code, 'qualificationGroup', e.target.value)
                          }
                        />
                      </label>
                    )}
                    <label className="text-sm space-y-1">
                      <span className="text-slate-500">{t(T.grade)}</span>
                      <Input
                        disabled={!canEdit}
                        value={form.grade ?? ''}
                        onChange={(e) =>
                          setField(code, 'grade', e.target.value)
                        }
                      />
                    </label>
                    <label className="text-sm space-y-1">
                      <span className="text-slate-500">{t(T.nextExam)}</span>
                      <Input
                        type="date"
                        disabled={!canEdit}
                        value={form.nextExamDate ?? ''}
                        onChange={(e) =>
                          setField(code, 'nextExamDate', e.target.value)
                        }
                      />
                    </label>
                  </>
                )}

                {isIndustrial && (
                  <>
                    <label className="text-sm space-y-1">
                      <span className="text-slate-500">{t(T.examDate)}</span>
                      <Input
                        type="date"
                        disabled={!canEdit}
                        value={form.examDate ?? ''}
                        onChange={(e) =>
                          setField(code, 'examDate', e.target.value)
                        }
                      />
                    </label>
                    <label className="text-sm space-y-1">
                      <span className="text-slate-500">{t(T.ruleName)}</span>
                      <Input
                        disabled={!canEdit}
                        value={form.ruleName ?? ''}
                        onChange={(e) =>
                          setField(code, 'ruleName', e.target.value)
                        }
                      />
                    </label>
                    <label className="text-sm space-y-1">
                      <span className="text-slate-500">{t(T.decision)}</span>
                      <Input
                        disabled={!canEdit}
                        value={form.commissionDecision ?? ''}
                        onChange={(e) =>
                          setField(code, 'commissionDecision', e.target.value)
                        }
                      />
                    </label>
                    <label className="text-sm space-y-1">
                      <span className="text-slate-500">{t(T.protocolNo)}</span>
                      <Input
                        disabled={!canEdit}
                        value={form.protocolNumber ?? ''}
                        onChange={(e) =>
                          setField(code, 'protocolNumber', e.target.value)
                        }
                      />
                    </label>
                    <label className="text-sm space-y-1">
                      <span className="text-slate-500">{t(T.protocolDate)}</span>
                      <Input
                        type="date"
                        disabled={!canEdit}
                        value={form.protocolDate ?? ''}
                        onChange={(e) =>
                          setField(code, 'protocolDate', e.target.value)
                        }
                      />
                    </label>
                    <label className="text-sm space-y-1">
                      <span className="text-slate-500">{t(T.nextExam)}</span>
                      <Input
                        type="date"
                        disabled={!canEdit}
                        value={form.nextExamDate ?? ''}
                        onChange={(e) =>
                          setField(code, 'nextExamDate', e.target.value)
                        }
                      />
                    </label>
                  </>
                )}

                {isMedical && (
                  <>
                    <label className="text-sm space-y-1">
                      <span className="text-slate-500">{t(T.medicalDate)}</span>
                      <Input
                        type="date"
                        disabled={!canEdit}
                        value={form.examDate ?? ''}
                        onChange={(e) =>
                          setField(code, 'examDate', e.target.value)
                        }
                      />
                    </label>
                    <label className="text-sm space-y-1 md:col-span-2">
                      <span className="text-slate-500">{t(T.doctor)}</span>
                      <Input
                        disabled={!canEdit}
                        value={form.doctorConclusion ?? ''}
                        onChange={(e) =>
                          setField(code, 'doctorConclusion', e.target.value)
                        }
                      />
                    </label>
                  </>
                )}
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              {s.record?.updatedBy && (
                <span>
                  {t(T.updatedBy)}: {personName(s.record.updatedBy)}
                  {s.record.updatedAt
                    ? ` · ${new Date(s.record.updatedAt).toLocaleString()}`
                    : ''}
                </span>
              )}
              {s.record?.approvedBy && (
                <span>
                  {t(T.approvedBy)}: {personName(s.record.approvedBy)}
                  {s.record.approvedAt
                    ? ` · ${new Date(s.record.approvedAt).toLocaleString()}`
                    : ''}
                </span>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {canEdit && (
                <Button
                  size="small"
                  type="primary"
                  loading={saving === code}
                  onClick={() => void onSave(code)}
                >
                  {t(T.save)}
                </Button>
              )}
              {showApprove && pending && (
                <>
                  <Button
                    size="small"
                    type="primary"
                    loading={acting === pending.id}
                    onClick={() => void onApprove(pending.id)}
                  >
                    {t(T.approve)}
                  </Button>
                  <Button
                    size="small"
                    danger
                    loading={acting === pending.id}
                    onClick={() => void onReject(pending.id)}
                  >
                    {t(T.reject)}
                  </Button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
