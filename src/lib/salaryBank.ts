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
