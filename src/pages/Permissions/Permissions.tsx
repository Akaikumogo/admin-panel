import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Avatar,
  Button,
  Input,
  message,
  Spin,
  Switch,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Filter, Mail, Search } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useQueryParams } from '@/hooks/useQueryParams';
import { usePaginatedFetch } from '@/hooks/useFetch';
import HighlightText from '@/components/HighlightText';
import NoData from '@/components/NoData';
import apiService, { BACKEND_ORIGIN } from '@/services/api';
import type {
  CrudPermissions,
  ModeratorPermissions,
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
  create: { uz: 'Yaratish', en: 'Create', ru: 'Созд.' },
  update: { uz: 'Yangilash', en: 'Update', ru: 'Изм.' },
  delete: { uz: 'O‘chirish', en: 'Delete', ru: 'Удал.' },
} as const;

const MODULES: {
  key: keyof ModeratorPermissions;
  label: { uz: string; en: string; ru: string };
}[] = [
  { key: 'contentLevels', label: { uz: 'Modullar', en: 'Levels', ru: 'Модули' } },
  { key: 'contentTheories', label: { uz: 'Nazariyalar', en: 'Theories', ru: 'Теории' } },
  { key: 'contentQuestions', label: { uz: 'Savollar', en: 'Questions', ru: 'Вопросы' } },
  { key: 'organizations', label: { uz: 'Tashkilotlar', en: 'Orgs', ru: 'Орг.' } },
  { key: 'students', label: { uz: 'Talabalar', en: 'Students', ru: 'Студ.' } },
  { key: 'users', label: { uz: 'Foydalanuvchilar', en: 'Users', ru: 'Польз.' } },
  { key: 'moderators', label: { uz: 'Moderatorlar', en: 'Mods', ru: 'Мод.' } },
  { key: 'profile', label: { uz: 'Profil', en: 'Profile', ru: 'Профиль' } },
  { key: 'exams', label: { uz: 'Imtihonlar', en: 'Exams', ru: 'Экзамены' } },
  { key: 'audioLibrary', label: { uz: 'Audio kutubxona', en: 'Audio library', ru: 'Аудиотека' } },
];

const CRUD_ORDER: (keyof CrudPermissions)[] = ['create', 'update', 'delete'];

const QP_DEFAULTS = { search: undefined } as const;

const PermissionsPage = () => {
  const { t } = useTranslation();
  const { params: qp, setParam } =
    useQueryParams<typeof QP_DEFAULTS>(QP_DEFAULTS);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const {
    data: moderators,
    total,
    loading,
    initialLoading,
    refetch,
  } = usePaginatedFetch(['moderators', qp.search], () =>
    apiService.getModerators({ search: qp.search || undefined }),
  );

  const [permMap, setPermMap] = useState<
    Record<string, ModeratorPermissions | undefined>
  >({});
  const [permLoading, setPermLoading] = useState(false);
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(() => new Set());
  const [savingId, setSavingId] = useState<string | null>(null);

  const handleSearchChange = (value: string) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setParam('search', value || undefined);
    }, 400);
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

  const columns: ColumnsType<UserProfile> = useMemo(() => {
    const actionTitle = (k: keyof CrudPermissions) => {
      if (k === 'create') return t(T.create);
      if (k === 'update') return t(T.update);
      return t(T.delete);
    };

    const userCol: ColumnsType<UserProfile>[0] = {
      title: t({ uz: 'Foydalanuvchi', en: 'User', ru: 'Пользователь' }),
      key: 'user',
      fixed: 'left',
      width: 240,
      render: (_, mod) => (
        <div className="flex items-center gap-3 min-w-0">
          <Avatar
            size={40}
            src={
              mod.avatarUrl ? `${BACKEND_ORIGIN}${mod.avatarUrl}` : undefined
            }
            className="flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-700"
          >
            {(mod.firstName?.[0] || '') + (mod.lastName?.[0] || '')}
          </Avatar>
          <div className="min-w-0">
            <div className="font-medium text-slate-900 dark:text-white truncate">
              <HighlightText
                text={`${mod.firstName} ${mod.lastName}`}
                highlight={qp.search}
              />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
              <Mail size={10} className="flex-shrink-0" />
              <HighlightText text={mod.email} highlight={qp.search} />
            </div>
            <Tag color="blue" className="mt-1 text-[10px]">
              MODERATOR
            </Tag>
          </div>
        </div>
      ),
    };

    const moduleGroups = MODULES.map((mod) => ({
      title: t(mod.label),
      align: 'center' as const,
      children: CRUD_ORDER.map((crud) => ({
        title: actionTitle(crud),
        key: `${String(mod.key)}-${crud}`,
        width: 72,
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
      width: 100,
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
    saveRow,
    permMap,
  ]);

  const scrollX = 240 + MODULES.length * CRUD_ORDER.length * 72 + 100;

  return (
    <div className="p-6 space-y-4 overflow-hidden h-[calc(100vh-100px)] flex flex-col">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          {t(T.title)}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t(T.subtitle)}</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap bg-white dark:bg-[#141414] border border-slate-200 dark:border-slate-700/60 rounded-lg px-4 py-3 flex-shrink-0">
        <Filter size={16} className="text-slate-400" />
        <Input
          allowClear
          defaultValue={qp.search}
          prefix={<Search size={14} className="text-slate-400" />}
          placeholder={t(T.search)}
          style={{ width: 240 }}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
        <Tag className="text-xs">
          {t(T.total)}: {total}
        </Tag>
        <Button size="small" onClick={() => refetch()}>
          {t({ uz: 'Yangilash', en: 'Refresh', ru: 'Обновить' })}
        </Button>
      </div>

      <div className="flex-1 min-h-0 bg-white dark:bg-[#141414] border border-slate-200 dark:border-slate-700/60 rounded-lg overflow-hidden">
        {initialLoading ? (
          <div className="flex items-center justify-center h-48">
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
            pagination={false}
            dataSource={moderators}
            columns={columns}
            scroll={{ x: scrollX, y: 'calc(100vh - 320px)' }}
            className="permissions-table"
          />
        )}
      </div>
    </div>
  );
};

export default PermissionsPage;
