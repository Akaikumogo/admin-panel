import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { ArrowRight, History, UserCog } from 'lucide-react';
import { Input, Segmented, Select, Table, Tag } from '@/components/ui';
import { useTranslation } from '@/hooks/useTranslation';
import { useFetch } from '@/hooks/useFetch';
import apiService, {
  type CustomPlanRow,
  type PlanChangeRow,
} from '@/services/api';

type Tab = 'changes' | 'active';
type KindFilter = 'all' | PlanChangeRow['kind'];

const fmtDay = (d: string | null) => (d ? dayjs(d).format('DD.MM.YYYY') : '—');

const CustomPlansPage = () => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('changes');

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <UserCog size={20} className="text-[var(--shell-rail)]" />
          Custom plans
        </h1>
        <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
          {t({
            uz: 'Markaziy apparat xodimlari kimning planini qachon va qanday o‘zgartirgani. Bu sahifa faqat superadmin uchun.',
            en: 'Which head-office staff changed whose plan, when and how. Superadmin only.',
            ru: 'Кто из центрального аппарата, когда и как изменил чей план. Только для суперадмина.',
          })}
        </p>
      </div>

      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'changes', label: t({ uz: 'O‘zgarishlar tarixi', en: 'Change history', ru: 'История изменений' }) },
          { value: 'active', label: t({ uz: 'Faol shaxsiy planlar', en: 'Active personal plans', ru: 'Активные личные планы' }) },
        ]}
      />

      {tab === 'changes' ? <ChangesTab /> : <ActiveTab />}
    </div>
  );
};

function GoalText({ goal, kind }: { goal: number | null; kind: PlanChangeRow['kind'] }) {
  const { t } = useTranslation();
  if (goal == null) {
    return (
      <span className="text-muted-foreground">
        {kind === 'USER_NORM'
          ? t({ uz: 'standart', en: 'default', ru: 'стандарт' })
          : '—'}
      </span>
    );
  }
  if (goal === 0) {
    return (
      <span className="font-semibold text-red-600 dark:text-red-400">
        0 <span className="font-normal text-xs">({t({ uz: 'plan yo‘q', en: 'no plan', ru: 'без плана' })})</span>
      </span>
    );
  }
  return <span className="font-semibold tabular-nums">{goal}</span>;
}

