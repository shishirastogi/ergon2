import React, { useState, useRef, useEffect } from 'react';
import { useCurrency } from '../../context/CurrencyContext';
import { CurrencyCode } from '../../types';
import { ChevronDown, RefreshCw, Check, Globe } from 'lucide-react';

export const CurrencySelector: React.FC<{ className?: string; compact?: boolean }> = ({
  className = '',
  compact = false,
}) => {
  const {
    dashboardCurrency,
    setDashboardCurrency,
    currencies,
    exchangeRates,
    ratesLastUpdated,
    isLiveRates,
    refreshRates,
  } = useCurrency();

  const [isOpen, setIsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeCurrency =
    currencies.find((c) => c.code === dashboardCurrency) || currencies[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRefreshing(true);
    await refreshRates();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Pill Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/75 backdrop-blur-md hover:bg-card border border-border-subtle/80 shadow-xs transition-all text-xs font-semibold text-text-primary cursor-pointer ${
          isOpen ? 'ring-2 ring-accent-blue/30 border-accent-blue' : ''
        }`}
        title="Change dashboard display currency"
      >
        <span className="text-sm leading-none">{activeCurrency.flag}</span>
        <span className="font-bold tracking-tight">{activeCurrency.code}</span>
        {!compact && (
          <span className="text-text-secondary font-medium">({activeCurrency.symbol})</span>
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 text-text-secondary transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-text-primary' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-card rounded-card-sm shadow-ergon-float border border-border-subtle p-2.5 z-50 animate-in fade-in slide-in-from-top-2">
          {/* Header */}
          <div className="px-2.5 py-2 border-b border-border-subtle flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-accent-blue" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                Display Currency
              </span>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              className="p-1 rounded-md text-text-secondary hover:text-text-primary hover:bg-card-alt transition-colors"
              title="Refresh real-time rates"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-accent-blue' : ''}`}
              />
            </button>
          </div>

          {/* Rates Status Banner */}
          <div className="px-2.5 py-1.5 mb-1.5 bg-card-alt rounded-lg flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isLiveRates ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span className="text-text-secondary">
                {isLiveRates ? 'Live FX Rates' : 'Standard Rates'}
              </span>
            </div>
            <span className="text-text-secondary font-mono">
              {ratesLastUpdated ? `Updated ${ratesLastUpdated}` : ''}
            </span>
          </div>

          {/* Currency List */}
          <div className="max-h-64 overflow-y-auto space-y-0.5">
            {currencies.map((c) => {
              const isSelected = c.code === dashboardCurrency;
              const rate = exchangeRates[c.code] || 1.0;

              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    setDashboardCurrency(c.code as CurrencyCode);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-neutral-900 text-white dark:bg-neutral-800 dark:text-white dark:border dark:border-neutral-700 font-bold'
                      : 'hover:bg-card-alt text-text-primary'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base leading-none">{c.flag}</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold">{c.code}</span>
                        <span
                          className={`text-xs ${
                            isSelected ? 'text-white/80' : 'text-text-secondary'
                          }`}
                        >
                          ({c.symbol})
                        </span>
                      </div>
                      <p
                        className={`text-[10px] truncate max-w-[130px] ${
                          isSelected ? 'text-white/70' : 'text-text-secondary'
                        }`}
                      >
                        {c.name}
                      </p>
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-1.5">
                    {c.code !== 'USD' && (
                      <span
                        className={`text-[10px] font-mono ${
                          isSelected ? 'text-white/80' : 'text-text-secondary'
                        }`}
                      >
                        1$ = {rate.toFixed(rate > 10 ? 1 : 2)}
                      </span>
                    )}
                    {isSelected && <Check className="w-3.5 h-3.5 text-accent-green shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
