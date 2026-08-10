import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Check, X, Save } from 'lucide-react';
import { Button, Input, Spin, Tag } from '@/components/ui';
import { useTranslation } from '@/hooks/useTranslation';
import apiService, {
  type EmployeeSafetyRecord,
  type EmployeeSafetySection,
  type Role,
  type UpsertSafetyRecordPayload,
  type UserProfile,
} from '@/services/api';
import { notification } from '@/lib/toast';
import { cn } from '@/lib/utils';

type Props = {
  userId: string;
  me: UserProfile | null;
};

type DraftRow = {
  key: string;
  typeCode: string;
  fields: UpsertSafetyRecordPayload;
};

const T = {
  title: {
    uz: 'Xavfsizlik / sertifikat maʼlumotlari',
    en: 'Safety / certification',
    ru: 'Безопасность / сертификация',
  },
  add: { uz: 'Qoʻshish', en: 'Add', ru: 'Добавить' },
  pending: { uz: 'Tasdiq kutilmoqda', en: 'Pending', ru: 'Ожидает' },
  approved: { uz: 'Tasdiqlangan', en: 'Approved', ru: 'Утверждено' },
  rejected: { uz: 'Rad etilgan', en: 'Rejected', ru: 'Отклонено' },
  empty: { uz: 'Yozuvlar yoʻq', en: 'No records', ru: 'Нет записей' },
  save: { uz: 'Saqlash', en: 'Save', ru: 'Сохранить' },
  cancel: { uz: 'Bekor', en: 'Cancel', ru: 'Отмена' },
  approve: { uz: 'Tasdiqlash', en: 'Approve', ru: 'Утвердить' },
  reject: { uz: 'Rad etish', en: 'Reject', ru: 'Отклонить' },
  examDate: { uz: 'Sinov sanasi', en: 'Exam date', ru: 'Дата' },
  examReason: { uz: 'Sinov sababi', en: 'Reason', ru: 'Причина' },
  grade: { uz: 'Baho', en: 'Grade', ru: 'Оценка' },
  qualGroup: {
    uz: 'Malaka guruhi',
    en: 'Qualification group',
    ru: 'Группа',
  },
  nextExam: { uz: 'Keyingi sinov', en: 'Next exam', ru: 'След. дата' },
  ruleName: { uz: 'Qoida nomi', en: 'Rule name', ru: 'Правило' },
  decision: {
    uz: 'Komissiya qarori',
    en: 'Commission decision',
    ru: 'Решение',
  },
  protocolNo: {
    uz: 'Bayonnoma №',
    en: 'Protocol №',
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
    ru: 'Заключение',
  },
  medicalDate: {
    uz: 'Koʻrik sanasi',
    en: 'Exam date',
    ru: 'Дата осмотра',
  },
  status: { uz: 'Holat', en: 'Status', ru: 'Статус' },
  actions: { uz: 'Amallar', en: 'Actions', ru: 'Действия' },
  draftHint: {
    uz: 'Yangi qator — toʻldirib saqlang',
    en: 'New row — fill and save',
    ru: 'Новая строка — заполните и сохраните',
  },
  latest: { uz: 'Joriy', en: 'Current', ru: 'Текущая' },
} as const;

const EMPTY_FIELDS: UpsertSafetyRecordPayload = {
  examDate: null,
  examReason: null,
  grade: null,
  qualificationGroup: null,
  nextExamDate: null,
  ruleName: null,
  commissionDecision: null,
  protocolNumber: null,
  protocolDate: null,
  doctorConclusion: null,
};

function statusTag(
  status: string | undefined,
  t: (x: { uz: string; en: string; ru: string }) => string,
) {
  if (status === 'PENDING')
    return (
      <Tag color="orange" className="!m-0">
        {t(T.pending)}
      </Tag>
    );
  if (status === 'APPROVED')
    return (
      <Tag color="green" className="!m-0">
        {t(T.approved)}
      </Tag>
    );
  if (status === 'REJECTED')
    return (
      <Tag color="red" className="!m-0">
        {t(T.rejected)}
      </Tag>
    );
  return <span className="text-slate-400">—</span>;
}

