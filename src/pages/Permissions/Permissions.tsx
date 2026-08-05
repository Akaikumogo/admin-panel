import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Avatar,
  Button,
  Input,
  message,
  Select,
  Spin,
  Switch,
  Table,
  Tag,
} from '@/components/ui';
import type { ColumnsType } from '@/components/ui';
import { Filter, Mail, Search, Star } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useQueryParams } from '@/hooks/useQueryParams';
import { useFetch, usePaginatedFetch } from '@/hooks/useFetch';
import HighlightText from '@/components/HighlightText';
import NoData from '@/components/NoData';
import apiService, { resolveAssetUrl } from '@/services/api';
import type {
  CrudPermissions,
  ModeratorPermissions,
  Organization,
  UserProfile,
} from '@/services/api';

const T = {
  title: { uz: 'Ruxsatlar', en: 'Permissions', ru: 'Права доступа' },
  subtitle: {
    uz: 'Moderatorlar uchun create / update / delete',
    en: 'Per-moderator create / update / delete',
    ru: 'Create / update / delete для модераторов',
  },
  search: { uz: 'Qidirish...', en: 'Search...', ru: 'Поиск...' },
  organization: { uz: 'Tashkilot', en: 'Organization', ru: 'Организация' },
  total: { uz: 'Jami', en: 'Total', ru: 'Всего' },
  save: { uz: 'Saqlash', en: 'Save', ru: 'Сохранить' },
  noData: {
    uz: 'Moderatorlar yo‘q',
    en: 'No moderators',
    ru: 'Нет модераторов',
  },
  saved: {
    uz: 'Ruxsatlar saqlandi',
    en: 'Permissions saved',
    ru: 'Права сохранены',
  },
  view: { uz: 'Ko‘rish', en: 'View', ru: 'Просм.' },
  create: { uz: 'Yaratish', en: 'Create', ru: 'Созд.' },
  update: { uz: 'Yangilash', en: 'Update', ru: 'Изм.' },
  delete: { uz: 'O‘chirish', en: 'Delete', ru: 'Удал.' },
  selectAll: { uz: 'Hammasi', en: 'All', ru: 'Все' },
  clearAll: { uz: 'Tozalash', en: 'Clear', ru: 'Очистить' },
} as const;

const MODULES: {
  key: keyof ModeratorPermissions;
  label: { uz: string; en: string; ru: string };
}[] = [
  { key: 'contentLevels', label: { uz: 'Modullar', en: 'Levels', ru: 'Модули' } },
  { key: 'contentTheories', label: { uz: 'Nazariyalar', en: 'Theories', ru: 'Теории' } },
  { key: 'contentQuestions', label: { uz: 'Savollar', en: 'Questions', ru: 'Вопросы' } },
  { key: 'organizations', label: { uz: 'Tashkilotlar', en: 'Orgs', ru: 'Орг.' } },
  { key: 'students', label: { uz: 'Xodimlar', en: 'Employees', ru: 'Сотр.' } },
  { key: 'users', label: { uz: 'Foydalanuvchilar', en: 'Users', ru: 'Польз.' } },
  { key: 'moderators', label: { uz: 'Moderatorlar', en: 'Mods', ru: 'Мод.' } },
  { key: 'profile', label: { uz: 'Profil', en: 'Profile', ru: 'Профиль' } },
  { key: 'exams', label: { uz: 'Imtihonlar', en: 'Exams', ru: 'Экзамены' } },
  { key: 'audioLibrary', label: { uz: 'Audio kutub.', en: 'Audio', ru: 'Аудио' } },
  { key: 'analytics', label: { uz: 'Analitika', en: 'Analytics', ru: 'Аналитика' } },
  { key: 'permissions', label: { uz: 'Ruxsatlar', en: 'Permissions', ru: 'Права' } },
  { key: 'violations', label: { uz: 'Qoidabuz.', en: 'Violations', ru: 'Наруш.' } },
  { key: 'logs', label: { uz: 'Loglar', en: 'Logs', ru: 'Логи' } },
  { key: 'nesSync', label: { uz: '1C sync', en: '1C sync', ru: '1C синх.' } },
  { key: 'aiAssistant', label: { uz: 'AI yordamchi', en: 'AI', ru: 'ИИ' } },
  {
    key: 'safetyRecords',
    label: {
      uz: 'Xavfsizlik yozuvlari',
      en: 'Safety records',
      ru: 'Записи безопасности',
    },
  },
];

const CRUD_ORDER: (keyof CrudPermissions)[] = ['view', 'create', 'update', 'delete'];
const PAGE_SIZE = 10;
const CRUD_COL_WIDTH = 72;
const USER_COL_WIDTH = 280;
const ACTIONS_COL_WIDTH = 100;

const QP_DEFAULTS = { search: undefined, orgId: undefined, page: undefined } as const;

