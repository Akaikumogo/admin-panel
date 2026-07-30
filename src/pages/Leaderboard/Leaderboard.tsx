import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Select, Spin, Table, Tag } from '@/components/ui';
import { Trophy } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useFetch } from '@/hooks/useFetch';
import apiService, { BACKEND_ORIGIN } from '@/services/api';
import type { LeaderboardRow, Organization, UserProfile } from '@/services/api';

const T = {
  title: { uz: 'Reyting', en: 'Leaderboard', ru: 'Рейтинг' },
  global: { uz: 'Global', en: 'Global', ru: 'Глобальный' },
  org: { uz: 'Tashkilot', en: 'Organization', ru: 'Организация' },
  range: { uz: 'Scope', en: 'Scope', ru: 'Scope' },
} as const;

export default function LeaderboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [scope, setScope] = useState<'global' | 'organization'>('global');
  const [orgId, setOrgId] = useState<string>('all');

  const { data: me } = useFetch<UserProfile | null>(['me'], () => apiService.me(), null);
  const { data: orgs } = useFetch(
    ['orgs-for-leaderboard'],
    () => apiService.getOrganizations(),
    [] as Organization[],
  );

  const canSelectAnyOrganization =
    me?.role === 'SUPERADMIN' || me?.organizations?.some((o) => o.isDefault === true);
  const effectiveOrgId =
    canSelectAnyOrganization ? (orgId === 'all' ? undefined : orgId) : undefined;

  const { data, loading, initialLoading } = useFetch(
    ['leaderboard', scope, effectiveOrgId],
    async () => {
      if (scope === 'global') return apiService.getAdminGlobalLeaderboard(50);
      return apiService.getAdminOrganizationLeaderboard({ orgId: effectiveOrgId, limit: 50 });
    },
    { scope, orgId: null, me: null, top: [] } as any,
  );

  const openProfile = (userId: string) => {
    navigate(`/dashboard/employees/${userId}`);
  };

  const columns = useMemo(
    () => [
      {
        title: '#',
        dataIndex: 'rank',
        key: 'rank',
        width: 70,
        render: (v: number) => <Tag color={v <= 3 ? 'gold' : 'blue'}>{v}</Tag>,
      },
      {
        title: t({ uz: 'User', en: 'User', ru: 'Пользователь' }),
        key: 'user',
        render: (_: unknown, r: LeaderboardRow) => (
          <button
            type="button"
            className="flex w-full items-center gap-3 text-left transition-colors hover:opacity-90"
            onClick={(e) => {
              e.stopPropagation();
              openProfile(r.userId);
            }}
          >
            <div className="h-9 w-9 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              {r.avatarUrl ? (
                <img
                  src={`${BACKEND_ORIGIN}${r.avatarUrl}`}
                  alt="avatar"
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
            <div className="min-w-0">
              <div className="truncate font-medium text-blue-600 hover:underline dark:text-blue-400">
                {r.firstName} {r.lastName}
              </div>
              <div className="truncate text-xs text-slate-500">{r.email}</div>
            </div>
          </button>
        ),
      },
      {
        title: t({ uz: 'To‘g‘ri', en: 'Correct', ru: 'Верно' }),
        dataIndex: 'correctAnswers',
        key: 'correctAnswers',
        width: 100,
        render: (_: unknown, r: LeaderboardRow) => (
          <span className="tabular-nums text-slate-600 dark:text-slate-300">
            {r.correctAnswers ?? Math.floor((r.xp || 0) / 10)}
          </span>
        ),
      },
      {
        title: 'XP',
        dataIndex: 'xp',
        key: 'xp',
        width: 120,
        render: (v: number) => <Tag color="green">{v}</Tag>,
      },
    ],
    [t],
  );

  if (initialLoading || !me) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-100px)] space-y-6 overflow-y-auto p-6">
      <Card
        className="!border-slate-200 dark:!border-slate-700/60"
        title={
          <span className="flex items-center gap-2">
            <Trophy size={16} />
            {t(T.title)}
          </span>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={scope}
            style={{ width: 220 }}
            onChange={(v) => setScope(v)}
            options={[
              { value: 'global', label: t(T.global) },
              { value: 'organization', label: t(T.org) },
            ]}
          />
          {canSelectAnyOrganization && scope === 'organization' ? (
            <Select
              value={orgId}
              style={{ width: 320 }}
              onChange={(v) => setOrgId(v)}
              options={[
                { value: 'all', label: 'Choose organization…' },
                ...orgs.map((o) => ({ value: o.id, label: o.name })),
              ]}
            />
          ) : null}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {t({
            uz: 'Ism ustiga bosing — profil va XP tarixi ochiladi (qachon, qaysi savol, +10).',
            en: 'Click a name to open profile and XP history.',
            ru: 'Нажмите на имя — откроется профиль и история XP.',
          })}
        </p>
      </Card>

      {data?.me ? (
        <Card className="!border-slate-200 dark:!border-slate-700/60">
          <div className="flex items-center justify-between gap-3">
            <div className="font-semibold">
              {t({ uz: 'Sizning o‘rningiz', en: 'Your rank', ru: 'Ваш ранг' })}
            </div>
            <div className="flex items-center gap-2">
              <Tag color="blue">#{data.me.rank}</Tag>
              <Tag color="green">{data.me.xp} XP</Tag>
            </div>
          </div>
        </Card>
      ) : null}

      <Card className="!border-slate-200 dark:!border-slate-700/60">
        <Table
          rowKey="userId"
          loading={loading}
          dataSource={data?.top ?? []}
          columns={columns}
          pagination={false}
          size="small"
          onRow={(r) => ({
            onClick: () => openProfile(r.userId),
            className: 'cursor-pointer',
          })}
        />
      </Card>
    </div>
  );
}
