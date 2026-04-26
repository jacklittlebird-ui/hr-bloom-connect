import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { initSessionMonitor } from '@/lib/security';
import { getRoleRedirectPath, normalizeLoginIdentifier } from '@/lib/auth';
import { detectAndCorrectClockSkew } from '@/lib/clockSkew';

// Errors that typically indicate the device clock is out of sync with the server.
const isClockSkewAuthError = (msg?: string | null): boolean => {
  if (!msg) return false;
  const m = msg.toLowerCase();
  return (
    m.includes('issued in the future') ||
    m.includes('jwt expired') ||
    m.includes('token has expired') ||
    m.includes('invalid jwt') ||
    m.includes('iat') ||
    m.includes('exp') ||
    m.includes('clock')
  );
};

export type UserRole = 'admin' | 'employee' | 'station_manager' | 'kiosk' | 'training_manager' | 'hr' | 'area_manager' | 'department_manager' | 'station_hr';

// Statuses that are blocked from accessing the employee portal
const BLOCKED_EMPLOYEE_STATUSES = new Set(['suspended', 'stopped', 'absent', 'resigned']);

const isEmployeeAllowedPortalAccess = (status?: string | null) => !BLOCKED_EMPLOYEE_STATUSES.has(String(status || '').toLowerCase());

