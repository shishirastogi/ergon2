import React, { createContext, useContext, useState, useEffect } from 'react';
import { CurrencyCode, CurrencyInfo } from '../types';
import { formatCurrency, formatCompactCurrency } from '../utils/formatters';

export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸', formatLocale: 'en-US' },
  { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺', formatLocale: 'de-DE' },
  { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧', formatLocale: 'en-GB' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', flag: '🇨🇦', formatLocale: 'en-CA' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺', formatLocale: 'en-AU' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵', formatLocale: 'ja-JP' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳', formatLocale: 'en-IN' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', flag: '🇨🇭', formatLocale: 'de-CH' },
  { code: 'SGD', symbol: 'SG$', name: 'Singapore Dollar', flag: '🇸🇬', formatLocale: 'en-SG' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham', flag: '🇦🇪', formatLocale: 'ar-AE' },
];

const DEFAULT_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.36,
  AUD: 1.52,
  JPY: 154.5,
  INR: 83.5,
  CHF: 0.90,
  SGD: 1.35,
  AED: 3.67,
};

interface CurrencyContextType {
  dashboardCurrency: CurrencyCode;
  setDashboardCurrency: (currency: CurrencyCode) => void;
  currencies: CurrencyInfo[];
  exchangeRates: Record<string, number>;
  ratesLastUpdated: string | null;
  isLiveRates: boolean;
  convert: (amount: number, fromCurrency?: string, toCurrency?: string) => number;
  format: (amount: number, currencyCode?: string) => string;
  formatCompact: (amount: number, currencyCode?: string) => string;
  refreshRates: () => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dashboardCurrency, setDashboardCurrencyState] = useState<CurrencyCode>(() => {
    const saved = localStorage.getItem('ergon_dashboard_currency');
    return (saved as CurrencyCode) || 'USD';
  });

  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>(() => {
    try {
      const cached = localStorage.getItem('ergon_exchange_rates');
      if (cached) {
        const parsed = JSON.parse(cached);
        return { ...DEFAULT_RATES, ...parsed.rates };
      }
    } catch {
      // fallback
    }
    return DEFAULT_RATES;
  });

  const [ratesLastUpdated, setRatesLastUpdated] = useState<string | null>(() => {
    return localStorage.getItem('ergon_rates_updated') || 'Estimated';
  });

  const [isLiveRates, setIsLiveRates] = useState<boolean>(false);

  const setDashboardCurrency = (currency: CurrencyCode) => {
    setDashboardCurrencyState(currency);
    localStorage.setItem('ergon_dashboard_currency', currency);
  };

  const fetchLiveRates = async () => {
    try {
      // Free, CORS-friendly, zero-API-key open exchange rates endpoint
      const res = await fetch('https://open.er-api.com/v6/latest/USD', {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error('Rates API response not ok');
      const data = await res.json();
      if (data && data.rates) {
        const newRates = { ...DEFAULT_RATES, ...data.rates };
        setExchangeRates(newRates);
        const updatedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setRatesLastUpdated(updatedTime);
        setIsLiveRates(true);
        localStorage.setItem('ergon_exchange_rates', JSON.stringify({ rates: newRates, time: updatedTime }));
        localStorage.setItem('ergon_rates_updated', updatedTime);
      }
    } catch (err) {
      console.warn('Real-time rates fetch failed, using offline cached exchange rates', err);
      setIsLiveRates(false);
    }
  };

  useEffect(() => {
    fetchLiveRates();
    // Auto-refresh every 30 minutes
    const interval = setInterval(fetchLiveRates, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const convert = (
    amount: number,
    fromCurrency: string = 'USD',
    toCurrency: string = dashboardCurrency
  ): number => {
    if (isNaN(amount) || amount === 0) return 0;
    const from = (fromCurrency || 'USD').toUpperCase();
    const to = (toCurrency || dashboardCurrency).toUpperCase();
    if (from === to) return amount;

    const rateFrom = exchangeRates[from] || DEFAULT_RATES[from] || 1.0;
    const rateTo = exchangeRates[to] || DEFAULT_RATES[to] || 1.0;

    // Convert to USD base first, then to target currency
    const amountInUSD = amount / rateFrom;
    const converted = amountInUSD * rateTo;
    return converted;
  };

  const format = (amount: number, currencyCode: string = dashboardCurrency): string => {
    return formatCurrency(amount, currencyCode);
  };

  const formatCompact = (amount: number, currencyCode: string = dashboardCurrency): string => {
    return formatCompactCurrency(amount, currencyCode);
  };

  return (
    <CurrencyContext.Provider
      value={{
        dashboardCurrency,
        setDashboardCurrency,
        currencies: SUPPORTED_CURRENCIES,
        exchangeRates,
        ratesLastUpdated,
        isLiveRates,
        convert,
        format,
        formatCompact,
        refreshRates: fetchLiveRates,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = (): CurrencyContextType => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
