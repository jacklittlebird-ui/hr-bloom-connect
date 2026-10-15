import { getCairoParts } from '@/lib/cairoDate';

/** Allowed deduction months (YYYY-MM): current month (only up to day 25) and following months. */
export function getAllowedDeductionMonths(now: Date = new Date(), count = 6): string[] {
  const { year, month, day } = getCairoParts(now);
  const start = day > 25 ? 1 : 0;
  const out: string[] = [];
  for (let i = start; i < start + count; i++) {
    const d = new Date(Date.UTC(year, month - 1 + i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

export const formatPenaltyLabel = (kind: string | null | undefined, days: number | null | undefined, month: string | null | undefined, ar: boolean) => {
  if (kind === 'warning') return ar ? 'إنذار' : 'Warning';
  if (kind === 'deduction') return ar ? `خصم ${days} يوم - ${month}` : `Deduct ${days} day(s) - ${month}`;
  return '';
};

/** Deduction month (YYYY-MM) for unpaid leave / unauthorized absence: current Cairo month, or next month after day 25. */
export function getUnpaidDeductionMonth(now: Date = new Date()): string {
  return getAllowedDeductionMonths(now, 1)[0];
}
