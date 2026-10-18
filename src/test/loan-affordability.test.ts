import { describe, it, expect } from 'vitest';
import { isInstallmentInsufficient } from '@/lib/loanAffordability';

describe('isInstallmentInsufficient', () => {
  it('flags when net before loan is below the installment', () => {
    expect(isInstallmentInsufficient(2000, -500, 2000)).toBe(true);
    expect(isInstallmentInsufficient(3000, 0, 1000)).toBe(true);
  });
  it('does not flag when salary covers the installment', () => {
    expect(isInstallmentInsufficient(2000, 5000, 2000)).toBe(false);
  });
  it('returns null when no payroll is saved for the month', () => {
    expect(isInstallmentInsufficient(2000, null, null)).toBeNull();
  });
});
