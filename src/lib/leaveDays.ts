import { addDays, differenceInCalendarDays, getDay, parseISO } from 'date-fns';

export const MARRIAGE_LEAVE_MAX_DAYS = 7;
export const MARRIAGE_LEAVE_NOTICE_AR = 'يحق لك 7 أيام إجازة زواج لا تخصم من رصيد الإجازات، ولا يحتسب يوم الجمعة، فتمتد الإجازة يومًا إضافيًا إذا تضمنت جمعة.';
export const MARRIAGE_LEAVE_NOTICE_EN = 'You are entitled to 7 days of marriage leave, not deducted from your balance. Fridays are not counted, so the leave extends by one day when it includes a Friday.';

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

/** End date giving exactly MARRIAGE_LEAVE_MAX_DAYS counted days (Fridays skipped). */
export function marriageLeaveEndDate(start: Date | string): Date {
  let d = typeof start === 'string' ? parseISO(start) : new Date(start);
  let counted = getDay(d) === 5 ? 0 : 1;
  while (counted < MARRIAGE_LEAVE_MAX_DAYS) {
    d = addDays(d, 1);
    if (getDay(d) !== 5) counted++;
  }
  return d;
}
