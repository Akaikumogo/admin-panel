import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Home,
  LogOut,
  Zap,
  User,
  Shield,
  ScrollText,
  Layers,
  BookOpen,
  HelpCircle,
  Building2,
  Users,
  GraduationCap,
  Languages,
  Maximize2,
  Minimize2,
  HeartPulse,
  Trophy,
  QrCode,
  ClipboardList,
  CalendarClock,
  BriefcaseBusiness,
  Trash2,
  KeyRound,
  BarChart2
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTranslation } from '@/hooks/useTranslation';
import { latinTextToCyrillic } from '@/utils/latinToCyrillic';
import { Button, Select, Spin } from 'antd';
import { Sidebar } from './SideBar';
import apiService, { BACKEND_ORIGIN, type UserProfile } from '@/services/api';
import { cacheModeratorPermissions } from '@/utils/permissions';

const navItems = [
  {
    path: '/dashboard/home',
    label: { uz: 'Bosh sahifa', en: 'Dashboard', ru: 'Главная' },
    icon: Home
  },
  {
    path: '/dashboard/moderators',
    label: { uz: 'Moderatorlar', en: 'Moderators', ru: 'Модераторы' },
    icon: Shield
  },
  {
    path: '/dashboard/permissions',
    label: { uz: 'Ruxsatlar', en: 'Permissions', ru: 'Права доступа' },
    icon: KeyRound
  },
  {
    path: '/dashboard/levels',
    label: { uz: 'Modullar', en: 'Modules', ru: 'Модули' },
    icon: Layers
  },
  {
    path: '/dashboard/theories',
    label: { uz: 'Nazariyalar', en: 'Theories', ru: 'Теории' },
    icon: BookOpen
  },
  {
    path: '/dashboard/questions',
    label: { uz: 'Savollar', en: 'Questions', ru: 'Вопросы' },
    icon: HelpCircle
  },
  {
    path: '/dashboard/organizations',
    label: { uz: 'Tashkilotlar', en: 'Organizations', ru: 'Организации' },
    icon: Building2
  },
  {
    path: '/dashboard/students',
    label: { uz: 'Talabalar', en: 'Students', ru: 'Студенты' },
    icon: GraduationCap
  },
  {
    path: '/dashboard/users',
    label: { uz: 'Foydalanuvchilar', en: 'Users', ru: 'Пользователи' },
    icon: Users
  },
  {
    path: '/dashboard/profile',
    label: { uz: 'Profil', en: 'Profile', ru: 'Профиль' },
    icon: User
  },
  {
    path: '/dashboard/hearts-analytics',
    label: { uz: 'Yurak yo‘qotish', en: 'Hearts lost', ru: 'Потеря сердец' },
    icon: HeartPulse,
  },
  {
    path: '/dashboard/leaderboard',
    label: { uz: 'Reyting', en: 'Leaderboard', ru: 'Рейтинг' },
    icon: Trophy
  },
  {
    path: '/dashboard/qr-scan',
    label: { uz: 'QR scan', en: 'QR scan', ru: 'QR scan' },
    icon: QrCode
  },
  {
    path: '/dashboard/violations',
    label: { uz: 'Qoidabuzarliklar', en: 'Violations', ru: 'Нарушения' },
    icon: Shield
  },
  {
    path: '/dashboard/logs',
    label: { uz: 'Loglar', en: 'Logs', ru: 'Логи' },
    icon: ScrollText
  },
  {
    path: '/dashboard/exams',
    label: { uz: 'Imtihonlar', en: 'Exams', ru: 'Экзамены' },
    icon: ClipboardList
  },
  {
    path: '/dashboard/exam-schedule',
    label: { uz: 'Imtihon belgilash', en: 'Scheduling', ru: 'Назначение' },
    icon: CalendarClock
  },
  {
    path: '/dashboard/exam-questions',
    label: { uz: 'Imtihon savollari', en: 'Exam questions', ru: 'Вопросы' },
    icon: HelpCircle
  },
  {
    path: '/dashboard/exam-analysis',
    label: { uz: 'Imtihon tahlili', en: 'Exam analytics', ru: 'Анализ экзаменов' },
    icon: BarChart2
  },
  {
    path: '/dashboard/positions',
    label: { uz: 'Lavozimlar', en: 'Positions', ru: 'Должности' },
    icon: BriefcaseBusiness
  },
  {
    path: '/dashboard/basket',
    label: { uz: 'Korzinka', en: 'Basket', ru: 'Корзина' },
    icon: Trash2
  }
];

