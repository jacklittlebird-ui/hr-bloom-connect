import React, { createContext, useContext, useCallback, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { trackQuery, debouncedFetch, invalidateCache } from '@/lib/queryOptimizer';

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
  // Lazy loaders — call to fetch data for a specific section
  ensureLeaves: () => Promise<void>;
  ensureLoans: () => Promise<void>;
  ensureEvaluations: () => Promise<void>;
  ensureTraining: () => Promise<void>;
  ensureMissions: () => Promise<void>;
  ensureViolations: () => Promise<void>;
  ensureDocuments: () => Promise<void>;
}

const PortalDataContext = createContext<PortalDataContextType | undefined>(undefined);

export const PortalDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const isEmployee = user?.role === 'employee';
  const scopedEmployeeId = isEmployee ? user?.employeeUuid : null;
  const LIMIT = 30;

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

  // Track which sections have been loaded
  const loaded = useRef<Set<string>>(new Set());

  // ─── Lazy Section Fetchers ─────────────────────────────────────────────

  const ensureLeaves = useCallback(async () => {
    if (loaded.current.has('leaves') || (isEmployee && !scopedEmployeeId)) return;
    loaded.current.add('leaves');

    await debouncedFetch(`portal_leaves_${scopedEmployeeId || 'all'}`, async () => {
      const currentYear = new Date().getFullYear();
      const lbQuery = supabase.from('leave_balances').select('employee_id, annual_total, annual_used, sick_total, sick_used, casual_total, casual_used, permissions_total, permissions_used').eq('year', currentYear);
      const lrQuery = supabase.from('leave_requests').select('id, employee_id, leave_type, start_date, end_date, days, status').order('created_at', { ascending: false }).limit(LIMIT);
      const pQuery = supabase.from('permission_requests').select('id, employee_id, permission_type, date, start_time, end_time, reason, status').order('created_at', { ascending: false }).limit(LIMIT);
      const otQuery = supabase.from('overtime_requests').select('id, employee_id, date, overtime_type, reason, status').order('created_at', { ascending: false }).limit(LIMIT);

      if (scopedEmployeeId) {
        lbQuery.eq('employee_id', scopedEmployeeId);
        lrQuery.eq('employee_id', scopedEmployeeId);
        pQuery.eq('employee_id', scopedEmployeeId);
        otQuery.eq('employee_id', scopedEmployeeId);
      }

      try {
        const [lbRes, lrRes, pRes, otRes] = await Promise.all([lbQuery, lrQuery, pQuery, otQuery]);
        trackQuery('portal_leaves', (lbRes.data?.length || 0) + (lrRes.data?.length || 0) + (pRes.data?.length || 0) + (otRes.data?.length || 0));

        if (lbRes.data) {
          const mapped: Record<string, LeaveBalance[]> = {};
          lbRes.data.forEach((lb: any) => {
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

        if (lrRes.data) {
          setLeaveRequests(lrRes.data.map((r: any) => {
            const lt = leaveTypeMap[r.leave_type] || { ar: r.leave_type, en: r.leave_type };
            return { id: r.id as any, employeeId: r.employee_id, typeAr: lt.ar, typeEn: lt.en, from: r.start_date, to: r.end_date, days: r.days, status: r.status as any };
          }));
        }

        if (pRes.data) {
          setPermissions(pRes.data.map((p: any) => {
            const pt = permTypeMap[p.permission_type] || { ar: p.permission_type, en: p.permission_type };
            return { id: p.id as any, employeeId: p.employee_id, typeAr: pt.ar, typeEn: pt.en, date: p.date, fromTime: p.start_time, toTime: p.end_time, reason: p.reason || '', status: p.status as any };
          }));
        }

        if (otRes.data) {
          const otTypeMap: Record<string, { ar: string; en: string }> = {
            holiday: { ar: 'إجازة رسمية', en: 'Holiday' },
            weekend: { ar: 'عطلة أسبوعية', en: 'Weekend' },
            regular: { ar: 'أخرى', en: 'Other' },
          };
          setOvertimeDays(otRes.data.map((o: any) => ({
            id: o.id, employeeId: o.employee_id,
            date: o.date, overtimeType: o.overtime_type || 'regular',
            typeAr: otTypeMap[o.overtime_type]?.ar || 'أخرى',
            typeEn: otTypeMap[o.overtime_type]?.en || 'Other',
            reason: o.reason || '', status: o.status as any,
          })));
        }
      } catch (err) {
        console.error('Portal leaves fetch error:', err);
        loaded.current.delete('leaves');
      }
      return true;
    }, { ttlMs: 30_000 });
  }, [isEmployee, scopedEmployeeId]);

  const ensureLoans = useCallback(async () => {
    if (loaded.current.has('loans') || (isEmployee && !scopedEmployeeId)) return;
    loaded.current.add('loans');

    await debouncedFetch(`portal_loans_${scopedEmployeeId || 'all'}`, async () => {
      const q = supabase.from('loans').select('id, employee_id, amount, paid_count, monthly_installment, remaining, reason, status').order('created_at', { ascending: false }).limit(20);
      if (scopedEmployeeId) q.eq('employee_id', scopedEmployeeId);
      try {
        const { data } = await q;
        trackQuery('portal_loans', data?.length || 0);
        if (data) {
          setPortalLoans(data.map((l: any) => ({
            id: l.id as any, employeeId: l.employee_id,
            typeAr: l.reason || 'قرض', typeEn: l.reason || 'Loan',
            amount: l.amount, paid: (l.paid_count || 0) * (l.monthly_installment || 0),
            remaining: l.remaining || 0, installment: l.monthly_installment || 0,
            status: l.status === 'completed' ? 'paid' as const : 'active' as const,
          })));
        }
      } catch (err) {
        console.error('Portal loans fetch error:', err);
        loaded.current.delete('loans');
      }
      return true;
    }, { ttlMs: 60_000 });
  }, [isEmployee, scopedEmployeeId]);

  const ensureEvaluations = useCallback(async () => {
    if (loaded.current.has('evaluations') || (isEmployee && !scopedEmployeeId)) return;
    loaded.current.add('evaluations');

    await debouncedFetch(`portal_evals_${scopedEmployeeId || 'all'}`, async () => {
      const q = supabase.from('performance_reviews').select('id, employee_id, quarter, year, score, status, strengths').order('created_at', { ascending: false }).limit(20);
      if (scopedEmployeeId) q.eq('employee_id', scopedEmployeeId);
      try {
        const { data } = await q;
        trackQuery('portal_evals', data?.length || 0);
        if (data) {
          setEvaluations(data.map((e: any) => ({
            id: e.id as any, employeeId: e.employee_id,
            period: `${e.quarter} ${e.year}`, score: e.score ?? 0, maxScore: 5,
            reviewerAr: '', reviewerEn: '',
            status: e.status === 'approved' || e.status === 'submitted' ? 'completed' as const : 'pending' as const,
            notesAr: e.strengths || '', notesEn: e.strengths || '',
          })));
        }
      } catch (err) {
        console.error('Portal evals fetch error:', err);
        loaded.current.delete('evaluations');
      }
      return true;
    }, { ttlMs: 120_000 });
  }, [isEmployee, scopedEmployeeId]);

  const ensureTraining = useCallback(async () => {
    if (loaded.current.has('training') || (isEmployee && !scopedEmployeeId)) return;
    loaded.current.add('training');

    await debouncedFetch(`portal_training_${scopedEmployeeId || 'all'}`, async () => {
      const q = supabase.from('training_records').select('id, employee_id, status, start_date, end_date').order('created_at', { ascending: false }).limit(20);
      if (scopedEmployeeId) q.eq('employee_id', scopedEmployeeId);
      try {
        const { data } = await q;
        trackQuery('portal_training', data?.length || 0);
        if (data) {
          setTraining(data.map((t: any) => ({
            id: t.id as any, employeeId: t.employee_id,
            nameAr: '', nameEn: '',
            progress: t.status === 'completed' ? 100 : t.status === 'enrolled' ? 50 : 0,
            status: t.status === 'completed' ? 'completed' as const : t.status === 'enrolled' ? 'in-progress' as const : 'planned' as const,
            startDate: t.start_date || '', endDate: t.end_date || '',
          })));
        }
      } catch (err) {
        console.error('Portal training fetch error:', err);
        loaded.current.delete('training');
      }
      return true;
    }, { ttlMs: 120_000 });
  }, [isEmployee, scopedEmployeeId]);

  const ensureMissions = useCallback(async () => {
    if (loaded.current.has('missions') || (isEmployee && !scopedEmployeeId)) return;
    loaded.current.add('missions');

    await debouncedFetch(`portal_missions_${scopedEmployeeId || 'all'}`, async () => {
      const q = supabase.from('missions').select('id, employee_id, mission_type, date, destination, reason, status').order('created_at', { ascending: false }).limit(LIMIT);
      if (scopedEmployeeId) q.eq('employee_id', scopedEmployeeId);
      try {
        const { data } = await q;
        trackQuery('portal_missions', data?.length || 0);
        if (data) {
          setMissions(data.map((m: any) => ({
            id: m.id as any, employeeId: m.employee_id,
            missionType: m.mission_type as PortalMissionType,
            date: m.date, destAr: m.destination || '', destEn: m.destination || '',
            reasonAr: m.reason || '', reasonEn: m.reason || '',
            status: m.status as any,
          })));
        }
      } catch (err) {
        console.error('Portal missions fetch error:', err);
        loaded.current.delete('missions');
      }
      return true;
    }, { ttlMs: 30_000 });
  }, [isEmployee, scopedEmployeeId]);

  const ensureViolations = useCallback(async () => {
    if (loaded.current.has('violations') || (isEmployee && !scopedEmployeeId)) return;
    loaded.current.add('violations');

    await debouncedFetch(`portal_violations_${scopedEmployeeId || 'all'}`, async () => {
      const q = supabase.from('violations').select('id, employee_id, date, type, penalty, status').order('created_at', { ascending: false }).limit(20);
      if (scopedEmployeeId) q.eq('employee_id', scopedEmployeeId);
      try {
        const { data } = await q;
        trackQuery('portal_violations', data?.length || 0);
        if (data) {
          setViolations(data.map((v: any) => ({
            id: v.id as any, employeeId: v.employee_id,
            date: v.date, typeAr: v.type, typeEn: v.type,
            penaltyAr: v.penalty || '', penaltyEn: v.penalty || '',
            status: v.status === 'approved' ? 'closed' as const : 'open' as const,
          })));
        }
      } catch (err) {
        console.error('Portal violations fetch error:', err);
        loaded.current.delete('violations');
      }
      return true;
    }, { ttlMs: 120_000 });
  }, [isEmployee, scopedEmployeeId]);

  const ensureDocuments = useCallback(async () => {
    if (loaded.current.has('documents') || (isEmployee && !scopedEmployeeId)) return;
    loaded.current.add('documents');

    await debouncedFetch(`portal_docs_${scopedEmployeeId || 'all'}`, async () => {
      const q = supabase.from('employee_documents').select('id, employee_id, name, type, uploaded_at').order('uploaded_at', { ascending: false }).limit(20);
      if (scopedEmployeeId) q.eq('employee_id', scopedEmployeeId);
      try {
        const { data } = await q;
        trackQuery('portal_docs', data?.length || 0);
        if (data) {
          setDocuments(data.map((d: any) => ({
            id: d.id as any, employeeId: d.employee_id,
            nameAr: d.name, nameEn: d.name,
            date: d.uploaded_at.split('T')[0],
            typeAr: d.type || '', typeEn: d.type || '',
          })));
        }
      } catch (err) {
        console.error('Portal docs fetch error:', err);
        loaded.current.delete('documents');
      }
      return true;
    }, { ttlMs: 120_000 });
  }, [isEmployee, scopedEmployeeId]);

  // ─── Getters ───────────────────────────────────────────────────────────

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
    invalidateCache('portal_leaves');
    loaded.current.delete('leaves');
    await ensureLeaves();
  }, [ensureLeaves]);

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
      if (error.message?.includes('existing leave request')) throw new Error('LEAVE_CONFLICT');
      throw error;
    }
    invalidateCache('portal_leaves');
    loaded.current.delete('leaves');
    await ensureLeaves();
  }, [ensureLeaves]);

  const getLoans = useCallback((empId: string) => portalLoans.filter(l => l.employeeId === empId), [portalLoans]);
  
  const addLoanRequest = useCallback(async (req: Omit<Loan, 'id' | 'status' | 'paid' | 'remaining'>) => {
    await supabase.from('loans').insert({
      employee_id: req.employeeId,
      amount: req.amount,
      installments_count: Math.ceil(req.amount / req.installment),
      reason: req.typeAr,
    });
    invalidateCache('portal_loans');
    loaded.current.delete('loans');
    await ensureLoans();
  }, [ensureLoans]);

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
    invalidateCache('portal_missions');
    loaded.current.delete('missions');
    await ensureMissions();
  }, [ensureMissions]);

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
    invalidateCache('portal_leaves');
    loaded.current.delete('leaves');
    await ensureLeaves();
  }, [ensureLeaves]);

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
    invalidateCache('portal_docs');
    loaded.current.delete('documents');
    await ensureDocuments();
  }, [ensureDocuments]);

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
      ensureLeaves, ensureLoans, ensureEvaluations,
      ensureTraining, ensureMissions, ensureViolations, ensureDocuments,
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
