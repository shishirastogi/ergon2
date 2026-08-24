import React from 'react';
import { Link2 } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showLinkIcon?: boolean;
  action?: React.ReactNode;
  children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  showLinkIcon = true,
  action,
  children,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl sm:text-4xl md:text-[44px] font-extrabold tracking-tight text-text-primary leading-tight">
            {title}
          </h1>
          {showLinkIcon && (
            <div className="hidden sm:flex w-8 h-8 rounded-full bg-card shadow-ergon-pill items-center justify-center text-text-secondary hover:text-text-primary cursor-pointer transition-all border border-border-subtle">
              <Link2 className="w-4 h-4" />
            </div>
          )}
        </div>
        {subtitle && (
          <p className="text-sm font-medium text-text-secondary mt-1">
            {subtitle}
          </p>
        )}
      </div>

      {(action || children) && (
        <div className="flex items-center gap-3 flex-wrap">
          {children}
          {action}
        </div>
      )}
    </div>
  );
};
