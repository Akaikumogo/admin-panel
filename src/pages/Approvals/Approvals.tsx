import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { Button, Spin, Tag, message } from '@/components/ui';
import { PageHeader } from '@/components/PageHeader';
import NoData from '@/components/NoData';
import { useTranslation } from '@/hooks/useTranslation';
import apiService, {
  type PendingSafetyApprovalItem,
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
  type: { uz: 'Turi', en: 'Type', ru: 'Тип' },
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
  actions: { uz: 'Amallar', en: 'Actions', ru: 'Действия' },
  pending: { uz: 'Kutilmoqda', en: 'Pending', ru: 'Ожидает' },
  openProfile: {
    uz: 'Profil',
    en: 'Profile',
    ru: 'Профиль',
  },
  rows: { uz: 'qator', en: 'rows', ru: 'строк' },
} as const;

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

function typeTitle(
  item: PendingSafetyApprovalItem,
  lang: string,
): string {
  const t = item.type;
  if (!t) return item.change.recordTypeCode;
  if (lang.startsWith('ru')) return t.titleRu || t.titleUz;
  if (lang.startsWith('en')) return t.titleEn || t.titleUz;
  return t.titleUz;
}

export default function ApprovalsPage() {
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('changeId');
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PendingSafetyApprovalItem[]>([]);
  const [acting, setActing] = useState<string | null>(null);
  const [bulkActing, setBulkActing] = useState(false);

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

  useEffect(() => {
    if (loading || !highlightId) return;
    rowRefs.current[highlightId]?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, [loading, highlightId, items]);

  const byEmployee = useMemo(() => {
    const map = new Map<
      string,
      { employee: PendingSafetyApprovalItem['employee']; rows: PendingSafetyApprovalItem[] }
    >();
    for (const item of items) {
      const key = item.employee.id;
      const cur = map.get(key);
      if (cur) cur.rows.push(item);
      else map.set(key, { employee: item.employee, rows: [item] });
    }
    return [...map.values()];
  }, [items]);

  const allIds = useMemo(() => items.map((i) => i.change.id), [items]);

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
    <div className="p-4 md:p-6 space-y-5 max-w-[1400px] mx-auto">
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
        <div className="space-y-6">
          {byEmployee.map(({ employee, rows }) => {
            const ids = rows.map((r) => r.change.id);
            const name = personName(rows[0]);
            return (
              <section
                key={employee.id}
                className="rounded-xl border border-border bg-card overflow-hidden"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border bg-muted/30">
                  <div className="min-w-0">
                    <button
                      type="button"
                      className="text-left font-semibold text-foreground hover:underline"
                      onClick={() =>
                        navigate(`/dashboard/employees/${employee.id}`)
                      }
                    >
                      {name}
                    </button>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {rows[0].organization.name ?? '—'} · {rows.length}{' '}
                      {t(T.rows)}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
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
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[960px] text-left">
                    <thead>
                      <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
                        <th className="px-3 py-2 font-semibold">{t(T.type)}</th>
                        <th className="px-3 py-2 font-semibold">{t(T.examDate)}</th>
                        <th className="px-3 py-2 font-semibold">{t(T.examReason)}</th>
                        <th className="px-3 py-2 font-semibold">{t(T.qualGroup)}</th>
                        <th className="px-3 py-2 font-semibold">{t(T.grade)}</th>
                        <th className="px-3 py-2 font-semibold">{t(T.nextExam)}</th>
                        <th className="px-3 py-2 font-semibold">{t(T.protocolNo)}</th>
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
                            ref={(el) => {
                              rowRefs.current[id] = el;
                            }}
                            className={cn(
                              'border-b border-border/80 text-sm',
                              highlighted && 'bg-red-50 dark:bg-red-950/30',
                            )}
                          >
                            <td className="px-3 py-2.5">
                              <div className="font-medium text-foreground">
                                {typeTitle(item, lang)}
                              </div>
                              <Tag color="red" className="!mt-1 !m-0">
                                {t(T.pending)}
                              </Tag>
                            </td>
                            <td className="px-3 py-2.5 tabular-nums">
                              {field(data, 'examDate')}
                            </td>
                            <td className="px-3 py-2.5 max-w-[180px] truncate">
                              {field(data, 'examReason') !== '—'
                                ? field(data, 'examReason')
                                : field(data, 'ruleName')}
                            </td>
                            <td className="px-3 py-2.5">
                              {field(data, 'qualificationGroup')}
                            </td>
                            <td className="px-3 py-2.5">{field(data, 'grade')}</td>
                            <td className="px-3 py-2.5 tabular-nums">
                              {field(data, 'nextExamDate')}
                            </td>
                            <td className="px-3 py-2.5">
                              {field(data, 'protocolNumber')}
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex flex-wrap gap-1.5">
                                <Button
                                  size="small"
                                  type="primary"
                                  icon={<Check size={14} />}
                                  loading={acting === id}
                                  disabled={bulkActing}
                                  onClick={() => void onApproveOne(id)}
                                >
                                  {t(T.approve)}
                                </Button>
                                <Button
                                  size="small"
                                  danger
                                  icon={<X size={14} />}
                                  loading={acting === id}
                                  disabled={bulkActing}
                                  onClick={() => void onRejectOne(id)}
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
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
