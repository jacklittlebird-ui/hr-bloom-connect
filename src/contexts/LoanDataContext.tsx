import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from '@/contexts/NotificationContext';
import { useAuth } from '@/contexts/AuthContext';

export interface Loan {
  id: string;
  employeeId: string; // UUID from employees table
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
  employeeId: string; // UUID from employees table
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
  addAdvance: (advance: Omit<Advance, 'id'>) => Promise<void>;
  updateAdvance: (id: string, updates: Partial<Advance>) => Promise<void>;
  deleteAdvance: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

const LoanDataContext = createContext<LoanDataContextType | undefined>(undefined);

export const LoanDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const { addNotification } = useNotifications();
  const { user } = useAuth();

  const isAdminRole = user?.role === 'admin' || user?.role === 'hr';

  const fetchLoans = useCallback(async () => {
    if (!isAdminRole) { setLoans([]); return; }
    const { data } = await supabase
      .from('loans')
      .select('*, employees(name_ar, stations(code))')
      .order('created_at', { ascending: false });

    if (data) {
      setLoans(data.map(l => ({
        id: l.id,
        employeeId: l.employee_id,
        employeeName: (l.employees as any)?.name_ar || '',
        station: (l.employees as any)?.stations?.code || '',
        amount: l.amount,
        installments: l.installments_count,
        monthlyPayment: l.monthly_installment || 0,
        paidInstallments: l.paid_count || 0,
        paidAmount: (l.paid_count || 0) * (l.monthly_installment || 0),
        remainingAmount: l.remaining || 0,
        startDate: l.start_date,
        status: l.status as Loan['status'],
        notes: l.reason || '',
        calculationMethod: 'auto',
      })));
    }
  }, [isAdminRole]);

  const fetchAdvances = useCallback(async () => {
    if (!isAdminRole) { setAdvances([]); return; }
    const { data } = await supabase
      .from('advances')
      .select('*, employees(name_ar, stations(code))')
      .order('created_at', { ascending: false });

    if (data) {
      setAdvances(data.map(a => ({
        id: a.id,
        employeeId: a.employee_id,
        employeeName: (a.employees as any)?.name_ar || '',
        station: (a.employees as any)?.stations?.code || '',
        amount: a.amount,
        requestDate: a.created_at.split('T')[0],
        deductionMonth: a.deduction_month,
        status: a.status as Advance['status'],
        reason: a.reason || '',
      })));
    }
  }, [isAdminRole]);

  const refreshData = useCallback(async () => {
    await Promise.all([fetchLoans(), fetchAdvances()]);
  }, [fetchLoans, fetchAdvances]);

  useEffect(() => {
    if (isAdminRole) {
      refreshData();
    } else {
      setLoans([]);
      setAdvances([]);
    }
  }, [isAdminRole, refreshData]);

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
    // Delete installments first
    await supabase.from('loan_installments').delete().eq('loan_id', id);
    const { error } = await supabase.from('loans').delete().eq('id', id);
    if (error) throw error;
    await fetchLoans();
  }, [fetchLoans]);

  const recordLoanPayment = useCallback(async (loanId: string) => {
    // Find next pending installment and mark it paid
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

    const { error: payError } = await supabase
      .from('loan_installments')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', installments[0].id);

    if (payError) throw payError;

    const { data: loanRow, error: loanError } = await supabase
      .from('loans')
      .select('paid_count, installments_count')
      .eq('id', loanId)
      .single();

    if (loanError) throw loanError;

    const newPaid = Math.min((loanRow.paid_count || 0) + 1, loanRow.installments_count || 1);
    const { error: updateError } = await supabase
      .from('loans')
      .update({
        paid_count: newPaid,
        status: newPaid >= (loanRow.installments_count || 1) ? 'completed' : 'active',
      })
      .eq('id', loanId);

    if (updateError) throw updateError;

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
    return loans.filter(l => l.employeeId === employeeId && l.status === 'active');
  }, [loans]);

  const getEmployeeMonthlyLoanPayment = useCallback((employeeId: string) => {
    return loans
      .filter(l => l.employeeId === employeeId && l.status === 'active')
      .reduce((sum, l) => sum + l.monthlyPayment, 0);
  }, [loans]);

  const getEmployeeAdvanceForMonth = useCallback((employeeId: string, month: string) => {
    return advances
      .filter(a => a.employeeId === employeeId && a.deductionMonth === month && a.status === 'approved')
      .reduce((sum, a) => sum + a.amount, 0);
  }, [advances]);

  return (
    <LoanDataContext.Provider value={{
      loans, advances, setLoans, setAdvances,
      getEmployeeActiveLoans, getEmployeeMonthlyLoanPayment, getEmployeeAdvanceForMonth,
      addLoan, updateLoan, deleteLoan, recordLoanPayment,
      addAdvance, updateAdvance, deleteAdvance, refreshData,
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
