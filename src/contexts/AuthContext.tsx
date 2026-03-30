import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { initSessionMonitor } from '@/lib/security';
import { getRoleRedirectPath, normalizeLoginIdentifier } from '@/lib/auth';

export type UserRole = 'admin' | 'employee' | 'station_manager' | 'kiosk' | 'training_manager' | 'hr' | 'area_manager';

export interface AuthUser {
  id: string;
  name: string;
  nameAr: string;
  email?: string;
  employeeId?: string;
  /** The actual UUID of the employee record in the employees table */
  employeeUuid?: string;
  role: UserRole;
  station?: string;
  stationId?: string;
  /** For area_manager: list of station codes they manage */
  stations?: string[];
  stationIds?: string[];
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
  // Get roles
  const { data: roles } = await supabase
    .from('user_roles')
    .select('role, station_id, employee_id')
    .eq('user_id', supabaseUser.id);

  if (!roles || roles.length === 0) return null;

  const userRole = roles[0];
  const role = userRole.role as UserRole;

  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', supabaseUser.id)
    .single();

  let stationCode: string | undefined;
  let employeeCode: string | undefined;
  let nameAr = profile?.full_name || supabaseUser.email || '';

  // Get station code if station_manager
  if (role === 'station_manager' && userRole.station_id) {
    const { data: station } = await supabase
      .from('stations')
      .select('code, name_ar')
      .eq('id', userRole.station_id)
      .single();
    stationCode = station?.code;
    nameAr = station?.name_ar ? `مدير محطة ${station.name_ar}` : nameAr;
  }

  // Get employee info if employee
  let employeeUuid: string | undefined;
  if (role === 'employee' && userRole.employee_id) {
    employeeUuid = userRole.employee_id;
    const { data: emp } = await supabase
      .from('employees')
      .select('employee_code, name_ar, name_en')
      .eq('id', userRole.employee_id)
      .single();
    employeeCode = emp?.employee_code;
    nameAr = emp?.name_ar || nameAr;
  }

  // Get area_manager stations
  let stationCodes: string[] | undefined;
  let stationUuids: string[] | undefined;
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
    role,
    station: stationCode,
    stationId: userRole.station_id || undefined,
    stations: stationCodes,
    stationIds: stationUuids,
    supabaseUserId: supabaseUser.id,
  };
}

async function fetchUserProfileWithRetry(supabaseUser: User, attempts = 4): Promise<AuthUser | null> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const profile = await fetchUserProfile(supabaseUser);
      if (profile) return profile;
    } catch (error) {
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
  // Track whether initial auth resolution has completed (prevents provider unmount on token refresh)
  const initialLoadDone = React.useRef(false);

  const resolveAuthenticatedUser = useCallback(async (supabaseUser: User, isInitialOrLogin = false) => {
    // Only show loading spinner on initial load or explicit login, NOT on token refresh
    if (isInitialOrLogin) {
      setLoading(true);
    }
    const profile = await fetchUserProfileWithRetry(supabaseUser);

    if (!profile) {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setLoading(false);
      return null;
    }

    setUser(profile);
    setLoading(false);
    initialLoadDone.current = true;
    return profile;
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        // On token refresh or other background events, silently re-resolve without loading state
        const isBackgroundEvent = initialLoadDone.current && (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED');
        if (isBackgroundEvent) {
          // Silently update profile in background without triggering loading/unmount
          setTimeout(async () => {
            await resolveAuthenticatedUser(newSession.user, false);
          }, 0);
        } else if (!initialLoadDone.current) {
          // Initial auth state - show loading
          setLoading(true);
          setTimeout(async () => {
            await resolveAuthenticatedUser(newSession.user, true);
          }, 0);
        }
      } else {
        setUser(null);
        setLoading(false);
        initialLoadDone.current = false;
      }
    });

    // Then get initial session
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      setSession(initialSession);
      if (initialSession?.user) {
        await resolveAuthenticatedUser(initialSession.user, true);
        return;
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [resolveAuthenticatedUser]);

  // Session timeout monitor - auto logout after 30 min inactivity
  useEffect(() => {
    if (!user) return;
    const cleanup = initSessionMonitor(async () => {
      console.log('Session expired due to inactivity');
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
    });
    return cleanup;
  }, [user]);

  const login = useCallback(async ({ email, password }: { email: string; password: string }) => {
    const normalizedEmail = normalizeLoginIdentifier(email);
    const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
    if (error) {
      return { success: false, error: error.message };
    }

    if (data.user) {
      try {
        setSession(data.session);
        const profile = await resolveAuthenticatedUser(data.user, true);
        if (!profile) {
          return { success: false, error: 'لم يتم العثور على صلاحيات لهذا الحساب' };
        }
        return { success: true, redirectTo: getRoleRedirectPath(profile.role) };
      } catch (e) {
        console.error('Profile fetch failed after login:', e);
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        return { success: false, error: 'تعذر تحميل بيانات الحساب، برجاء المحاولة مرة أخرى' };
      }
    }
    return { success: true };
  }, [resolveAuthenticatedUser]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

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