export interface AuthUser {
  id: string;
  name: string;
  nameAr: string;
  email?: string;
  employeeId?: string;
  /** The actual UUID of the employee record in the employees table */
  employeeUuid?: string;
  employeeStatus?: string;
  role: UserRole;
  station?: string;
  stationId?: string;
  /** For area_manager: list of station codes they manage */
  stations?: string[];
  stationIds?: string[];
  /** For department_manager: scoped department(s). departmentId stays as primary for backward-compat. */
  departmentId?: string;
  departmentName?: string;
  departmentNameAr?: string;
  /** All department IDs the manager oversees (multi-department support) */
  departmentIds?: string[];
  /** Localized list of all department names */
  departmentNames?: string[];
  departmentNamesAr?: string[];
  supabaseUserId: string;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<{ success: boolean; error?: string; redirectTo?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchUserProfile(supabaseUser: User): Promise<AuthUser | null> {
  const { data: roles } = await supabase
    .from('user_roles')
    .select('role, station_id, employee_id, department_id')
    .eq('user_id', supabaseUser.id);

  if (!roles || roles.length === 0) return null;

  const userRole = roles[0];
  const role = userRole.role as UserRole;

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', supabaseUser.id)
    .single();

  let stationCode: string | undefined;
  let employeeCode: string | undefined;
  let employeeStatus: string | undefined;
  let nameAr = profile?.full_name || supabaseUser.email || '';
  let stationCodes: string[] | undefined;
  let stationUuids: string[] | undefined;

  if ((role === 'station_manager' || role === 'station_hr') && userRole.station_id) {
    const { data: station } = await supabase
      .from('stations')
      .select('code, name_ar')
      .eq('id', userRole.station_id)
      .single();
    stationCode = station?.code;
    if (role === 'station_hr') {
      nameAr = station?.name_ar ? `موارد بشرية ${station.name_ar}` : nameAr;
    } else {
      nameAr = station?.name_ar ? `مدير محطة ${station.name_ar}` : nameAr;
    }
  }

  // Station HR: collect all assigned stations (multi-station support)
  if (role === 'station_hr') {
    const { data: shrLinks } = await supabase
      .from('station_hr_stations' as any)
      .select('station_id')
      .eq('user_id', supabaseUser.id);
    const allStationIds = new Set<string>();
    if (userRole.station_id) allStationIds.add(userRole.station_id);
    (shrLinks || []).forEach((row: any) => row.station_id && allStationIds.add(row.station_id));

    if (allStationIds.size > 0) {
      stationUuids = Array.from(allStationIds);
      const { data: shrStations } = await supabase
        .from('stations')
        .select('id, code, name_ar')
        .in('id', stationUuids);
      const ordered = stationUuids
        .map(id => shrStations?.find(s => s.id === id))
        .filter(Boolean) as Array<{ id: string; code: string; name_ar: string }>;
      stationCodes = ordered.map(s => s.code);
      // Ensure primary stationCode is the first one if it wasn't set
      if (!stationCode && stationCodes.length > 0) stationCode = stationCodes[0];
      // Update display name when multiple stations
      if (stationCodes.length > 1) {
        nameAr = `موارد بشرية (${ordered.map(s => s.name_ar).join(' / ')})`;
      }
    }
  }

  let departmentId: string | undefined;
  let departmentName: string | undefined;
  let departmentNameAr: string | undefined;
  let departmentIds: string[] | undefined;
  let departmentNames: string[] | undefined;
  let departmentNamesAr: string[] | undefined;
  if (role === 'department_manager') {
    if (userRole.station_id) {
      const { data: station } = await supabase
        .from('stations')
        .select('code, name_ar')
        .eq('id', userRole.station_id)
        .single();
      stationCode = station?.code;
    }

    // Collect all departments (linking table + legacy primary on user_roles)
    const allDeptIds = new Set<string>();
    if (userRole.department_id) allDeptIds.add(userRole.department_id);
    const { data: linkedDepts } = await supabase
      .from('department_manager_departments')
      .select('department_id')
      .eq('user_id', supabaseUser.id);
    (linkedDepts || []).forEach((d: any) => d.department_id && allDeptIds.add(d.department_id));

    if (allDeptIds.size > 0) {
      departmentIds = Array.from(allDeptIds);
      const { data: depts } = await supabase
        .from('departments')
        .select('id, name_ar, name_en')
        .in('id', departmentIds);
      const ordered = departmentIds
        .map(id => depts?.find(d => d.id === id))
        .filter(Boolean) as Array<{ id: string; name_ar: string; name_en: string }>;
      departmentNames = ordered.map(d => d.name_en);
      departmentNamesAr = ordered.map(d => d.name_ar);

      const primaryId = userRole.department_id || departmentIds[0];
      const primary = depts?.find(d => d.id === primaryId);
      if (primary) {
        departmentId = primary.id;
        departmentName = primary.name_en;
        departmentNameAr = primary.name_ar;
      }

      const labelList = (departmentNamesAr.length > 0 ? departmentNamesAr : departmentNames || []).join(' / ');
      nameAr = labelList ? `مدير قسم ${labelList}` : nameAr;
    }
  }

  let employeeUuid: string | undefined;
  if (role === 'employee') {
    if (!userRole.employee_id) {
      throw new Error('EMPLOYEE_INACTIVE');
    }

    employeeUuid = userRole.employee_id;
    const { data: emp, error: employeeError } = await supabase
      .from('employees')
      .select('employee_code, name_ar, name_en, status')
      .eq('id', userRole.employee_id)
      .maybeSingle();

    if (employeeError) {
      throw employeeError;
    }

    employeeStatus = (emp?.status as string | undefined) || undefined;

    if (!isEmployeeAllowedPortalAccess(employeeStatus)) {
      throw new Error('EMPLOYEE_INACTIVE');
    }

    employeeCode = emp?.employee_code;
    nameAr = emp?.name_ar || nameAr;
  }

  if (role === 'area_manager') {
    const { data: amStations } = await supabase
      .from('area_manager_stations')
      .select('station_id')
      .eq('user_id', supabaseUser.id);
    if (amStations && amStations.length > 0) {
      stationUuids = amStations.map(s => s.station_id);
      const { data: stationData } = await supabase
        .from('stations')
        .select('code')
        .in('id', stationUuids);
      stationCodes = stationData?.map(s => s.code) || [];
    }
  }

  return {
    id: supabaseUser.id,
    name: profile?.full_name || supabaseUser.email || '',
    nameAr,
    email: supabaseUser.email,
    employeeId: employeeCode,
    employeeUuid,
    employeeStatus,
    role,
    station: stationCode,
    stationId: userRole.station_id || undefined,
    stations: stationCodes,
    stationIds: stationUuids,
    departmentId,
    departmentName,
    departmentNameAr,
    departmentIds,
    departmentNames,
    departmentNamesAr,
    supabaseUserId: supabaseUser.id,
  };
}

async function fetchUserProfileWithRetry(supabaseUser: User, attempts = 4): Promise<AuthUser | null> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const profile = await fetchUserProfile(supabaseUser);
      if (profile) return profile;
    } catch (error: any) {
      if (error?.message === 'EMPLOYEE_INACTIVE') {
        throw error;
      }
      lastError = error;
    }

