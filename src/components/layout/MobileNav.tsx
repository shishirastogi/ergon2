import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, FolderKanban, FileText, Receipt } from 'lucide-react';

export const MobileNav: React.FC = () => {
  const items = [
    { label: 'Overview', path: '/', icon: LayoutDashboard },
    { label: 'Clients', path: '/clients', icon: Users },
    { label: 'Pipeline', path: '/projects', icon: FolderKanban },
    { label: 'Quotes', path: '/quotes', icon: FileText },
    { label: 'Invoices', path: '/invoices', icon: Receipt },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/75 backdrop-blur-xl -webkit-backdrop-blur-xl border-t border-border-subtle/80 shadow-lg safe-bottom">
      <div className="flex items-center justify-around py-2 px-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-2xl transition-all ${
                  isActive
                    ? 'text-text-primary font-bold'
                    : 'text-text-secondary font-medium hover:text-text-primary'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`p-1.5 rounded-full transition-all ${
                      isActive
                        ? 'bg-neutral-900 text-white dark:bg-neutral-800 dark:text-white dark:border dark:border-neutral-700 shadow-xs'
                        : 'text-text-secondary'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
