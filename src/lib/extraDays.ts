const r2 = (n: number) => Math.round(n * 100) / 100;

/** Extra working days allowance: (monthly net / 30) x days. */
export const extraDaysAllowance = (netSalary: number, days: number) => {
  const dailyRate = r2(netSalary / 30);
  return { dailyRate, amount: r2((netSalary / 30) * days) };
};
