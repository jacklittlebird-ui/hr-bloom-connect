import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// ===== LEAVES =====
export interface LeaveBalance {
  typeAr: string;
  typeEn: string;
  total: number;
  used: number;
  remaining: number;
}

export interface LeaveRequest {
  id: number;
  employeeId: string;
  typeAr: string;
  typeEn: string;
  from: string;
  to: string;
  days: number;
  status: 'approved' | 'pending' | 'rejected';
}

// ===== PERMISSION =====
export interface PermissionRequest {
  id: number;
  employeeId: string;
  typeAr: string;
  typeEn: string;
  date: string;
  fromTime: string;
  toTime: string;
  reason: string;
  status: 'approved' | 'pending' | 'rejected';
}

// ===== LOANS =====
export interface Loan {
  id: number;
  employeeId: string;
  typeAr: string;
  typeEn: string;
  amount: number;
  paid: number;
  remaining: number;
  installment: number;
  status: 'active' | 'paid';
}

// ===== EVALUATIONS =====
export interface Evaluation {
  id: number;
  employeeId: string;
  period: string;
  score: number;
  maxScore: number;
  reviewerAr: string;
  reviewerEn: string;
  status: 'completed' | 'pending';
  notesAr: string;
  notesEn: string;
}

// ===== TRAINING =====
export interface TrainingCourse {
  id: number;
  employeeId: string;
  nameAr: string;
  nameEn: string;
  progress: number;
  status: 'in-progress' | 'completed' | 'planned';
  startDate: string;
  endDate: string;
}

// ===== MISSIONS =====
export type PortalMissionType = 'morning' | 'evening' | 'full_day';
export interface Mission {
  id: number;
  employeeId: string;
  missionType: PortalMissionType;
  date: string;
  destAr: string;
  destEn: string;
  reasonAr: string;
  reasonEn: string;
  status: 'approved' | 'pending' | 'rejected';
}

// ===== VIOLATIONS =====
export interface Violation {
  id: number;
  employeeId: string;
  date: string;
  typeAr: string;
  typeEn: string;
  penaltyAr: string;
  penaltyEn: string;
  status: 'open' | 'closed';
}

// ===== OVERTIME =====
export interface OvertimeDay {
  id: string;
  employeeId: string;
  date: string;
  overtimeType: string;
  typeAr: string;
  typeEn: string;
  reason: string;
  status: 'approved' | 'pending' | 'rejected';
}

// ===== REQUESTS =====
export interface EmployeeRequest {
  id: number;
  employeeId: string;
  typeAr: string;
  typeEn: string;
  date: string;
  status: 'approved' | 'pending' | 'rejected';
}

// ===== DOCUMENTS =====
export interface PortalDocument {
  id: number;
  employeeId: string;
  nameAr: string;
  nameEn: string;
  date: string;
  typeAr: string;
  typeEn: string;
}

const leaveTypeMap: Record<string, { ar: string; en: string }> = {
  annual: { ar: 'سنوية', en: 'Annual' },
  sick: { ar: 'مرضية', en: 'Sick' },
  casual: { ar: 'عارضة', en: 'Casual' },
  unpaid: { ar: 'بدون راتب', en: 'Unpaid' },
};

const permTypeMap: Record<string, { ar: string; en: string }> = {
  early_leave: { ar: 'انصراف مبكر', en: 'Early Leave' },
  late_arrival: { ar: 'تأخر صباحي', en: 'Late Arrival' },
  personal: { ar: 'شخصي', en: 'Personal' },
};

interface PortalDataContextType {
  getLeaveBalances: (employeeId: string) => LeaveBalance[];
  getLeaveRequests: (employeeId: string) => LeaveRequest[];
  addLeaveRequest: (req: Omit<LeaveRequest, 'id' | 'status'>) => void;
  getPermissions: (employeeId: string) => PermissionRequest[];
  addPermission: (req: Omit<PermissionRequest, 'id' | 'status'>) => void;
  getLoans: (employeeId: string) => Loan[];
  addLoanRequest: (req: Omit<Loan, 'id' | 'status' | 'paid' | 'remaining'>) => void;
  getEvaluations: (employeeId: string) => Evaluation[];
  getTraining: (employeeId: string) => TrainingCourse[];
  getMissions: (employeeId: string) => Mission[];
  addMission: (req: Omit<Mission, 'id' | 'status'>) => void;
  getOvertimeDays: (employeeId: string) => OvertimeDay[];
  addOvertimeDay: (req: Omit<OvertimeDay, 'id' | 'status'>) => void;
  getViolations: (employeeId: string) => Violation[];
  getRequests: (employeeId: string) => EmployeeRequest[];
  addRequest: (req: Omit<EmployeeRequest, 'id' | 'status'>) => void;
  getDocuments: (employeeId: string) => PortalDocument[];
  addDocument: (doc: Omit<PortalDocument, 'id'>) => void;
}

