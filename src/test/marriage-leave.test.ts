import { describe, expect, it } from 'vitest';
import { calculateLeaveDays, isValidMarriageLeave } from '@/lib/leaveDays';

describe('Marriage leave: seven days excluding Fridays', () => {
  it('counts Saturday through the following Saturday as seven days', () => {
    expect(calculateLeaveDays('marriage', '2026-10-17', '2026-10-24')).toBe(7);
    expect(isValidMarriageLeave('2026-10-17', '2026-10-24')).toBe(true);
  });
  it('rejects eight counted days even when a Friday is excluded', () => {
    expect(calculateLeaveDays('marriage', '2026-10-17', '2026-10-25')).toBe(8);
    expect(isValidMarriageLeave('2026-10-17', '2026-10-25')).toBe(false);
  });
  it('excludes Fridays at either boundary and every Friday in a longer period', () => {
    expect(calculateLeaveDays('marriage', '2026-10-23', '2026-10-24')).toBe(1);
    expect(calculateLeaveDays('marriage', '2026-10-22', '2026-10-23')).toBe(1);
    expect(calculateLeaveDays('marriage', '2026-10-16', '2026-10-30')).toBe(12);
    expect(isValidMarriageLeave('2026-10-16', '2026-10-30')).toBe(false);
  });
  it('rejects reversed dates and a Friday-only request', () => {
    expect(isValidMarriageLeave('2026-10-24', '2026-10-17')).toBe(false);
    expect(isValidMarriageLeave('2026-10-23', '2026-10-23')).toBe(false);
  });
  it('leaves other leave types inclusive of Fridays', () => {
    for (const type of ['annual', 'sick', 'casual', 'unpaid']) {
      expect(calculateLeaveDays(type, '2026-10-17', '2026-10-24')).toBe(8);
    }
  });
});