import { describe, it, expect } from 'vitest';
import { sharmAllowanceAmount, canRunSharmAllowance } from '@/lib/sharmAllowance';

describe('Sharm allowance', () => {
  it('pays 350 per W day', () => expect(sharmAllowanceAmount(20)).toBe(7000));
  it('blocked on day 25', () => expect(canRunSharmAllowance('2026-11-25')).toBe(false));
  it('allowed on day 26', () => expect(canRunSharmAllowance('2026-11-26')).toBe(true));
});
