import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  Home,
  LogOut,
  User,
  Shield,
  ScrollText,
  Layers,
  BookOpen,
  HelpCircle,
  Building2,
  GraduationCap,
  Languages,
  Maximize2,
  Minimize2,
  HeartPulse,
  Trophy,
  Activity,
  KeyRound,
  Library,
  LibraryBig,
  Bot,
  IdCard,
  ArrowDownUp,
  FileSpreadsheet,
  Building,
  BriefcaseBusiness,
  Archive,
  AlertTriangle,
  Bell,
  BadgeCheck,
  ClipboardCheck,
  CalendarDays,
  UserCog,
  Megaphone,
  Zap,
  Menu,
  X,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTranslation } from '@/hooks/useTranslation';
import { fmtHeaderDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Button, Select, Spin } from '@/components/ui';
import { Sidebar, type NavGroup, type NavItem } from './SideBar';
import apiService, {
  resolveAssetUrl,
  type ModeratorPermissions,
  type UserProfile,
} from '@/services/api';
import { cacheModeratorPermissions } from '@/utils/permissions';
import { mergeModeratorPermissions } from '@/utils/moderatorPermissions';
import { can } from '@/utils/can';
import { userActivitySocket } from '@/services/userActivitySocket';
import {
  canShowTelegramBotBrowserNotif,
  readLastUnreadTotal,
  showTelegramBotBrowserNotification,
  writeLastUnreadTotal,
} from '@/utils/telegramBotNotifications';
import { isSuperAdmin } from '@/utils/isSuperAdmin';
import { permissionForPath } from '@/utils/routePermissions';

const G = {
  main: { uz: 'Asosiy', en: 'Main', ru: 'Основное' },
  admin: { uz: 'Boshqaruv', en: 'Administration', ru: 'Администрирование' },
  content: { uz: "O'quv kontenti", en: 'Learning', ru: 'Обучение' },
  people: { uz: 'Xodimlar', en: 'People', ru: 'Персонал' },
  analytics: { uz: 'Analitika', en: 'Analytics', ru: 'Аналитика' },
  account: { uz: 'Hisob', en: 'Account', ru: 'Аккаунт' },
} as const;

const importExportNavItem: NavItem = {
  path: '/dashboard/import-export',
  label: { uz: 'Import / Export', en: 'Import / Export', ru: 'Import / Export' },
  icon: ArrowDownUp,
};

const telegramBotNavItem: NavItem = {
  path: '/dashboard/telegram-bot',
  label: { uz: 'Telegram Bot', en: 'Telegram Bot', ru: 'Telegram Bot' },
  icon: Bot,
};

