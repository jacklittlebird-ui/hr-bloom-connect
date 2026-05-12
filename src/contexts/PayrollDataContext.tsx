import React, { createContext, useContext, useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { trackQuery } from '@/lib/queryOptimizer';
import { revertLoanPaymentsForPeriod } from '@/lib/loanPayments';

export interface ProcessedPayroll {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  employeeNameEn: string;
  department: string;
  stationLocation: string;
  month: string;
  year: string;
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
  gross: number;
  employeeInsurance: number;
  loanPayment: number;
  advanceAmount: number;
  mobileBill: number;
  leaveDays: number;
  leaveDeduction: number;
  penaltyType: 'amount' | 'days' | 'percentage';
  penaltyValue: number;
  penaltyAmount: number;
  totalDeductions: number;
  netSalary: number;
  employerSocialInsurance: number;
  healthInsurance: number;
  incomeTax: number;
  processedAt: string;
}

interface PayrollDataContextType {
  payrollEntries: ProcessedPayroll[];
  refreshPayroll: () => Promise<void>;
  savePayrollEntry: (entry: ProcessedPayroll) => void;
  savePayrollEntries: (entries: ProcessedPayroll[]) => void;
  deletePayrollEntry: (employeeId: string, month: string, year: string) => Promise<void>;
  getPayrollEntry: (employeeId: string, month: string, year: string) => ProcessedPayroll | undefined;
  getMonthlyPayroll: (month: string, year: string) => ProcessedPayroll[];
  getEmployeePayroll: (employeeId: string) => ProcessedPayroll[];
}

const PayrollDataContext = createContext<PayrollDataContextType | undefined>(undefined);

// Only select needed columns (not SELECT *)
const PAYROLL_COLS = 'employee_id, month, year, basic_salary, transport_allowance, incentives, station_allowance, mobile_allowance, living_allowance, overtime_pay, bonus_type, bonus_value, bonus_amount, gross, employee_insurance, loan_payment, advance_amount, mobile_bill, leave_days, leave_deduction, penalty_type, penalty_value, penalty_amount, total_deductions, net_salary, employer_social_insurance, health_insurance, income_tax, processed_at, id';

// Salary data is sensitive, so employee views also receive the full processed breakdown.
const EMPLOYEE_PAYROLL_COLS = PAYROLL_COLS;
const FETCH_BATCH_SIZE = 1000;

const fetchAllBatches = async <T,>(
  fetchPage: (from: number, to: number) => Promise<{ data: T[] | null; error: unknown }>
): Promise<T[]> => {
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await fetchPage(from, from + FETCH_BATCH_SIZE - 1);
    if (error) {
      console.error('Error fetching paginated payroll data:', error);
      break;
    }

    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < FETCH_BATCH_SIZE) break;
    from += FETCH_BATCH_SIZE;
  }

  return rows;
};

const mapRowToEntry = (r: any): ProcessedPayroll => ({
  employeeId: r.employee_id,
  employeeCode: '',
  employeeName: '',
  employeeNameEn: '',
  department: '',
  stationLocation: '',
  month: r.month,
  year: r.year,
  basicSalary: r.basic_salary ?? 0,
  transportAllowance: r.transport_allowance ?? 0,
  incentives: r.incentives ?? 0,
  stationAllowance: r.station_allowance ?? 0,
  mobileAllowance: r.mobile_allowance ?? 0,
  livingAllowance: r.living_allowance ?? 0,
  overtimePay: r.overtime_pay ?? 0,
  bonusType: (r.bonus_type as 'amount' | 'percentage') ?? 'amount',
  bonusValue: r.bonus_value ?? 0,
  bonusAmount: r.bonus_amount ?? 0,
  gross: r.gross ?? 0,
  employeeInsurance: r.employee_insurance ?? 0,
  loanPayment: r.loan_payment ?? 0,
  advanceAmount: r.advance_amount ?? 0,
  mobileBill: r.mobile_bill ?? 0,
  leaveDays: r.leave_days ?? 0,
  leaveDeduction: r.leave_deduction ?? 0,
  penaltyType: (r.penalty_type as 'amount' | 'days' | 'percentage') ?? 'amount',
  penaltyValue: r.penalty_value ?? 0,
  penaltyAmount: r.penalty_amount ?? 0,
  totalDeductions: r.total_deductions ?? 0,
  netSalary: r.net_salary ?? 0,
  employerSocialInsurance: r.employer_social_insurance ?? 0,
  healthInsurance: r.health_insurance ?? 0,
  incomeTax: r.income_tax ?? 0,
  processedAt: r.processed_at ?? '',
});

