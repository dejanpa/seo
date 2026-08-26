/**
 * Billing period math. Kept in its own leaf module (no database imports) so it
 * can be imported and tested directly.
 */

/** Same calendar day next month, clamped to the last day of shorter months. */
export function addOneMonth(isoDate: string): string {
  const start = new Date(isoDate);
  const target = new Date(start);
  target.setUTCMonth(target.getUTCMonth() + 1);
  // setUTCMonth rolls Jan 31 → Mar 3; pull back to the last day of the intended
  // month so a period never skips one.
  if (target.getUTCDate() !== start.getUTCDate()) {
    target.setUTCDate(0);
  }
  return target.toISOString();
}
