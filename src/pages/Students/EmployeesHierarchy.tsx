import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  startTransition,
  type ReactNode,
  type MouseEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Avatar,
  Switch,
  message,
} from '@/components/ui';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Briefcase,
  Building2,
  ChevronRight,
  FolderTree,
  Users,
  Zap,
} from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { BACKEND_ORIGIN } from '@/services/api';
import type { StudentSummary } from '@/services/api';
import apiService from '@/services/api';
import { cn } from '@/lib/utils';

/* ─── tree model ─────────────────────────────────────────────────────────── */

type PosNode = {
  key: string;
  name: string;
  employees: StudentSummary[];
};

type DeptNode = {
  key: string;
  name: string;
  /** NES division raw ('' = Bo‘limsiz bucket key for assigned? assigned always named) */
  division: string;
  positions: PosNode[];
  total: number;
};

type OrgNode = {
  key: string;
  id: string;
  name: string;
  reportActive: boolean;
  departments: DeptNode[];
  noDivision: StudentSummary[];
  noPost: StudentSummary[];
  total: number;
};

export type DivisionActivation = {
  organizationId: string;
  division: string;
  isActive: boolean;
};

function buildTree(
  students: StudentSummary[],
  orgActiveMap: Map<string, boolean>,
): OrgNode[] {
  type Acc = {
    id: string;
    name: string;
    reportActive: boolean;
    assigned: Map<string, Map<string, StudentSummary[]>>;
    noDivision: StudentSummary[];
    noPost: StudentSummary[];
  };

  const orgs = new Map<string, Acc>();

  const ensureOrg = (
    id: string,
    name: string,
    reportActive: boolean,
  ): Acc => {
    let o = orgs.get(id);
    if (!o) {
      o = {
        id,
        name,
        reportActive,
        assigned: new Map(),
        noDivision: [],
        noPost: [],
      };
      orgs.set(id, o);
    } else if (orgActiveMap.has(id)) {
      o.reportActive = orgActiveMap.get(id)!;
    }
    return o;
  };

  for (const s of students) {
    const orgList =
      s.organizations?.length > 0
        ? s.organizations
        : [{ id: '__none__', name: 'Tashkilot yo‘q', reportActive: true }];

    for (const org of orgList) {
      const oid = org.id || '__none__';
      const fromMap = orgActiveMap.get(oid);
      const reportActive =
        fromMap !== undefined
          ? fromMap
          : org.reportActive !== false;
      const node = ensureOrg(oid, org.name || '—', reportActive);
      const division = s.division?.trim() || '';
      const post = s.post?.trim() || '';

      if (!division) {
        node.noDivision.push(s);
        continue;
      }
      if (!post) {
        node.noPost.push(s);
        continue;
      }

      if (!node.assigned.has(division)) node.assigned.set(division, new Map());
      const posts = node.assigned.get(division)!;
      if (!posts.has(post)) posts.set(post, []);
      posts.get(post)!.push(s);
    }
  }

  const byName = (a: StudentSummary, b: StudentSummary) =>
    `${a.lastName} ${a.firstName}`.localeCompare(
      `${b.lastName} ${b.firstName}`,
      'uz',
    );

  return [...orgs.values()]
    .map((o) => {
      const departments: DeptNode[] = [...o.assigned.entries()]
        .sort(([a], [b]) => a.localeCompare(b, 'uz'))
        .map(([deptName, postsMap]) => {
          const positions: PosNode[] = [...postsMap.entries()]
            .sort(([a], [b]) => a.localeCompare(b, 'uz'))
            .map(([postName, employees]) => ({
              key: `${o.id}::${deptName}::${postName}`,
              name: postName,
              employees: [...employees].sort(byName),
            }));
          return {
            key: `${o.id}::dept::${deptName}`,
            name: deptName,
            division: deptName,
            positions,
            total: positions.reduce((n, p) => n + p.employees.length, 0),
          };
        });

      const noDivision = [...o.noDivision].sort(byName);
      const noPost = [...o.noPost].sort(byName);

      return {
        key: `org::${o.id}`,
        id: o.id,
        name: o.name,
        reportActive: o.reportActive,
        departments,
        noDivision,
        noPost,
        total:
          departments.reduce((n, d) => n + d.total, 0) +
          noDivision.length +
          noPost.length,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'uz'));
}

/* ─── leaf UI ────────────────────────────────────────────────────────────── */

type PendingOff = {
  kind: 'org' | 'division' | 'employee';
  title: string;
  apply: () => Promise<void>;
};

const EmployeeRow = memo(function EmployeeRow({
  s,
  canEdit,
  checked,
  onToggle,
}: {
  s: StudentSummary;
  canEdit: boolean;
  checked: boolean;
  onToggle: (next: boolean) => void;
}) {
  const navigate = useNavigate();
  return (
    <div
      className={cn(
        'group flex w-full items-center gap-3 border-b border-border/40 px-3 py-2 last:border-b-0',
        !checked && 'opacity-55',
      )}
    >
      <button
        type="button"
        onClick={() => navigate(`/dashboard/employees/${s.id}`)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left transition-colors hover:opacity-90 active:scale-[0.995]"
      >
        <Avatar
          size={28}
          src={s.avatarUrl ? `${BACKEND_ORIGIN}${s.avatarUrl}` : undefined}
          className="shrink-0 rounded-md bg-slate-700"
        >
          {(s.firstName?.[0] || '') + (s.lastName?.[0] || '')}
        </Avatar>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium tracking-tight text-foreground">
            {s.lastName} {s.firstName}
          </span>
          <span className="block truncate font-mono text-[11px] tabular-nums text-muted-foreground">
            {s.personnelNumber ? `№ ${s.personnelNumber}` : s.email}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1 font-mono text-[11px] tabular-nums text-amber-700 dark:text-amber-400">
          <Zap size={11} strokeWidth={2} />
          {s.totalXp}
        </span>
      </button>
      <div
        className="shrink-0"
        onClick={(e: MouseEvent) => e.stopPropagation()}
        title={
          checked
            ? 'ON — hisobotda hisobga olinadi'
            : 'OFF — reportingda hisobga olinmaydi'
        }
      >
        <Switch
          size="small"
          checked={checked}
          disabled={!canEdit}
          onCheckedChange={onToggle}
        />
      </div>
    </div>
  );
});

function EmployeePanel({
  people,
  warn,
  canEdit,
  empActive,
  onToggleEmp,
}: {
  people: StudentSummary[];
  warn?: boolean;
  canEdit: boolean;
  empActive: Map<string, boolean>;
  onToggleEmp: (userId: string, next: boolean, name: string) => void;
}) {
  if (people.length === 0) return null;
  return (
    <div
      className={cn(
        'overflow-hidden rounded-md border',
        warn
          ? 'border-amber-200/90 bg-amber-50/40 dark:border-amber-900/50 dark:bg-amber-950/25'
          : 'border-border/60 bg-background',
      )}
    >
      {people.map((s) => {
        const checked = empActive.get(s.id) ?? s.reportActive !== false;
        return (
          <EmployeeRow
            key={s.id}
            s={s}
            canEdit={canEdit}
            checked={checked}
            onToggle={(next) =>
              onToggleEmp(s.id, next, `${s.lastName} ${s.firstName}`)
            }
          />
        );
      })}
    </div>
  );
}

function BranchToggle({
  open,
  onToggle,
  depth,
  icon,
  title,
  meta,
  count,
  accent,
  switchChecked,
  canEditSwitch,
  onSwitch,
}: {
  open: boolean;
  onToggle: () => void;
  depth: 0 | 1 | 2 | 3;
  icon: ReactNode;
  title: string;
  meta?: string;
  count: number;
  accent?: 'warn' | 'default';
  switchChecked?: boolean;
  canEditSwitch?: boolean;
  onSwitch?: (next: boolean) => void;
}) {
  const pad =
    depth === 0
      ? 'pl-3'
      : depth === 1
        ? 'pl-5'
        : depth === 2
          ? 'pl-8'
          : 'pl-10';

  return (
    <div
      className={cn(
        'flex w-full items-start gap-2 border-b border-border/50 py-2.5 pr-3',
        open && depth === 0 && 'bg-muted/30',
        switchChecked === false && 'opacity-70',
        pad,
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex min-w-0 flex-1 items-start gap-2 text-left transition-colors hover:opacity-90 active:bg-muted/40"
      >
        <ChevronRight
          size={16}
          strokeWidth={2}
          className={cn(
            'mt-0.5 shrink-0 text-muted-foreground transition-transform duration-200',
            open && 'rotate-90',
          )}
        />
        <span
          className={cn(
            'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded',
            accent === 'warn'
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200'
              : depth === 0
                ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-200'
                : depth === 1
                  ? 'bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200',
          )}
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              'block text-left text-[13px] leading-snug text-foreground',
              depth === 0 ? 'font-semibold tracking-tight' : 'font-medium',
            )}
            style={{ textWrap: 'pretty' as const }}
          >
            {title}
          </span>
          {meta ? (
            <span className="mt-0.5 block text-[11px] text-muted-foreground">
              {meta}
            </span>
          ) : null}
        </span>
        <span
          className={cn(
            'mt-0.5 shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums',
            accent === 'warn'
              ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200'
              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
          )}
        >
          {count}
        </span>
      </button>
      {onSwitch != null && switchChecked != null ? (
        <div
          className="mt-0.5 shrink-0"
          title={
            switchChecked
              ? 'ON — hisobotda hisobga olinadi'
              : 'OFF — reportingda hisobga olinmaydi'
          }
        >
          <Switch
            size="small"
            checked={switchChecked}
            disabled={!canEditSwitch}
            onCheckedChange={onSwitch}
          />
        </div>
      ) : null}
    </div>
  );
}

/* ─── main ───────────────────────────────────────────────────────────────── */

export function EmployeesHierarchy({
  students,
  divisions,
  organizations,
  canEdit = false,
  className,
  onActivationChange,
}: {
  students: StudentSummary[];
  divisions?: DivisionActivation[];
  organizations?: Array<{ id: string; reportActive: boolean }>;
  canEdit?: boolean;
  className?: string;
  onActivationChange?: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const [pendingOff, setPendingOff] = useState<PendingOff | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const [orgActive, setOrgActive] = useState<Map<string, boolean>>(() => new Map());
  const [divActive, setDivActive] = useState<Map<string, boolean>>(() => new Map());
  const [empActive, setEmpActive] = useState<Map<string, boolean>>(() => new Map());

  useEffect(() => {
    const m = new Map<string, boolean>();
    for (const s of students) {
      for (const o of s.organizations ?? []) {
        if (o.id) m.set(o.id, o.reportActive !== false);
      }
    }
    for (const o of organizations ?? []) {
      m.set(o.id, o.reportActive !== false);
    }
    setOrgActive(m);
    const em = new Map<string, boolean>();
    for (const s of students) em.set(s.id, s.reportActive !== false);
    setEmpActive(em);
  }, [students, organizations]);

  useEffect(() => {
    const m = new Map<string, boolean>();
    for (const d of divisions ?? []) {
      m.set(`${d.organizationId}::${d.division}`, d.isActive !== false);
    }
    setDivActive(m);
  }, [divisions]);

  const tree = useMemo(
    () => buildTree(students, orgActive),
    [students, orgActive],
  );

  const toggle = useCallback((key: string) => {
    startTransition(() => {
      setOpen((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    });
  }, []);

  const isOpen = useCallback((key: string) => open.has(key), [open]);

  const divKey = (orgId: string, division: string) => `${orgId}::${division}`;

  const requestSwitch = useCallback(
    (next: boolean, draft: PendingOff) => {
      if (!canEdit || busyKey) return;
      if (!next) {
        setPendingOff(draft);
        return;
      }
      void (async () => {
        setBusyKey(draft.title);
        try {
          await draft.apply();
          onActivationChange?.();
          message.success(
            t({
              uz: 'Hisobotga qaytarildi',
              en: 'Included in reporting again',
              ru: 'Снова в отчётах',
            }),
          );
        } catch {
          message.error(
            t({
              uz: 'Saqlashda xato',
              en: 'Could not save',
              ru: 'Не удалось сохранить',
            }),
          );
        } finally {
          setBusyKey(null);
        }
      })();
    },
    [busyKey, canEdit, onActivationChange, t],
  );

  const confirmOff = async () => {
    if (!pendingOff) return;
    const job = pendingOff;
    setPendingOff(null);
    setBusyKey(job.title);
    try {
      await job.apply();
      onActivationChange?.();
      message.success(
        t({
          uz: 'Hisobotdan chiqarildi (ma’lumotlar saqlanadi)',
          en: 'Excluded from reporting (data kept)',
          ru: 'Исключено из отчётов (данные сохранены)',
        }),
      );
    } catch {
      message.error(
        t({
          uz: 'Saqlashda xato',
          en: 'Could not save',
          ru: 'Не удалось сохранить',
        }),
      );
    } finally {
      setBusyKey(null);
    }
  };

  if (tree.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center">
        <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm font-medium text-foreground">
          {t({ uz: 'Xodimlar yo‘q', en: 'No employees', ru: 'Нет сотрудников' })}
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          'min-w-0 overflow-hidden rounded-lg border border-border bg-card',
          className,
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {t({
              uz: 'Filial → Bo‘lim → Lavozim → Xodim',
              en: 'Branch → Dept → Position → Employee',
              ru: 'Филиал → Отдел → Должность → Сотрудник',
            })}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {t({
              uz: 'Switch OFF = hisobotdan chiqarish (o‘chirish emas)',
              en: 'Switch OFF = exclude from reports (not delete)',
              ru: 'Switch OFF = исключить из отчётов (не удаление)',
            })}
          </p>
        </div>

        <ul className="divide-y divide-border/60">
          {tree.map((org, idx) => {
            const orgOpen = isOpen(org.key);
            const orgOn = orgActive.get(org.id) ?? org.reportActive !== false;
            return (
              <li
                key={org.key}
                style={{
                  contentVisibility: 'auto',
                  containIntrinsicSize: '72px',
                }}
                className={cn(idx % 2 === 1 && !orgOpen && 'bg-muted/15')}
              >
                <BranchToggle
                  open={orgOpen}
                  onToggle={() => toggle(org.key)}
                  depth={0}
                  icon={<Building2 size={13} strokeWidth={2} />}
                  title={org.name}
                  meta={t({ uz: 'Filial', en: 'Branch', ru: 'Филиал' })}
                  count={org.total}
                  switchChecked={orgOn}
                  canEditSwitch={canEdit && !busyKey}
                  onSwitch={(next) =>
                    requestSwitch(next, {
                      kind: 'org',
                      title: org.name,
                      apply: async () => {
                        await apiService.setOrganizationReportActive(
                          org.id,
                          next,
                        );
                        setOrgActive((prev) => {
                          const m = new Map(prev);
                          m.set(org.id, next);
                          return m;
                        });
                      },
                    })
                  }
                />

                {orgOpen ? (
                  <div className="border-t border-border/40 bg-muted/10 pb-2">
                    {org.departments.map((dept) => {
                      const deptOpen = isOpen(dept.key);
                      const dOn =
                        divActive.get(divKey(org.id, dept.division)) ?? true;
                      return (
                        <div key={dept.key}>
                          <BranchToggle
                            open={deptOpen}
                            onToggle={() => toggle(dept.key)}
                            depth={1}
                            icon={<FolderTree size={13} strokeWidth={2} />}
                            title={dept.name}
                            meta={t({
                              uz: 'Bo‘lim',
                              en: 'Department',
                              ru: 'Отдел',
                            })}
                            count={dept.total}
                            switchChecked={dOn}
                            canEditSwitch={canEdit && !busyKey}
                            onSwitch={(next) =>
                              requestSwitch(next, {
                                kind: 'division',
                                title: dept.name,
                                apply: async () => {
                                  await apiService.setDivisionReportActive(
                                    org.id,
                                    dept.division,
                                    next,
                                  );
                                  setDivActive((prev) => {
                                    const m = new Map(prev);
                                    m.set(divKey(org.id, dept.division), next);
                                    return m;
                                  });
                                },
                              })
                            }
                          />
                          {deptOpen ? (
                            <div className="pb-1">
                              {dept.positions.map((pos) => {
                                const posOpen = isOpen(pos.key);
                                return (
                                  <div key={pos.key}>
                                    <BranchToggle
                                      open={posOpen}
                                      onToggle={() => toggle(pos.key)}
                                      depth={2}
                                      icon={
                                        <Briefcase size={13} strokeWidth={2} />
                                      }
                                      title={pos.name}
                                      meta={t({
                                        uz: 'Lavozim',
                                        en: 'Position',
                                        ru: 'Должность',
                                      })}
                                      count={pos.employees.length}
                                    />
                                    {posOpen ? (
                                      <div className="px-3 pb-2 pl-10">
                                        <EmployeePanel
                                          people={pos.employees}
                                          canEdit={canEdit && !busyKey}
                                          empActive={empActive}
                                          onToggleEmp={(
                                            userId,
                                            next,
                                            name,
                                          ) =>
                                            requestSwitch(next, {
                                              kind: 'employee',
                                              title: name,
                                              apply: async () => {
                                                await apiService.setEmployeeReportActive(
                                                  userId,
                                                  next,
                                                );
                                                setEmpActive((prev) => {
                                                  const m = new Map(prev);
                                                  m.set(userId, next);
                                                  return m;
                                                });
                                              },
                                            })
                                          }
                                        />
                                      </div>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}

                    {(org.noDivision.length > 0 || org.noPost.length > 0) && (
                      <div className="mx-3 mt-2 border-t border-dashed border-border pt-2">
                        <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          {t({
                            uz: 'Biriktirilmagan',
                            en: 'Unassigned',
                            ru: 'Не привязаны',
                          })}
                        </p>

                        {org.noDivision.length > 0 ? (
                          <div>
                            <BranchToggle
                              open={isOpen(`${org.key}::no-dept`)}
                              onToggle={() => toggle(`${org.key}::no-dept`)}
                              depth={1}
                              icon={<Users size={13} strokeWidth={2} />}
                              title={t({
                                uz: 'Bo‘limsiz',
                                en: 'No department',
                                ru: 'Без отдела',
                              })}
                              count={org.noDivision.length}
                              accent="warn"
                              switchChecked={
                                divActive.get(divKey(org.id, '')) ?? true
                              }
                              canEditSwitch={canEdit && !busyKey}
                              onSwitch={(next) =>
                                requestSwitch(next, {
                                  kind: 'division',
                                  title: 'Bo‘limsiz',
                                  apply: async () => {
                                    await apiService.setDivisionReportActive(
                                      org.id,
                                      '',
                                      next,
                                    );
                                    setDivActive((prev) => {
                                      const m = new Map(prev);
                                      m.set(divKey(org.id, ''), next);
                                      return m;
                                    });
                                  },
                                })
                              }
                            />
                            {isOpen(`${org.key}::no-dept`) ? (
                              <div className="px-3 pb-2 pl-10">
                                <EmployeePanel
                                  people={org.noDivision}
                                  warn
                                  canEdit={canEdit && !busyKey}
                                  empActive={empActive}
                                  onToggleEmp={(userId, next, name) =>
                                    requestSwitch(next, {
                                      kind: 'employee',
                                      title: name,
                                      apply: async () => {
                                        await apiService.setEmployeeReportActive(
                                          userId,
                                          next,
                                        );
                                        setEmpActive((prev) => {
                                          const m = new Map(prev);
                                          m.set(userId, next);
                                          return m;
                                        });
                                      },
                                    })
                                  }
                                />
                              </div>
                            ) : null}
                          </div>
                        ) : null}

                        {org.noPost.length > 0 ? (
                          <div>
                            <BranchToggle
                              open={isOpen(`${org.key}::no-post`)}
                              onToggle={() => toggle(`${org.key}::no-post`)}
                              depth={1}
                              icon={<Users size={13} strokeWidth={2} />}
                              title={t({
                                uz: 'Lavozimsiz',
                                en: 'No position',
                                ru: 'Без должности',
                              })}
                              count={org.noPost.length}
                              accent="warn"
                            />
                            {isOpen(`${org.key}::no-post`) ? (
                              <div className="px-3 pb-2 pl-10">
                                <EmployeePanel
                                  people={org.noPost}
                                  warn
                                  canEdit={canEdit && !busyKey}
                                  empActive={empActive}
                                  onToggleEmp={(userId, next, name) =>
                                    requestSwitch(next, {
                                      kind: 'employee',
                                      title: name,
                                      apply: async () => {
                                        await apiService.setEmployeeReportActive(
                                          userId,
                                          next,
                                        );
                                        setEmpActive((prev) => {
                                          const m = new Map(prev);
                                          m.set(userId, next);
                                          return m;
                                        });
                                      },
                                    })
                                  }
                                />
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>

      <AlertDialog
        open={!!pendingOff}
        onOpenChange={(v) => {
          if (!v) setPendingOff(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t({
                uz: 'Hisobotdan chiqarish',
                en: 'Exclude from reporting',
                ru: 'Исключить из отчётов',
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingOff
                ? t({
                    uz: `«${pendingOff.title}» reporting va KPI hisob-kitoblaridan chiqariladi. Ma’lumotlar o‘chirilmaydi.`,
                    en: `“${pendingOff.title}” will be excluded from reporting and KPI. Data is not deleted.`,
                    ru: `«${pendingOff.title}» будет исключён из отчётов и KPI. Данные не удаляются.`,
                  })
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t({ uz: 'Bekor', en: 'Cancel', ru: 'Отмена' })}
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmOff()}>
              {t({ uz: 'Chiqarish', en: 'Exclude', ru: 'Исключить' })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
