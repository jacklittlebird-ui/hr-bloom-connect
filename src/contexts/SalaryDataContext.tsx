import React, { createContext, useContext, useCallback, useState, useEffect, useRef } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { trackQuery, debouncedFetch, invalidateCache } from '@/lib/queryOptimizer';

export interface SalaryRecord {
  year: string;
  employeeId: string;
  stationLocation: string;
  basicSalary: number;
  transportAllowance: number;
  incentives: number;
  livingAllowance: number;
  stationAllowance: number;
  mobileAllowance: number;
  rosterAllowance: number;
  employeeInsurance: number;
  employerSocialInsurance: number;
  healthInsurance: number;
  incomeTax: number;
}

export const calcGross = (r: Omit<SalaryRecord, 'year' | 'employeeId' | 'stationLocation'>) =>
  r.basicSalary + r.transportAllowance + r.incentives + r.stationAllowance + r.mobileAllowance;

export const calcFullGross = (r: Omit<SalaryRecord, 'year' | 'employeeId' | 'stationLocation'>) =>
  r.basicSalary + r.transportAllowance + r.incentives + r.livingAllowance + r.stationAllowance + r.mobileAllowance;

export const calcNet = (r: Omit<SalaryRecord, 'year' | 'employeeId' | 'stationLocation'>) =>
  calcFullGross(r) - r.employeeInsurance;

interface SalaryDataContextType {
  salaryRecords: SalaryRecord[];
  getSalaryRecord: (employeeId: string, year: string) => SalaryRecord | undefined;
  getLatestSalaryRecord: (employeeId: string) => SalaryRecord | undefined;
  saveSalaryRecord: (record: SalaryRecord) => void;
  deleteSalaryRecord: (employeeId: string, year: string) => void;
  refreshSalaryRecords: () => void;
}

const SalaryDataContext = createContext<SalaryDataContextType | undefined>(undefined);

const SALARY_COLS = 'employee_id, year, basic_salary, transport_allowance, incentives, living_allowance, station_allowance, mobile_allowance, roster_allowance, employee_insurance, employer_social_insurance, health_insurance, income_tax';
const EMPLOYEE_SALARY_COLS = 'employee_id, year, basic_salary, transport_allowance, incentives, living_allowance, station_allowance, mobile_allowance, roster_allowance, employee_insurance';

const mapRow = (row: any): SalaryRecord => ({
  year: row.year,
  employeeId: row.employee_id,
  stationLocation: '',
  basicSalary: row.basic_salary ?? 0,
  transportAllowance: row.transport_allowance ?? 0,
  incentives: row.incentives ?? 0,
  livingAllowance: row.living_allowance ?? 0,
  stationAllowance: row.station_allowance ?? 0,
  mobileAllowance: row.mobile_allowance ?? 0,
  rosterAllowance: row.roster_allowance ?? 0,
  employeeInsurance: row.employee_insurance ?? 0,
  employerSocialInsurance: row.employer_social_insurance ?? 0,
  healthInsurance: row.health_insurance ?? 0,
  incomeTax: row.income_tax ?? 0,
});

export const SalaryDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
  const { addNotification } = useNotifications();
  const { user } = useAuth();
  const isEmployee = user?.role === 'employee';
  const scopedEmployeeId = isEmployee ? user?.employeeUuid : null;

  const fetchRecords = useCallback(async () => {
    const cacheKey = `salary_${scopedEmployeeId || 'all'}`;
    
    const result = await debouncedFetch(cacheKey, async () => {
      let query;
      if (isEmployee && scopedEmployeeId) {
        query = supabase.from('salary_records').select(EMPLOYEE_SALARY_COLS).eq('employee_id', scopedEmployeeId).limit(5);
      } else {
        query = supabase.from('salary_records').select(SALARY_COLS);
      }
      const { data, error } = await query;
      trackQuery('salary', data?.length || 0);
      if (!error && data) return data.map(mapRow);
      return [];
    }, { ttlMs: 120_000 });

    setSalaryRecords(result);
  }, [isEmployee, scopedEmployeeId]);

  const hasMounted = useRef(false);
  useEffect(() => {
    if (hasMounted.current) return;
    hasMounted.current = true;
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        invalidateCache('salary_');
        fetchRecords();
      }
    });
    return () => subscription.unsubscribe();
  }, [fetchRecords]);

  const getSalaryRecord = useCallback((employeeId: string, year: string) => {
    return salaryRecords.find(r => r.employeeId === employeeId && r.year === year);
  }, [salaryRecords]);

  const getLatestSalaryRecord = useCallback((employeeId: string) => {
    const records = salaryRecords.filter(r => r.employeeId === employeeId).sort((a, b) => b.year.localeCompare(a.year));
    return records[0];
  }, [salaryRecords]);

  const saveSalaryRecord = useCallback(async (record: SalaryRecord) => {
    const payload = {
      employee_id: record.employeeId,
      year: record.year,
      basic_salary: record.basicSalary,
      transport_allowance: record.transportAllowance,
      incentives: record.incentives,
      living_allowance: record.livingAllowance,
      station_allowance: record.stationAllowance,
      mobile_allowance: record.mobileAllowance,
      roster_allowance: record.rosterAllowance,
      employee_insurance: record.employeeInsurance,
      employer_social_insurance: record.employerSocialInsurance,
      health_insurance: record.healthInsurance,
      income_tax: record.incomeTax,
    };

    const existing = salaryRecords.find(r => r.employeeId === record.employeeId && r.year === record.year);
    
    if (existing) {
      const { error } = await supabase.from('salary_records').update(payload).eq('employee_id', record.employeeId).eq('year', record.year);
      if (error) { console.error('Error updating salary record:', error); return; }
    } else {
      const { error } = await supabase.from('salary_records').insert(payload);
      if (error) { console.error('Error inserting salary record:', error); return; }
    }

    invalidateCache('salary_');
    await fetchRecords();
    addNotification({ titleAr: `تم حفظ سجل الراتب`, titleEn: `Salary record saved`, type: 'success', module: 'salary' });
  }, [salaryRecords, addNotification, fetchRecords]);

  const deleteSalaryRecord = useCallback(async (employeeId: string, year: string) => {
    const { error } = await supabase.from('salary_records').delete().eq('employee_id', employeeId).eq('year', year);
    if (error) { console.error('Error deleting salary record:', error); return; }
    invalidateCache('salary_');
    await fetchRecords();
    addNotification({ titleAr: `تم حذف سجل الراتب`, titleEn: `Salary record deleted`, type: 'warning', module: 'salary' });
  }, [addNotification, fetchRecords]);

  return (
    <SalaryDataContext.Provider value={{ salaryRecords, getSalaryRecord, getLatestSalaryRecord, saveSalaryRecord, deleteSalaryRecord, refreshSalaryRecords: fetchRecords }}>
      {children}
    </SalaryDataContext.Provider>
  );
};

export const useSalaryData = () => {
  const ctx = useContext(SalaryDataContext);
  if (!ctx) throw new Error('useSalaryData must be used within SalaryDataProvider');
  return ctx;
};