    if (attempt < attempts - 1) {
      const delayMs = 300 * (attempt + 1);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  if (lastError) {
    console.error('User profile fetch failed after retries:', lastError);
  }

  return null;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const initialLoadDone = React.useRef(false);
  const authResolutionId = React.useRef(0);

  const clearAuthState = useCallback(() => {
    authResolutionId.current += 1;
    initialLoadDone.current = false;
    setUser(null);
    setSession(null);
    setLoading(false);
  }, []);

  const resolveAuthenticatedUser = useCallback(async (supabaseUser: User, isInitialOrLogin = false) => {
    const resolutionId = ++authResolutionId.current;

    if (isInitialOrLogin) {
      setLoading(true);
    }

    let profile: AuthUser | null = null;

    try {
      profile = await fetchUserProfileWithRetry(supabaseUser);
    } catch (err: any) {
      if (resolutionId !== authResolutionId.current) {
        return null;
      }
      await supabase.auth.signOut();
      clearAuthState();
      throw err;
    }

    if (resolutionId !== authResolutionId.current) {
      return null;
    }

    if (!profile) {
      await supabase.auth.signOut();
      clearAuthState();
      return null;
    }

    setUser(profile);
    setLoading(false);
    initialLoadDone.current = true;
    return profile;
  }, [clearAuthState]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);

      if (newSession?.user) {
        const isBackgroundEvent = initialLoadDone.current && (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED');

        if (isBackgroundEvent) {
          setTimeout(() => {
            void resolveAuthenticatedUser(newSession.user, false).catch(() => undefined);
          }, 0);
        } else if (!initialLoadDone.current) {
          setLoading(true);
          setTimeout(() => {
            void resolveAuthenticatedUser(newSession.user, true).catch(() => undefined);
          }, 0);
        }
      } else {
        clearAuthState();
      }
    });

    void supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);

      if (initialSession?.user) {
        void resolveAuthenticatedUser(initialSession.user, true).catch(() => undefined);
        return;
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [clearAuthState, resolveAuthenticatedUser]);

  useEffect(() => {
    if (!user) return;
    const cleanup = initSessionMonitor(async () => {
      console.log('Session expired due to inactivity');
      await supabase.auth.signOut();
      clearAuthState();
    });
    return cleanup;
  }, [clearAuthState, user]);

  const login = useCallback(async ({ email, password }: { email: string; password: string }) => {
    const normalizedEmail = normalizeLoginIdentifier(email);

    // Mark initial load as done BEFORE signInWithPassword so the onAuthStateChange
    // listener treats the upcoming SIGNED_IN event as a background event and does
    // NOT race with our manual profile fetch below (which would otherwise cause
    // resolutionId churn and end up calling signOut on a perfectly valid login).
    initialLoadDone.current = true;

    let { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });

    // If the failure looks like a clock-skew problem (device clock is wrong),
    // synchronously re-detect the offset against the server and retry once.
    // This makes login resilient for users whose phones / PCs have wrong dates.
    if (error && isClockSkewAuthError(error.message)) {
      console.warn('[auth] Login failed with possible clock-skew error — recalibrating clock and retrying:', error.message);
      await detectAndCorrectClockSkew();
      const retry = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      initialLoadDone.current = false;
      return { success: false, error: error.message };
    }

    if (data.user) {
      // Bump resolution id so any in-flight listener resolution is invalidated
      // and only this manual flow controls the final auth state.
      const myResolution = ++authResolutionId.current;

      let profile: AuthUser | null = null;
      try {
        profile = await fetchUserProfileWithRetry(data.user);
      } catch (e: any) {
        console.error('Profile fetch failed after login:', e);
        await supabase.auth.signOut();
        clearAuthState();
        if (e?.message === 'EMPLOYEE_INACTIVE') {
          return { success: false, error: 'هذا الحساب غير نشط أو غير مؤهل للدخول. برجاء التواصل مع الموارد البشرية.' };
        }
        return { success: false, error: 'تعذر تحميل بيانات الحساب، برجاء المحاولة مرة أخرى' };
      }

      // If another resolution started while we were fetching, abort silently.
      if (myResolution !== authResolutionId.current) {
        if (!profile) return { success: false, error: 'تعذر تحميل بيانات الحساب، برجاء المحاولة مرة أخرى' };
        // Still apply our profile since we have a valid one.
        authResolutionId.current = myResolution;
      }

      if (!profile) {
        await supabase.auth.signOut();
        clearAuthState();
        return { success: false, error: 'لم يتم العثور على صلاحيات لهذا الحساب' };
      }

      // Apply the auth state directly — no second resolveAuthenticatedUser call,
      // which previously caused a race that nulled out the user right after login.
      setSession(data.session);
      setUser(profile);
      setLoading(false);
      initialLoadDone.current = true;

      return { success: true, redirectTo: getRoleRedirectPath(profile.role) };
    }

    return { success: true };
  }, [clearAuthState]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    clearAuthState();
  }, [clearAuthState]);

  return (
    <AuthContext.Provider value={{ user, session, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
