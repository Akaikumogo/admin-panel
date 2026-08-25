import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, ChevronDown, X } from 'lucide-react';
import { Button, Spin, Tag, message } from '@/components/ui';
import { PageHeader } from '@/components/PageHeader';
import NoData from '@/components/NoData';
import { useTranslation } from '@/hooks/useTranslation';
import apiService, {
  type PendingSafetyApprovalItem,
  type SafetyRecordType,
} from '@/services/api';
import { cn } from '@/lib/utils';

const T = {
  title: {
    uz: 'Tasdiq uchun',
    en: 'For approval',
    ru: 'На утверждение',
  },
  subtitle: {
    uz: 'Xodimlarning xavfsizlik / texnik sinov maʼlumotlarini tasdiqlang yoki rad eting',
    en: 'Approve or reject employee safety / technical exam data',
    ru: 'Утвердите или отклоните данные по охране труда / тех. испытаниям',
  },
  approveAll: {
    uz: 'Barchasini tasdiqlash',
    en: 'Approve all',
    ru: 'Утвердить все',
  },
  rejectAll: {
    uz: 'Barchasini rad etish',
    en: 'Reject all',
    ru: 'Отклонить все',
  },
  approve: { uz: 'Tasdiqlash', en: 'Approve', ru: 'Утвердить' },
  reject: { uz: 'Rad etish', en: 'Reject', ru: 'Отклонить' },
  empty: {
    uz: 'Tasdiq kutilayotgan yozuv yoʻq',
    en: 'Nothing pending approval',
    ru: 'Нет ожидающих утверждения',
  },
  employee: { uz: 'Xodim', en: 'Employee', ru: 'Сотрудник' },
  organization: { uz: 'Filial', en: 'Branch', ru: 'Филиал' },
  pendingCount: {
    uz: 'Kutilmoqda',
    en: 'Pending',
    ru: 'Ожидает',
  },
  actions: { uz: 'Amallar', en: 'Actions', ru: 'Действия' },
  examDate: { uz: 'Sinov sanasi', en: 'Exam date', ru: 'Дата' },
  examReason: { uz: 'Sinov sababi', en: 'Reason', ru: 'Причина' },
  grade: { uz: 'Baho', en: 'Grade', ru: 'Оценка' },
  qualGroup: {
    uz: 'Malaka guruhi',
    en: 'Qualification group',
    ru: 'Группа',
  },
  nextExam: { uz: 'Keyingi sinov', en: 'Next exam', ru: 'След. дата' },
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
  decision: {
    uz: 'Komissiya qarori',
    en: 'Commission decision',
    ru: 'Решение',
  },
  ruleName: { uz: 'Qoida nomi', en: 'Rule name', ru: 'Правило' },
  pending: { uz: 'Kutilmoqda', en: 'Pending', ru: 'Ожидает' },
  rows: { uz: 'qator', en: 'rows', ru: 'строк' },
  types: { uz: 'tur', en: 'types', ru: 'типов' },
} as const;

/** Xodim sahifasidagi 5 ta sinov turi tartibi */
const TYPE_ORDER = [
  'TECHNICAL_OPERATION',
  'OCCUPATIONAL_SAFETY',
  'FIRE_SAFETY',
  'INDUSTRIAL_SAFETY',
  'MEDICAL_EXAM',
] as const;

function field(
  data: Record<string, unknown> | null | undefined,
  key: string,
): string {
  if (!data) return '—';
  const v = data[key];
  if (v == null || v === '') return '—';
  return String(v);
}

function personName(item: PendingSafetyApprovalItem) {
  const n =
    `${item.employee.lastName ?? ''} ${item.employee.firstName ?? ''}`.trim();
  return n || item.employee.email || item.employee.id;
}

function typeTitleFrom(
  type: SafetyRecordType | null,
  code: string,
  lang: string,
): string {
  if (!type) return code;
  if (lang.startsWith('ru')) return type.titleRu || type.titleUz;
  if (lang.startsWith('en')) return type.titleEn || type.titleUz;
  return type.titleUz;
}

