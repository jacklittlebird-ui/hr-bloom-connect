import { describe, it, expect } from 'vitest';
import { stripEmpPrefix, transferBankOf } from '@/lib/salaryBank';
describe('salary bank', () => {
  it('strips emp prefix', () => expect(stripEmpPrefix('emp0015')).toBe('0015'));
  it('nbe active goes to nbe', () => expect(transferBankOf({ salaryBank: 'nbe', nbeAccountActive: true })).toBe('nbe'));
  it('disabled nbe falls back to cash', () => expect(transferBankOf({ salaryBank: 'nbe', nbeAccountActive: false })).toBe('cash'));
  it('credit default', () => expect(transferBankOf({ salaryBank: 'credit_agricole' })).toBe('credit_agricole'));
});
