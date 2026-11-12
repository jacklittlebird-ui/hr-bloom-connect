export type TransferBank = 'nbe' | 'credit_agricole' | 'cash';

/** Removes a leading "emp" (any case) from an employee code: "emp0015" -> "0015". */
export const stripEmpPrefix = (code: string) => String(code || '').replace(/^emp/i, '');

/** Which tab/export an employee's salary goes to. A disabled account falls back to cash. */
export const transferBankOf = (emp?: { salaryBank?: string; creditAccountActive?: boolean; nbeAccountActive?: boolean } | null): TransferBank => {
  if (!emp) return 'cash';
  if (emp.salaryBank === 'nbe') return emp.nbeAccountActive ? 'nbe' : 'cash';
  if (emp.salaryBank === 'credit_agricole') return emp.creditAccountActive === false ? 'cash' : 'credit_agricole';
  return 'cash';
};

export type VisibleBank = TransferBank;

/**
 * The single bank account an employee is allowed to see in their own profile:
 * the enabled one. If both flags are on, the chosen salary bank wins; if none
 * is enabled there is no account, so the profile shows cash.
 */
export const visibleBankOf = (emp?: { salaryBank?: string; creditAccountActive?: boolean; nbeAccountActive?: boolean } | null): VisibleBank => {
  if (!emp) return 'cash';
  const creditEnabled = emp.creditAccountActive !== false;
  const nbeEnabled = emp.nbeAccountActive === true;
  if (creditEnabled && nbeEnabled) return transferBankOf(emp) === 'nbe' ? 'nbe' : 'credit_agricole';
  if (nbeEnabled) return 'nbe';
  if (creditEnabled) return 'credit_agricole';
  return 'cash';
};
