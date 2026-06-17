import { useEffect, useMemo, useState } from 'react';
import { Card, Segmented, Select, Tabs, Spin } from 'antd';
import {
  Activity,
  Clock,
  TrendingUp,
  Users as UsersIcon,
  Building2,
  Star,
  AlertTriangle,
} from 'lucide-react';
import {
  userActivityApi,
  apiService,
  type ActivityGroup,
  type ActivityRange,
  type ActivityStats,
  type ActivityUserRow,
  type QuestionStatsRow,
  type Organization,
} from '@/services/api';
import { userActivitySocket } from '@/services/userActivitySocket';
import { useFetch } from '@/hooks/useFetch';
import ActivityTable from './ActivityTable';
import QuestionStatsPanel from './QuestionStatsPanel';
import UserTimelineDrawer from './UserTimelineDrawer';

const RANGE_OPTIONS: { label: string; value: ActivityRange }[] = [
  { label: 'Bugun', value: 'day' },
  { label: 'Hafta', value: 'week' },
  { label: 'Oy', value: 'month' },
  { label: 'Yil', value: 'year' },
];

const formatDuration = (sec: number): string => {
  if (!sec || sec < 60) return `${sec || 0}s`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}s ${m}m`;
  return `${m}m`;
};

const StatCard = ({
  icon: Icon,
  label,
  value,
  hint,
  color,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string | number;
  hint?: string;
  color: string;
}) => (
  <Card className="!rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
    <div className="flex items-start gap-4">
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${color}`}
      >
        <Icon size={22} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
          {label}
        </div>
        <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 leading-tight">
          {value}
        </div>
        {hint && (
          <div className="text-xs text-slate-400 mt-1 truncate" title={hint}>
            {hint}
          </div>
        )}
      </div>
    </div>
  </Card>
);

