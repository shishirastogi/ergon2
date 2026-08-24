import React from 'react';
import { CategoryBreakdown } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface CategoryStripedBarsProps {
  categories?: CategoryBreakdown[];
  currencyCode?: string;
}

export const CategoryStripedBars: React.FC<CategoryStripedBarsProps> = ({
  categories = [],
  currencyCode = 'USD',
}) => {
  const displayCategories =
    categories && categories.length > 0
      ? categories
      : [
          {
            name: 'Direct Invoices',
            amount: 0,
            percentage: 0,
            colorHex: '#2FBF71',
            accentClass: 'bg-striped-green',
          },
          {
            name: 'Collected Revenue',
            amount: 0,
            percentage: 0,
            colorHex: '#3B6FE0',
            accentClass: 'bg-striped-blue',
          },
          {
            name: 'Pending Balance',
            amount: 0,
            percentage: 0,
            colorHex: '#F2994A',
            accentClass: 'bg-striped-orange',
          },
        ];

  return (
    <div className="space-y-3.5 pt-1">
      {displayCategories.map((cat) => {
        const pct = Math.max(0, Math.min(100, cat.percentage || 0));
        return (
          <div key={cat.name} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-text-secondary font-medium truncate text-[11px] sm:text-xs">
                  {cat.name}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-card-alt text-text-secondary border border-border-subtle shrink-0">
                  {pct}%
                </span>
              </div>
              <span className="text-text-primary font-bold text-[11px] sm:text-xs shrink-0">
                {formatCurrency(cat.amount || 0, currencyCode)}
              </span>
            </div>

            {/* Rounded horizontal pill bar with diagonal stripe fill */}
            <div className="h-2.5 w-full rounded-full bg-card-alt border border-border-subtle/60 overflow-hidden relative shadow-inner">
              {pct > 0 ? (
                <div
                  style={{ width: `${pct}%` }}
                  className={`h-full rounded-full transition-all duration-500 ${cat.accentClass}`}
                />
              ) : (
                <div className="h-full w-2 rounded-full bg-border-subtle" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
