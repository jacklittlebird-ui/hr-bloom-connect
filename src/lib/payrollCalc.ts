/**
 * Single source of truth for payroll figures shown anywhere in the app.
 *
 * RULE: the salary an employee shows in the payroll sheet (مسير الرواتب) MUST be
 * identical to the salary shown in every report (station totals, employee detail,
 * bank transfer, payslips, employee portal). All consumers derive their numbers
 * from this helper, applied on top of the stored payroll entry.
 *
 * Mirrors the database trigger `calculate_payroll_net`.
 */

export const roundToNearestQuarter = (value: number) => Math.round(value * 4) / 4;

export interface PayrollOverrides {
  /** Uploaded living allowance for the payroll month (الرواتب > بدلات المعيشة) */
  livingAllowance?: number;
  /** Uploaded unpaid-leave days for the payroll month (الرواتب > الإجازات) */
  leaveDays?: number;
  /** Uploaded penalty days for the payroll month (الرواتب > الخصومات) */
  penaltyDays?: number;
  /** Live monthly deductions */
  loanPayment?: number;
  advanceAmount?: number;
  mobileBill?: number;
}

export interface PayrollComputable {
  basicSalary: number;
  transportAllowance: number;
  incentives: number;
  stationAllowance: number;
  mobileAllowance: number;
  livingAllowance: number;
  overtimePay: number;
  bonusType: 'amount' | 'percentage';
  bonusValue: number;
  bonusAmount: number;
  employeeInsurance: number;
  loanPayment: number;
  advanceAmount: number;
  mobileBill: number;
  leaveDays: number;
  leaveDeduction: number;
  penaltyType: 'amount' | 'days' | 'percentage';
  penaltyValue: number;
  penaltyAmount: number;
  gross: number;
  totalDeductions: number;
  netSalary: number;
}

/**
 * Recompute an entry's derived money fields using the same formulas as the DB trigger,
 * after applying any live overrides (uploads / installments).
 */
export function recomputePayroll<T extends PayrollComputable>(entry: T, overrides: PayrollOverrides = {}): T {
  const livingAllowance = overrides.livingAllowance ?? entry.livingAllowance ?? 0;
  const leaveDays = overrides.leaveDays ?? entry.leaveDays ?? 0;

  const penaltyType = overrides.penaltyDays !== undefined ? 'days' : entry.penaltyType;
  const penaltyValue = overrides.penaltyDays !== undefined ? overrides.penaltyDays : (entry.penaltyValue ?? 0);

  const loanPayment = overrides.loanPayment ?? entry.loanPayment ?? 0;
  const advanceAmount = overrides.advanceAmount ?? entry.advanceAmount ?? 0;
  const mobileBill = overrides.mobileBill ?? entry.mobileBill ?? 0;

  // Base gross used for leave deduction (excludes living allowance + overtime)
  const baseGross =
    (entry.basicSalary || 0) +
    (entry.transportAllowance || 0) +
    (entry.incentives || 0) +
    (entry.stationAllowance || 0) +
    (entry.mobileAllowance || 0);

  const grossBeforeBonus = baseGross + livingAllowance + (entry.overtimePay || 0);

  const bonusAmount =
    entry.bonusType === 'percentage'
      ? Math.round(grossBeforeBonus * (entry.bonusValue || 0)) / 100 // value is a percentage
      : (entry.bonusValue || entry.bonusAmount || 0);

  const gross = grossBeforeBonus + bonusAmount;

  const leaveDeduction = roundToNearestQuarter((baseGross / 30) * leaveDays);

  let penaltyAmount: number;
  if (penaltyType === 'days') {
    penaltyAmount = roundToNearestQuarter(((entry.basicSalary || 0) / 30) * penaltyValue);
  } else if (penaltyType === 'percentage') {
    penaltyAmount = roundToNearestQuarter(((entry.basicSalary || 0) * penaltyValue) / 100);
  } else {
    penaltyAmount = roundToNearestQuarter(penaltyValue);
  }

  const totalDeductions =
    (entry.employeeInsurance || 0) + loanPayment + advanceAmount + mobileBill + leaveDeduction + penaltyAmount;

  return {
    ...entry,
    livingAllowance,
    bonusAmount,
    gross,
    loanPayment,
    advanceAmount,
    mobileBill,
    leaveDays,
    leaveDeduction,
    penaltyType,
    penaltyValue,
    penaltyAmount,
    totalDeductions,
    netSalary: gross - totalDeductions,
  };
}
