/**
 * Minimal hand-rolled validation helpers (no external validator dependency —
 * the spec asks for server-side checks without extra libraries).
 *
 * Every helper THROWS an HttpError(400) with a clear message on failure, so
 * route handlers stay flat: validateX(body) returns cleaned values or throws.
 */
import { badRequest } from './httpError.js';
import { D } from './money.js';

export function requireString(value, field, { max = 500, min = 1 } = {}) {
  if (typeof value !== 'string' || value.trim().length < min) {
    throw badRequest(`'${field}' is required and must be a non-empty string`);
  }
  const trimmed = value.trim();
  if (trimmed.length > max) {
    throw badRequest(`'${field}' must be at most ${max} characters`);
  }
  return trimmed;
}

/** Optional string: undefined/null → null; otherwise validated like requireString. */
export function optionalString(value, field, { max = 2000 } = {}) {
  if (value === undefined || value === null || value === '') return null;
  return requireString(value, field, { max });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function email(value, field = 'email') {
  const v = optionalString(value, field, { max: 320 });
  if (v === null) return null;
  if (!EMAIL_RE.test(v)) throw badRequest(`'${field}' is not a valid email address`);
  return v.toLowerCase();
}

export function oneOf(value, field, allowed) {
  if (value === undefined || value === null || value === '') return undefined;
  if (!allowed.includes(value)) {
    throw badRequest(`'${field}' must be one of: ${allowed.join(', ')}`);
  }
  return value;
}

/**
 * Money/quantity input → Decimal-safe positive number. Returns a JS number;
 * callers re-wrap in Decimal for arithmetic. Rejects NaN/negative/non-finite.
 */
export function positiveNumber(value, field, { max = 10_000_000, allowZero = false } = {}) {
  const n = typeof value === 'string' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n)) {
    throw badRequest(`'${field}' must be a finite number`);
  }
  if (n < (allowZero ? 0 : 0.01)) {
    throw badRequest(`'${field}' must be ${allowZero ? '>= 0' : 'a positive amount'}`);
  }
  // Guard against absurd precision that would silently round on save.
  if (D(n).toDecimalPlaces(2).minus(n).abs().gt(0)) {
    throw badRequest(`'${field}' supports at most 2 decimal places`);
  }
  if (n > max) throw badRequest(`'${field}' exceeds maximum (${max})`);
  return n;
}

/** ISO date-ish string → Date (UTC midnight for date-only strings), or null. */
export function optionalDate(value, field) {
  if (value === undefined || value === null || value === '') return null;
  const d = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(String(value).trim()) ? `${value}T00:00:00.000Z` : value
  );
  if (Number.isNaN(d.getTime())) throw badRequest(`'${field}' is not a valid date`);
  return d;
}

/** Validates and normalizes a line-items array from a request body. */
export function lineItemsInput(items, field = 'lineItems') {
  if (!Array.isArray(items)) {
    if (items === undefined || items === null) return [];
    throw badRequest(`'${field}' must be an array of line items`);
  }
  if (items.length > 100) throw badRequest(`'${field}' supports at most 100 items`);

  return items.map((item, i) => {
    if (!item || typeof item !== 'object') {
      throw badRequest(`${field}[${i}] must be an object`);
    }
    return {
      description: requireString(item.description ?? item.name, `${field}[${i}].description`, {
        max: 300,
      }),
      quantity: positiveNumber(item.quantity ?? 1, `${field}[${i}].quantity`, {
        allowZero: false,
        max: 100000,
      }),
      unitPrice: positiveNumber(item.unitRate ?? item.unitPrice, `${field}[${i}].unitRate`, {
        allowZero: true,
      }),
    };
  });
}
