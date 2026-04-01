import { useMemo, useState } from 'react';
import { Card, Select, Spin, Table, Tag } from 'antd';
import { HeartPulse } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useFetch } from '@/hooks/useFetch';
import apiService from '@/services/api';
import type { HeartsLostAnalyticsResponse, Organization, UserProfile } from '@/services/api';

const T = {
  title: { uz: 'Yurak yo‘qotish', en: 'Hearts lost', ru: 'Потеря сердец' },
  today: { uz: 'Bugun', en: 'Today', ru: 'Сегодня' },
  month: { uz: '1 oy', en: 'Month', ru: 'Месяц' },
  year: { uz: '1 yil', en: 'Year', ru: 'Год' },
  org: { uz: 'Tashkilot', en: 'Organization', ru: 'Организация' },
  byUser: { uz: 'Kim qancha', en: 'By user', ru: 'По пользователям' },
  byQuestion: { uz: 'Qaysi savollar', en: 'By question', ru: 'По вопросам' },
} as const;

export default function HeartsAnalyticsPage() {
  const { t } = useTranslation();
  const [range, setRange] = useState<'today' | 'month' | 'year'>('today');
  const [orgId, setOrgId] = useState<string>('all');

  const { data: me } = useFetch<UserProfile | null>(['me'], () => apiService.me(), null);
  const { data: orgs } = useFetch(
    ['organizations-for-analytics'],
    () => apiService.getOrganizations(),
    [] as Organization[],
  );

  const effectiveOrgId =
    me?.role === 'SUPERADMIN'
      ? orgId
      : me?.organizations?.[0]?.id ?? 'all';

  const { data, loading, initialLoading } = useFetch<HeartsLostAnalyticsResponse>(
    ['hearts-lost', range, effectiveOrgId],
    () => apiService.getHeartsLostAnalytics({ range, orgId: effectiveOrgId }),
    { orgId: effectiveOrgId, range: { from: '', to: '' }, byUser: [], byQuestion: [] },
  );

  const byUserColumns = useMemo(
    () => [
      {
        title: t({ uz: 'Foydalanuvchi', en: 'User', ru: 'Пользователь' }),
        key: 'user',
        render: (_: unknown, r: HeartsLostAnalyticsResponse['byUser'][number]) =>
          `${r.firstName} ${r.lastName} (${r.email})`,
      },
      {
        title: t({ uz: 'Yo‘qotilgan', en: 'Lost', ru: 'Потеряно' }),
        dataIndex: 'lostHearts',
        key: 'lostHearts',
        width: 140,
        render: (v: number) => <Tag color="red">{v}</Tag>,
      },
    ],
    [t],
  );

  const byQuestionColumns = useMemo(
    () => [
      {
        title: t({ uz: 'Savol', en: 'Question', ru: 'Вопрос' }),
        dataIndex: 'prompt',
        key: 'prompt',
        ellipsis: true,
      },
      {
        title: t({ uz: 'Modul', en: 'Module', ru: 'Модуль' }),
        dataIndex: 'levelTitle',
        key: 'levelTitle',
        width: 180,
      },
      {
        title: t({ uz: 'Nazariya', en: 'Theory', ru: 'Теория' }),
        dataIndex: 'theoryTitle',
        key: 'theoryTitle',
        width: 180,
      },
      {
        title: t({ uz: 'Yo‘qotilgan', en: 'Lost', ru: 'Потеряно' }),
        dataIndex: 'lostHearts',
        key: 'lostHearts',
        width: 140,
        render: (v: number) => <Tag color="red">{v}</Tag>,
      },
    ],
    [t],
  );

  if (initialLoading || !me) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-100px)]">
      <Card
        className="!border-slate-200 dark:!border-slate-700/60"
        title={
          <span className="flex items-center gap-2">
            <HeartPulse size={16} />
            {t(T.title)}
          </span>
        }
      >
        <div className="flex items-center gap-3 flex-wrap">
          <Select
            value={range}
            style={{ width: 160 }}
            onChange={(v) => setRange(v)}
            options={[
              { value: 'today', label: t(T.today) },
              { value: 'month', label: t(T.month) },
              { value: 'year', label: t(T.year) },
            ]}
          />
          {me.role === 'SUPERADMIN' ? (
            <Select
              value={orgId}
              style={{ width: 320 }}
              onChange={(v) => setOrgId(v)}
              options={[
                { value: 'all', label: 'All organizations' },
                ...orgs.map((o) => ({ value: o.id, label: o.name })),
              ]}
            />
          ) : null}
        </div>
      </Card>

      <Card
        className="!border-slate-200 dark:!border-slate-700/60"
        title={<span className="font-semibold">{t(T.byUser)}</span>}
      >
        <Table
          rowKey="userId"
          loading={loading}
          dataSource={data.byUser}
          columns={byUserColumns}
          pagination={false}
          size="small"
        />
      </Card>

      <Card
        className="!border-slate-200 dark:!border-slate-700/60"
        title={<span className="font-semibold">{t(T.byQuestion)}</span>}
      >
        <Table
          rowKey="questionId"
          loading={loading}
          dataSource={data.byQuestion}
          columns={byQuestionColumns}
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  );
}

