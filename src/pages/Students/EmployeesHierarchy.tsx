import { useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Collapse } from '@/components/ui';
import { Building2, Briefcase, FolderTree, Users, Zap } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { BACKEND_ORIGIN } from '@/services/api';
import type { StudentSummary } from '@/services/api';
import { cn } from '@/lib/utils';

const NO_DEPT = '__no_division__';
const NO_POST = '__no_post__';

type OrgNode = {
  key: string;
  id: string;
  name: string;
  departments: DeptNode[];
  noDivision: StudentSummary[];
  noPost: StudentSummary[];
  total: number;
};

type DeptNode = {
  key: string;
  name: string;
  positions: PosNode[];
  total: number;
};

type PosNode = {
  key: string;
  name: string;
  employees: StudentSummary[];
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
      o = {
        id,
        name,
        assigned: new Map(),
        noDivision: [],
        noPost: [],
      };
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

  const sortPeople = (a: StudentSummary, b: StudentSummary) =>
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
              key: `${o.id}:${deptName}:${postName}`,
              name: postName,
              employees: [...employees].sort(sortPeople),
            }));
          const total = positions.reduce((n, p) => n + p.employees.length, 0);
          return {
            key: `${o.id}:dept:${deptName}`,
            name: deptName,
            positions,
            total,
          };
        });

      const noDivision = [...o.noDivision].sort(sortPeople);
      const noPost = [...o.noPost].sort(sortPeople);
      const total =
        departments.reduce((n, d) => n + d.total, 0) +
        noDivision.length +
        noPost.length;

      return {
        key: `org:${o.id}`,
        id: o.id,
        name: o.name,
        departments,
        noDivision,
        noPost,
        total,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'uz'));
}

function CountPill({ n, tone }: { n: number; tone?: 'muted' | 'warn' }) {
  return (
    <span
      className={cn(
        'ml-2 inline-flex min-w-[1.75rem] shrink-0 items-center justify-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
        tone === 'warn'
          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200'
          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
      )}
    >
      {n}
    </span>
  );
}

function EmployeeRow({ s }: { s: StudentSummary }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(`/dashboard/employees/${s.id}`)}
      className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-muted/60"
    >
      <Avatar
        size={30}
        src={s.avatarUrl ? `${BACKEND_ORIGIN}${s.avatarUrl}` : undefined}
        className="shrink-0 bg-gradient-to-br from-slate-600 to-slate-800"
      >
        {(s.firstName?.[0] || '') + (s.lastName?.[0] || '')}
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {s.lastName} {s.firstName}
        </p>
        <p className="truncate text-[11px] text-muted-foreground">
          {s.personnelNumber ? `№ ${s.personnelNumber}` : s.email}
          {s.post ? ` · ${s.post}` : ''}
        </p>
      </div>
      <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
        <Zap size={12} /> {s.totalXp}
      </span>
    </button>
  );
}

function EmployeeList({
  people,
  warn,
}: {
  people: StudentSummary[];
  warn?: boolean;
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border divide-y divide-border/50',
        warn
          ? 'border-amber-200/80 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20'
          : 'border-border/70 bg-muted/15',
      )}
    >
      {people.map((s) => (
        <EmployeeRow key={s.id} s={s} />
      ))}
    </div>
  );
}

function SectionLabel({
  icon: Icon,
  title,
  subtitle,
  count,
  tone,
}: {
  icon: typeof Users;
  title: string;
  subtitle?: string;
  count: number;
  tone?: 'org' | 'dept' | 'post' | 'warn';
}) {
  const iconWrap =
    tone === 'org'
      ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
      : tone === 'dept'
        ? 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300'
        : tone === 'post'
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200';

  return (
    <span className="flex min-w-0 flex-1 items-center gap-2.5 pr-2">
      <span
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
          iconWrap,
        )}
      >
        <Icon size={14} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block whitespace-normal break-words text-sm font-semibold leading-snug text-foreground">
          {title}
        </span>
        {subtitle ? (
          <span className="mt-0.5 block truncate text-[11px] font-normal text-muted-foreground">
            {subtitle}
          </span>
        ) : null}
      </span>
      <CountPill n={count} tone={tone === 'warn' ? 'warn' : 'muted'} />
    </span>
  );
}

