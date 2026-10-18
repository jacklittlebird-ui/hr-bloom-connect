/**
 * An installment is "insufficient" when the employee's net salary for that
 * month, before the loan deduction, cannot cover the installment amount.
 * Returns null when there is no saved payroll for the month (unknown).
 */
export const isInstallmentInsufficient = (
  installmentAmount: number,
  netSalary: number | null | undefined,
  loanPaymentInPayroll: number | null | undefined,
): boolean | null => {
  if (netSalary === null || netSalary === undefined) return null;
  const availableBeforeLoan = Number(netSalary) + Number(loanPaymentInPayroll || 0);
  return availableBeforeLoan < Number(installmentAmount || 0) || Number(netSalary) < 0;
};
