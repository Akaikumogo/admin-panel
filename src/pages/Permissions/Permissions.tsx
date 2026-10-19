import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Input,
  message,
  Select,
  Spin,
  Switch,
  Tag,
} from '@/components/ui';
import { Mail, Search, Star } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useQueryParams } from '@/hooks/useQueryParams';
import { useFetch, usePaginatedFetch } from '@/hooks/useFetch';
import HighlightText from '@/components/HighlightText';
import NoData from '@/components/NoData';
import { AvatarPreview } from '@/components/AvatarPreview';
import { PageHeader } from '@/components/PageHeader';
import apiService, { resolveAssetUrl } from '@/services/api';
import type {
  CrudPermissions,
  ModeratorPermissions,
  Organization,
  UserProfile,
} from '@/services/api';
import { mergeModeratorPermissions } from '@/utils/moderatorPermissions';
import { cn } from '@/lib/utils';

const T = {
  title: { uz: 'Ruxsatlar', en: 'Permissions', ru: 'Права доступа' },
  subtitle: {
    uz: 'Moderator tanlang — modul bo‘yicha ko‘rish / yaratish / yangilash / o‘chirish',
    en: 'Pick a moderator — view / create / update / delete per module',
    ru: 'Выберите модератора — просмотр / создание / изменение / удаление',
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
  pick: {
    uz: 'Chapdan moderator tanlang',
    en: 'Select a moderator on the left',
    ru: 'Выберите модератора слева',
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
  dirty: { uz: 'Saqlanmagan', en: 'Unsaved', ru: 'Не сохранено' },
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
  { key: 'violations', label: { uz: 'Qoidabuzarliklar', en: 'Violations', ru: 'Нарушения' } },
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
  {
    key: 'telegramBot',
    label: {
      uz: 'Telegram bot',
      en: 'Telegram bot',
      ru: 'Telegram бот',
    },
  },
];

const CRUD_ORDER: (keyof CrudPermissions)[] = [
  'view',
  'create',
  'update',
  'delete',
];
const PAGE_SIZE = 20;

const QP_DEFAULTS = { search: undefined, orgId: undefined, page: undefined } as const;

const PermissionsPage = () => {
  const { t } = useTranslation();
  const { params: qp, setParam, setParams } =
    useQueryParams<typeof QP_DEFAULTS>(QP_DEFAULTS);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const currentPage = qp.page ? parseInt(qp.page, 10) : 1;
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
      setSelectedId(null);
      return;
    }
    setSelectedId((prev) =>
      prev && moderators.some((m) => m.id === prev) ? prev : moderators[0].id,
    );
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
          next[r.id] = r.permissions
            ? mergeModeratorPermissions(r.permissions)
            : undefined;
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
              view: false,
              create: false,
              update: false,
              delete: false,
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
        next[m.key] = {
          view: value,
          create: value,
          update: value,
          delete: value,
        };
      }
      return { ...prev, [userId]: next };
    });
    setDirtyIds((prev) => new Set(prev).add(userId));
  }, []);

  const setModuleAll = useCallback(
    (userId: string, moduleKey: keyof ModeratorPermissions, value: boolean) => {
      setPermMap((prev) => {
        const cur = prev[userId];
        if (!cur) return prev;
        return {
          ...prev,
          [userId]: {
            ...cur,
            [moduleKey]: {
              view: value,
              create: value,
              update: value,
              delete: value,
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

  const crudLabel = (k: keyof CrudPermissions) => {
    if (k === 'view') return t(T.view);
    if (k === 'create') return t(T.create);
    if (k === 'update') return t(T.update);
    return t(T.delete);
  };

  const selected = useMemo(
    () => moderators.find((m) => m.id === selectedId) ?? null,
    [moderators, selectedId],
  );
  const selectedPerms = selectedId ? permMap[selectedId] : undefined;
  const isDirty = selectedId ? dirtyIds.has(selectedId) : false;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="page-stack min-w-0 max-w-full">
      <PageHeader title={t(T.title)} description={t(T.subtitle)} />

      <div className="surface grid min-h-[560px] min-w-0 overflow-hidden lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
        {/* Moderator list */}
        <aside className="flex min-h-0 flex-col border-b border-border/80 lg:border-b-0 lg:border-r">
          <div className="space-y-2 border-b border-border/80 p-3 md:p-4">
            <Input
              allowClear
              defaultValue={qp.search}
              prefix={<Search size={14} className="text-muted-foreground" />}
              placeholder={t(T.search)}
              className="h-9"
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            <Select
              allowClear
              showSearch
              placeholder={t(T.organization)}
              value={qp.orgId}
              onChange={handleOrgChange}
              optionFilterProp="label"
              className="w-full"
              options={organizations.map((o) => ({
                value: o.id,
                label: o.name,
              }))}
            />
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                {t(T.total)}: {total}
              </span>
              <Button size="small" variant="ghost" onClick={() => refetch()}>
                {t({ uz: 'Yangilash', en: 'Refresh', ru: 'Обновить' })}
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {initialLoading ? (
              <div className="flex h-40 items-center justify-center">
                <Spin />
              </div>
            ) : moderators.length === 0 ? (
              <NoData text={t(T.noData)} />
            ) : (
              <ul className="divide-y divide-border/60">
                {moderators.map((mod) => {
                  const active = mod.id === selectedId;
                  const dirty = dirtyIds.has(mod.id);
                  return (
                    <li key={mod.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(mod.id)}
                        className={cn(
                          'flex w-full items-start gap-3 px-3 py-3 text-left transition-colors md:px-4',
                          active
                            ? 'bg-accent text-accent-foreground'
                            : 'hover:bg-muted/60',
                        )}
                      >
                        <AvatarPreview
                          src={
                            mod.avatarUrl
                              ? resolveAssetUrl(mod.avatarUrl)
                              : null
                          }
                          name={`${mod.firstName ?? ''} ${mod.lastName ?? ''}`.trim()}
                          initials={
                            (mod.firstName?.[0] || '') +
                            (mod.lastName?.[0] || '')
                          }
                          size={36}
                          avatarClassName="bg-zinc-700 text-zinc-100"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-[13px] font-medium tracking-tight">
                              <HighlightText
                                text={`${mod.firstName} ${mod.lastName}`}
                                highlight={qp.search}
                              />
                            </span>
                            {mod.organizations?.some((o) => o.isDefault) ? (
                              <Star
                                size={12}
                                className="shrink-0 fill-amber-400 text-amber-500"
                              />
                            ) : null}
                            {dirty ? (
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                            ) : null}
                          </span>
                          <span className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                            <Mail size={10} className="shrink-0" />
                            <HighlightText
                              text={mod.email}
                              highlight={qp.search}
                            />
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between gap-2 border-t border-border/80 px-3 py-2">
              <Button
                size="small"
                variant="ghost"
                disabled={currentPage <= 1 || loading}
                onClick={() =>
                  setParam(
                    'page',
                    currentPage - 1 <= 1 ? undefined : String(currentPage - 1),
                  )
                }
              >
                ←
              </Button>
              <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                {currentPage} / {totalPages}
              </span>
              <Button
                size="small"
                variant="ghost"
                disabled={currentPage >= totalPages || loading}
                onClick={() => setParam('page', String(currentPage + 1))}
              >
                →
              </Button>
            </div>
          ) : null}
        </aside>

        {/* Permission editor */}
        <section className="flex min-h-0 min-w-0 flex-col">
          {!selected ? (
            <div className="flex flex-1 items-center justify-center p-8">
              <p className="text-sm text-muted-foreground">{t(T.pick)}</p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3 border-b border-border/80 px-4 py-3 md:px-5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold tracking-tight text-foreground">
                    {selected.firstName} {selected.lastName}
                  </p>
                  <p className="truncate text-[12px] text-muted-foreground">
                    {selected.organizations?.map((o) => o.name).join(', ') ||
                      '—'}
                  </p>
                </div>
                {isDirty ? (
                  <Tag color="warning" className="!m-0 text-[10px]">
                    {t(T.dirty)}
                  </Tag>
                ) : null}
                <Button
                  size="small"
                  variant="ghost"
                  onClick={() => setAllForUser(selected.id, true)}
                >
                  {t(T.selectAll)}
                </Button>
                <Button
                  size="small"
                  variant="ghost"
                  onClick={() => setAllForUser(selected.id, false)}
                >
                  {t(T.clearAll)}
                </Button>
                <Button
                  type="primary"
                  size="small"
                  loading={savingId === selected.id}
                  disabled={!isDirty}
                  onClick={() => void saveRow(selected.id)}
                >
                  {t(T.save)}
                </Button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5">
                {permLoading || !selectedPerms ? (
                  <div className="flex h-40 items-center justify-center">
                    <Spin />
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {MODULES.map((mod) => {
                      const row = selectedPerms[mod.key];
                      const allOn = CRUD_ORDER.every((c) => !!row?.[c]);
                      return (
                        <div
                          key={String(mod.key)}
                          className="rounded-xl border border-border/80 bg-background/40 px-3 py-3"
                        >
                          <div className="mb-2.5 flex items-center justify-between gap-2">
                            <p className="truncate text-[13px] font-medium tracking-tight text-foreground">
                              {t(mod.label)}
                            </p>
                            <button
                              type="button"
                              className="text-[11px] font-medium text-muted-foreground hover:text-primary"
                              onClick={() =>
                                setModuleAll(selected.id, mod.key, !allOn)
                              }
                            >
                              {allOn ? t(T.clearAll) : t(T.selectAll)}
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                            {CRUD_ORDER.map((crud) => (
                              <label
                                key={crud}
                                className="flex cursor-pointer items-center justify-between gap-2"
                              >
                                <span className="text-[12px] text-muted-foreground">
                                  {crudLabel(crud)}
                                </span>
                                <Switch
                                  size="small"
                                  checked={!!row?.[crud]}
                                  onChange={(v) =>
                                    setCrud(selected.id, mod.key, crud, v)
                                  }
                                />
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default PermissionsPage;
