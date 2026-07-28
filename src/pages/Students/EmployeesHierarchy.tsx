import {
  memo,
  useCallback,
  useMemo,
  useState,
  startTransition,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/ui';
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
  positions: PosNode[];
  total: number;
};

type OrgNode = {
  key: string;
  id: string;
  name: string;
  departments: DeptNode[];
  noDivision: StudentSummary[];
  noPost: StudentSummary[];
  total: number;
};

function buildTree(students: StudentSummary[]): OrgNode[] {
  type Acc = {
    id: string;
    name: string;
    assigned: Map<string, Map<string, StudentSummary[]>>;
    noDivision: StudentSummary[];
    noPost: StudentSummary[];
  };

  const orgs = new Map<string, Acc>();

  const ensureOrg = (id: string, name: string): Acc => {
    let o = orgs.get(id);
    if (!o) {
      o = { id, name, assigned: new Map(), noDivision: [], noPost: [] };
      orgs.set(id, o);
    }
    return o;
  };

  for (const s of students) {
    const orgList =
      s.organizations?.length > 0
        ? s.organizations
        : [{ id: '__none__', name: 'Tashkilot yo‘q' }];

    for (const org of orgList) {
      const node = ensureOrg(org.id || '__none__', org.name || '—');
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

/* ─── leaf UI (module scope — no inline components) ──────────────────────── */

const EmployeeRow = memo(function EmployeeRow({ s }: { s: StudentSummary }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(`/dashboard/employees/${s.id}`)}
      className="group flex w-full items-center gap-3 border-b border-border/40 px-3 py-2 text-left last:border-b-0 transition-colors hover:bg-sky-50/80 active:scale-[0.995] dark:hover:bg-sky-950/30"
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
  );
});

function EmployeePanel({
  people,
  warn,
}: {
  people: StudentSummary[];
  warn?: boolean;
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
      {people.map((s) => (
        <EmployeeRow key={s.id} s={s} />
      ))}
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
}: {
  open: boolean;
  onToggle: () => void;
  depth: 0 | 1 | 2 | 3;
  icon: ReactNode;
  title: string;
  meta?: string;
  count: number;
  accent?: 'warn' | 'default';
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
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'flex w-full items-start gap-2 border-b border-border/50 py-2.5 pr-3 text-left transition-colors',
        'hover:bg-muted/50 active:bg-muted/70',
        open && depth === 0 && 'bg-muted/30',
        pad,
      )}
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
  );
}

/* ─── main ───────────────────────────────────────────────────────────────── */

export function EmployeesHierarchy({
  students,
  className,
}: {
  students: StudentSummary[];
  className?: string;
}) {
  const { t } = useTranslation();
  const tree = useMemo(() => buildTree(students), [students]);
  const [open, setOpen] = useState<Set<string>>(() => new Set());

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

  if (tree.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center">
        <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm font-medium text-foreground">
          {t({ uz: 'Xodimlar yo‘q', en: 'No employees', ru: 'Нет сотрудников' })}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t({
            uz: 'Filtrni o‘zgartiring yoki Energo ID sinxronini tekshiring',
            en: 'Change filters or check Energo ID sync',
            ru: 'Измените фильтр или проверьте синхронизацию',
          })}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'min-w-0 overflow-hidden rounded-lg border border-border bg-card',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/40 px-3 py-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {t({
            uz: 'Filial → Bo‘lim → Lavozim → Xodim',
            en: 'Branch → Dept → Position → Employee',
            ru: 'Филиал → Отдел → Должность → Сотрудник',
          })}
        </p>
        <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
          {tree.length}{' '}
          {t({ uz: 'filial', en: 'branches', ru: 'филиалов' })}
        </p>
      </div>

      <ul className="divide-y divide-border/60">
        {tree.map((org, idx) => {
          const orgOpen = isOpen(org.key);
          return (
            <li
              key={org.key}
              style={{ contentVisibility: 'auto', containIntrinsicSize: '72px' }}
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
              />

              {orgOpen ? (
                <div className="border-t border-border/40 bg-muted/10 pb-2">
                  {org.departments.map((dept) => {
                    const deptOpen = isOpen(dept.key);
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
                          />
                          {isOpen(`${org.key}::no-dept`) ? (
                            <div className="px-3 pb-2 pl-10">
                              <EmployeePanel
                                people={org.noDivision}
                                warn
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
                              <EmployeePanel people={org.noPost} warn />
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  )}

                  {org.departments.length === 0 &&
                  org.noDivision.length === 0 &&
                  org.noPost.length === 0 ? (
                    <p className="px-5 py-3 text-xs text-muted-foreground">
                      {t({
                        uz: 'Bu filialda xodim yo‘q',
                        en: 'No employees in this branch',
                        ru: 'В филиале нет сотрудников',
                      })}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