const entryToPayload = (entry: ProcessedPayroll) => ({
  employee_id: entry.employeeId,
  month: entry.month,
  year: entry.year,
  basic_salary: entry.basicSalary,
  transport_allowance: entry.transportAllowance,
  incentives: entry.incentives,
  station_allowance: entry.stationAllowance,
  mobile_allowance: entry.mobileAllowance,
  living_allowance: entry.livingAllowance,
  overtime_pay: entry.overtimePay,
  bonus_type: entry.bonusType,
  bonus_value: entry.bonusValue,
  bonus_amount: entry.bonusAmount,
  gross: entry.gross,
  employee_insurance: entry.employeeInsurance,
  loan_payment: entry.loanPayment,
  advance_amount: entry.advanceAmount,
  mobile_bill: entry.mobileBill,
  leave_days: entry.leaveDays,
  leave_deduction: entry.leaveDeduction,
  penalty_type: entry.penaltyType,
  penalty_value: entry.penaltyValue,
  penalty_amount: entry.penaltyAmount,
  total_deductions: entry.totalDeductions,
  net_salary: entry.netSalary,
  employer_social_insurance: entry.employerSocialInsurance,
  health_insurance: entry.healthInsurance,
  income_tax: entry.incomeTax,
  processed_at: entry.processedAt || new Date().toISOString(),
});