/** AJ/AO prefiksini olib tashlash (faqat koʻrsatish uchun) */
function cleanOrgName(raw: string | null | undefined): string {
  if (!raw) return '—';
  let s = raw.normalize('NFKC').replace(/\s+/g, ' ').trim();

  const junk = new Set(['aj', 'ao', 'аж', 'ао']);
  const fold = (w: string) =>
    w
      .replace(/[^a-zA-Zа-яА-ЯёЁжЖ]/g, '')
      .toLowerCase()
      .replace(/а/g, 'a')
      .replace(/о/g, 'o')
      .replace(/ж/g, 'j');

  for (let i = 0; i < 4; i++) {
    const m = s.match(/^(\S+)(\s+|$)/);
    if (!m) break;
    if (!junk.has(fold(m[1]))) break;
    s = s.slice(m[0].length).trim();
  }
  return s || raw;
}

type EmpGroup = {
  employee: PendingSafetyApprovalItem['employee'];
  organization: PendingSafetyApprovalItem['organization'];
  rows: PendingSafetyApprovalItem[];
};

function TypeTable({
  typeCode,
  title,
  rows,
  acting,
  bulkActing,
  highlightId,
  onApprove,
  onReject,
  t,
}: {
  typeCode: string;
  title: string;
  rows: PendingSafetyApprovalItem[];
  acting: string | null;
  bulkActing: boolean;
  highlightId: string | null;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  t: (x: { uz: string; en: string; ru: string }) => string;
}) {
  const isMedical = typeCode === 'MEDICAL_EXAM';
  const isIndustrial = typeCode === 'INDUSTRIAL_SAFETY';
  const isOccupational = typeCode === 'OCCUPATIONAL_SAFETY';

  return (
    <div className="overflow-hidden rounded-lg border border-border/80 bg-background">
      <div className="border-b border-border/70 bg-muted/40 px-3 py-2">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        <p className="text-[11px] text-muted-foreground">
          {rows.length} {t(T.rows)} · {t(T.pending)}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-semibold">{t(T.examDate)}</th>
              {!isMedical && (
                <th className="px-3 py-2 font-semibold">{t(T.examReason)}</th>
              )}
              {isOccupational && (
                <th className="px-3 py-2 font-semibold">{t(T.qualGroup)}</th>
              )}
              {!isMedical && (
                <th className="px-3 py-2 font-semibold">{t(T.grade)}</th>
              )}
              {isIndustrial && (
                <th className="px-3 py-2 font-semibold">{t(T.ruleName)}</th>
              )}
              {isIndustrial && (
                <th className="px-3 py-2 font-semibold">{t(T.decision)}</th>
              )}
              <th className="px-3 py-2 font-semibold">{t(T.nextExam)}</th>
              <th className="px-3 py-2 font-semibold">{t(T.protocolNo)}</th>
              <th className="px-3 py-2 font-semibold">{t(T.protocolDate)}</th>
              {isMedical && (
                <th className="px-3 py-2 font-semibold">{t(T.doctor)}</th>
              )}
              <th className="px-3 py-2 font-semibold">{t(T.actions)}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => {
              const data = item.change.newData;
              const id = item.change.id;
              const highlighted = highlightId === id;
              return (
                <tr
                  key={id}
                  id={`approval-row-${id}`}
                  className={cn(
                    'border-b border-border/70',
                    highlighted && 'bg-amber-50 dark:bg-amber-950/30',
                  )}
                >
                  <td className="px-3 py-2.5 tabular-nums">
                    {field(data, 'examDate')}
                  </td>
                  {!isMedical && (
                    <td className="px-3 py-2.5 max-w-[160px] truncate">
                      {field(data, 'examReason') !== '—'
                        ? field(data, 'examReason')
                        : field(data, 'ruleName')}
                    </td>
                  )}
                  {isOccupational && (
                    <td className="px-3 py-2.5">
                      {field(data, 'qualificationGroup')}
                    </td>
                  )}
                  {!isMedical && (
                    <td className="px-3 py-2.5">{field(data, 'grade')}</td>
                  )}
                  {isIndustrial && (
                    <td className="px-3 py-2.5 max-w-[140px] truncate">
                      {field(data, 'ruleName')}
                    </td>
                  )}
                  {isIndustrial && (
                    <td className="px-3 py-2.5 max-w-[140px] truncate">
                      {field(data, 'commissionDecision')}
                    </td>
                  )}
                  <td className="px-3 py-2.5 tabular-nums">
                    {field(data, 'nextExamDate')}
                  </td>
                  <td className="px-3 py-2.5">
                    {field(data, 'protocolNumber')}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">
                    {field(data, 'protocolDate')}
                  </td>
                  {isMedical && (
                    <td className="px-3 py-2.5 max-w-[160px] truncate">
                      {field(data, 'doctorConclusion')}
                    </td>
                  )}
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        size="small"
                        type="primary"
                        icon={<Check size={14} />}
                        loading={acting === id}
                        disabled={bulkActing}
                        onClick={() => onApprove(id)}
                      >
                        {t(T.approve)}
                      </Button>
                      <Button
                        size="small"
                        danger
                        icon={<X size={14} />}
                        loading={acting === id}
                        disabled={bulkActing}
                        onClick={() => onReject(id)}
                      >
                        {t(T.reject)}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ApprovalsPage() {
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('changeId');

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PendingSafetyApprovalItem[]>([]);
  const [acting, setActing] = useState<string | null>(null);
  const [bulkActing, setBulkActing] = useState(false);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiService.getPendingSafetyApprovals();
      setItems(res.items);
    } catch {
      message.error(
        t({
          uz: 'Roʻyxatni yuklab boʻlmadi',
          en: 'Failed to load list',
          ru: 'Не удалось загрузить',
        }),
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const byEmployee = useMemo((): EmpGroup[] => {
    const map = new Map<string, EmpGroup>();
    for (const item of items) {
      const key = item.employee.id;
      const cur = map.get(key);
      if (cur) cur.rows.push(item);
      else {
        map.set(key, {
          employee: item.employee,
          organization: item.organization,
          rows: [item],
        });
      }
    }
    return [...map.values()].sort((a, b) =>
      personName(a.rows[0]!).localeCompare(personName(b.rows[0]!), 'uz'),
    );
  }, [items]);

  // Highlight: tegishli xodimni ochish
  useEffect(() => {
    if (loading || !highlightId) return;
    const hit = items.find((i) => i.change.id === highlightId);
    if (!hit) return;
    setOpenIds((prev) => new Set(prev).add(hit.employee.id));
    requestAnimationFrame(() => {
      document
        .getElementById(`approval-row-${highlightId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, [loading, highlightId, items]);

  const allIds = useMemo(() => items.map((i) => i.change.id), [items]);

  const toggleOpen = (empId: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(empId)) next.delete(empId);
      else next.add(empId);
      return next;
    });
  };

  const onApproveOne = async (changeId: string) => {
    setActing(changeId);
    try {
      await apiService.approveSafetyChange(changeId);
      setItems((prev) => prev.filter((i) => i.change.id !== changeId));
      message.success(t(T.approve));
      window.dispatchEvent(new Event('el-approvals-changed'));
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Error';
      message.error(String(msg));
    } finally {
      setActing(null);
    }
  };

  const onRejectOne = async (changeId: string) => {
    setActing(changeId);
    try {
      await apiService.rejectSafetyChange(changeId);
      setItems((prev) => prev.filter((i) => i.change.id !== changeId));
      message.success(t(T.reject));
      window.dispatchEvent(new Event('el-approvals-changed'));
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Error';
      message.error(String(msg));
    } finally {
      setActing(null);
    }
  };

  const onApproveAll = async (ids: string[] = allIds) => {
    if (!ids.length) return;
    setBulkActing(true);
    try {
      const res = await apiService.bulkApproveSafetyChanges(ids);
      const ok = new Set(res.results.filter((r) => r.ok).map((r) => r.changeId));
      setItems((prev) => prev.filter((i) => !ok.has(i.change.id)));
      message.success(
        t({
          uz: `${res.approved ?? ok.size} ta tasdiqlandi`,
          en: `${res.approved ?? ok.size} approved`,
          ru: `Утверждено: ${res.approved ?? ok.size}`,
        }),
      );
      window.dispatchEvent(new Event('el-approvals-changed'));
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Error';
      message.error(String(msg));
    } finally {
      setBulkActing(false);
    }
  };

  const onRejectAll = async (ids: string[] = allIds) => {
    if (!ids.length) return;
    setBulkActing(true);
    try {
      const res = await apiService.bulkRejectSafetyChanges(ids);
      const ok = new Set(res.results.filter((r) => r.ok).map((r) => r.changeId));
      setItems((prev) => prev.filter((i) => !ok.has(i.change.id)));
      message.success(
        t({
          uz: `${res.rejected ?? ok.size} ta rad etildi`,
          en: `${res.rejected ?? ok.size} rejected`,
          ru: `Отклонено: ${res.rejected ?? ok.size}`,
        }),
      );
      window.dispatchEvent(new Event('el-approvals-changed'));
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Error';
      message.error(String(msg));
    } finally {
      setBulkActing(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 p-4 md:p-6">
      <PageHeader
        title={t(T.title)}
        description={t(T.subtitle)}
        actions={
          items.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="primary"
                icon={<Check size={16} />}
                loading={bulkActing}
                onClick={() => void onApproveAll()}
              >
                {t(T.approveAll)}
              </Button>
              <Button
                danger
                icon={<X size={16} />}
                loading={bulkActing}
                onClick={() => void onRejectAll()}
              >
                {t(T.rejectAll)}
              </Button>
            </div>
          ) : null
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spin size="large" />
        </div>
      ) : items.length === 0 ? (
        <NoData text={t(T.empty)} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="w-10 px-3 py-3" />
                  <th className="px-3 py-3 font-semibold">{t(T.employee)}</th>
                  <th className="px-3 py-3 font-semibold">
                    {t(T.organization)}
                  </th>
                  <th className="px-3 py-3 font-semibold">
                    {t(T.pendingCount)}
                  </th>
                  <th className="px-3 py-3 font-semibold">{t(T.actions)}</th>
                </tr>
              </thead>
              <tbody>
                {byEmployee.map((group) => {
                  const empId = group.employee.id;
                  const open = openIds.has(empId);
                  const ids = group.rows.map((r) => r.change.id);
                  const name = personName(group.rows[0]!);
                  const typeCodes = new Set(
                    group.rows.map((r) => r.change.recordTypeCode),
                  );

                  const byType = TYPE_ORDER.map((code) => {
                    const rows = group.rows.filter(
                      (r) => r.change.recordTypeCode === code,
                    );
                    if (!rows.length) return null;
                    return {
                      code,
                      title: typeTitleFrom(rows[0]!.type, code, lang),
                      rows,
                    };
                  }).filter(Boolean) as Array<{
                    code: string;
                    title: string;
                    rows: PendingSafetyApprovalItem[];
                  }>;

                  // Tartibda bo‘lmagan boshqa turlar
                  for (const r of group.rows) {
                    const code = r.change.recordTypeCode;
                    if (TYPE_ORDER.includes(code as (typeof TYPE_ORDER)[number]))
                      continue;
                    if (byType.some((x) => x.code === code)) continue;
                    byType.push({
                      code,
                      title: typeTitleFrom(r.type, code, lang),
                      rows: group.rows.filter(
                        (x) => x.change.recordTypeCode === code,
                      ),
                    });
                  }

                  return (
                    <Fragment key={empId}>
                      <tr
                        className={cn(
                          'border-b border-border/80 text-sm transition-colors',
                          open && 'bg-muted/20',
                        )}
                      >
                        <td className="px-2 py-3">
                          <button
                            type="button"
                            aria-expanded={open}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                            onClick={() => toggleOpen(empId)}
                          >
                            <ChevronDown
                              size={18}
                              className={cn(
                                'transition-transform',
                                open && 'rotate-180',
                              )}
                            />
                          </button>
                        </td>
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            className="text-left font-semibold text-foreground hover:underline"
                            onClick={() => toggleOpen(empId)}
                          >
                            {name}
                          </button>
                          <button
                            type="button"
                            className="mt-0.5 block text-[11px] text-primary hover:underline"
                            onClick={() =>
                              navigate(`/dashboard/employees/${empId}`)
                            }
                          >
                            Profil
                          </button>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">
                          {cleanOrgName(group.organization.name)}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Tag color="red" className="!m-0">
                              {group.rows.length} {t(T.rows)}
                            </Tag>
                            <span className="text-xs text-muted-foreground">
                              {typeCodes.size} {t(T.types)}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div
                            className="flex flex-wrap gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              size="small"
                              type="primary"
                              loading={bulkActing}
                              onClick={() => void onApproveAll(ids)}
                            >
                              {t(T.approveAll)}
                            </Button>
                            <Button
                              size="small"
                              danger
                              loading={bulkActing}
                              onClick={() => void onRejectAll(ids)}
                            >
                              {t(T.rejectAll)}
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {open ? (
                        <tr className="border-b border-border">
                          <td colSpan={5} className="bg-muted/15 px-3 py-4 md:px-5">
                            <div className="space-y-4">
                              {byType.map((block) => (
                                <TypeTable
                                  key={block.code}
                                  typeCode={block.code}
                                  title={block.title}
                                  rows={block.rows}
                                  acting={acting}
                                  bulkActing={bulkActing}
                                  highlightId={highlightId}
                                  onApprove={(id) => void onApproveOne(id)}
                                  onReject={(id) => void onRejectOne(id)}
                                  t={t}
                                />
                              ))}
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