const UserActivity = () => {
  const [group, setGroup] = useState<ActivityGroup>('employees');
  const [range, setRange] = useState<ActivityRange>('day');
  const [orgFilter, setOrgFilter] = useState<string>('all');
  const [onlineFilter, setOnlineFilter] = useState<'all' | 'online' | 'offline'>(
    'all',
  );
  const [drawerUserId, setDrawerUserId] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState<Record<string, boolean>>({});

  const { data: organizations } = useFetch(
    ['organizations'],
    () => apiService.getOrganizations(),
    [] as Organization[],
  );

  const { data: stats, refetch: refetchStats } = useFetch<ActivityStats | null>(
    ['ua-stats', group, range, orgFilter],
    () =>
      userActivityApi.stats({
        group,
        range,
        organizationId: orgFilter === 'all' ? undefined : orgFilter,
      }),
    null,
  );

  const {
    data: users,
    loading: usersLoading,
    refetch: refetchUsers,
  } = useFetch<ActivityUserRow[]>(
    ['ua-users', group, range, orgFilter],
    () =>
      userActivityApi.listUsers({
        group,
        range,
        organizationId: orgFilter === 'all' ? undefined : orgFilter,
      }),
    [] as ActivityUserRow[],
  );

  const { data: questionStats } = useFetch<QuestionStatsRow[]>(
    ['ua-question-stats', orgFilter],
    () =>
      userActivityApi.questionStats({
        organizationId: orgFilter === 'all' ? undefined : orgFilter,
      }),
    [] as QuestionStatsRow[],
  );

  // Real-time: WS dan kelgan online/offline statusni state ga yozamiz
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    userActivitySocket.connect(token);
    const off = userActivitySocket.onStatus((e) => {
      setLiveStatus((prev) => ({
        ...prev,
        [e.userId]: e.status === 'online',
      }));
      // Stat cards refresh — debounce: 3 sekunddan keyin
    });
    return () => {
      off();
    };
  }, []);

  // Har 60 sekundda stat va list ni yangilash (backup polling)
  useEffect(() => {
    const id = setInterval(() => {
      refetchStats();
      refetchUsers();
    }, 60_000);
    return () => clearInterval(id);
  }, [refetchStats, refetchUsers]);

  const enrichedUsers = useMemo<ActivityUserRow[]>(() => {
    return users.map((u) =>
      liveStatus[u.userId] !== undefined
        ? { ...u, isOnline: liveStatus[u.userId] }
        : u,
    );
  }, [users, liveStatus]);

  const filteredUsers = useMemo(() => {
    if (onlineFilter === 'all') return enrichedUsers;
    return enrichedUsers.filter((u) =>
      onlineFilter === 'online' ? u.isOnline : !u.isOnline,
    );
  }, [enrichedUsers, onlineFilter]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Foydalanuvchilar aktivligi
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time online status, kunlik/haftalik/oylik activity va savol
            xatolari
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Segmented
            value={range}
            onChange={(v) => setRange(v as ActivityRange)}
            options={RANGE_OPTIONS}
          />
          <Select
            value={orgFilter}
            onChange={setOrgFilter}
            className="!min-w-[200px]"
            options={[
              { value: 'all', label: 'Barcha filiallar' },
              ...organizations.map((o) => ({ value: o.id, label: o.name })),
            ]}
          />
          <Select
            value={onlineFilter}
            onChange={setOnlineFilter}
            className="!min-w-[140px]"
            options={[
              { value: 'all', label: 'Hammasi' },
              { value: 'online', label: 'Online' },
              { value: 'offline', label: 'Offline' },
            ]}
          />
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          icon={Activity}
          label="Hozir online"
          value={stats?.onlineNow ?? 0}
          color="bg-emerald-500"
        />
        <StatCard
          icon={UsersIcon}
          label="Bugun kirganlar"
          value={stats?.loginsToday ?? 0}
          color="bg-blue-500"
        />
        <StatCard
          icon={Clock}
          label="O'rtacha online (min)"
          value={stats?.avgOnlineMinutes ?? 0}
          color="bg-violet-500"
        />
        <StatCard
          icon={Building2}
          label="Eng aktiv filial"
          value={stats?.topBranch?.name ?? '—'}
          hint={
            stats?.topBranch
              ? `${stats.topBranch.loginCount} ta login bugun`
              : undefined
          }
          color="bg-amber-500"
        />
        <StatCard
          icon={Star}
          label="Eng aktiv xodim"
          value={stats?.topUser?.name ?? '—'}
          hint={
            stats?.topUser
              ? formatDuration(stats.topUser.onlineSeconds)
              : undefined
          }
          color="bg-rose-500"
        />
        <StatCard
          icon={AlertTriangle}
          label="Eng kam aktiv xodim"
          value={stats?.leastActiveUser?.name ?? '—'}
          hint={
            stats?.leastActiveUser
              ? formatDuration(stats.leastActiveUser.onlineSeconds)
              : undefined
          }
          color="bg-slate-500"
        />
      </div>

      {/* TABS */}
      <Tabs
        activeKey={group}
        onChange={(k) => setGroup(k as ActivityGroup)}
        items={[
          {
            key: 'employees',
            label: (
              <span className="flex items-center gap-2">
                <UsersIcon size={16} /> Filial xodimlari
              </span>
            ),
            children: (
              <Spin spinning={usersLoading}>
                <ActivityTable
                  rows={filteredUsers}
                  onOpenUser={setDrawerUserId}
                  formatDuration={formatDuration}
                />
              </Spin>
            ),
          },
          {
            key: 'moderators',
            label: (
              <span className="flex items-center gap-2">
                <TrendingUp size={16} /> Moderatorlar
              </span>
            ),
            children: (
              <Spin spinning={usersLoading}>
                <ActivityTable
                  rows={filteredUsers}
                  onOpenUser={setDrawerUserId}
                  formatDuration={formatDuration}
                />
              </Spin>
            ),
          },
        ]}
      />

      {/* QUESTION STATS — eng ko'p xato qilingan savollar */}
      <QuestionStatsPanel rows={questionStats} />

      {/* User detail drawer */}
      <UserTimelineDrawer
        userId={drawerUserId}
        onClose={() => setDrawerUserId(null)}
      />
    </div>
  );
};

export default UserActivity;