export const PayrollDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rawEntries, setRawEntries] = useState<ProcessedPayroll[]>([]);
  const [employeeMap, setEmployeeMap] = useState<Record<string, { code: string; nameAr: string; nameEn: string; department: string; station: string }>>({});
  const { addNotification } = useNotifications();
  const { user } = useAuth();
  const isEmployee = user?.role === 'employee';
  const scopedEmployeeId = isEmployee ? user?.employeeUuid : null;

  const hydratePayrollEntries = useCallback(async (entries: ProcessedPayroll[]) => {
    if (!entries.length) return entries;

    const employeeIds = new Set(entries.map(entry => entry.employeeId));
    const periods = Array.from(new Set(entries.map(entry => `${entry.year}-${entry.month}`)));

    const dueDates = periods.map((period) => `${period}-01`);

    const [loanInstallmentRows, advanceRows, mobileBillRows] = await Promise.all([
      dueDates.length
        ? fetchAllBatches<{ employee_id: string; amount: number | null; due_date: string }>(async (from, to) => {
            let query = supabase
              .from('loan_installments')
              .select('employee_id, amount, due_date')
              .in('due_date', dueDates)
              .eq('status', 'pending')
              .range(from, to);

            if (isEmployee && scopedEmployeeId) {
              query = query.eq('employee_id', scopedEmployeeId);
            }

            return await query;
          })
        : Promise.resolve([]),
      periods.length
        ? fetchAllBatches<{ employee_id: string; amount: number | null; deduction_month: string }>(async (from, to) => {
            let query = supabase
              .from('advances')
              .select('employee_id, amount, deduction_month')
              .in('deduction_month', periods)
              .in('status', ['approved', 'deducted'])
              .range(from, to);

            if (isEmployee && scopedEmployeeId) {
              query = query.eq('employee_id', scopedEmployeeId);
            }

            return await query;
          })
        : Promise.resolve([]),
      periods.length
        ? fetchAllBatches<{ employee_id: string; amount: number | null; deduction_month: string }>(async (from, to) => {
            let query = supabase
              .from('mobile_bills')
              .select('employee_id, amount, deduction_month')
              .in('deduction_month', periods)
              .range(from, to);

            if (isEmployee && scopedEmployeeId) {
              query = query.eq('employee_id', scopedEmployeeId);
            }

            return await query;
          })
        : Promise.resolve([]),
    ]);

    const loanInstallmentMap = new Map<string, number>();
    loanInstallmentRows.forEach((row) => {
      if (!employeeIds.has(row.employee_id)) return;
      const duePeriod = row.due_date?.slice(0, 7);
      if (!duePeriod) return;
      const key = `${row.employee_id}-${duePeriod}`;
      loanInstallmentMap.set(key, (loanInstallmentMap.get(key) || 0) + (row.amount || 0));
    });

    const advanceMap = new Map<string, number>();
    advanceRows.forEach((row) => {
      if (!employeeIds.has(row.employee_id)) return;
      const key = `${row.employee_id}-${row.deduction_month}`;
      advanceMap.set(key, (advanceMap.get(key) || 0) + (row.amount || 0));
    });

    const mobileBillMap = new Map<string, number>();
    mobileBillRows.forEach((row) => {
      if (!employeeIds.has(row.employee_id)) return;
      const key = `${row.employee_id}-${row.deduction_month}`;
      mobileBillMap.set(key, (mobileBillMap.get(key) || 0) + (row.amount || 0));
    });

    return entries.map((entry) => {
      const periodKey = `${entry.employeeId}-${entry.year}-${entry.month}`;
      const liveLoanPayment = loanInstallmentMap.get(periodKey);
      // Prefer live installment data for active/current loans so edits and replacements
      // appear immediately in payroll reports, but fall back to stored history when the
      // loan has since been completed or no live installment exists anymore.
      const loanPayment = liveLoanPayment ?? entry.loanPayment;
      const advanceAmount = advanceMap.get(periodKey) ?? 0;
      const mobileBill = mobileBillMap.get(periodKey) ?? 0;
      const totalDeductions = entry.employeeInsurance + loanPayment + advanceAmount + mobileBill + entry.leaveDeduction + entry.penaltyAmount;

      return {
        ...entry,
        loanPayment,
        advanceAmount,
        mobileBill,
        totalDeductions,
        netSalary: entry.gross - totalDeductions,
      };
    });
  }, [isEmployee, scopedEmployeeId]);

  const fetchEmployeeMap = useCallback(async () => {
    if (isEmployee) return;

    const [employees, departments, stations] = await Promise.all([
      fetchAllBatches<any>(async (from, to) =>
        await supabase.from('employees').select('id, employee_code, name_ar, name_en, department_id, station_id').order('employee_code').range(from, to)
      ),
      fetchAllBatches<any>(async (from, to) =>
        await supabase.from('departments').select('id, name_ar').range(from, to)
      ),
      fetchAllBatches<any>(async (from, to) =>
        await supabase.from('stations').select('id, code').range(from, to)
      ),
    ]);
    trackQuery('payroll_empMap', employees.length + departments.length + stations.length);
    
    const deptMap: Record<string, string> = {};
    departments.forEach(d => { deptMap[d.id] = d.name_ar; });
    const stationMap: Record<string, string> = {};
    stations.forEach(s => { stationMap[s.id] = s.code; });

    const map: Record<string, { code: string; nameAr: string; nameEn: string; department: string; station: string }> = {};
    employees.forEach(e => {
      map[e.id] = {
        code: e.employee_code || '',
        nameAr: e.name_ar || '',
        nameEn: e.name_en || '',
        department: e.department_id ? (deptMap[e.department_id] || '') : '',
        station: e.station_id ? (stationMap[e.station_id] || '') : '',
      };
    });
    setEmployeeMap(map);
  }, [isEmployee]);

  const fetchEntries = useCallback(async () => {
    let query;
    if (isEmployee && scopedEmployeeId) {
      query = supabase.from('payroll_entries').select(EMPLOYEE_PAYROLL_COLS).eq('employee_id', scopedEmployeeId).order('year', { ascending: false }).order('month', { ascending: false }).limit(24);
      const { data, error } = await query;
      trackQuery('payroll', data?.length || 0);
      const entries = (!error && data) ? data.map(mapRowToEntry) : [];
      const hydratedEntries = await hydratePayrollEntries(entries);
      setRawEntries(hydratedEntries);
    } else {
      const data = await fetchAllBatches<any>(async (from, to) =>
        await supabase.from('payroll_entries').select(PAYROLL_COLS).order('year', { ascending: false }).order('month', { ascending: false }).range(from, to)
      );
      trackQuery('payroll', data.length || 0);
      const entries = data.map(mapRowToEntry);
      const hydratedEntries = await hydratePayrollEntries(entries);
      setRawEntries(hydratedEntries);
    }
  }, [hydratePayrollEntries, isEmployee, scopedEmployeeId]);

  const payrollEntries = useMemo(() => {
    return rawEntries.map(entry => {
      const emp = employeeMap[entry.employeeId];
      if (emp) {
        return {
          ...entry,
          employeeCode: emp.code || entry.employeeCode,
          employeeName: emp.nameAr || entry.employeeName,
          employeeNameEn: emp.nameEn || entry.employeeNameEn,
          department: emp.department || entry.department,
          stationLocation: emp.station || entry.stationLocation,
        };
      }
      return entry;
    });
  }, [rawEntries, employeeMap]);

  // Lazy loading: only fetch when first consumer calls refreshPayroll or accesses data
  const hasFetched = useRef(false);
  const ensureLoaded = useCallback(async () => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    await Promise.all([fetchEmployeeMap(), fetchEntries()]);
  }, [fetchEmployeeMap, fetchEntries]);

  // Don't fetch on mount — wait until a page actually needs payroll data
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        hasFetched.current = false;
        setRawEntries([]);
        setEmployeeMap({});
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const upsertEntry = async (entry: ProcessedPayroll) => {
    const payload = entryToPayload(entry);
    const { data: existing } = await supabase
      .from('payroll_entries')
      .select('id')
      .eq('employee_id', entry.employeeId)
      .eq('month', entry.month)
      .eq('year', entry.year)
      .maybeSingle();

    if (existing) {
      await supabase.from('payroll_entries').update(payload).eq('id', existing.id);
    } else {
      await supabase.from('payroll_entries').insert(payload);
    }
  };

  const savePayrollEntry = useCallback(async (entry: ProcessedPayroll) => {
    await upsertEntry(entry);
    await fetchEntries();
    addNotification({ titleAr: `تم معالجة مسير الراتب: ${entry.employeeName}`, titleEn: `Payroll processed: ${entry.employeeNameEn}`, type: 'success', module: 'payroll' });
  }, [addNotification, fetchEntries]);

  const savePayrollEntries = useCallback(async (entries: ProcessedPayroll[]) => {
    for (const entry of entries) {
      await upsertEntry(entry);
    }
    await fetchEntries();
    addNotification({ titleAr: `تم معالجة مسير الرواتب لـ ${entries.length} موظف`, titleEn: `Payroll processed for ${entries.length} employees`, type: 'success', module: 'payroll' });
  }, [addNotification, fetchEntries]);

  const getPayrollEntry = useCallback((employeeId: string, month: string, year: string) => {
    return payrollEntries.find(e => e.employeeId === employeeId && e.month === month && e.year === year);
  }, [payrollEntries]);


  const deletePayrollEntry = useCallback(async (employeeId: string, month: string, year: string) => {
    const { error } = await supabase
      .from('payroll_entries')
      .delete()
      .eq('employee_id', employeeId)
      .eq('month', month)
      .eq('year', year);
    if (error) {
      console.error('Error deleting payroll entry:', error);
      return;
    }

    await revertLoanPaymentsForPeriod(employeeId, month, year);

    await fetchEntries();
    addNotification({ titleAr: 'تم حذف كشف الراتب', titleEn: 'Payroll entry deleted', type: 'warning', module: 'payroll' });
  }, [addNotification, fetchEntries]);

  const refreshPayroll = useCallback(async () => {
    hasFetched.current = true;
    await Promise.all([fetchEmployeeMap(), fetchEntries()]);
  }, [fetchEmployeeMap, fetchEntries]);

  // Auto-load when payrollEntries is accessed (via getMonthlyPayroll etc.)
  const getMonthlyPayrollLazy = useCallback((month: string, year: string) => {
    if (!hasFetched.current) ensureLoaded();
    return payrollEntries.filter(e => e.month === month && e.year === year);
  }, [payrollEntries, ensureLoaded]);

  const getEmployeePayrollLazy = useCallback((employeeId: string) => {
    if (!hasFetched.current) ensureLoaded();
    return payrollEntries.filter(e => e.employeeId === employeeId).sort((a, b) => `${b.year}-${b.month}`.localeCompare(`${a.year}-${a.month}`));
  }, [payrollEntries, ensureLoaded]);

  return (
    <PayrollDataContext.Provider value={{ payrollEntries, refreshPayroll, savePayrollEntry, savePayrollEntries, deletePayrollEntry, getPayrollEntry, getMonthlyPayroll: getMonthlyPayrollLazy, getEmployeePayroll: getEmployeePayrollLazy }}>
      {children}
    </PayrollDataContext.Provider>
  );
};

export const usePayrollData = () => {
  const ctx = useContext(PayrollDataContext);
  if (!ctx) throw new Error('usePayrollData must be used within PayrollDataProvider');
  return ctx;
};
