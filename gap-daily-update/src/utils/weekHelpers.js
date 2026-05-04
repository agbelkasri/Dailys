import { parseISO, getISOWeek, getISOWeekYear, subWeeks } from 'date-fns';

/**
 * Returns true if `dateStr` falls in the same ISO week as `todayStr` OR in the
 * ISO week immediately preceding it. Handles year boundaries.
 *
 * Used to grant designated section editors (see useResponsibleEditors) a
 * rolling edit window covering "this week and last week" — so e.g. on Monday
 * morning they can still update Friday's report.
 *
 * Both args are 'yyyy-MM-dd' strings.
 */
export function isInCurrentOrPreviousISOWeek(dateStr, todayStr) {
  if (!dateStr || !todayStr) return false;

  const date  = parseISO(dateStr);
  const today = parseISO(todayStr);
  if (Number.isNaN(date.getTime()) || Number.isNaN(today.getTime())) return false;

  const dWeek = getISOWeek(date);
  const dYear = getISOWeekYear(date);

  // Same ISO week as today
  if (dYear === getISOWeekYear(today) && dWeek === getISOWeek(today)) return true;

  // Previous ISO week (subWeeks handles year-boundary correctly)
  const prev  = subWeeks(today, 1);
  return dYear === getISOWeekYear(prev) && dWeek === getISOWeek(prev);
}