const PortalDataContext = createContext<PortalDataContextType | undefined>(undefined);

export const PortalDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const isEmployee = user?.role === 'employee';
  const scopedEmployeeId = isEmployee ? user?.employeeUuid : null;

  // Cache data from Supabase
  const [leaveBalances, setLeaveBalances] = useState<Record<string, LeaveBalance[]>>({});
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [permissions, setPermissions] = useState<PermissionRequest[]>([]);
  const [portalLoans, setPortalLoans] = useState<Loan[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [training, setTraining] = useState<TrainingCourse[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [overtimeDays, setOvertimeDays] = useState<OvertimeDay[]>([]);
  const [requests, setRequests] = useState<EmployeeRequest[]>([]);
  const [documents, setDocuments] = useState<PortalDocument[]>([]);

  const fetchAll = useCallback(async () => {
    // If employee role but no employeeUuid yet, skip fetching
    if (isEmployee && !scopedEmployeeId) return;

    const currentYear = new Date().getFullYear();

    // Build scoped queries - employee role only fetches their own data
    const lbQuery = supabase.from('leave_balances').select('*').eq('year', currentYear);
    const lrQuery = supabase.from('leave_requests').select('*').order('created_at', { ascending: false });
    const pQuery = supabase.from('permission_requests').select('*').order('created_at', { ascending: false });
    const loansQuery = supabase.from('loans').select('*').order('created_at', { ascending: false });
    const prQuery = supabase.from('performance_reviews').select('*').order('created_at', { ascending: false });
    const trQuery = supabase.from('training_records').select('*, training_courses(name_ar, name_en)').order('created_at', { ascending: false });
    const mQuery = supabase.from('missions').select('*').order('created_at', { ascending: false });
    const vQuery = supabase.from('violations').select('*').order('created_at', { ascending: false });
    const otQuery = supabase.from('overtime_requests').select('*').order('created_at', { ascending: false });
    const dQuery = supabase.from('employee_documents').select('*').order('uploaded_at', { ascending: false });

    // Scope all queries to this employee's data only
    if (scopedEmployeeId) {
      lbQuery.eq('employee_id', scopedEmployeeId);
      lrQuery.eq('employee_id', scopedEmployeeId);
      pQuery.eq('employee_id', scopedEmployeeId);
      loansQuery.eq('employee_id', scopedEmployeeId);
      prQuery.eq('employee_id', scopedEmployeeId);
      trQuery.eq('employee_id', scopedEmployeeId);
      mQuery.eq('employee_id', scopedEmployeeId);
      vQuery.eq('employee_id', scopedEmployeeId);
      otQuery.eq('employee_id', scopedEmployeeId);
      dQuery.eq('employee_id', scopedEmployeeId);
    }

    try {
      const [lbRes, lrRes, pRes, loansRes, prRes, trRes, mRes, vRes, otRes, dRes] = await Promise.all([
        lbQuery, lrQuery, pQuery, loansQuery, prQuery, trQuery, mQuery, vQuery, otQuery, dQuery,
      ]);

      // Leave balances
      if (lbRes.data) {
        const mapped: Record<string, LeaveBalance[]> = {};
        lbRes.data.forEach(lb => {
          if (!mapped[lb.employee_id]) mapped[lb.employee_id] = [];
          mapped[lb.employee_id].push(
            { typeAr: 'سنوية', typeEn: 'Annual', total: lb.annual_total, used: lb.annual_used, remaining: lb.annual_total - lb.annual_used },
            { typeAr: 'مرضية', typeEn: 'Sick', total: lb.sick_total, used: lb.sick_used, remaining: lb.sick_total - lb.sick_used },
            { typeAr: 'عارضة', typeEn: 'Casual', total: lb.casual_total, used: lb.casual_used, remaining: lb.casual_total - lb.casual_used },
            { typeAr: 'الأذونات', typeEn: 'Permissions', total: lb.permissions_total, used: lb.permissions_used, remaining: lb.permissions_total - lb.permissions_used },
          );
        });
        setLeaveBalances(mapped);
      }

      // Leave requests
      if (lrRes.data) {
        setLeaveRequests(lrRes.data.map(r => {
          const lt = leaveTypeMap[r.leave_type] || { ar: r.leave_type, en: r.leave_type };
          return { id: r.id as any, employeeId: r.employee_id, typeAr: lt.ar, typeEn: lt.en, from: r.start_date, to: r.end_date, days: r.days, status: r.status as any };
        }));
      }

      // Permissions
      if (pRes.data) {
        setPermissions(pRes.data.map(p => {
          const pt = permTypeMap[p.permission_type] || { ar: p.permission_type, en: p.permission_type };
          return { id: p.id as any, employeeId: p.employee_id, typeAr: pt.ar, typeEn: pt.en, date: p.date, fromTime: p.start_time, toTime: p.end_time, reason: p.reason || '', status: p.status as any };
        }));
      }

      // Loans
      if (loansRes.data) {
        setPortalLoans(loansRes.data.map(l => ({
          id: l.id as any, employeeId: l.employee_id,
          typeAr: l.reason || 'قرض', typeEn: l.reason || 'Loan',
          amount: l.amount, paid: (l.paid_count || 0) * (l.monthly_installment || 0),
          remaining: l.remaining || 0, installment: l.monthly_installment || 0,
          status: l.status === 'completed' ? 'paid' as const : 'active' as const,
        })));
      }

      // Evaluations
      if (prRes.data) {
        setEvaluations(prRes.data.map(e => ({
          id: e.id as any, employeeId: e.employee_id,
          period: `${e.quarter} ${e.year}`, score: e.score ?? 0, maxScore: 5,
          reviewerAr: '', reviewerEn: '',
          status: e.status === 'approved' || e.status === 'submitted' ? 'completed' as const : 'pending' as const,
          notesAr: e.strengths || '', notesEn: e.strengths || '',
        })));
      }

      // Training
      if (trRes.data) {
        setTraining(trRes.data.map(t => ({
          id: t.id as any, employeeId: t.employee_id,
          nameAr: (t.training_courses as any)?.name_ar || '',
          nameEn: (t.training_courses as any)?.name_en || '',
          progress: t.status === 'completed' ? 100 : t.status === 'enrolled' ? 50 : 0,
          status: t.status === 'completed' ? 'completed' as const : t.status === 'enrolled' ? 'in-progress' as const : 'planned' as const,
          startDate: t.start_date || '', endDate: t.end_date || '',
        })));
      }

      // Missions
      if (mRes.data) {
        setMissions(mRes.data.map(m => ({
          id: m.id as any, employeeId: m.employee_id,
          missionType: m.mission_type as PortalMissionType,
          date: m.date, destAr: m.destination || '', destEn: m.destination || '',
          reasonAr: m.reason || '', reasonEn: m.reason || '',
          status: m.status as any,
        })));
      }

      // Violations
      if (vRes.data) {
        setViolations(vRes.data.map(v => ({
          id: v.id as any, employeeId: v.employee_id,
          date: v.date, typeAr: v.type, typeEn: v.type,
          penaltyAr: v.penalty || '', penaltyEn: v.penalty || '',
          status: v.status === 'approved' ? 'closed' as const : 'open' as const,
        })));
      }

      // Overtime days
      if (otRes.data) {
        const otTypeMap: Record<string, { ar: string; en: string }> = {
          holiday: { ar: 'إجازة رسمية', en: 'Holiday' },
          weekend: { ar: 'عطلة أسبوعية', en: 'Weekend' },
          regular: { ar: 'أخرى', en: 'Other' },
        };
        setOvertimeDays(otRes.data.map(o => {
          const t = otTypeMap[o.status] || otTypeMap.regular;
          return {
            id: o.id, employeeId: o.employee_id,
            date: o.date, overtimeType: (o as any).overtime_type || 'regular',
            typeAr: otTypeMap[(o as any).overtime_type]?.ar || 'أخرى',
            typeEn: otTypeMap[(o as any).overtime_type]?.en || 'Other',
            reason: o.reason || '', status: o.status as any,
          };
        }));
      }

      // Documents
      if (dRes.data) {
        setDocuments(dRes.data.map(d => ({
          id: d.id as any, employeeId: d.employee_id,
          nameAr: d.name, nameEn: d.name,
          date: d.uploaded_at.split('T')[0],
          typeAr: d.type || '', typeEn: d.type || '',
        })));
      }
    } catch (err) {
      console.error('PortalDataContext fetchAll error:', err);
    }
  }, [isEmployee, scopedEmployeeId]);

  useEffect(() => {
    fetchAll();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') fetchAll();
    });
    return () => subscription.unsubscribe();
  }, [fetchAll]);

  const getLeaveBalances = useCallback((empId: string) => leaveBalances[empId] || [], [leaveBalances]);
  const getLeaveRequests = useCallback((empId: string) => leaveRequests.filter(r => r.employeeId === empId), [leaveRequests]);
  
  const addLeaveRequest = useCallback(async (req: Omit<LeaveRequest, 'id' | 'status'>) => {
    const leaveType = Object.entries(leaveTypeMap).find(([, v]) => v.ar === req.typeAr || v.en === req.typeEn)?.[0] || 'annual';
    await supabase.from('leave_requests').insert({
      employee_id: req.employeeId,
      leave_type: leaveType,
      start_date: req.from,
      end_date: req.to,
      days: req.days,
    });
    await fetchAll();
  }, [fetchAll]);

  const getPermissions = useCallback((empId: string) => permissions.filter(p => p.employeeId === empId), [permissions]);
  
  const addPermission = useCallback(async (req: Omit<PermissionRequest, 'id' | 'status'>) => {
    const permType = Object.entries(permTypeMap).find(([, v]) => v.ar === req.typeAr || v.en === req.typeEn)?.[0] || 'personal';
    const { error } = await supabase.from('permission_requests').insert({
      employee_id: req.employeeId,
      permission_type: permType,
      date: req.date,
      start_time: req.fromTime,
      end_time: req.toTime,
      reason: req.reason,
    });
    if (error) {
      if (error.message?.includes('existing leave request')) {
        throw new Error('LEAVE_CONFLICT');
      }
      throw error;
    }
    await fetchAll();
  }, [fetchAll]);

  const getLoans = useCallback((empId: string) => portalLoans.filter(l => l.employeeId === empId), [portalLoans]);
  
  const addLoanRequest = useCallback(async (req: Omit<Loan, 'id' | 'status' | 'paid' | 'remaining'>) => {
    await supabase.from('loans').insert({
      employee_id: req.employeeId,
      amount: req.amount,
      installments_count: Math.ceil(req.amount / req.installment),
      reason: req.typeAr,
    });
    await fetchAll();
  }, [fetchAll]);

  const getEvaluations = useCallback((empId: string) => evaluations.filter(e => e.employeeId === empId), [evaluations]);
  const getTraining = useCallback((empId: string) => training.filter(t => t.employeeId === empId), [training]);
  const getMissions = useCallback((empId: string) => missions.filter(m => m.employeeId === empId), [missions]);
  
  const addMission = useCallback(async (req: Omit<Mission, 'id' | 'status'>) => {
    await supabase.from('missions').insert({
      employee_id: req.employeeId,
      mission_type: req.missionType,
      date: req.date,
      destination: req.destAr || req.destEn,
      reason: req.reasonAr || req.reasonEn,
    });
    await fetchAll();
  }, [fetchAll]);

  const getViolations = useCallback((empId: string) => violations.filter(v => v.employeeId === empId), [violations]);
  const getOvertimeDays = useCallback((empId: string) => overtimeDays.filter(o => o.employeeId === empId), [overtimeDays]);
  
  const addOvertimeDay = useCallback(async (req: Omit<OvertimeDay, 'id' | 'status'>) => {
    await supabase.from('overtime_requests').insert({
      employee_id: req.employeeId,
      date: req.date,
      hours: 8,
      reason: req.reason,
      overtime_type: req.overtimeType,
    } as any);
    await fetchAll();
  }, [fetchAll]);

  const getRequests = useCallback((empId: string) => requests.filter(r => r.employeeId === empId), [requests]);
  
  const addRequest = useCallback(async (req: Omit<EmployeeRequest, 'id' | 'status'>) => {
    setRequests(prev => [...prev, { ...req, id: Date.now(), status: 'pending' as const }]);
  }, []);

  const getDocuments = useCallback((empId: string) => documents.filter(d => d.employeeId === empId), [documents]);
  
  const addDocument = useCallback(async (doc: Omit<PortalDocument, 'id'>) => {
    await supabase.from('employee_documents').insert({
      employee_id: doc.employeeId,
      name: doc.nameAr || doc.nameEn,
      type: doc.typeEn || doc.typeAr,
    });
    await fetchAll();
  }, [fetchAll]);

  return (
    <PortalDataContext.Provider value={{
      getLeaveBalances, getLeaveRequests, addLeaveRequest,
      getPermissions, addPermission,
      getLoans, addLoanRequest,
      getEvaluations, getTraining,
      getMissions, addMission,
      getViolations,
      getOvertimeDays, addOvertimeDay,
      getRequests, addRequest,
      getDocuments, addDocument,
    }}>
      {children}
    </PortalDataContext.Provider>
  );
};

export const usePortalData = () => {
  const ctx = useContext(PortalDataContext);
  if (!ctx) throw new Error('usePortalData must be used within PortalDataProvider');
  return ctx;
};