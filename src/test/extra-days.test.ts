import { describe, it, expect } from 'vitest';
import { extraDaysAllowance } from '@/lib/extraDays';

describe('extra days allowance', () => {
  it('net 6000, 3 days -> 600', () => {
    expect(extraDaysAllowance(6000, 3)).toEqual({ dailyRate: 200, amount: 600 });
  });
  it('rounds to 2 decimals', () => {
    expect(extraDaysAllowance(5000, 1).amount).toBe(166.67);
  });
});