const navGroups: NavGroup[] = [
  {
    label: G.main,
    items: [
      {
        path: '/dashboard/home',
        label: { uz: 'Bosh sahifa', en: 'Dashboard', ru: 'Главная' },
        icon: Home,
      },
      {
        path: '/dashboard/notifications',
        label: {
          uz: 'Bildirishnomalar',
          en: 'Notifications',
          ru: 'Уведомления',
        },
        icon: Bell,
      },
    ],
  },
  {
    label: G.admin,
    items: [
      {
        path: '/dashboard/moderators',
        label: { uz: 'Moderatorlar', en: 'Moderators', ru: 'Модераторы' },
        icon: Shield,
      },
      {
        path: '/dashboard/approvers',
        label: {
          uz: 'Tasdiqlovchilar',
          en: 'Approvers',
          ru: 'Утверждающие',
        },
        icon: BadgeCheck,
      },
      {
        path: '/dashboard/permissions',
        label: { uz: 'Ruxsatlar', en: 'Permissions', ru: 'Права доступа' },
        icon: KeyRound,
      },
      {
        path: '/dashboard/organizations',
        label: { uz: 'Tashkilotlar', en: 'Organizations', ru: 'Организации' },
        icon: Building2,
      },
      {
        path: '/dashboard/violations',
        label: { uz: 'Qoidabuzarliklar', en: 'Violations', ru: 'Нарушения' },
        icon: Shield,
      },
      {
        path: '/dashboard/logs',
        label: { uz: 'Loglar', en: 'Logs', ru: 'Логи' },
        icon: ScrollText,
      },
      telegramBotNavItem,
      {
        path: '/dashboard/telegram-news',
        label: { uz: 'Telegram News', en: 'Telegram News', ru: 'Telegram News' },
        icon: Megaphone,
      },
    ],
  },
  {
    label: G.content,
    items: [
      {
        path: '/dashboard/levels',
        label: { uz: 'Modullar', en: 'Modules', ru: 'Модули' },
        icon: Layers,
      },
      {
        path: '/dashboard/lessons',
        label: { uz: 'Darslar', en: 'Lessons', ru: 'Уроки' },
        icon: Library,
      },
      {
        path: '/dashboard/audio-library',
        label: { uz: 'Kutubxona', en: 'Library', ru: 'Библиотека' },
        icon: LibraryBig,
      },
      {
        path: '/dashboard/theories',
        label: { uz: 'Nazariyalar', en: 'Theories', ru: 'Теории' },
        icon: BookOpen,
      },
      {
        path: '/dashboard/questions',
        label: { uz: 'Savollar', en: 'Questions', ru: 'Вопросы' },
        icon: HelpCircle,
      },
    ],
  },
  {
    label: G.people,
    items: [
      {
        path: '/dashboard/employees',
        label: { uz: 'Xodimlar', en: 'Employees', ru: 'Сотрудники' },
        icon: GraduationCap,
      },
      {
        path: '/dashboard/approvals',
        label: { uz: 'Tasdiq uchun', en: 'For approval', ru: 'На утверждение' },
        icon: ClipboardCheck,
      },
      {
        path: '/dashboard/departments',
        label: { uz: 'Bo‘limlar', en: 'Departments', ru: 'Отделы' },
        icon: Building,
      },
      {
        path: '/dashboard/positions',
        label: { uz: 'Lavozimlar', en: 'Positions', ru: 'Должности' },
        icon: BriefcaseBusiness,
      },
      {
        path: '/dashboard/nes-sync',
        label: { uz: 'ENERGO ID', en: 'ENERGO ID', ru: 'ENERGO ID' },
        icon: IdCard,
      },
      {
        path: '/dashboard/archive',
        label: { uz: 'Arxiv', en: 'Archive', ru: 'Архив' },
        icon: Archive,
      },
    ],
  },
  {
    label: G.analytics,
    items: [
      {
        path: '/dashboard/analytics',
        label: { uz: 'Analitika', en: 'Analytics', ru: 'Аналитика' },
        icon: Activity,
      },
      {
        path: '/dashboard/reports',
        label: { uz: 'Hisobotlar', en: 'Reports', ru: 'Отчёты' },
        icon: FileSpreadsheet,
      },
      {
        path: '/dashboard/plan-calendar',
        label: { uz: 'Plan kalendari', en: 'Plan calendar', ru: 'Календарь плана' },
        icon: CalendarDays,
      },
      {
        path: '/dashboard/custom-plans',
        label: { uz: 'Custom plans', en: 'Custom plans', ru: 'Custom plans' },
        icon: UserCog,
      },
      {
        path: '/dashboard/hearts-analytics',
        label: { uz: 'Xato javoblar', en: 'Wrong answers', ru: 'Ошибочные ответы' },
        icon: HeartPulse,
      },
      {
        path: '/dashboard/leaderboard',
        label: { uz: 'Reyting', en: 'Leaderboard', ru: 'Рейтинг' },
        icon: Trophy,
      },
      {
        path: '/dashboard/anomaloz',
        label: { uz: 'Anomaloz', en: 'Anomalies', ru: 'Аномалии' },
        icon: AlertTriangle,
      },
    ],
  },
  {
    label: G.account,
    items: [
      {
        path: '/dashboard/profile',
        label: { uz: 'Profil', en: 'Profile', ru: 'Профиль' },
        icon: User,
      },
      {
        path: '/dashboard/ai-assistant',
        label: { uz: 'AI yordamchi', en: 'AI assistant', ru: 'AI помощник' },
        icon: Bot,
      },
    ],
  },
];

const allNavItems: NavItem[] = [
  ...navGroups.flatMap((group) => group.items),
  importExportNavItem,
];

function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'relative inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]',
        className,
      )}
    >
      <Zap className="h-5 w-5" fill="currentColor" strokeWidth={0} />
      <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-breathe rounded-full border-2 border-background bg-accent-400" />
    </span>
  );
}

