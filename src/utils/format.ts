/**
 * Safe currency/number formatters.
 * These guard against undefined/null values that would crash .toLocaleString()
 */

/** Format a number as a dollar amount, e.g. 12500 → "12,500" */
export function formatMoney(value: number | undefined | null): string {
  const num = Number(value);
  if (isNaN(num)) return '0';
  return num.toLocaleString();
}

/** Format a number as a percentage, e.g. 25.5 → "25.5%" */
export function formatPercent(value: number | undefined | null, decimals = 1): string {
  const num = Number(value);
  if (isNaN(num)) return '0%';
  return `${num.toFixed(decimals)}%`;
}

/** Safely parse a number, returning 0 for undefined/null/NaN */
export function safeNum(value: number | undefined | null): number {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}