const PermissionsPage = () => {
  const { t } = useTranslation();
  const { params: qp, setParam, setParams } =
    useQueryParams<typeof QP_DEFAULTS>(QP_DEFAULTS);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const currentPage = qp.page ? parseInt(qp.page, 10) : 1;

  const { data: organizations } = useFetch(
    ['organizations'],
    () => apiService.getOrganizations(),
    [] as Organization[],
  );

  const {
    data: moderators,
    total,
    loading,
    initialLoading,
    refetch,
  } = usePaginatedFetch(
    ['permissions-moderators', qp.search, qp.orgId, currentPage],
    () =>
      apiService.getModerators({
        search: qp.search || undefined,
        organizationId: qp.orgId || undefined,
        page: currentPage,
        limit: PAGE_SIZE,
      }),
  );

  const [permMap, setPermMap] = useState<
    Record<string, ModeratorPermissions | undefined>
  >({});
  const [permLoading, setPermLoading] = useState(false);
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(() => new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const tableWrapRef = useRef<HTMLDivElement>(null);
  const [tableScrollY, setTableScrollY] = useState(480);

  useLayoutEffect(() => {
    const el = tableWrapRef.current;
    if (!el) return;

    const updateHeight = () => {
      const next = el.clientHeight - 108;
      setTableScrollY(Math.max(280, next));
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, [initialLoading, moderators.length]);

  const handleSearchChange = (value: string) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setParams({ search: value || undefined, page: undefined });
    }, 400);
  };

  const handleOrgChange = (value: string | undefined) => {
    setParams({ orgId: value || undefined, page: undefined });
  };

  useEffect(() => {
    if (!moderators.length) {
      setPermMap({});
      return;
    }
    let cancelled = false;
    setPermLoading(true);
    void (async () => {
      try {
        const results = await Promise.all(
          moderators.map(async (m) => {
            try {
              const rec = await apiService.getModeratorPermissions(m.id);
              return { id: m.id, permissions: rec.permissions };
            } catch {
              return { id: m.id, permissions: undefined };
            }
          }),
        );
        if (cancelled) return;
        const next: Record<string, ModeratorPermissions | undefined> = {};
        for (const r of results) {
          next[r.id] = r.permissions;
        }
        setPermMap(next);
        setDirtyIds(new Set());
      } finally {
        if (!cancelled) setPermLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [moderators]);

  const setCrud = useCallback(
    (
      userId: string,
      moduleKey: keyof ModeratorPermissions,
      field: keyof CrudPermissions,
      value: boolean,
    ) => {
      setPermMap((prev) => {
        const cur = prev[userId];
        if (!cur) return prev;
        return {
          ...prev,
          [userId]: {
            ...cur,
            [moduleKey]: {
              ...cur[moduleKey],
              [field]: value,
            },
          },
        };
      });
      setDirtyIds((prev) => new Set(prev).add(userId));
    },
    [],
  );

  const setAllForUser = useCallback((userId: string, value: boolean) => {
    setPermMap((prev) => {
      const cur = prev[userId];
      if (!cur) return prev;
      const next = { ...cur } as ModeratorPermissions;
      for (const m of MODULES) {
        next[m.key] = { view: value, create: value, update: value, delete: value };
      }
      return { ...prev, [userId]: next };
    });
    setDirtyIds((prev) => new Set(prev).add(userId));
  }, []);

  const saveRow = useCallback(
    async (userId: string) => {
      const perms = permMap[userId];
      if (!perms) return;
      setSavingId(userId);
      try {
        await apiService.updateModeratorPermissions(userId, perms);
        message.success(t(T.saved));
        setDirtyIds((prev) => {
          const n = new Set(prev);
          n.delete(userId);
          return n;
        });
      } finally {
        setSavingId(null);
      }
    },
    [permMap, t],
  );

  const scrollX =
    USER_COL_WIDTH +
    MODULES.length * CRUD_ORDER.length * CRUD_COL_WIDTH +
    ACTIONS_COL_WIDTH;

  const columns: ColumnsType<UserProfile> = useMemo(() => {
    const actionTitle = (k: keyof CrudPermissions) => {
      if (k === 'view') return t(T.view);
      if (k === 'create') return t(T.create);
      if (k === 'update') return t(T.update);
      return t(T.delete);
    };

    const userCol: ColumnsType<UserProfile>[0] = {
      title: t({ uz: 'Foydalanuvchi', en: 'User', ru: 'Пользователь' }),
      key: 'user',
      fixed: 'left',
      width: USER_COL_WIDTH,
      render: (_, mod) => (
        <div className="flex items-center gap-3 min-w-0">
          <Avatar
            size={40}
            src={
              mod.avatarUrl ? resolveAssetUrl(mod.avatarUrl) : undefined
            }
            className="flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-700"
          >
            {(mod.firstName?.[0] || '') + (mod.lastName?.[0] || '')}
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-slate-900 dark:text-white truncate flex items-center gap-1.5">
              <HighlightText
                text={`${mod.firstName} ${mod.lastName}`}
                highlight={qp.search}
              />
              {mod.organizations?.some((o) => o.isDefault) ? (
                <Star
                  size={14}
                  className="flex-shrink-0 fill-amber-400 text-amber-500"
                />
              ) : null}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
              <Mail size={10} className="flex-shrink-0" />
              <HighlightText text={mod.email} highlight={qp.search} />
            </div>
            <div
              className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5"
              title={mod.organizations?.map((o) => o.name).join(', ') || '—'}
            >
              {mod.organizations?.map((o) => o.name).join(', ') || '—'}
            </div>
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              <Tag color="blue" className="text-[10px] !m-0">
                MODERATOR
              </Tag>
              <Button
                size="small"
                type="link"
                className="!px-1 !text-[10px]"
                onClick={() => setAllForUser(mod.id, true)}
              >
                {t(T.selectAll)}
              </Button>
              <Button
                size="small"
                type="link"
                className="!px-1 !text-[10px]"
                onClick={() => setAllForUser(mod.id, false)}
              >
                {t(T.clearAll)}
              </Button>
            </div>
          </div>
        </div>
      ),
    };

    const moduleGroups = MODULES.map((mod) => ({
      title: t(mod.label),
      align: 'center' as const,
      width: CRUD_ORDER.length * CRUD_COL_WIDTH,
      children: CRUD_ORDER.map((crud) => ({
        title: actionTitle(crud),
        key: `${String(mod.key)}-${crud}`,
        width: CRUD_COL_WIDTH,
        align: 'center' as const,
        render: (_: unknown, record: UserProfile) => {
          const perms = permMap[record.id];
          if (permLoading || !perms) {
            return <Spin size="small" />;
          }
          return (
            <Switch
              size="small"
              checked={perms[mod.key][crud]}
              onChange={(v) => setCrud(record.id, mod.key, crud, v)}
            />
          );
        },
      })),
    }));

    const actionsCol: ColumnsType<UserProfile>[0] = {
      title: t({ uz: 'Amallar', en: 'Actions', ru: 'Действия' }),
      key: 'actions',
      fixed: 'right',
      width: ACTIONS_COL_WIDTH,
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          loading={savingId === record.id}
          disabled={!dirtyIds.has(record.id)}
          onClick={() => void saveRow(record.id)}
        >
          {t(T.save)}
        </Button>
      ),
    };

    return [userCol, ...moduleGroups, actionsCol];
  }, [
    t,
    qp.search,
    permLoading,
    dirtyIds,
    savingId,
    setCrud,
    setAllForUser,
    saveRow,
    permMap,
  ]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-6">
      <div className="flex-shrink-0">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          {t(T.title)}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t(T.subtitle)}</p>
      </div>

      <div className="flex flex-shrink-0 flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-700/60 dark:bg-card">
        <Filter size={16} className="text-slate-400" />
        <Input
          allowClear
          defaultValue={qp.search}
          prefix={<Search size={14} className="text-slate-400" />}
          placeholder={t(T.search)}
          style={{ width: 220 }}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
        <Select
          allowClear
          showSearch
          placeholder={t(T.organization)}
          value={qp.orgId}
          onChange={handleOrgChange}
          optionFilterProp="label"
          style={{ minWidth: 260, maxWidth: 360 }}
          options={organizations.map((o) => ({
            value: o.id,
            label: o.name,
          }))}
        />
        <Tag className="text-xs">
          {t(T.total)}: {total}
        </Tag>
        <Button size="small" onClick={() => refetch()}>
          {t({ uz: 'Yangilash', en: 'Refresh', ru: 'Обновить' })}
        </Button>
        <span className="ml-auto text-xs text-slate-400">
          {t({
            uz: "Switchlar uchun jadvalni o'ngga suring →",
            en: 'Scroll right to see permission switches →',
            ru: 'Прокрутите вправо для переключателей →',
          })}
        </span>
      </div>

      <div
        ref={tableWrapRef}
        className="min-h-0 flex-1 rounded-lg border border-slate-200 bg-white dark:border-slate-700/60 dark:bg-card"
      >
        {initialLoading ? (
          <div className="flex h-48 items-center justify-center">
            <Spin />
          </div>
        ) : moderators.length === 0 && !loading ? (
          <div className="p-8">
            <NoData text={t(T.noData)} />
          </div>
        ) : (
          <Table<UserProfile>
            size="small"
            rowKey="id"
            loading={loading}
            dataSource={moderators}
            columns={columns}
            scroll={{ x: scrollX, y: tableScrollY }}
            pagination={{
              current: currentPage,
              pageSize: PAGE_SIZE,
              total,
              showSizeChanger: false,
              onChange: (page) =>
                setParam('page', page === 1 ? undefined : String(page)),
            }}
            className="permissions-table"
          />
        )}
      </div>
    </div>
  );
};

export default PermissionsPage;
