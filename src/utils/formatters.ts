/**
 * Ergon Single Shared Currency and Date Formatting Utilities
 * Adheres to money and date conventions in ergon-ai-guide.md
 */

const CURRENCY_LOCALES: Record<string, string> = {
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
  CAD: 'en-CA',
  AUD: 'en-AU',
  JPY: 'ja-JP',
  INR: 'en-IN',
  CHF: 'de-CH',
  SGD: 'en-SG',
  AED: 'ar-AE',
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'CA$',
  AUD: 'A$',
  JPY: '¥',
  INR: '₹',
  CHF: 'CHF',
  SGD: 'SG$',
  AED: 'AED',
};

export function formatCurrency(
  amount: number | null | undefined,
  currencyCode: string = 'USD'
): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    const sym = CURRENCY_SYMBOLS[currencyCode] || '$';
    return `${sym}0.00`;
  }
  const locale = CURRENCY_LOCALES[currencyCode] || 'en-US';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    const sym = CURRENCY_SYMBOLS[currencyCode] || '$';
    return `${sym}${amount.toFixed(2)}`;
  }
}

export function formatCompactCurrency(
  amount: number | null | undefined,
  currencyCode: string = 'USD'
): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    const sym = CURRENCY_SYMBOLS[currencyCode] || '$';
    return `${sym}0`;
  }
  const sym = CURRENCY_SYMBOLS[currencyCode] || '$';
  if (Math.abs(amount) >= 1_000_000) {
    return `${sym}${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(amount) >= 1_000) {
    return `${sym}${(amount / 1_000).toFixed(1)}k`;
  }
  return formatCurrency(amount, currencyCode);
}

export function formatCompactNumber(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0';
  }
  if (Math.abs(amount) >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(amount) >= 1_000) {
    return `${(amount / 1_000).toFixed(1)}k`;
  }
  return amount.toLocaleString('en-US');
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateStr;
  }
}

export function formatShortDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch {
    return dateStr;
  }
}