function sortRecords(list: EmployeeSafetyRecord[]) {
  return [...list].sort((a, b) => {
    const aDate = a.examDate || a.createdAt || '';
    const bDate = b.examDate || b.createdAt || '';
    if (aDate !== bDate) return bDate.localeCompare(aDate);
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });
}

function cell(children: React.ReactNode, className?: string) {
  return (
    <td className={cn('px-3 py-2 align-middle text-xs text-slate-700 dark:text-slate-200', className)}>
      {children}
    </td>
  );
}

export function EmployeeSafetySection({ userId, me }: Props) {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const sectionParam = searchParams.get('section');
  const changeIdParam = searchParams.get('changeId');
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<EmployeeSafetySection[]>([]);
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const highlightRef = useRef<HTMLTableRowElement | null>(null);

  const role: Role | undefined = me?.role;
  const canEdit = role === 'SUPERADMIN' || role === 'MODERATOR';
  const canApprove = role === 'SUPERADMIN' || role === 'APPROVER';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiService.getEmployeeSafetyRecords(userId);
      setSections(data);
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
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (loading || !sectionParam) return;
    highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [loading, sectionParam, sections, changeIdParam]);

  const draftsByType = useMemo(() => {
    const map = new Map<string, DraftRow[]>();
    for (const d of drafts) {
      const list = map.get(d.typeCode) ?? [];
      list.push(d);
      map.set(d.typeCode, list);
    }
    return map;
  }, [drafts]);

  const addDraft = (typeCode: string) => {
    if (!canEdit) return;
    setDrafts((prev) => [
      {
        key: `draft-${typeCode}-${Date.now()}`,
        typeCode,
        fields: { ...EMPTY_FIELDS },
      },
      ...prev,
    ]);
  };

  const updateDraftFields = (
    key: string,
    fields: Partial<UpsertSafetyRecordPayload>,
  ) => {
    setDrafts((prev) =>
      prev.map((d) =>
        d.key === key ? { ...d, fields: { ...d.fields, ...fields } } : d,
      ),
    );
  };

  const removeDraft = (key: string) => {
    setDrafts((prev) => prev.filter((d) => d.key !== key));
  };

  const onSaveDraft = async (draft: DraftRow) => {
    setSaving(draft.key);
    try {
      await apiService.upsertEmployeeSafetyRecord(
        userId,
        draft.typeCode,
        draft.fields,
      );
      notification.success({
        message: t({
          uz: 'Saqlandi — tasdiq kutilmoqda',
          en: 'Saved — pending approval',
          ru: 'Сохранено — ожидает',
        }),
      });
      removeDraft(draft.key);
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

  if (loading) {
    return (
      <div className="flex justify-center rounded-xl border border-border bg-card p-10">
        <Spin />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          {t(T.title)}
        </h2>
        <p className="mt-0.5 text-[11px] text-slate-500">
          {t({
            uz: 'Har bir boʻlim — alohida jadval',
            en: 'Each section has its own table',
            ru: 'Каждый раздел — отдельная таблица',
          })}
        </p>
      </div>

      {sections.map((section) => {
        const code = section.type.code;
        const isMedical = code === 'MEDICAL_EXAM';
        const isIndustrial = code === 'INDUSTRIAL_SAFETY';
        const isOccupational = code === 'OCCUPATIONAL_SAFETY';
        const records = sortRecords(
          section.records && section.records.length > 0
            ? section.records
            : section.record
              ? [section.record]
              : [],
        );
        const sectionDrafts = draftsByType.get(code) ?? [];
        const colCount = isMedical
          ? 4
          : isIndustrial
            ? 8
            : isOccupational
              ? 7
              : 6;

        const sectionHighlight =
          sectionParam === section.type.sectionSlug ||
          (changeIdParam && section.pendingChange?.id === changeIdParam);

        return (
          <section
            key={code}
            id={`safety-${section.type.sectionSlug}`}
            className={cn(
              'overflow-hidden rounded-xl border border-border/80 bg-card shadow-[0_12px_28px_-20px_rgba(15,23,42,0.2)]',
              sectionHighlight && 'ring-2 ring-amber-400/70',
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {section.type.titleUz}
                </h3>
                {section.record ? (
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {t(T.latest)}: {section.record.examDate || '—'} ·{' '}
                    {statusTag(section.record.approvalStatus, t)}
                  </p>
                ) : (
                  <p className="mt-0.5 text-[11px] text-slate-400">{t(T.empty)}</p>
                )}
              </div>
              {canEdit ? (
                <Button
                  type="primary"
                  size="small"
                  icon={<Plus size={14} strokeWidth={2} />}
                  onClick={() => addDraft(code)}
                  className="!h-8 shrink-0"
                >
                  {t(T.add)}
                </Button>
              ) : null}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-slate-50/80 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 dark:bg-slate-900/40 dark:text-slate-400">
                    {isMedical ? (
                      <>
                        <th className="px-3 py-2.5">{t(T.medicalDate)}</th>
                        <th className="px-3 py-2.5">{t(T.doctor)}</th>
                      </>
                    ) : isIndustrial ? (
                      <>
                        <th className="px-3 py-2.5 whitespace-nowrap">{t(T.examDate)}</th>
                        <th className="px-3 py-2.5">{t(T.ruleName)}</th>
                        <th className="px-3 py-2.5">{t(T.decision)}</th>
                        <th className="px-3 py-2.5">{t(T.protocolNo)}</th>
                        <th className="px-3 py-2.5 whitespace-nowrap">
                          {t(T.protocolDate)}
                        </th>
                        <th className="px-3 py-2.5 whitespace-nowrap">{t(T.nextExam)}</th>
                      </>
                    ) : (
                      <>
                        <th className="px-3 py-2.5 whitespace-nowrap">{t(T.examDate)}</th>
                        <th className="px-3 py-2.5">{t(T.examReason)}</th>
                        {isOccupational ? (
                          <th className="px-3 py-2.5">{t(T.qualGroup)}</th>
                        ) : null}
                        <th className="px-3 py-2.5">{t(T.grade)}</th>
                        <th className="px-3 py-2.5 whitespace-nowrap">{t(T.nextExam)}</th>
                      </>
                    )}
                    <th className="px-3 py-2.5">{t(T.status)}</th>
                    <th className="px-3 py-2.5">{t(T.actions)}</th>
                  </tr>
                </thead>
                <tbody>
                  {sectionDrafts.map((draft) => {
                    const f = draft.fields;
                    return (
                      <tr
                        key={draft.key}
                        className="border-b border-border/60 bg-[color-mix(in_oklab,var(--shell-rail)_6%,transparent)]"
                      >
                        {isMedical ? (
                          <>
                            {cell(
                              <Input
                                type="date"
                                className="!h-8 text-xs"
                                value={f.examDate ?? ''}
                                onChange={(e) =>
                                  updateDraftFields(draft.key, {
                                    examDate: e.target.value || null,
                                  })
                                }
                              />,
                            )}
                            {cell(
                              <Input
                                className="!h-8 text-xs min-w-[200px]"
                                placeholder={t(T.doctor)}
                                value={f.doctorConclusion ?? ''}
                                onChange={(e) =>
                                  updateDraftFields(draft.key, {
                                    doctorConclusion: e.target.value || null,
                                  })
                                }
                              />,
                            )}
                          </>
                        ) : isIndustrial ? (
                          <>
                            {cell(
                              <Input
                                type="date"
                                className="!h-8 text-xs"
                                value={f.examDate ?? ''}
                                onChange={(e) =>
                                  updateDraftFields(draft.key, {
                                    examDate: e.target.value || null,
                                  })
                                }
                              />,
                            )}
                            {cell(
                              <Input
                                className="!h-8 text-xs min-w-[140px]"
                                placeholder={t(T.ruleName)}
                                value={f.ruleName ?? ''}
                                onChange={(e) =>
                                  updateDraftFields(draft.key, {
                                    ruleName: e.target.value || null,
                                  })
                                }
                              />,
                            )}
                            {cell(
                              <Input
                                className="!h-8 text-xs min-w-[140px]"
                                placeholder={t(T.decision)}
                                value={f.commissionDecision ?? ''}
                                onChange={(e) =>
                                  updateDraftFields(draft.key, {
                                    commissionDecision: e.target.value || null,
                                  })
                                }
                              />,
                            )}
                            {cell(
                              <Input
                                className="!h-8 text-xs w-28"
                                placeholder={t(T.protocolNo)}
                                value={f.protocolNumber ?? ''}
                                onChange={(e) =>
                                  updateDraftFields(draft.key, {
                                    protocolNumber: e.target.value || null,
                                  })
                                }
                              />,
                            )}
                            {cell(
                              <Input
                                type="date"
                                className="!h-8 text-xs"
                                value={f.protocolDate ?? ''}
                                onChange={(e) =>
                                  updateDraftFields(draft.key, {
                                    protocolDate: e.target.value || null,
                                  })
                                }
                              />,
                            )}
                            {cell(
                              <Input
                                type="date"
                                className="!h-8 text-xs"
                                value={f.nextExamDate ?? ''}
                                onChange={(e) =>
                                  updateDraftFields(draft.key, {
                                    nextExamDate: e.target.value || null,
                                  })
                                }
                              />,
                            )}
                          </>
                        ) : (
                          <>
                            {cell(
                              <Input
                                type="date"
                                className="!h-8 text-xs"
                                value={f.examDate ?? ''}
                                onChange={(e) =>
                                  updateDraftFields(draft.key, {
                                    examDate: e.target.value || null,
                                  })
                                }
                              />,
                            )}
                            {cell(
                              <Input
                                className="!h-8 text-xs min-w-[140px]"
                                placeholder={t(T.examReason)}
                                value={f.examReason ?? ''}
                                onChange={(e) =>
                                  updateDraftFields(draft.key, {
                                    examReason: e.target.value || null,
                                  })
                                }
                              />,
                            )}
                            {isOccupational
                              ? cell(
                                  <Input
                                    className="!h-8 text-xs w-28"
                                    placeholder={t(T.qualGroup)}
                                    value={f.qualificationGroup ?? ''}
                                    onChange={(e) =>
                                      updateDraftFields(draft.key, {
                                        qualificationGroup:
                                          e.target.value || null,
                                      })
                                    }
                                  />,
                                )
                              : null}
                            {cell(
                              <Input
                                className="!h-8 text-xs w-20"
                                placeholder={t(T.grade)}
                                value={f.grade ?? ''}
                                onChange={(e) =>
                                  updateDraftFields(draft.key, {
                                    grade: e.target.value || null,
                                  })
                                }
                              />,
                            )}
                            {cell(
                              <Input
                                type="date"
                                className="!h-8 text-xs"
                                value={f.nextExamDate ?? ''}
                                onChange={(e) =>
                                  updateDraftFields(draft.key, {
                                    nextExamDate: e.target.value || null,
                                  })
                                }
                              />,
                            )}
                          </>
                        )}
                        {cell(
                          <span className="text-[11px] text-slate-400">
                            {t(T.draftHint)}
                          </span>,
                        )}
                        {cell(
                          <div className="flex flex-wrap gap-1.5">
                            <Button
                              size="small"
                              type="primary"
                              loading={saving === draft.key}
                              icon={<Save size={13} />}
                              onClick={() => void onSaveDraft(draft)}
                            >
                              {t(T.save)}
                            </Button>
                            <Button
                              size="small"
                              onClick={() => removeDraft(draft.key)}
                              disabled={saving === draft.key}
                            >
                              {t(T.cancel)}
                            </Button>
                          </div>,
                        )}
                      </tr>
                    );
                  })}

                  {records.length === 0 && sectionDrafts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={colCount}
                        className="px-3 py-8 text-center text-sm text-slate-400"
                      >
                        {t(T.empty)}
                      </td>
                    </tr>
                  ) : (
                    records.map((record) => {
                      const pendingId =
                        section.pendingChange &&
                        (section.pendingChange.recordId === record.id ||
                          section.record?.id === record.id)
                          ? section.pendingChange.id
                          : null;
                      const highlight =
                        (changeIdParam && pendingId === changeIdParam) ||
                        (sectionParam === section.type.sectionSlug &&
                          record.isLatest);
                      const showApprove =
                        canApprove &&
                        pendingId &&
                        record.approvalStatus === 'PENDING' &&
                        (!changeIdParam || changeIdParam === pendingId);

                      return (
                        <tr
                          key={record.id}
                          ref={highlight ? highlightRef : undefined}
                          className={cn(
                            'border-b border-border/60 transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-900/30',
                            highlight && 'bg-amber-50/80 dark:bg-amber-950/20',
                          )}
                        >
                          {isMedical ? (
                            <>
                              {cell(
                                <span className="whitespace-nowrap tabular-nums">
                                  {record.examDate || '—'}
                                  {record.isLatest ? (
                                    <span className="ml-1.5 text-[10px] font-medium uppercase tracking-wide text-[var(--shell-rail)]">
                                      {t(T.latest)}
                                    </span>
                                  ) : null}
                                </span>,
                              )}
                              {cell(
                                <span className="max-w-[320px] truncate block" title={record.doctorConclusion ?? ''}>
                                  {record.doctorConclusion || '—'}
                                </span>,
                              )}
                            </>
                          ) : isIndustrial ? (
                            <>
                              {cell(
                                <span className="whitespace-nowrap tabular-nums">
                                  {record.examDate || '—'}
                                  {record.isLatest ? (
                                    <span className="ml-1.5 text-[10px] font-medium uppercase tracking-wide text-[var(--shell-rail)]">
                                      {t(T.latest)}
                                    </span>
                                  ) : null}
                                </span>,
                              )}
                              {cell(record.ruleName || '—')}
                              {cell(record.commissionDecision || '—')}
                              {cell(
                                <span className="tabular-nums">
                                  {record.protocolNumber || '—'}
                                </span>,
                              )}
                              {cell(
                                <span className="whitespace-nowrap tabular-nums">
                                  {record.protocolDate || '—'}
                                </span>,
                              )}
                              {cell(
                                <span className="whitespace-nowrap tabular-nums">
                                  {record.nextExamDate || '—'}
                                </span>,
                              )}
                            </>
                          ) : (
                            <>
                              {cell(
                                <span className="whitespace-nowrap tabular-nums">
                                  {record.examDate || '—'}
                                  {record.isLatest ? (
                                    <span className="ml-1.5 text-[10px] font-medium uppercase tracking-wide text-[var(--shell-rail)]">
                                      {t(T.latest)}
                                    </span>
                                  ) : null}
                                </span>,
                              )}
                              {cell(
                                <span className="max-w-[220px] truncate block" title={record.examReason ?? ''}>
                                  {record.examReason || '—'}
                                </span>,
                              )}
                              {isOccupational
                                ? cell(record.qualificationGroup || '—')
                                : null}
                              {cell(
                                <span className="tabular-nums">
                                  {record.grade || '—'}
                                </span>,
                              )}
                              {cell(
                                <span className="whitespace-nowrap tabular-nums">
                                  {record.nextExamDate || '—'}
                                </span>,
                              )}
                            </>
                          )}
                          {cell(statusTag(record.approvalStatus, t))}
                          {cell(
                            showApprove && pendingId ? (
                              <div className="flex flex-wrap gap-1.5">
                                <Button
                                  size="small"
                                  type="primary"
                                  loading={acting === pendingId}
                                  icon={<Check size={13} />}
                                  onClick={() => void onApprove(pendingId)}
                                >
                                  {t(T.approve)}
                                </Button>
                                <Button
                                  size="small"
                                  danger
                                  loading={acting === pendingId}
                                  icon={<X size={13} />}
                                  onClick={() => void onReject(pendingId)}
                                >
                                  {t(T.reject)}
                                </Button>
                              </div>
                            ) : (
                              <span className="text-slate-300">—</span>
                            ),
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
