import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Collapse, Tag } from '@/components/ui';
import { Building2, Briefcase, FolderTree, Users, Zap } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { BACKEND_ORIGIN } from '@/services/api';
import type { StudentSummary } from '@/services/api';
import { shortBranchName } from '@/pages/Home/branchName';
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

function CountPill({ n }: { n: number }) {
  return (
    <span className="ml-2 inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
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
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted/70"
    >
      <Avatar
        size={32}
        src={s.avatarUrl ? `${BACKEND_ORIGIN}${s.avatarUrl}` : undefined}
        className="bg-gradient-to-br from-slate-600 to-slate-800 shrink-0"
      >
        {(s.firstName?.[0] || '') + (s.lastName?.[0] || '')}
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {s.lastName} {s.firstName}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {s.personnelNumber ? `Tabel: ${s.personnelNumber}` : s.email}
        </p>
      </div>
      <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
        <Zap size={12} /> {s.totalXp}
      </span>
    </button>
  );
}

function SectionLabel({
  icon: Icon,
  title,
  count,
  muted,
}: {
  icon: typeof Users;
  title: string;
  count: number;
  muted?: boolean;
}) {
  return (
    <span
      className={cn(
        'flex items-center gap-2 text-sm font-semibold',
        muted && 'text-muted-foreground',
      )}
    >
      <Icon size={15} className="shrink-0 opacity-70" />
      <span className="truncate">{title}</span>
      <CountPill n={count} />
    </span>
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
    <div className={cn('min-w-0 space-y-2', className)}>
      <Collapse
        className="rounded-xl border border-border bg-card px-3"
        items={tree.map((org) => ({
          key: org.key,
          label: (
            <SectionLabel
              icon={Building2}
              title={shortBranchName(org.name)}
              count={org.total}
            />
          ),
          children: (
            <div className="space-y-2 pl-1">
              {org.departments.length > 0 ? (
                <Collapse
                  className="border-0"
                  items={org.departments.map((dept) => ({
                    key: dept.key,
                    label: (
                      <SectionLabel
                        icon={FolderTree}
                        title={dept.name}
                        count={dept.total}
                      />
                    ),
                    children: (
                      <Collapse
                        className="border-0 pl-2"
                        items={dept.positions.map((pos) => ({
                          key: pos.key,
                          label: (
                            <SectionLabel
                              icon={Briefcase}
                              title={pos.name}
                              count={pos.employees.length}
                            />
                          ),
                          children: (
                            <div className="divide-y divide-border/60 rounded-lg border border-border/60 bg-muted/20">
                              {pos.employees.map((s) => (
                                <EmployeeRow key={`${pos.key}:${s.id}`} s={s} />
                              ))}
                            </div>
                          ),
                        }))}
                      />
                    ),
                  }))}
                />
              ) : null}

              {org.noDivision.length > 0 || org.noPost.length > 0 ? (
                <div className="mt-3 space-y-2 border-t border-dashed border-border pt-3">
                  <p className="px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {t({
                      uz: 'Biriktirilmagan',
                      en: 'Unassigned',
                      ru: 'Не привязаны',
                    })}
                  </p>
                  <Collapse
                    className="border-0"
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
                                  muted
                                />
                              ),
                              children: (
                                <div className="divide-y divide-border/60 rounded-lg border border-border/60 bg-amber-50/40 dark:bg-amber-950/20">
                                  {org.noDivision.map((s) => (
                                    <EmployeeRow
                                      key={`${org.key}:nd:${s.id}`}
                                      s={s}
                                    />
                                  ))}
                                </div>
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
                                  muted
                                />
                              ),
                              children: (
                                <div className="divide-y divide-border/60 rounded-lg border border-border/60 bg-amber-50/40 dark:bg-amber-950/20">
                                  {org.noPost.map((s) => (
                                    <div key={`${org.key}:np:${s.id}`}>
                                      <EmployeeRow s={s} />
                                      {s.division ? (
                                        <p className="px-3 pb-2 text-[11px] text-muted-foreground">
                                          <Tag className="!text-[10px]">
                                            {s.division}
                                          </Tag>
                                        </p>
                                      ) : null}
                                    </div>
                                  ))}
                                </div>
                              ),
                            },
                          ]
                        : []),
                    ]}
                  />
                </div>
              ) : null}
            </div>
          ),
        }))}
      />
    </div>
  );
}