function Nest({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'ml-3 space-y-1 border-l-2 border-border/70 pl-3 dark:border-slate-700',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function EmployeesHierarchy({
  students,
  className,
}: {
  students: StudentSummary[];
  className?: string;
}) {
  const { t } = useTranslation();
  const tree = useMemo(() => buildTree(students), [students]);

  if (tree.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {t({ uz: 'Xodimlar yo‘q', en: 'No employees', ru: 'Нет сотрудников' })}
      </p>
    );
  }

  return (
    <div className={cn('min-w-0', className)}>
      <Collapse
        className="bg-card"
        items={tree.map((org) => {
          return {
            key: org.key,
            label: (
              <SectionLabel
                icon={Building2}
                title={org.name}
                subtitle={t({
                  uz: 'Filial',
                  en: 'Branch',
                  ru: 'Филиал',
                })}
                count={org.total}
                tone="org"
              />
            ),
            children: (
              <Nest>
                {org.departments.length > 0 ? (
                  <Collapse
                    ghost
                    items={org.departments.map((dept) => ({
                      key: dept.key,
                      label: (
                        <SectionLabel
                          icon={FolderTree}
                          title={dept.name}
                          subtitle={t({
                            uz: 'Bo‘lim',
                            en: 'Department',
                            ru: 'Отдел',
                          })}
                          count={dept.total}
                          tone="dept"
                        />
                      ),
                      children: (
                        <Nest>
                          <Collapse
                            ghost
                            items={dept.positions.map((pos) => ({
                              key: pos.key,
                              label: (
                                <SectionLabel
                                  icon={Briefcase}
                                  title={pos.name}
                                  subtitle={t({
                                    uz: 'Lavozim',
                                    en: 'Position',
                                    ru: 'Должность',
                                  })}
                                  count={pos.employees.length}
                                  tone="post"
                                />
                              ),
                              children: (
                                <EmployeeList people={pos.employees} />
                              ),
                            }))}
                          />
                        </Nest>
                      ),
                    }))}
                  />
                ) : null}

                {org.noDivision.length > 0 || org.noPost.length > 0 ? (
                  <div className="mt-2 space-y-1 border-t border-dashed border-border pt-2">
                    <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {t({
                        uz: 'Biriktirilmagan',
                        en: 'Unassigned',
                        ru: 'Не привязаны',
                      })}
                    </p>
                    <Collapse
                      ghost
                      items={[
                        ...(org.noDivision.length
                          ? [
                              {
                                key: `${org.key}:${NO_DEPT}`,
                                label: (
                                  <SectionLabel
                                    icon={Users}
                                    title={t({
                                      uz: 'Bo‘limsiz',
                                      en: 'No department',
                                      ru: 'Без отдела',
                                    })}
                                    count={org.noDivision.length}
                                    tone="warn"
                                  />
                                ),
                                children: (
                                  <EmployeeList
                                    people={org.noDivision}
                                    warn
                                  />
                                ),
                              },
                            ]
                          : []),
                        ...(org.noPost.length
                          ? [
                              {
                                key: `${org.key}:${NO_POST}`,
                                label: (
                                  <SectionLabel
                                    icon={Users}
                                    title={t({
                                      uz: 'Lavozimsiz',
                                      en: 'No position',
                                      ru: 'Без должности',
                                    })}
                                    count={org.noPost.length}
                                    tone="warn"
                                  />
                                ),
                                children: (
                                  <div className="space-y-1">
                                    <EmployeeList people={org.noPost} warn />
                                  </div>
                                ),
                              },
                            ]
                          : []),
                      ]}
                    />
                  </div>
                ) : null}

                {org.departments.length === 0 &&
                org.noDivision.length === 0 &&
                org.noPost.length === 0 ? (
                  <p className="py-2 text-xs text-muted-foreground">
                    {t({
                      uz: 'Bu filialda xodim yo‘q',
                      en: 'No employees in this branch',
                      ru: 'В филиале нет сотрудников',
                    })}
                  </p>
                ) : null}
              </Nest>
            ),
          };
        })}
      />
    </div>
  );
}
