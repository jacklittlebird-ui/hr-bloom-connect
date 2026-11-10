import { describe, it, expect } from 'vitest';
import { sharmAllowanceAmount, canRunSharmAllowance } from '@/lib/sharmAllowance';

describe('Sharm allowance', () => {
  it('pays 350 per W day', () => expect(sharmAllowanceAmount(20)).toBe(7000));
  it('blocked on day 25', () => expect(canRunSharmAllowance('2026-11-25')).toBe(false));
  it('allowed on day 26', () => expect(canRunSharmAllowance('2026-11-26')).toBe(true));
  it('allows October payroll preparation before November 25', () => expect(canRunSharmAllowance('2026-11-10', '2026-10')).toBe(true));
  it('keeps the selected current month blocked through day 25', () => expect(canRunSharmAllowance('2026-11-25', '2026-11')).toBe(false));
  it('opens the selected month on day 26', () => expect(canRunSharmAllowance('2026-11-26', '2026-11')).toBe(true));
  it('blocks future months even after the current month closes', () => expect(canRunSharmAllowance('2026-11-26', '2026-12')).toBe(false));
  it('rejects empty or invalid selected months', () => {
    expect(canRunSharmAllowance('2026-11-26', '')).toBe(false);
    expect(canRunSharmAllowance('2026-11-26', '2026-13')).toBe(false);
  });
});
