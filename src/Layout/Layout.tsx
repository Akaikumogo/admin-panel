import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTranslation } from '@/hooks/useTranslation';
import { fmtHeaderDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Button, Select, Spin } from '@/components/ui';
import { Sidebar, type NavGroup, type NavItem } from './SideBar';
import apiService, { resolveAssetUrl, type UserProfile } from '@/services/api';
import { cacheModeratorPermissions } from '@/utils/permissions';
import { can } from '@/utils/can';
import { userActivitySocket } from '@/services/userActivitySocket';

const G = {
  main: { uz: 'Asosiy', en: 'Main', ru: 'Основное' },
  admin: { uz: 'Boshqaruv', en: 'Administration', ru: 'Администрирование' },
  content: { uz: "O'quv kontenti", en: 'Learning', ru: 'Обучение' },
  people: { uz: 'Xodimlar', en: 'People', ru: 'Персонал' },
  analytics: { uz: 'Analitika', en: 'Analytics', ru: 'Аналитика' },
  account: { uz: 'Hisob', en: 'Account', ru: 'Аккаунт' },
} as const;

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

const allNavItems: NavItem[] = navGroups.flatMap((group) => group.items);

const importExportNavItem: NavItem = {
  path: '/dashboard/import-export',
  label: { uz: 'Import / Export', en: 'Import / Export', ru: 'Import / Export' },
  icon: ArrowDownUp,
};

const Layout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(
    () => typeof document !== 'undefined' && !!document.fullscreenElement
  );
  const { t, lang, setLang } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [me, setMe] = useState<UserProfile | null>(null);
  const [meLoading, setMeLoading] = useState(true);

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

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
      return;
    }
    apiService
      .getMyModeratorPermissions()
      .then((res) => cacheModeratorPermissions(res.permissions))
      .catch(() => cacheModeratorPermissions(null));
  }, [me]);

  useEffect(() => {
    if (meLoading || !me) return;

    // Role USER (xodim) admin panelga kirmaydi.
    if (me.role === 'USER') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('user');
      navigate('/login');
    }
  }, [me, meLoading, navigate]);

  const visibleNavGroups = useMemo((): NavGroup[] => {
    if (!me) return [];

    if (me.role === 'APPROVER') {
      const allowed = new Set([
        '/dashboard/home',
        '/dashboard/notifications',
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
      if (me.role === 'SUPERADMIN') return items;
      if (me.role !== 'MODERATOR') return [];

      const hasAudioPerm =
        can('audioLibrary', 'create') ||
        can('audioLibrary', 'update') ||
        can('audioLibrary', 'delete');
      const hasNesSyncPerm = can('nesSync', 'view');

      return items.filter(
        (item) =>
          item.path !== '/dashboard/moderators' &&
          item.path !== '/dashboard/approvers' &&
          item.path !== '/dashboard/violations' &&
          item.path !== '/dashboard/permissions' &&
          item.path !== '/dashboard/exam-analysis' &&
          item.path !== '/dashboard/anomaloz' &&
          (hasNesSyncPerm || item.path !== '/dashboard/nes-sync') &&
          (hasAudioPerm || item.path !== '/dashboard/audio-library'),
      );
    };

    return navGroups
      .map((group) => {
        let items = filterItems(group.items);
        if (me.role === 'SUPERADMIN' && group.label.uz === G.admin.uz) {
          items = [...items, importExportNavItem];
        }
        return { ...group, items };
      })
      .filter((group) => group.items.length > 0);
  }, [me]);

  const isModeratorForbiddenRoute =
    me?.role === 'MODERATOR' &&
    (location.pathname === '/dashboard/moderators' ||
      location.pathname === '/dashboard/approvers' ||
      location.pathname === '/dashboard/permissions' ||
      location.pathname === '/dashboard/import-export' ||
      location.pathname === '/dashboard/anomaloz' ||
      (location.pathname === '/dashboard/nes-sync' && !can('nesSync', 'view')) ||
      location.pathname === '/dashboard/exam-analysis' ||
      (location.pathname === '/dashboard/audio-library' &&
        !(
          can('audioLibrary', 'create') ||
          can('audioLibrary', 'update') ||
          can('audioLibrary', 'delete')
        )));

  const isDirectorForbiddenRoute =
    me?.role === 'APPROVER' &&
    !location.pathname.startsWith('/dashboard/employees') &&
    !location.pathname.startsWith('/dashboard/students') &&
    location.pathname !== '/dashboard/home' &&
    location.pathname !== '/dashboard/notifications' &&
    location.pathname !== '/dashboard/profile';

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

  return (
    <div
      data-app-shell="true"
      className="flex h-dvh max-w-[100vw] overflow-hidden bg-background"
    >
      <aside
        className={cn(
          'z-30 flex h-full shrink-0 flex-col border-r border-border bg-[var(--shell-sidebar)] transition-[width] duration-300 ease-out',
          isCollapsed ? 'w-[72px]' : 'w-[272px]',
        )}
      >
        <div className="flex h-14 shrink-0 items-center border-b border-border px-3">
          <button
            type="button"
            onClick={toggleSidebar}
            className={cn(
              'flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors',
              'hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isCollapsed && 'justify-center px-0',
            )}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground font-semibold tracking-tight">
              EL
            </span>
            {!isCollapsed && (
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-semibold tracking-tight text-foreground">
                  Elektrolearn
                </span>
                <span className="block text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Admin
                </span>
              </span>
            )}
          </button>
        </div>

        <Sidebar navGroups={visibleNavGroups} isCollapsed={isCollapsed} />

        <div className="shrink-0 border-t border-border p-3">
          <button
            type="button"
            onClick={clearSessionAndLogout}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors',
              'hover:bg-muted hover:text-foreground active:scale-[0.98]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isCollapsed && 'justify-center px-2',
            )}
          >
            <LogOut size={18} strokeWidth={1.75} />
            {!isCollapsed && (
              <span>
                {t({ uz: 'Chiqish', en: 'Logout', ru: 'Выход' })}
              </span>
            )}
          </button>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-card/90 px-5 backdrop-blur-md supports-[backdrop-filter]:bg-card/75">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight text-foreground">
              {t(getCurrentPageTitle())}
            </h1>
            <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
              {getCurrentDate()}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="default"
              size="middle"
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
              className="w-[132px]"
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
            <button
              type="button"
              onClick={() => navigate('/dashboard/profile')}
              className={cn(
                'flex items-center gap-2.5 rounded-md border border-border bg-background px-2 py-1 transition-colors',
                'hover:bg-muted/80 active:scale-[0.98]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              )}
            >
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium leading-tight text-foreground">
                  {me ? `${me.firstName} ${me.lastName}` : '—'}
                </p>
                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  {me?.role || ''}
                </p>
              </div>
              <div className="h-8 w-8 shrink-0 overflow-hidden rounded-md bg-primary">
                {me?.avatarUrl ? (
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
            </button>
          </div>
        </header>

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-background">
          <div className="w-full min-w-0 max-w-full p-2 md:p-2">
            {me?.role !== 'USER' &&
            !isModeratorForbiddenRoute &&
            !isDirectorForbiddenRoute &&
            !isAccountingForbiddenRoute ? (
              <Outlet />
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