const Layout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(
    () => typeof document !== 'undefined' && !!document.fullscreenElement,
  );
  const { t, lang, setLang } = useTranslation();
  const colorFrom = '#3B82F6';
  const colorTo = '#0a36ad';
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
    const currentItem = navItems.find((item) => {
      if (item.path === location.pathname) return true;
      return location.pathname.startsWith(item.path + '/');
    });
    return (
      currentItem?.label || { uz: 'Bosh sahifa', en: 'Home', ru: 'Главная' }
    );
  };

  const getCurrentDate = () => {
    const now = new Date();
    const day = now.getDate();
    const year = now.getFullYear();

    if (lang === 'en') {
      return now.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    }
    if (lang === 'ru') {
      return now.toLocaleDateString('ru-RU', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    }

    const uzWeekdays = [
      'Yakshanba',
      'Dushanba',
      'Seshanba',
      'Chorshanba',
      'Payshanba',
      'Juma',
      'Shanba'
    ];
    const uzMonths = [
      'yanvar',
      'fevral',
      'mart',
      'aprel',
      'may',
      'iyun',
      'iyul',
      'avgust',
      'sentabr',
      'oktabr',
      'noyabr',
      'dekabr'
    ];
    const weekday = uzWeekdays[now.getDay()];
    const month = uzMonths[now.getMonth()];

    if (lang === 'uz-cyrl') {
      return latinTextToCyrillic(`${weekday}, ${day} ${month}, ${year}`);
    }
    return `${weekday}, ${day} ${month}, ${year}`;
  };

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

    // Role USER (student) admin panelga kirmaydi.
    if (me.role === 'USER') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('user');
      navigate('/login');
    }
  }, [me, meLoading, navigate]);

  const visibleNavItems = useMemo(() => {
    if (!me) return [];
    if (me.role === 'SUPERADMIN') return navItems;
    if (me.role === 'MODERATOR') {
      return navItems.filter(
        (item) =>
          item.path !== '/dashboard/moderators' &&
          item.path !== '/dashboard/users' &&
          item.path !== '/dashboard/violations' &&
          item.path !== '/dashboard/permissions' &&
          item.path !== '/dashboard/exam-analysis',
      );
    }
    return [];
  }, [me]);

  const isModeratorForbiddenRoute =
    me?.role === 'MODERATOR' &&
    (location.pathname === '/dashboard/moderators' ||
      location.pathname === '/dashboard/users' ||
      location.pathname === '/dashboard/permissions' ||
      location.pathname === '/dashboard/exam-analysis');

  useEffect(() => {
    if (meLoading || !me) return;
    // Moderatorlar uchun /dashboard/moderators va /dashboard/users yo'q.
    if (isModeratorForbiddenRoute) {
      navigate('/dashboard/home');
    }
  }, [meLoading, me, isModeratorForbiddenRoute, navigate]);

  const initials = useMemo(() => {
    const first = (me?.firstName || '').trim();
    const last = (me?.lastName || '').trim();
    const a = first ? first[0].toUpperCase() : '';
    const b = last ? last[0].toUpperCase() : '';
    return a + b || 'U';
  }, [me?.firstName, me?.lastName]);

  if (meLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCF9] dark:bg-[#1B1C1D]">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="min-h-screen bg-[#FDFCF9] dark:bg-[#1B1C1D] transition-colors duration-300">
        <div className="flex min-h-screen w-screen">
          {/* Sidebar */}
          <aside
            style={{ width: isCollapsed ? 100 : 340 }}
            className="row-span-2 w-full h-screen max-h-screen shrink-0 flex flex-col overflow-hidden bg-white/80 dark:bg-[#121314]/80 backdrop-blur-sm border-r border-slate-200/80 dark:border-slate-700/60 transition-all duration-300"
          >
            <div className="flex flex-col h-full min-h-0 w-full">
              {/* Logo */}
              <div className="h-18 w-full shrink-0 flex items-center justify-center px-6 border-b border-slate-200/80 dark:border-slate-700/60">
                <AnimatePresence mode="popLayout">
                  <div className="w-full flex items-center justify-start">
                    <motion.div
                      key="expanded-logo"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center gap-3 cursor-pointer"
                      onClick={toggleSidebar}
                      layout
                    >
                      <motion.div
                        layoutId="c"
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{
                          background: `linear-gradient(135deg, ${colorFrom}, ${colorTo})`
                        }}
                      >
                        <motion.span className="text-white dark:text-slate-900 font-bold text-lg">
                          <Zap
                            color="#DBEAFE"
                            className="font-extrabold text-2xl "
                          />
                        </motion.span>
                      </motion.div>
                      {!isCollapsed && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ duration: 0.6 }}
                          className="flex flex-col overflow-auto"
                        >
                          <h1 className="min-w-[200px] font-bold text-lg text-slate-900 dark:text-white">
                            Elektrolearn
                          </h1>
                          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Admin Panel
                          </p>
                        </motion.div>
                      )}
                    </motion.div>
                  </div>
                </AnimatePresence>
              </div>

              {/* Navigation */}
              <Sidebar
                navItems={visibleNavItems}
                isCollapsed={isCollapsed}
                themeColors={{ colorFrom, colorTo }}
              />

              {/* Logout */}
              <div className="p-4 min-h-[50px] shrink-0">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-black/45">
                  <button
                    onClick={() => {
                      localStorage.removeItem('token');
                      localStorage.removeItem('isLoggedIn');
                      localStorage.removeItem('user');
                      navigate('/login');
                    }}
                    style={{
                      justifyContent: isCollapsed ? 'center' : 'flex-start'
                    }}
                    className="flex items-center gap-2 text-sm font-semibold transition-colors duration-200 w-full"
                  >
                    <LogOut size={20} className="dark:text-slate-300" />
                    {!isCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2 }}
                        className="font-medium whitespace-nowrap overflow-hidden z-10 dark:text-slate-300 text-slate-600"
                      >
                        {t({
                          uz: 'Chiqish',
                          en: 'Logout',
                          ru: 'Выход'
                        })}
                      </motion.span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </aside>

          <div className="w-full">
            {/* Header */}
            <header
              className="h-18 bg-white/80 dark:bg-[#121314]/80 backdrop-blur-sm border-b border-slate-200/80 dark:border-slate-700/60"
              style={{
                transition: 'margin-left 0.3s ease-in-out'
              }}
            >
              <div className="flex items-center justify-between px-8 h-full">
                {/* Left Section */}
                <div className="flex items-center gap-6 min-w-0">
                  <div className="min-w-0">
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white truncate">
                      {t(getCurrentPageTitle())}
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {getCurrentDate()}
                    </p>
                  </div>
                </div>

                {/* Right Section */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <Button
                    type="default"
                    size="large"
                    onClick={toggleFullscreen}
                    title={t({
                      uz: isFullscreen ? 'To‘liq ekrandan chiqish' : 'To‘liq ekran',
                      en: isFullscreen ? 'Exit fullscreen' : 'Fullscreen',
                      ru: isFullscreen ? 'Выйти из полноэкранного режима' : 'Полный экран',
                    })}
                    aria-label={t({
                      uz: isFullscreen ? 'To‘liq ekrandan chiqish' : 'To‘liq ekran',
                      en: isFullscreen ? 'Exit fullscreen' : 'Fullscreen',
                      ru: isFullscreen ? 'Выйти из полноэкранного режима' : 'Полный экран',
                    })}
                    icon={
                      isFullscreen ? (
                        <Minimize2 size={16} strokeWidth={2} />
                      ) : (
                        <Maximize2 size={16} strokeWidth={2} />
                      )
                    }
                  />
                  <ThemeToggle />
                  <Select
                    value={lang}
                    style={{ width: 150 }}
                    size="large"
                    prefix={<Languages />}
                    onChange={(value) => setLang(value as typeof lang)}
                    options={[
                      { value: 'en', label: 'English' },
                      { value: 'ru', label: 'Русский' },
                      { value: 'uz', label: "O'zbekcha" },
                      { value: 'uz-cyrl', label: 'Ўзбекча' }
                    ]}
                  />
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard/profile')}
                    className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-black/60 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                  >
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-medium text-slate-900 dark:text-white leading-tight">
                        {me ? `${me.firstName} ${me.lastName}` : '---'}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {me?.role || ''}
                      </p>
                    </div>
                    <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
                      {me?.avatarUrl ? (
                        <img
                          src={`${BACKEND_ORIGIN}${me.avatarUrl}`}
                          alt="avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          style={{
                            background: `linear-gradient(135deg, ${colorFrom} 0%, ${colorTo} 100%)`
                          }}
                          className="w-full h-full flex items-center justify-center rounded-full"
                        >
                          <span className="text-white font-bold text-xs tracking-wide select-none">
                            {initials}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                </div>
              </div>
            </header>
            {/* Main Content */}
            <main className="overflow-y-auto bg-[#FDFCF9] dark:bg-[#1B1C1D]">
              <div className="p-2 grid grid-cols-1 grid-row-1">
                <div className="col-span-1 row-span-1 rounded-lg w-full h-[calc(100vh-100px)]">
                  <AnimatePresence mode="sync">
                    {me?.role !== 'USER' && !isModeratorForbiddenRoute ? <Outlet /> : null}
                  </AnimatePresence>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Layout;
