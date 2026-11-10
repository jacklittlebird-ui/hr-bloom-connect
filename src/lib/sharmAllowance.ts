export const SHARM_DAY_RATE = 350;

/** Sharm allowance = roster W days × 350. */
export function sharmAllowanceAmount(workDays: number): number {
  return Math.max(0, workDays) * SHARM_DAY_RATE;
}

/** A month's roster closes after its 25th (Cairo); closed past months remain runnable. */
export function canRunSharmAllowance(cairoToday: string, month = cairoToday.slice(0, 7)): boolean {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return false;
  return cairoToday > `${month}-25`;
}