function ChangesTab() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [kind, setKind] = useState<KindFilter>('all');
  const [actorId, setActorId] = useState<string>('');
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(searchDraft.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(id);
  }, [searchDraft]);

  const { data, loading } = useFetch(
    ['plan-changes', page, kind, actorId, search],
    () =>
      apiService.getPlanChanges({
        page,
        limit: 20,
        kind: kind === 'all' ? undefined : kind,
        actorId: actorId || undefined,
        search: search || undefined,
      }),
    null,
  );

  const kindLabel: Record<PlanChangeRow['kind'], string> = {
    CALENDAR_DAY: t({ uz: 'Hamma uchun kun', en: 'Day for everyone', ru: 'День для всех' }),
    USER_NORM: t({ uz: 'Doimiy norma', en: 'Permanent goal', ru: 'Постоянная норма' }),
    USER_DAY: t({ uz: 'Xodim kuni', en: 'Employee day', ru: 'День сотрудника' }),
  };

  const columns = [
    {
      title: t({ uz: 'Qachon', en: 'When', ru: 'Когда' }),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      filterable: false,
      render: (v: string) => dayjs(v).format('DD.MM.YYYY HH:mm'),
    },
    {
      title: t({ uz: 'Kim o‘zgartirdi', en: 'Changed by', ru: 'Кто изменил' }),
      dataIndex: 'actorName',
      key: 'actorName',
      width: 200,
      filterable: false,
      render: (v: string | null, row: PlanChangeRow) => (
        <div className="min-w-0">
          <div className="font-medium truncate">{v || '—'}</div>
          {row.actorRole ? (
            <Tag color={row.actorRole === 'SUPERADMIN' ? 'purple' : 'blue'}>
              {row.actorRole === 'SUPERADMIN' ? 'Superadmin' : t({ uz: 'Markaziy apparat', en: 'Head office', ru: 'Центр. аппарат' })}
            </Tag>
          ) : null}
        </div>
      ),
    },
    {
      title: t({ uz: 'Kimning plani', en: 'Whose plan', ru: 'Чей план' }),
      dataIndex: 'targetName',
      key: 'targetName',
      width: 220,
      filterable: false,
      render: (v: string | null, row: PlanChangeRow) =>
        row.targetUserId ? (
          <div className="min-w-0">
            <Link
              to={`/dashboard/employees/${row.targetUserId}`}
              className="font-medium text-primary hover:underline truncate block"
            >
              {v || '—'}
            </Link>
            {row.targetOrgName ? (
              <div className="text-xs text-muted-foreground truncate">{row.targetOrgName}</div>
            ) : null}
          </div>
        ) : (
          <Tag color="orange">{t({ uz: 'Hamma xodimlar', en: 'All employees', ru: 'Все сотрудники' })}</Tag>
        ),
    },
    {
      title: t({ uz: 'Turi', en: 'Type', ru: 'Тип' }),
      dataIndex: 'kind',
      key: 'kind',
      width: 150,
      filterable: false,
      render: (v: PlanChangeRow['kind'], row: PlanChangeRow) => (
        <div>
          <div>{kindLabel[v]}</div>
          {row.action === 'RESET' ? (
            <div className="text-xs text-muted-foreground">
              {t({ uz: 'standartga qaytarildi', en: 'reset', ru: 'сброшено' })}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      title: t({ uz: 'Kun', en: 'Day', ru: 'День' }),
      dataIndex: 'day',
      key: 'day',
      width: 110,
      filterable: false,
      render: (v: string | null, row: PlanChangeRow) =>
        row.kind === 'USER_NORM'
          ? t({ uz: 'har ish kuni', en: 'every workday', ru: 'каждый раб. день' })
          : fmtDay(v),
    },
    {
      title: t({ uz: 'O‘zgarish', en: 'Change', ru: 'Изменение' }),
      dataIndex: 'newGoal',
      key: 'change',
      filterable: false,
      render: (_: unknown, row: PlanChangeRow) => {
        const name =
          (row.newValue?.holidayName as string | undefined) ??
          (row.oldValue?.holidayName as string | undefined);
        const note = row.newValue?.note as string | undefined;
        return (
          <div>
            <span className="inline-flex items-center gap-1.5">
              <GoalText goal={row.oldGoal} kind={row.kind} />
              <ArrowRight size={14} className="text-muted-foreground" />
              <GoalText goal={row.newGoal} kind={row.kind} />
            </span>
            {name || note ? (
              <div className="text-xs text-muted-foreground">{name || note}</div>
            ) : null}
          </div>
        );
      },
    },
  ];

  return (
    <div className="bg-card border border-border rounded-lg p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          className="w-64"
          placeholder={t({ uz: 'Xodim yoki o‘zgartirgan odam…', en: 'Employee or editor…', ru: 'Сотрудник или редактор…' })}
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
        />
        <Select
          className="w-60"
          allowClear
          value={actorId || null}
          placeholder={t({ uz: 'Kim o‘zgartirdi', en: 'Changed by', ru: 'Кто изменил' })}
          options={(data?.actors ?? []).map((a) => ({ value: a.id, label: a.name }))}
          onChange={(v) => {
            setActorId(v ?? '');
            setPage(1);
          }}
        />
        <Segmented<KindFilter>
          value={kind}
          onChange={(v) => {
            setKind(v);
            setPage(1);
          }}
          options={[
            { value: 'all', label: t({ uz: 'Hammasi', en: 'All', ru: 'Все' }) },
            { value: 'USER_DAY', label: kindLabel.USER_DAY },
            { value: 'USER_NORM', label: kindLabel.USER_NORM },
            { value: 'CALENDAR_DAY', label: kindLabel.CALENDAR_DAY },
          ]}
        />
      </div>

      <Table
        dataSource={data?.data ?? []}
        columns={columns}
        rowKey="id"
        size="small"
        loading={loading}
        pagination={{
          current: page,
          pageSize: data?.limit ?? 20,
          total: data?.total ?? 0,
          showSizeChanger: false,
          onChange: (p) => setPage(p),
        }}
      />
      {!loading && data && data.total === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <History size={14} />
          {t({ uz: 'Hali o‘zgarish yo‘q', en: 'No changes yet', ru: 'Изменений пока нет' })}
        </p>
      ) : null}
    </div>
  );
}

function ActiveTab() {
  const { t } = useTranslation();
  const { data, loading } = useFetch(
    ['custom-plans'],
    () => apiService.getCustomPlans(),
    null,
  );

  const columns = [
    {
      title: t({ uz: 'Xodim', en: 'Employee', ru: 'Сотрудник' }),
      dataIndex: 'fullName',
      key: 'fullName',
      width: 240,
      filterable: false,
      render: (v: string, row: CustomPlanRow) => (
        <div className="min-w-0">
          <Link
            to={`/dashboard/employees/${row.userId}`}
            className="font-medium text-primary hover:underline truncate block"
          >
            {v || '—'}
          </Link>
          {row.orgName ? (
            <div className="text-xs text-muted-foreground truncate">{row.orgName}</div>
          ) : null}
        </div>
      ),
    },
    {
      title: t({ uz: 'Doimiy norma', en: 'Permanent goal', ru: 'Постоянная норма' }),
      dataIndex: 'dailyPlanGoal',
      key: 'dailyPlanGoal',
      width: 130,
      filterable: false,
      render: (v: number | null) =>
        v == null ? (
          <span className="text-muted-foreground">{t({ uz: 'standart', en: 'default', ru: 'стандарт' })}</span>
        ) : (
          <span className="font-semibold tabular-nums">{v}</span>
        ),
    },
    {
      title: t({ uz: 'Oldindagi maxsus kunlar', en: 'Upcoming custom days', ru: 'Предстоящие особые дни' }),
      dataIndex: 'upcomingDays',
      key: 'upcomingDays',
      filterable: false,
      render: (v: CustomPlanRow['upcomingDays']) =>
        v.length ? (
          <div className="flex flex-wrap gap-1">
            {v.slice(0, 8).map((d) => (
              <Tag key={d.day} color={d.goal === 0 ? 'red' : 'green'}>
                {dayjs(d.day).format('DD.MM')}: {d.goal}
              </Tag>
            ))}
            {v.length > 8 ? <Tag>+{v.length - 8}</Tag> : null}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      title: t({ uz: 'Oxirgi o‘zgartirgan', en: 'Last changed by', ru: 'Последнее изменение' }),
      dataIndex: 'lastChangedBy',
      key: 'lastChangedBy',
      width: 220,
      filterable: false,
      render: (v: string | null, row: CustomPlanRow) => (
        <div>
          <div className="font-medium">{v || '—'}</div>
          {row.lastChangedAt ? (
            <div className="text-xs text-muted-foreground">
              {dayjs(row.lastChangedAt).format('DD.MM.YYYY HH:mm')}
            </div>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
      <Table
        dataSource={data?.users ?? []}
        columns={columns}
        rowKey="userId"
        size="small"
        loading={loading}
        pagination={{ pageSize: 20, showSizeChanger: false }}
      />
    </div>
  );
}

export default CustomPlansPage;
