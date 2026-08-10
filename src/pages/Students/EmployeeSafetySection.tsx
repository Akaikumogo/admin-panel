import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Check, X, Save } from 'lucide-react';
import { Button, Input, Spin, Tag, Select } from '@/components/ui';
import { useTranslation } from '@/hooks/useTranslation';
import apiService, {
  type EmployeeSafetyRecord,
  type EmployeeSafetySection,
  type Role,
  type SafetyRecordType,
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

type TableRow = {
  key: string;
  kind: 'record' | 'draft';
  type: SafetyRecordType;
  record?: EmployeeSafetyRecord;
  draft?: DraftRow;
  pendingChangeId?: string | null;
  isLatest?: boolean;
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
  type: { uz: 'Boʻlim', en: 'Section', ru: 'Раздел' },
  examDate: { uz: 'Sinov sanasi', en: 'Exam date', ru: 'Дата' },
  detail: { uz: 'Sabab / izoh', en: 'Reason / note', ru: 'Причина' },
  grade: { uz: 'Baho', en: 'Grade', ru: 'Оценка' },
  nextExam: { uz: 'Keyingi sinov', en: 'Next exam', ru: 'След. дата' },
  status: { uz: 'Holat', en: 'Status', ru: 'Статус' },
  actions: { uz: 'Amallar', en: 'Actions', ru: 'Действия' },
  pickType: { uz: 'Boʻlimni tanlang', en: 'Select section', ru: 'Выберите раздел' },
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

function detailText(record: EmployeeSafetyRecord, typeCode: string): string {
  if (typeCode === 'MEDICAL_EXAM') return record.doctorConclusion?.trim() || '—';
  if (typeCode === 'INDUSTRIAL_SAFETY') {
    return (
      [record.ruleName, record.commissionDecision, record.protocolNumber]
        .filter(Boolean)
        .join(' · ') || '—'
    );
  }
  const parts = [record.examReason, record.qualificationGroup].filter(Boolean);
  return parts.length ? parts.join(' · ') : '—';
}

function shortTypeTitle(title: string): string {
  if (title.length <= 42) return title;
  return `${title.slice(0, 40)}…`;
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
    const el = highlightRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [loading, sectionParam, sections, changeIdParam]);

  const typeOptions = useMemo(
    () =>
      sections.map((s) => ({
        value: s.type.code,
        label: s.type.titleUz,
      })),
    [sections],
  );

  const rows: TableRow[] = useMemo(() => {
    const out: TableRow[] = [];

    for (const draft of drafts) {
      const type =
        sections.find((s) => s.type.code === draft.typeCode)?.type ??
        ({
          id: draft.typeCode,
          code: draft.typeCode,
          titleUz: t(T.pickType),
          titleRu: t(T.pickType),
          titleEn: t(T.pickType),
          sectionSlug: '',
          sortOrder: 0,
        } satisfies SafetyRecordType);
      out.push({
        key: draft.key,
        kind: 'draft',
        type,
        draft,
      });
    }

    const recordRows: TableRow[] = [];
    for (const section of sections) {
      const list =
        section.records && section.records.length > 0
          ? section.records
          : section.record
            ? [section.record]
            : [];
      for (const record of list) {
        recordRows.push({
          key: record.id,
          kind: 'record',
          type: section.type,
          record,
          pendingChangeId:
            section.pendingChange &&
            (section.pendingChange.recordId === record.id ||
              section.record?.id === record.id)
              ? section.pendingChange.id
              : null,
          isLatest: record.isLatest,
        });
      }
    }

    // Eng yangi yuqorida: avval sinov sanasi, bo‘lmasa yaratilgan vaqt
    recordRows.sort((a, b) => {
      const aDate = a.record?.examDate || a.record?.createdAt || '';
      const bDate = b.record?.examDate || b.record?.createdAt || '';
      if (aDate !== bDate) return bDate.localeCompare(aDate);
      return (b.record?.createdAt || '').localeCompare(a.record?.createdAt || '');
    });

    return [...out, ...recordRows];
  }, [drafts, sections, t]);

  const addDraft = () => {
    if (!canEdit) return;
    const defaultType = sections[0]?.type.code ?? '';
    setDrafts((prev) => [
      {
        key: `draft-${Date.now()}`,
        typeCode: defaultType,
        fields: { ...EMPTY_FIELDS },
      },
      ...prev,
    ]);
  };

  const updateDraft = (
    key: string,
    patch: Partial<DraftRow> | { fields: Partial<UpsertSafetyRecordPayload> },
  ) => {
    setDrafts((prev) =>
      prev.map((d) => {
        if (d.key !== key) return d;
        if ('fields' in patch && patch.fields) {
          return { ...d, fields: { ...d.fields, ...patch.fields } };
        }
        const { fields: _f, ...rest } = patch as Partial<DraftRow>;
        return { ...d, ...rest };
      }),
    );
  };

  const removeDraft = (key: string) => {
    setDrafts((prev) => prev.filter((d) => d.key !== key));
  };

  const onSaveDraft = async (draft: DraftRow) => {
    if (!draft.typeCode) {
      notification.error({ message: t(T.pickType) });
      return;
    }
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

  const renderDraftInputs = (draft: DraftRow) => {
    const code = draft.typeCode;
    const isMedical = code === 'MEDICAL_EXAM';
    const isIndustrial = code === 'INDUSTRIAL_SAFETY';
    const isOccupational = code === 'OCCUPATIONAL_SAFETY';
    const f = draft.fields;

    return (
      <>
        <td className="px-3 py-2 align-top min-w-[200px]">
          <Select
            value={draft.typeCode || undefined}
            onChange={(v) => updateDraft(draft.key, { typeCode: v })}
            options={typeOptions}
            placeholder={t(T.pickType)}
            showSearch
            className="!h-8 text-xs"
          />
        </td>
        <td className="px-3 py-2 align-top">
          <Input
            type="date"
            className="!h-8 text-xs"
            value={f.examDate ?? ''}
            onChange={(e) =>
              updateDraft(draft.key, { fields: { examDate: e.target.value || null } })
            }
          />
        </td>
        <td className="px-3 py-2 align-top min-w-[180px]">
          {isMedical ? (
            <Input
              className="!h-8 text-xs"
              placeholder={t({
                uz: 'Shifokor xulosasi',
                en: 'Doctor conclusion',
                ru: 'Заключение',
              })}
              value={f.doctorConclusion ?? ''}
              onChange={(e) =>
                updateDraft(draft.key, {
                  fields: { doctorConclusion: e.target.value || null },
                })
              }
            />
          ) : isIndustrial ? (
            <div className="space-y-1.5">
              <Input
                className="!h-8 text-xs"
                placeholder={t({
                  uz: 'Qoida nomi',
                  en: 'Rule name',
                  ru: 'Правило',
                })}
                value={f.ruleName ?? ''}
                onChange={(e) =>
                  updateDraft(draft.key, {
                    fields: { ruleName: e.target.value || null },
                  })
                }
              />
              <Input
                className="!h-8 text-xs"
                placeholder={t({
                  uz: 'Komissiya qarori',
                  en: 'Decision',
                  ru: 'Решение',
                })}
                value={f.commissionDecision ?? ''}
                onChange={(e) =>
                  updateDraft(draft.key, {
                    fields: { commissionDecision: e.target.value || null },
                  })
                }
              />
              <div className="flex gap-1.5">
                <Input
                  className="!h-8 text-xs"
                  placeholder={t({
                    uz: 'Bayonnoma №',
                    en: 'Protocol №',
                    ru: 'Протокол №',
                  })}
                  value={f.protocolNumber ?? ''}
                  onChange={(e) =>
                    updateDraft(draft.key, {
                      fields: { protocolNumber: e.target.value || null },
                    })
                  }
                />
                <Input
                  type="date"
                  className="!h-8 text-xs"
                  value={f.protocolDate ?? ''}
                  onChange={(e) =>
                    updateDraft(draft.key, {
                      fields: { protocolDate: e.target.value || null },
                    })
                  }
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Input
                className="!h-8 text-xs"
                placeholder={t({
                  uz: 'Sinov sababi',
                  en: 'Reason',
                  ru: 'Причина',
                })}
                value={f.examReason ?? ''}
                onChange={(e) =>
                  updateDraft(draft.key, {
                    fields: { examReason: e.target.value || null },
                  })
                }
              />
              {isOccupational ? (
                <Input
                  className="!h-8 text-xs"
                  placeholder={t({
                    uz: 'Malaka guruhi',
                    en: 'Qualification group',
                    ru: 'Группа',
                  })}
                  value={f.qualificationGroup ?? ''}
                  onChange={(e) =>
                    updateDraft(draft.key, {
                      fields: { qualificationGroup: e.target.value || null },
                    })
                  }
                />
              ) : null}
            </div>
          )}
        </td>
        <td className="px-3 py-2 align-top">
          {!isMedical ? (
            <Input
              className="!h-8 text-xs w-20"
              value={f.grade ?? ''}
              onChange={(e) =>
                updateDraft(draft.key, {
                  fields: { grade: e.target.value || null },
                })
              }
            />
          ) : (
            <span className="text-slate-300">—</span>
          )}
        </td>
        <td className="px-3 py-2 align-top">
          {!isMedical ? (
            <Input
              type="date"
              className="!h-8 text-xs"
              value={f.nextExamDate ?? ''}
              onChange={(e) =>
                updateDraft(draft.key, {
                  fields: { nextExamDate: e.target.value || null },
                })
              }
            />
          ) : (
            <span className="text-slate-300">—</span>
          )}
        </td>
        <td className="px-3 py-2 align-top">
          <span className="text-[11px] text-slate-400">{t(T.draftHint)}</span>
        </td>
        <td className="px-3 py-2 align-top">
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
          </div>
        </td>
      </>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center rounded-xl border border-border bg-card p-10">
        <Spin />
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-[0_12px_28px_-20px_rgba(15,23,42,0.2)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            {t(T.title)}
          </h2>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {t({
              uz: 'Barcha yozuvlar bir jadvalda',
              en: 'All records in one table',
              ru: 'Все записи в одной таблице',
            })}
          </p>
        </div>
        {canEdit ? (
          <Button
            type="primary"
            size="small"
            icon={<Plus size={14} strokeWidth={2} />}
            onClick={addDraft}
            className="!h-8"
          >
            {t(T.add)}
          </Button>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50/80 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 dark:bg-slate-900/40 dark:text-slate-400">
              <th className="px-3 py-2.5 font-semibold">{t(T.type)}</th>
              <th className="px-3 py-2.5 font-semibold whitespace-nowrap">
                {t(T.examDate)}
              </th>
              <th className="px-3 py-2.5 font-semibold">{t(T.detail)}</th>
              <th className="px-3 py-2.5 font-semibold">{t(T.grade)}</th>
              <th className="px-3 py-2.5 font-semibold whitespace-nowrap">
                {t(T.nextExam)}
              </th>
              <th className="px-3 py-2.5 font-semibold">{t(T.status)}</th>
              <th className="px-3 py-2.5 font-semibold">{t(T.actions)}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-10 text-center text-sm text-slate-400"
                >
                  {t(T.empty)}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const highlight =
                  row.kind === 'record' &&
                  ((changeIdParam &&
                    row.pendingChangeId === changeIdParam) ||
                    (sectionParam &&
                      row.type.sectionSlug === sectionParam &&
                      row.isLatest));

                if (row.kind === 'draft' && row.draft) {
                  return (
                    <tr
                      key={row.key}
                      className="border-b border-border/60 bg-[color-mix(in_oklab,var(--shell-rail)_6%,transparent)]"
                    >
                      {renderDraftInputs(row.draft)}
                    </tr>
                  );
                }

                const record = row.record!;
                const showApprove =
                  canApprove &&
                  row.pendingChangeId &&
                  record.approvalStatus === 'PENDING' &&
                  (!changeIdParam || changeIdParam === row.pendingChangeId);

                return (
                  <tr
                    key={row.key}
                    ref={highlight ? highlightRef : undefined}
                    className={cn(
                      'border-b border-border/60 transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-900/30',
                      highlight && 'bg-amber-50/80 dark:bg-amber-950/20',
                    )}
                  >
                    <td className="px-3 py-2.5 align-middle">
                      <div className="max-w-[220px]">
                        <p
                          className="truncate text-xs font-medium text-slate-800 dark:text-slate-100"
                          title={row.type.titleUz}
                        >
                          {shortTypeTitle(row.type.titleUz)}
                        </p>
                        {row.isLatest ? (
                          <span className="mt-0.5 inline-block text-[10px] font-medium uppercase tracking-wide text-[var(--shell-rail)]">
                            {t(T.latest)}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 align-middle whitespace-nowrap tabular-nums text-xs text-slate-700 dark:text-slate-200">
                      {record.examDate || '—'}
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      <p
                        className="max-w-[280px] truncate text-xs text-slate-600 dark:text-slate-300"
                        title={detailText(record, row.type.code)}
                      >
                        {detailText(record, row.type.code)}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 align-middle tabular-nums text-xs text-slate-700 dark:text-slate-200">
                      {record.grade || '—'}
                    </td>
                    <td className="px-3 py-2.5 align-middle whitespace-nowrap tabular-nums text-xs text-slate-700 dark:text-slate-200">
                      {record.nextExamDate || '—'}
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      {statusTag(record.approvalStatus, t)}
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      {showApprove && row.pendingChangeId ? (
                        <div className="flex flex-wrap gap-1.5">
                          <Button
                            size="small"
                            type="primary"
                            loading={acting === row.pendingChangeId}
                            icon={<Check size={13} />}
                            onClick={() => void onApprove(row.pendingChangeId!)}
                          >
                            {t(T.approve)}
                          </Button>
                          <Button
                            size="small"
                            danger
                            loading={acting === row.pendingChangeId}
                            icon={<X size={13} />}
                            onClick={() => void onReject(row.pendingChangeId!)}
                          >
                            {t(T.reject)}
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
