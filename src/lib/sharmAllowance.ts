export const SHARM_DAY_RATE = 350;

/** Sharm allowance = roster W days × 350. */
export function sharmAllowanceAmount(workDays: number): number {
  return Math.max(0, workDays) * SHARM_DAY_RATE;
}

/** The run button opens only after day 25 (Cairo) of the month, when the roster period has closed. */
export function canRunSharmAllowance(cairoToday: string): boolean {
  return Number(cairoToday.slice(8, 10)) > 25;
}
