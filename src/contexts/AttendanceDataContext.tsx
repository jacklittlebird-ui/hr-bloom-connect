import React, { createContext, useContext, useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from '@/contexts/NotificationContext';
import { useAuth } from '@/contexts/AuthContext';
import { trackQuery, debouncedFetch, invalidateCache } from '@/lib/queryOptimizer';

export interface AttendanceEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNameAr: string;
  department: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: 'present' | 'absent' | 'late' | 'early-leave' | 'on-leave' | 'weekend' | 'mission';
  isMission?: boolean;
  workHours: number;
  workMinutes: number;
  overtime: number;
  notes?: string;
}

export const calculateWorkTime = (checkIn: string | null, checkOut: string | null): { hours: number; minutes: number; totalMinutes: number } => {
  if (!checkIn || !checkOut) return { hours: 0, minutes: 0, totalMinutes: 0 };
  const [inH, inM] = checkIn.split(':').map(Number);
  const [outH, outM] = checkOut.split(':').map(Number);
  let totalInMinutes = inH * 60 + inM;
  let totalOutMinutes = outH * 60 + outM;
  if (totalOutMinutes < totalInMinutes) totalOutMinutes += 24 * 60;
  const diffMinutes = totalOutMinutes - totalInMinutes;
  return { hours: Math.floor(diffMinutes / 60), minutes: diffMinutes % 60, totalMinutes: diffMinutes };
};

const isFlexibleSchedule = (scheduleType?: string | null) =>
  scheduleType === 'flexible' || scheduleType === 'fully-flexible' || scheduleType === 'fully_flexible';

interface AttendanceDataContextType {
  records: AttendanceEntry[];
  refresh: () => Promise<void>;
  checkIn: (employeeId: string, employeeName: string, employeeNameAr: string, department: string) => void;
  checkOut: (recordId: string) => void;
  addMissionAttendance: (employeeId: string, employeeName: string, employeeNameAr: string, department: string, date: string, checkIn: string, checkOut: string, hours: number) => void;
  getEmployeeRecords: (employeeId: string) => AttendanceEntry[];
  getEmployeeMonthlyRecords: (employeeId: string, year: number, month: number) => AttendanceEntry[];
  getMonthlyStats: (employeeId: string, year: number, month: number) => {
    present: number; late: number; absent: number; totalHours: number; totalMinutes: number; overtime: number;
  };
}

const AttendanceDataContext = createContext<AttendanceDataContextType | undefined>(undefined);

const formatTime = (ts: string | null): string | null => {
  if (!ts) return null;
  try {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  } catch { return null; }
};

const buildEntry = (r: any, employeeName = '', employeeNameAr = '', department = ''): AttendanceEntry => {
  const ci = formatTime(r.check_in);
  const co = formatTime(r.check_out);
  const wt = calculateWorkTime(ci, co);
  const hasDbHours = (r.work_hours != null && r.work_hours > 0) || (r.work_minutes != null && r.work_minutes > 0);
  let finalHours: number, finalMinutes: number;
  if (hasDbHours) {
    const dbM = r.work_minutes ?? 0;
    const totalMins = dbM > 0 ? Math.round(dbM) : Math.round((r.work_hours ?? 0) * 60);
    finalHours = Math.floor(totalMins / 60);
    finalMinutes = totalMins % 60;
  } else {
    finalHours = wt.hours;
    finalMinutes = wt.minutes;
  }
  return {
    id: r.id,
    employeeId: r.employee_id,
    employeeName: (r.employees as any)?.name_en || employeeName,
    employeeNameAr: (r.employees as any)?.name_ar || employeeNameAr,
    department: (r.employees as any)?.departments?.name_ar || department,
    date: r.date,
    checkIn: ci,
    checkOut: co,
    status: r.status as AttendanceEntry['status'],
    isMission: r.status === 'mission',
    workHours: finalHours,
    workMinutes: finalMinutes,
    overtime: Math.max(0, finalHours - 8),
    notes: r.notes || undefined,
  };
};

