import React from 'react';
import { MoreHorizontal } from 'lucide-react';

interface CardProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  showMoreButton?: boolean;
  onMoreClick?: () => void;
  className?: string;
  padding?: 'standard' | 'large' | 'compact' | 'none';
  children: React.ReactNode;
  gradientBg?: boolean;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  action,
  showMoreButton = false,
  onMoreClick,
  className = '',
  padding = 'standard',
  children,
  gradientBg = false,
}) => {
  const paddingClass = {
    standard: 'p-6 sm:p-7',
    large: 'p-7 sm:p-9',
    compact: 'p-4 sm:p-5',
    none: 'p-0',
  }[padding];

  return (
    <div
      className={`rounded-card transition-all duration-200 border border-border-subtle/70 ${
        gradientBg
          ? 'bg-hero-gradient text-white shadow-none'
          : 'bg-card shadow-ergon-card hover:shadow-ergon-card-hover text-text-primary'
      } ${paddingClass} ${className}`}
    >
      {(title || action || showMoreButton) && (
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            {title && (
              <h2
                className={`text-lg sm:text-xl font-bold tracking-tight ${
                  gradientBg ? 'text-white' : 'text-text-primary'
                }`}
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p
                className={`text-xs mt-0.5 font-medium ${
                  gradientBg ? 'text-white/80' : 'text-text-secondary'
                }`}
              >
                {subtitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {action}
            {showMoreButton && (
              <button
                type="button"
                onClick={onMoreClick}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  gradientBg
                    ? 'hover:bg-white/20 text-white'
                    : 'text-text-secondary hover:text-text-primary hover:bg-card-alt'
                }`}
                aria-label="More options"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
      {children}
    </div>
  );
};
