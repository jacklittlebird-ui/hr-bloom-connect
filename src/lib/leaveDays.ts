import { differenceInCalendarDays, getDay, parseISO } from 'date-fns';

export const MARRIAGE_LEAVE_MAX_DAYS = 7;
export const MARRIAGE_LEAVE_NOTICE_AR = 'أقصى إجازة مسموح بها للزواج هي 7 أيام، ولا تخصم من رصيد الإجازات، ولا يحتسب يوم الجمعة ضمن الإجازة.';
export const MARRIAGE_LEAVE_NOTICE_EN = 'Marriage leave is limited to 7 days, does not deduct from your leave balance, and excludes Fridays.';

/** Inclusive calendar days; marriage leave excludes every Friday. */
export function calculateLeaveDays(type: string, start?: Date | string, end?: Date | string): number {
  if (!start || !end) return 0;
  const from = typeof start === 'string' ? parseISO(start) : start;
  const to = typeof end === 'string' ? parseISO(end) : end;
  const total = differenceInCalendarDays(to, from) + 1;
  if (!Number.isFinite(total) || total <= 0) return 0;
  if (type !== 'marriage') return total;
  const firstFridayOffset = (5 - getDay(from) + 7) % 7;
  const fridays = firstFridayOffset < total ? 1 + Math.floor((total - firstFridayOffset - 1) / 7) : 0;
  return total - fridays;
}

export function isValidMarriageLeave(start?: Date | string, end?: Date | string): boolean {
  const days = calculateLeaveDays('marriage', start, end);
  return days > 0 && days <= MARRIAGE_LEAVE_MAX_DAYS;
}