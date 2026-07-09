/* eslint-disable @typescript-eslint/no-explicit-any */
import { NavLink, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

export type NavItem = {
  path: string;
  label: { uz: string; en: string; ru: string };
  icon: React.ComponentType<any>;
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
  const indicatorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const { t } = useTranslation();

  const flatItems = useMemo(
    () => navGroups.flatMap((group) => group.items),
    [navGroups],
  );

  useEffect(() => {
    const activeIndex = flatItems.findIndex((item) =>
      isNavActive(item.path, location.pathname),
    );
    const activeEl = itemRefs.current[activeIndex];
    const containerEl = containerRef.current;

    if (activeEl && containerEl && indicatorRef.current) {
      const activeRect = activeEl.getBoundingClientRect();
      const containerRect = containerEl.getBoundingClientRect();
      indicatorRef.current.style.top = `${activeRect.top - containerRect.top}px`;
      indicatorRef.current.style.height = `${activeRect.height}px`;
    }
  }, [location.pathname, flatItems]);

  let itemIndex = 0;

  return (
    <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-4">
      <div className="relative space-y-4" ref={containerRef}>
        <div
          ref={indicatorRef}
          className="absolute left-0 w-full rounded-lg z-0 transition-all duration-300 bg-primary dark:bg-slate-700 dark:border dark:border-slate-600/50"
          style={{ top: 0, height: 0 }}
        />

        {navGroups.map((group) => (
          <div key={group.label.uz} className="space-y-1">
            {!isCollapsed && (
              <p className="px-3 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t(group.label)}
              </p>
            )}
            {group.items.map((item) => {
              const currentIndex = itemIndex;
              itemIndex += 1;
              const Icon = item.icon;
              const isActive = isNavActive(item.path, location.pathname);

              return (
                <div
                  key={item.path}
                  className="relative z-10"
                  ref={(el) => {
                    itemRefs.current[currentIndex] = el;
                  }}
                >
                  <NavLink to={item.path}>
                    <div
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                        isActive
                          ? 'text-primary-foreground dark:text-white'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <Icon size={20} className="flex-shrink-0" />
                      {!isCollapsed && (
                        <span className="text-sm font-medium whitespace-nowrap">
                          {t(item.label)}
                        </span>
                      )}
                    </div>
                  </NavLink>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </nav>
  );
};
