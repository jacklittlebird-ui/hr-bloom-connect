import React, { createContext, useContext, useCallback, useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from '@/contexts/NotificationContext';
import { useAuth } from '@/contexts/AuthContext';
import { trackQuery } from '@/lib/queryOptimizer';
import { markInstallmentPaid, recalculateLoanSummary, revertInstallmentPayment } from '@/lib/loanPayments';

export interface Loan {
  id: string;
  employeeId: string;
  employeeName: string;
  station: string;
  amount: number;
  installments: number;
  monthlyPayment: number;
  paidInstallments: number;
  paidAmount: number;
  remainingAmount: number;
  startDate: string;
  status: 'active' | 'completed' | 'pending';
  notes: string;
  calculationMethod: 'auto' | 'manual';
}

export interface Advance {
  id: string;
  employeeId: string;
  employeeName: string;
  station: string;
  amount: number;
  requestDate: string;
  deductionMonth: string;
  status: 'pending' | 'approved' | 'rejected' | 'deducted';
  reason: string;
}

interface LoanDataContextType {
  loans: Loan[];
  advances: Advance[];
  setLoans: React.Dispatch<React.SetStateAction<Loan[]>>;
  setAdvances: React.Dispatch<React.SetStateAction<Advance[]>>;
  getEmployeeActiveLoans: (employeeId: string) => Loan[];
  getEmployeeMonthlyLoanPayment: (employeeId: string) => number;
  getEmployeeAdvanceForMonth: (employeeId: string, month: string) => number;
  addLoan: (loan: Omit<Loan, 'id' | 'paidInstallments' | 'paidAmount' | 'remainingAmount' | 'monthlyPayment'> & { monthlyPayment?: number }) => Promise<void>;
  updateLoan: (id: string, updates: Partial<Loan>) => Promise<void>;
  deleteLoan: (id: string) => Promise<void>;
  recordLoanPayment: (loanId: string) => Promise<void>;
  reverseLoanPayment: (loanId: string) => Promise<void>;
  addAdvance: (advance: Omit<Advance, 'id'>) => Promise<void>;
  updateAdvance: (id: string, updates: Partial<Advance>) => Promise<void>;
  deleteAdvance: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
  ensureLoaded: () => Promise<void>;
}

const LoanDataContext = createContext<LoanDataContextType | undefined>(undefined);

// Specific columns instead of SELECT *
const LOAN_COLS = 'id, employee_id, amount, installments_count, monthly_installment, paid_count, remaining, start_date, status, reason, employees(name_ar, stations(code))';
const EMPLOYEE_LOAN_COLS = 'id, employee_id, amount, installments_count, monthly_installment, paid_count, remaining, start_date, status, reason';
const ADVANCE_COLS = 'id, employee_id, amount, created_at, deduction_month, status, reason, employees(name_ar, stations(code))';
const EMPLOYEE_ADVANCE_COLS = 'id, employee_id, amount, created_at, deduction_month, status, reason';

export const LoanDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const { addNotification } = useNotifications();
  const { user } = useAuth();
  const isEmployee = user?.role === 'employee';
  const scopedEmployeeId = isEmployee ? user?.employeeUuid : null;

  const fetchLoans = useCallback(async () => {
    let query;
    if (isEmployee && scopedEmployeeId) {
      query = supabase.from('loans').select(EMPLOYEE_LOAN_COLS).eq('employee_id', scopedEmployeeId).order('created_at', { ascending: false }).limit(20);
    } else {
      query = supabase.from('loans').select(LOAN_COLS).order('created_at', { ascending: false });
    }
    const { data } = await query;
    trackQuery('loans', data?.length || 0);
    
    setLoans((data || []).map((l: any) => ({
      id: l.id,
      employeeId: l.employee_id,
      employeeName: l.employees?.name_ar || '',
      station: l.employees?.stations?.code || '',
      amount: l.amount,
      installments: l.installments_count,
      monthlyPayment: l.monthly_installment || 0,
      paidInstallments: l.paid_count || 0,
      paidAmount: (l.paid_count || 0) * (l.monthly_installment || 0),
      remainingAmount: l.remaining || 0,
      startDate: l.start_date,
      status: l.status as Loan['status'],
      notes: l.reason || '',
      calculationMethod: 'auto' as const,
    })));
  }, [isEmployee, scopedEmployeeId]);

  const fetchAdvances = useCallback(async () => {
    let query;
    if (isEmployee && scopedEmployeeId) {
      query = supabase.from('advances').select(EMPLOYEE_ADVANCE_COLS).eq('employee_id', scopedEmployeeId).order('created_at', { ascending: false }).limit(20);
    } else {
      query = supabase.from('advances').select(ADVANCE_COLS).order('created_at', { ascending: false });
    }
    const { data } = await query;
    trackQuery('advances', data?.length || 0);
    
    setAdvances((data || []).map((a: any) => ({
      id: a.id,
      employeeId: a.employee_id,
      employeeName: a.employees?.name_ar || '',
      station: a.employees?.stations?.code || '',
      amount: a.amount,
      requestDate: a.created_at.split('T')[0],
      deductionMonth: a.deduction_month,
      status: a.status as Advance['status'],
      reason: a.reason || '',
    })));
  }, [isEmployee, scopedEmployeeId]);

  const refreshData = useCallback(async () => {
    hasFetched.current = true;
    await Promise.all([fetchLoans(), fetchAdvances()]);
  }, [fetchLoans, fetchAdvances]);

  // Lazy loading: don't fetch on mount
  const hasFetched = useRef(false);
  const ensureLoaded = useCallback(async () => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    await Promise.all([fetchLoans(), fetchAdvances()]);
  }, [fetchLoans, fetchAdvances]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        hasFetched.current = false;
        setLoans([]);
        setAdvances([]);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const addLoan = useCallback(async (loan: Omit<Loan, 'id' | 'paidInstallments' | 'paidAmount' | 'remainingAmount' | 'monthlyPayment'> & { monthlyPayment?: number }) => {
    const { error } = await supabase.from('loans').insert({
      employee_id: loan.employeeId,
      amount: loan.amount,
      installments_count: loan.installments,
      monthly_installment: loan.monthlyPayment && loan.monthlyPayment > 0 ? loan.monthlyPayment : undefined,
      start_date: loan.startDate.length === 7 ? `${loan.startDate}-01` : loan.startDate,
      reason: loan.notes,
      status: loan.status || 'active',
    });
    if (error) throw error;
    addNotification({ titleAr: `تم إضافة قرض جديد: ${loan.employeeName}`, titleEn: `New loan added: ${loan.employeeName}`, type: 'info', module: 'loan' });
    
    await fetchLoans();
  }, [addNotification, fetchLoans]);

  const updateLoan = useCallback(async (id: string, updates: Partial<Loan>) => {
    const dbUpdates: any = {};
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
    if (updates.installments !== undefined) dbUpdates.installments_count = updates.installments;
    if (updates.monthlyPayment !== undefined) dbUpdates.monthly_installment = updates.monthlyPayment;
    if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate.length === 7 ? `${updates.startDate}-01` : updates.startDate;
    if (updates.notes !== undefined) dbUpdates.reason = updates.notes;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.employeeId !== undefined) dbUpdates.employee_id = updates.employeeId;

    const { error } = await supabase.from('loans').update(dbUpdates).eq('id', id);
    if (error) throw error;
    
    await fetchLoans();
  }, [fetchLoans]);

  const deleteLoan = useCallback(async (id: string) => {
    await supabase.from('loan_installments').delete().eq('loan_id', id);
    const { error } = await supabase.from('loans').delete().eq('id', id);
    if (error) throw error;
    
    await fetchLoans();
  }, [fetchLoans]);

  const recordLoanPayment = useCallback(async (loanId: string) => {
    const { data: installments, error: installmentError } = await supabase
      .from('loan_installments')
      .select('id')
      .eq('loan_id', loanId)
      .eq('status', 'pending')
      .order('installment_number', { ascending: true })
      .limit(1);

    if (installmentError) throw installmentError;
    if (!installments || installments.length === 0) {
      
      await fetchLoans();
      return;
    }

    await markInstallmentPaid(installments[0].id);

    
    await fetchLoans();
  }, [fetchLoans]);

  const reverseLoanPayment = useCallback(async (loanId: string) => {
    const { data: installments, error: installmentError } = await supabase
      .from('loan_installments')
      .select('id')
      .eq('loan_id', loanId)
      .eq('status', 'paid')
      .order('installment_number', { ascending: false })
      .limit(1);

    if (installmentError) throw installmentError;
    if (!installments || installments.length === 0) {
      await fetchLoans();
      return;
    }

    await revertInstallmentPayment(installments[0].id);
    await recalculateLoanSummary(loanId);

    await fetchLoans();
  }, [fetchLoans]);

  const addAdvance = useCallback(async (advance: Omit<Advance, 'id'>) => {
    const { error } = await supabase.from('advances').insert({
      employee_id: advance.employeeId,
      amount: advance.amount,
      deduction_month: advance.deductionMonth,
      reason: advance.reason,
      status: advance.status || 'pending',
    });
    if (error) throw error;
    addNotification({ titleAr: `تم إضافة سلفة جديدة: ${advance.employeeName}`, titleEn: `New advance added: ${advance.employeeName}`, type: 'info', module: 'loan' });
    
    await fetchAdvances();
  }, [addNotification, fetchAdvances]);

  const updateAdvance = useCallback(async (id: string, updates: Partial<Advance>) => {
    const dbUpdates: any = {};
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
    if (updates.deductionMonth !== undefined) dbUpdates.deduction_month = updates.deductionMonth.length === 7 ? `${updates.deductionMonth}-01` : updates.deductionMonth;
    if (updates.reason !== undefined) dbUpdates.reason = updates.reason;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.employeeId !== undefined) dbUpdates.employee_id = updates.employeeId;

    const { error } = await supabase.from('advances').update(dbUpdates).eq('id', id);
    if (error) throw error;
    
    await fetchAdvances();
  }, [fetchAdvances]);

  const deleteAdvance = useCallback(async (id: string) => {
    const { error } = await supabase.from('advances').delete().eq('id', id);
    if (error) throw error;
    
    await fetchAdvances();
  }, [fetchAdvances]);

  const getEmployeeActiveLoans = useCallback((employeeId: string) => {
    if (!hasFetched.current) ensureLoaded();
    return loans.filter(l => l.employeeId === employeeId && l.status === 'active');
  }, [loans, ensureLoaded]);

  const getEmployeeMonthlyLoanPayment = useCallback((employeeId: string) => {
    if (!hasFetched.current) ensureLoaded();
    return loans.filter(l => l.employeeId === employeeId && l.status === 'active').reduce((sum, l) => sum + l.monthlyPayment, 0);
  }, [loans, ensureLoaded]);

  const getEmployeeAdvanceForMonth = useCallback((employeeId: string, month: string) => {
    if (!hasFetched.current) ensureLoaded();
    return advances.filter(a => a.employeeId === employeeId && a.deductionMonth === month && a.status === 'approved').reduce((sum, a) => sum + a.amount, 0);
  }, [advances, ensureLoaded]);

  return (
    <LoanDataContext.Provider value={{
      loans, advances, setLoans, setAdvances,
      getEmployeeActiveLoans, getEmployeeMonthlyLoanPayment, getEmployeeAdvanceForMonth,
      addLoan, updateLoan, deleteLoan, recordLoanPayment, reverseLoanPayment,
      addAdvance, updateAdvance, deleteAdvance, refreshData, ensureLoaded,
    }}>
      {children}
    </LoanDataContext.Provider>
  );
};

export const useLoanData = () => {
  const ctx = useContext(LoanDataContext);
  if (!ctx) throw new Error('useLoanData must be used within LoanDataProvider');
  return ctx;
};
