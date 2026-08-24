import prismaPkg from '@prisma/client';
const { Prisma } = prismaPkg;

/**
 * Decimal-safe money helpers.
 * ALL money math on the server goes through Prisma's Decimal to avoid
 * floating-point drift on real invoices (e.g. 0.1 + 0.2 !== 0.3).
 */

const TWO_DP = new Prisma.Decimal('0.01');

export const D = (value) => new Prisma.Decimal(value ?? 0);

/** Round a Decimal to 2 decimal places (banker-agnostic half-up rounding). */
export function round2(dec) {
  return D(dec).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

/** quantity × unitPrice for one line item → Decimal rounded to 2dp */
export function lineTotal(quantity, unitPrice) {
  return round2(D(quantity).times(D(unitPrice)));
}

/**
 * Tax/total computation — THE single source of truth for quote & invoice totals.
 *
 * ⚠️ GST/TAX NOTE — VERIFY WITH A REAL ACCOUNTANT BEFORE LIVE BILLING:
 * This implementation treats prices as TAX-EXCLUSIVE and applies
 * `taxAmount = subtotal × taxRate`, where taxRate is supplied as a fraction
 * (0.18 = 18% GST). It does NOT handle: GST-inclusive pricing, place-of-supply
 * rules (CGST/SGST vs IGST), reverse charge, composition scheme, exemptions,
 * or HSN/SAC line classification. Exact GST treatment must be confirmed with
 * a qualified accountant before this touches actual client billing in India.
 */
export function computeTotals(lineItems, taxRateFraction) {
  const subtotal = lineItems.reduce(
    (sum, li) => sum.plus(lineTotal(li.quantity, li.unitPrice)),
    D(0)
  );
  const rate = D(taxRateFraction || 0);
  if (rate.lt(0) || rate.gt(1)) {
    // taxRate is a fraction of 1; anything outside [0, 1] is invalid input.
    throw new RangeError('taxRate must be between 0 and 1 (e.g. 0.18 for 18%)');
  }
  const taxAmount = round2(subtotal.times(rate));
  const total = subtotal.plus(taxAmount);
  return { subtotal: round2(subtotal), taxAmount, total };
}

/** Convert a Prisma Decimal field to a plain JS number for JSON responses. */
export function num(dec) {
  if (dec === null || dec === undefined) return null;
  return Number(dec);
}
