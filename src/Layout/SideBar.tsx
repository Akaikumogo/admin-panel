import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';

export type NavItem = {
  path: string;
  label: { uz: string; en: string; ru: string };
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
};

export type NavGroup = {
  label: { uz: string; en: string; ru: string };
  items: NavItem[];
};

function isNavActive(path: string, pathname: string) {
  return pathname === path || pathname.startsWith(path + '/');
}

export const Sidebar: React.FC<{
  navGroups: NavGroup[];
  isCollapsed?: boolean;
}> = ({ navGroups, isCollapsed = false }) => {
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <nav
      className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 py-3"
      aria-label="Main"
    >
      <div className="space-y-5">
        {navGroups.map((group) => (
          <div key={group.label.uz} className="space-y-0.5">
            {!isCollapsed && (
              <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {t(group.label)}
              </p>
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isNavActive(item.path, location.pathname);

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  title={isCollapsed ? t(item.label) : undefined}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    active
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground',
                    isCollapsed && 'justify-center px-2',
                  )}
                >
                  {/* Signature: active left rail */}
                  <span
                    aria-hidden
                    className={cn(
                      'absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--shell-rail)] transition-opacity duration-200',
                      active ? 'opacity-100' : 'opacity-0 group-hover:opacity-40',
                    )}
                  />
                  <Icon
                    size={18}
                    strokeWidth={1.75}
                    className={cn(
                      'shrink-0 transition-colors',
                      active ? 'text-[var(--shell-rail)]' : 'text-current',
                    )}
                  />
                  {!isCollapsed && (
                    <span className="truncate">{t(item.label)}</span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </div>
    </nav>
  );
};
