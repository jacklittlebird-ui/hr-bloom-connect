import { describe, it, expect } from 'vitest';
import { getAllowedDeductionMonths } from '@/lib/violationPenalty';

describe('violation deduction months', () => {
  it('allows the current month on or before day 25 (Cairo)', () => {
    expect(getAllowedDeductionMonths(new Date('2026-10-25T12:00:00+03:00'))[0]).toBe('2026-10');
  });
  it('blocks the current month after day 25', () => {
    expect(getAllowedDeductionMonths(new Date('2026-10-26T09:00:00+03:00'))[0]).toBe('2026-11');
  });
  it('never offers a past month and rolls over the year', () => {
    const m = getAllowedDeductionMonths(new Date('2026-12-28T09:00:00+02:00'));
    expect(m[0]).toBe('2027-01');
    expect(m.every(x => x >= '2026-12')).toBe(true);
  });
});
