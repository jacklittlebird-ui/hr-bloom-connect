import { describe, it, expect } from 'vitest';
import { getUnpaidDeductionMonth } from '@/lib/violationPenalty';

describe('unpaid leave deduction month', () => {
  it('uses the current month up to day 25', () => {
    expect(getUnpaidDeductionMonth(new Date('2026-10-25T12:00:00+03:00'))).toBe('2026-10');
  });
  it('moves to next month after day 25', () => {
    expect(getUnpaidDeductionMonth(new Date('2026-10-26T09:00:00+03:00'))).toBe('2026-11');
  });
  it('rolls over the year', () => {
    expect(getUnpaidDeductionMonth(new Date('2026-12-28T09:00:00+02:00'))).toBe('2027-01');
  });
});