// Employee-specific select columns (no JOINs)
const EMPLOYEE_COLS = 'id, employee_id, date, check_in, check_out, status, work_hours, work_minutes, notes, is_late';
// Admin select: specific columns + minimal JOINs
const ADMIN_COLS = 'id, employee_id, date, check_in, check_out, status, work_hours, work_minutes, notes, is_late, employees(name_en, name_ar, department_id, departments(name_ar))';

export const AttendanceDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [records, setRecords] = useState<AttendanceEntry[]>([]);
  const { addNotification } = useNotifications();
  const { user } = useAuth();
  const isEmployee = user?.role === 'employee';
  const scopedEmployeeId = isEmployee ? user?.employeeUuid : null;

  const fetchRecords = useCallback(async () => {
    const cacheKey = `attendance_${scopedEmployeeId || 'all'}`;
    
    const doFetch = async () => {
      if (isEmployee && scopedEmployeeId) {
        const { data } = await supabase
          .from('attendance_records')
          .select(EMPLOYEE_COLS)
          .eq('employee_id', scopedEmployeeId)
          .order('date', { ascending: false })
          .limit(50);
        trackQuery('attendance', data?.length || 0);
        return (data || []).map(r => buildEntry(r));
      }

      const { data } = await supabase
        .from('attendance_records')
        .select(ADMIN_COLS)
        .order('date', { ascending: false })
        .limit(200);
      trackQuery('attendance', data?.length || 0);
      return (data || []).map(r => buildEntry(r));
    };

    const result = await debouncedFetch(cacheKey, doFetch, { ttlMs: 30_000 });
    setRecords(result);
  }, [isEmployee, scopedEmployeeId]);

  const hasMounted = useRef(false);
  useEffect(() => {
    if (hasMounted.current) return;
    hasMounted.current = true;
    fetchRecords();
  }, [fetchRecords]);

  // Listen to auth changes but debounce
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        invalidateCache('attendance_');
        fetchRecords();
      }
    });
    return () => subscription.unsubscribe();
  }, [fetchRecords]);

  const checkInFn = useCallback(async (employeeId: string, employeeName: string, employeeNameAr: string, department: string) => {
    const now = new Date();
    const dateString = now.toISOString().split('T')[0];
    const checkInTs = now.toISOString();

    // Check if there's ANY record for today (open or closed) — prevent duplicates
    const { data: todayRecord } = await supabase
      .from('attendance_records')
      .select('id, check_out')
      .eq('employee_id', employeeId)
      .eq('date', dateString)
      .limit(1)
      .maybeSingle();

    if (todayRecord) {
      addNotification({
        titleAr: `يوجد سجل حضور بالفعل لـ ${employeeNameAr} اليوم`,
        titleEn: `${employeeName} already has a record for today`,
        type: 'warning',
        module: 'attendance',
      });
      return;
    }

    const { data: assignment } = await supabase
      .from('attendance_assignments')
      .select('rule_id, attendance_rules(schedule_type)')
      .eq('employee_id', employeeId)
      .eq('is_active', true)
      .maybeSingle();

    const scheduleType = (assignment?.attendance_rules as any)?.schedule_type || 'fixed';
    const isFlexible = isFlexibleSchedule(scheduleType);
    const isLate = !isFlexible && now.getHours() >= 9;

    // Close any previously open records from PREVIOUS days only
    const { data: openRecords } = await supabase
      .from('attendance_records')
      .select('id, check_in, date')
      .eq('employee_id', employeeId)
      .is('check_out', null)
      .neq('date', dateString);

    if (openRecords && openRecords.length > 0) {
      for (const rec of openRecords) {
        await supabase.from('attendance_records')
          .update({ 
            check_out: rec.check_in, 
            work_hours: 0,
            work_minutes: 0,
            notes: 'لم يتم تسجيل انصراف / No checkout recorded - auto-closed' 
          })
          .eq('id', rec.id);
      }
    }

    await supabase.from('attendance_records').insert({
      employee_id: employeeId,
      date: dateString,
      check_in: checkInTs,
      status: isLate ? 'late' : 'present',
      is_late: isLate,
    });

    addNotification({
      titleAr: `تسجيل حضور: ${employeeNameAr}`,
      titleEn: `Check-in: ${employeeName}`,
      type: isLate ? 'warning' : 'success',
      module: 'attendance',
    });
    invalidateCache('attendance_');
    await fetchRecords();
  }, [addNotification, fetchRecords]);

  const checkOutFn = useCallback(async (recordId: string) => {
    const now = new Date();
    const checkOutTs = now.toISOString();

    const record = records.find(r => r.id === recordId);

    let isFlexible = false;
    if (record) {
      const { data: assignment } = await supabase
        .from('attendance_assignments')
        .select('rule_id, attendance_rules(schedule_type)')
        .eq('employee_id', record.employeeId)
        .eq('is_active', true)
        .maybeSingle();

      const scheduleType = (assignment?.attendance_rules as any)?.schedule_type || 'fixed';
      isFlexible = isFlexibleSchedule(scheduleType);
    }

    const isEarlyLeave = !isFlexible && now.getHours() < 17;

    await supabase.from('attendance_records').update({
      check_out: checkOutTs,
      status: isEarlyLeave ? 'early-leave' : undefined,
    }).eq('id', recordId);

    if (record) {
      addNotification({
        titleAr: `تسجيل انصراف: ${record.employeeNameAr}`,
        titleEn: `Check-out: ${record.employeeName}`,
        type: isEarlyLeave ? 'warning' : 'success',
        module: 'attendance',
      });
    }
    invalidateCache('attendance_');
    await fetchRecords();
  }, [records, addNotification, fetchRecords]);

  const addMissionAttendance = useCallback(async (employeeId: string, employeeName: string, employeeNameAr: string, department: string, date: string, checkInTime: string, checkOutTime: string, hours: number) => {
    const ciTs = `${date}T${checkInTime}:00`;
    const coTs = `${date}T${checkOutTime}:00`;

    await supabase.from('attendance_records').delete().eq('employee_id', employeeId).eq('date', date);
    await supabase.from('attendance_records').insert({
      employee_id: employeeId,
      date,
      check_in: ciTs,
      check_out: coTs,
      status: 'mission',
      notes: 'مأمورية / Mission',
    });

    invalidateCache('attendance_');
    await fetchRecords();
  }, [fetchRecords]);

  const getEmployeeRecords = useCallback((employeeId: string) => {
    return records.filter(r => r.employeeId === employeeId).sort((a, b) => b.date.localeCompare(a.date));
  }, [records]);

  const getEmployeeMonthlyRecords = useCallback((employeeId: string, year: number, month: number) => {
    return records.filter(r => {
      if (r.employeeId !== employeeId) return false;
      const d = new Date(r.date);
      return d.getFullYear() === year && d.getMonth() === month;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [records]);

  const getMonthlyStats = useCallback((employeeId: string, year: number, month: number) => {
    const monthRecords = records.filter(r => {
      if (r.employeeId !== employeeId) return false;
      const d = new Date(r.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
    const present = monthRecords.filter(r => ['present', 'late', 'early-leave', 'mission'].includes(r.status)).length;
    const late = monthRecords.filter(r => r.status === 'late').length;
    const absent = monthRecords.filter(r => r.status === 'absent').length;
    const totalMinutes = monthRecords.reduce((s, r) => s + r.workHours * 60 + r.workMinutes, 0);
    const overtime = monthRecords.reduce((s, r) => s + r.overtime, 0);
    return { present, late, absent, totalHours: Math.floor(totalMinutes / 60), totalMinutes: totalMinutes % 60, overtime };
  }, [records]);

  return (
    <AttendanceDataContext.Provider value={{ records, refresh: fetchRecords, checkIn: checkInFn, checkOut: checkOutFn, addMissionAttendance, getEmployeeRecords, getEmployeeMonthlyRecords, getMonthlyStats }}>
      {children}
    </AttendanceDataContext.Provider>
  );
};

export const useAttendanceData = () => {
  const ctx = useContext(AttendanceDataContext);
  if (!ctx) throw new Error('useAttendanceData must be used within AttendanceDataProvider');
  return ctx;
};
