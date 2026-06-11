/**
 * Holiday helpers — pure, no Firebase imports so they're trivially testable
 * and usable from any context.
 *
 * Holidays are stored per-plant in /config/holidays as:
 *   { EAP: ['2026-07-04', ...], GAP: [...], SLP: [...] }
 *
 * A "holiday" means the plant was closed that day — it should be excluded
 * from every absenteeism calculation (the carried-forward headcount would
 * otherwise inflate the denominator) and hidden from non-admin viewers.
 */

/** True if `date` (YYYY-MM-DD) is a holiday for `plant`. */
export function isHoliday(holidays, plant, date) {
  if (!holidays || !plant || !date) return false;
  const list = holidays[plant];
  return Array.isArray(list) && list.includes(date);
}

/** Empty default so consumers can destructure without null checks. */
export const EMPTY_HOLIDAYS = { EAP: [], GAP: [], SLP: [] };