const Layout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(
    () => typeof document !== 'undefined' && !!document.fullscreenElement
  );
  const { t, lang, setLang } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [me, setMe] = useState<UserProfile | null>(null);
  const [meLoading, setMeLoading] = useState(true);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  /** Moderator ruxsatlari yuklanganda menyuni qayta chizish uchun */
  const [modPerms, setModPerms] = useState<ModeratorPermissions | null>(null);
  const [modPermsReady, setModPermsReady] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      /* brauzer rad etishi mumkin */
    }
  };

  const getCurrentPageTitle = () => {
    const currentItem = allNavItems.find((item) => {
      if (item.path === location.pathname) return true;
      return location.pathname.startsWith(item.path + '/');
    });
    return (
      currentItem?.label || { uz: 'Bosh sahifa', en: 'Home', ru: 'Главная' }
    );
  };

  const getCurrentDate = () => fmtHeaderDate(lang);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  useEffect(() => {
    // Header profile info
    apiService
      .me()
      .then((res) => setMe(res))
      .catch(() => setMe(null))
      .finally(() => setMeLoading(false));
  }, []);

  useEffect(() => {
    if (!me || (me.role !== 'APPROVER' && me.role !== 'SUPERADMIN')) {
      setPendingApprovalsCount(0);
      return;
    }
    let cancelled = false;
    const refresh = () => {
      apiService
        .getPendingSafetyApprovalsCount()
        .then((res) => {
          if (!cancelled) setPendingApprovalsCount(res.total ?? 0);
        })
        .catch(() => {
          if (!cancelled) setPendingApprovalsCount(0);
        });
    };
    refresh();
    const timer = window.setInterval(refresh, 30_000);
    const onChanged = () => refresh();
    window.addEventListener('el-approvals-changed', onChanged);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener('el-approvals-changed', onChanged);
    };
  }, [me?.id, me?.role]);

  // Activity tracking — WebSocket ulanishi (login bo'lgan har bir userda)
  useEffect(() => {
    if (!me) return;
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    userActivitySocket.connect(token);
    return () => {
      userActivitySocket.disconnect();
    };
  }, [me?.id]);

  useEffect(() => {
    if (!me) return;
    if (me.role !== 'MODERATOR') {
      cacheModeratorPermissions(null);
      setModPerms(null);
      setModPermsReady(true);
      return;
    }
    setModPermsReady(false);
    apiService
      .getMyModeratorPermissions()
      .then((res) => {
        const merged = res.permissions
          ? mergeModeratorPermissions(res.permissions)
          : null;
        cacheModeratorPermissions(merged);
        setModPerms(merged);
      })
      .catch(() => {
        cacheModeratorPermissions(null);
        setModPerms(null);
      })
      .finally(() => setModPermsReady(true));
  }, [me]);

  // Telegram bot → brauzer bildirishnomasi (faqat alohida toggle yoqilganda)
  useEffect(() => {
    if (!me) return;
    const allowed =
      isSuperAdmin() || !!modPerms?.telegramBot?.view || can('telegramBot', 'view');
    if (!allowed) return;

    let cancelled = false;
    const tick = async () => {
      if (!canShowTelegramBotBrowserNotif()) return;
      try {
        const rows = await apiService.getTelegramBotChats();
        if (cancelled) return;
        const total = rows.reduce((s, c) => s + (c.unreadCount || 0), 0);
        const prev = readLastUnreadTotal();
        writeLastUnreadTotal(total);
        if (total > prev) {
          const hot = rows
            .filter((c) => c.unreadCount > 0)
            .sort((a, b) => (b.unreadCount || 0) - (a.unreadCount || 0))[0];
          showTelegramBotBrowserNotification(
            'Telegram Bot',
            hot?.lastMessagePreview ||
              hot?.displayName ||
              `Yangi xabar (${total})`,
          );
        }
      } catch {
        /* ruxsat yo‘q yoki offline */
      }
    };

    void tick();
    const id = window.setInterval(() => void tick(), 12000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [me?.id, me?.role, modPerms]);

  useEffect(() => {
    if (meLoading || !me) return;

    // Role USER (xodim) admin panelga kirmaydi - tokenlar saqlanadi,
    // shu domendagi mobile ilovaga o'tkaziladi (qayta login yo'q).
    if (me.role === 'USER' || me.adminAccess === false) {
      window.location.replace('/mobile/learn');
    }
  }, [me, meLoading, navigate]);

  const visibleNavGroups = useMemo((): NavGroup[] => {
    if (!me) return [];

    if (me.role === 'APPROVER') {
      const allowed = new Set([
        '/dashboard/home',
        '/dashboard/notifications',
        '/dashboard/employees',
        '/dashboard/approvals',
        '/dashboard/reports',
        '/dashboard/leaderboard',
        '/dashboard/hearts-analytics',
        '/dashboard/profile',
        '/dashboard/ai-assistant',
      ]);
      return navGroups
        .map((group) => ({
          ...group,
          items: group.items
            .filter((item) => allowed.has(item.path))
            .map((item) =>
              item.path === '/dashboard/approvals'
                ? {
                    ...item,
                    badgeCount: pendingApprovalsCount,
                    badgeTone: 'danger' as const,
                  }
                : item,
            ),
        }))
        .filter((group) => group.items.length > 0);
    }

    if (me.role === 'ACCOUNTING') {
      const allowed = new Set([
        '/dashboard/home',
        '/dashboard/analytics',
        '/dashboard/reports',
        '/dashboard/employees',
        '/dashboard/profile',
      ]);
      return navGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => allowed.has(item.path)),
        }))
        .filter((group) => group.items.length > 0);
    }

    const filterItems = (items: NavItem[]) => {
      if (me.role === 'SUPERADMIN') {
        return items.map((item) =>
          item.path === '/dashboard/approvals'
            ? {
                ...item,
                badgeCount: pendingApprovalsCount,
                badgeTone: 'danger' as const,
              }
            : item,
        );
      }
      if (me.role !== 'MODERATOR') return [];

      const canView = (key: keyof ModeratorPermissions) =>
        !!modPerms?.[key]?.view || can(key, 'view');

      return items.filter((item) => {
        const key = permissionForPath(item.path);
        if (key === 'always') return true;
        if (!key) return false;
        return canView(key);
      });
    };

    return navGroups
      .map((group) => {
        let items = filterItems(group.items);
        const showImport =
          me.role === 'SUPERADMIN' ||
          (me.role === 'MODERATOR' &&
            (!!modPerms?.importExport?.view || can('importExport', 'view')));
        if (showImport && group.label.uz === G.admin.uz) {
          items = [...items, importExportNavItem];
        }
        return { ...group, items };
      })
      .filter((group) => group.items.length > 0);
  }, [me, pendingApprovalsCount, modPerms]);

  const moderatorRouteKey =
    me?.role === 'MODERATOR' ? permissionForPath(location.pathname) : null;
  const isModeratorForbiddenRoute =
    me?.role === 'MODERATOR' &&
    modPermsReady &&
    location.pathname.startsWith('/dashboard') &&
    moderatorRouteKey !== 'always' &&
    (moderatorRouteKey == null ||
      !(
        !!modPerms?.[moderatorRouteKey]?.view ||
        can(moderatorRouteKey, 'view')
      ));

  const isDirectorForbiddenRoute =
    me?.role === 'APPROVER' &&
    !location.pathname.startsWith('/dashboard/employees') &&
    !location.pathname.startsWith('/dashboard/students') &&
    location.pathname !== '/dashboard/home' &&
    location.pathname !== '/dashboard/notifications' &&
    location.pathname !== '/dashboard/approvals' &&
    location.pathname !== '/dashboard/reports' &&
    location.pathname !== '/dashboard/leaderboard' &&
    location.pathname !== '/dashboard/hearts-analytics' &&
    location.pathname !== '/dashboard/profile' &&
    location.pathname !== '/dashboard/ai-assistant';

  const isAccountingForbiddenRoute =
    me?.role === 'ACCOUNTING' &&
    !location.pathname.startsWith('/dashboard/employees') &&
    !location.pathname.startsWith('/dashboard/students') &&
    location.pathname !== '/dashboard/home' &&
    location.pathname !== '/dashboard/analytics' &&
    location.pathname !== '/dashboard/reports' &&
    location.pathname !== '/dashboard/profile';

  useEffect(() => {
    if (meLoading || !me) return;
    if (
      isModeratorForbiddenRoute ||
      isDirectorForbiddenRoute ||
      isAccountingForbiddenRoute
    ) {
      navigate('/dashboard/home');
    }
  }, [
    meLoading,
    me,
    isModeratorForbiddenRoute,
    isDirectorForbiddenRoute,
    isAccountingForbiddenRoute,
    navigate,
  ]);

  const initials = useMemo(() => {
    const first = (me?.firstName || '').trim();
    const last = (me?.lastName || '').trim();
    const a = first ? first[0].toUpperCase() : '';
    const b = last ? last[0].toUpperCase() : '';
    return a + b || 'U';
  }, [me?.firstName, me?.lastName]);

  if (meLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Spin size="large" />
      </div>
    );
  }

  const clearSessionAndLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('token');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('user');
    userActivitySocket.disconnect();
    navigate('/login');
  };

  const sidebarBody = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 pb-6 pt-6">
        <BrandMark />
        <div className="leading-tight">
          <div className="text-[15px] font-semibold tracking-tight text-foreground">
            ElektroLearn
          </div>
          <div className="text-[11px] text-muted-foreground">Admin panel</div>
        </div>
      </div>

      <Sidebar
        navGroups={visibleNavGroups}
        onNavigate={() => setMobileOpen(false)}
      />

      {me ? (
        <div className="m-3 flex items-center gap-3 rounded-2xl border border-border/70 bg-card/70 p-3">
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              navigate('/dashboard/profile');
            }}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-primary ring-1 ring-black/5">
              {me.avatarUrl ? (
                <img
                  src={resolveAssetUrl(me.avatarUrl)}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <span className="select-none text-[11px] font-semibold tracking-wide text-primary-foreground">
                    {initials}
                  </span>
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-[13px] font-semibold text-foreground">
                {`${me.firstName} ${me.lastName}`.trim() || '—'}
              </div>
              <div className="truncate text-[11px] text-muted-foreground">
                {me.role}
              </div>
            </div>
          </button>
          <button
            type="button"
            onClick={clearSessionAndLogout}
            title={t({ uz: 'Chiqish', en: 'Logout', ru: 'Выход' })}
            aria-label={t({ uz: 'Chiqish', en: 'Logout', ru: 'Выход' })}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-rose-600"
          >
            <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </button>
        </div>
      ) : null}
    </div>
  );

  return (
    <div
      data-app-shell="true"
      className="grain min-h-[100dvh] max-w-full overflow-x-clip bg-background"
    >
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] border-r border-border/70 bg-background/80 backdrop-blur-xl lg:block">
        {sidebarBody}
      </aside>

      <AnimatePresence>
        {mobileOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-foreground/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="absolute inset-y-0 left-0 w-[284px] max-w-[86vw] border-r border-border bg-background"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            >
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label={t({ uz: 'Yopish', en: 'Close', ru: 'Закрыть' })}
                className="absolute right-3 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
              {sidebarBody}
            </motion.aside>
          </div>
        ) : null}
      </AnimatePresence>

      <div className="min-w-0 max-w-full lg:pl-[264px]">
        <header className="sticky top-0 z-20 overflow-x-clip border-b border-border/60 bg-background/75 backdrop-blur-xl">
          <div className="flex h-14 w-full min-w-0 items-center justify-between gap-2 px-4 md:gap-3 md:px-6 lg:px-8">
            <div className="flex min-w-0 flex-1 items-center gap-2 lg:hidden">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                aria-label={t({ uz: 'Menyu', en: 'Menu', ru: 'Меню' })}
              >
                <Menu className="h-6 w-6" />
              </button>
              <BrandMark className="h-8 w-8 shrink-0" />
              <span className="hidden truncate font-semibold tracking-tight min-[380px]:inline">
                ElektroLearn
              </span>
            </div>

            <div className="hidden min-w-0 flex-1 overflow-hidden lg:block">
              <div className="truncate text-[13px] font-medium text-foreground">
                {t(getCurrentPageTitle())}
              </div>
              <div className="truncate text-[12px] text-muted-foreground">
                {getCurrentDate()}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="default"
                size="middle"
                variant="ghost"
                className="h-9 w-9 rounded-xl px-0"
                onClick={toggleFullscreen}
                title={t({
                  uz: isFullscreen ? 'To‘liq ekrandan chiqish' : 'To‘liq ekran',
                  en: isFullscreen ? 'Exit fullscreen' : 'Fullscreen',
                  ru: isFullscreen
                    ? 'Выйти из полноэкранного режима'
                    : 'Полный экран',
                })}
                aria-label={t({
                  uz: isFullscreen ? 'To‘liq ekrandan chiqish' : 'To‘liq ekran',
                  en: isFullscreen ? 'Exit fullscreen' : 'Fullscreen',
                  ru: isFullscreen
                    ? 'Выйти из полноэкранного режима'
                    : 'Полный экран',
                })}
                icon={
                  isFullscreen ? (
                    <Minimize2 size={15} strokeWidth={1.75} />
                  ) : (
                    <Maximize2 size={15} strokeWidth={1.75} />
                  )
                }
              />
              <ThemeToggle />
              <Select
                value={lang}
                className="w-[100px] sm:w-[120px]"
                size="middle"
                prefix={<Languages size={14} />}
                onChange={(value) => setLang(value as typeof lang)}
                options={[
                  { value: 'en', label: 'English' },
                  { value: 'ru', label: 'Русский' },
                  { value: 'uz', label: "O'zbekcha" },
                  { value: 'uz-cyrl', label: 'Ўзбекча' },
                ]}
              />
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100dvh-3.5rem)] w-full min-w-0 max-w-full overflow-x-clip px-4 py-6 md:px-6 md:py-8 lg:px-8">
          {me?.role !== 'USER' &&
          !isModeratorForbiddenRoute &&
          !isDirectorForbiddenRoute &&
          !isAccountingForbiddenRoute ? (
            <Outlet />
          ) : null}
        </main>
      </div>
    </div>
  );
};

export default Layout;
