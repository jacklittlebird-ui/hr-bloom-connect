import { describe, it, expect } from 'vitest';
import { stripEmpPrefix, transferBankOf, visibleBankOf } from '@/lib/salaryBank';
describe('salary bank', () => {
  it('strips emp prefix', () => expect(stripEmpPrefix('emp0015')).toBe('0015'));
  it('nbe active goes to nbe', () => expect(transferBankOf({ salaryBank: 'nbe', nbeAccountActive: true })).toBe('nbe'));
  it('disabled nbe falls back to cash', () => expect(transferBankOf({ salaryBank: 'nbe', nbeAccountActive: false })).toBe('cash'));
  it('credit default', () => expect(transferBankOf({ salaryBank: 'credit_agricole' })).toBe('credit_agricole'));
  it('profile shows only the enabled credit account', () => expect(visibleBankOf({ salaryBank: 'credit_agricole', creditAccountActive: true, nbeAccountActive: false })).toBe('credit_agricole'));
  it('profile shows only the enabled nbe account', () => expect(visibleBankOf({ salaryBank: 'nbe', creditAccountActive: false, nbeAccountActive: true })).toBe('nbe'));
  it('profile shows cash when no account is enabled', () => expect(visibleBankOf({ salaryBank: 'cash', creditAccountActive: false, nbeAccountActive: false })).toBe('cash'));
  it('both enabled falls back to the chosen salary bank', () => expect(visibleBankOf({ salaryBank: 'nbe', creditAccountActive: true, nbeAccountActive: true })).toBe('nbe'));
});
