import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';

export type NavItem = {
  path: string;
  label: { uz: string; en: string; ru: string };
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  /** Qizil badge counter (masalan: tasdiq kutayotganlar) */
  badgeCount?: number;
  badgeTone?: 'danger' | 'default';
};

export type NavGroup = {
  label: { uz: string; en: string; ru: string };
  items: NavItem[];
};

function isNavActive(path: string, pathname: string, paths: string[]) {
  if (pathname === path) return true;
  if (!pathname.startsWith(path + '/')) return false;
  return !paths.some(
    (other) =>
      other !== path &&
      other.length > path.length &&
      (pathname === other || pathname.startsWith(other + '/')),
  );
}

/** SCHETCHIK uslubidagi sidebar nav — pill active + section labels */
export const Sidebar: React.FC<{
  navGroups: NavGroup[];
  onNavigate?: () => void;
}> = ({ navGroups, onNavigate }) => {
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <nav
      className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3"
      aria-label="Main"
    >
      {navGroups.map((group) => {
        const isAnalytics =
          group.label.uz === 'Analitika' ||
          group.items.some((i) => i.path.includes('/analytics'));
        return (
        <div
          key={group.label.uz}
          className={cn('space-y-0.5', isAnalytics && 'space-y-0')}
        >
          <div
            className={cn(
              'px-3 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground',
              isAnalytics ? 'pb-1' : 'pb-2',
            )}
          >
            {t(group.label)}
          </div>
          {group.items.map((item) => {
            const Icon = item.icon;
            const active = isNavActive(
              item.path,
              location.pathname,
              group.items.map((entry) => entry.path),
            );

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onNavigate}
                className={cn(
                  'group relative flex items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors',
                  isAnalytics ? 'py-1.5' : 'py-2',
                  active
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-xl border border-border/80 bg-card shadow-sm dark:bg-muted/80"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                ) : null}
                <Icon
                  size={18}
                  strokeWidth={1.75}
                  className={cn(
                    'relative shrink-0',
                    active ? 'text-primary' : 'text-current',
                  )}
                />
                <span className="relative flex min-w-0 flex-1 items-center gap-2">
                  <span className="truncate">{t(item.label)}</span>
                  {typeof item.badgeCount === 'number' && item.badgeCount > 0 ? (
                    <span
                      className={cn(
                        'ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums text-white',
                        item.badgeTone === 'danger' || !item.badgeTone
                          ? 'bg-red-600'
                          : 'bg-muted-foreground',
                      )}
                    >
                      {item.badgeCount > 99 ? '99+' : item.badgeCount}
                    </span>
                  ) : null}
                </span>
              </NavLink>
            );
          })}
        </div>
        );
      })}
    </nav>
  );
};
