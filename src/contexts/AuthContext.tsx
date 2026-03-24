import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { initSessionMonitor } from '@/lib/security';
import { withTimeout } from '@/lib/asyncControl';
import { getCachedValue, setCachedValue } from '@/lib/runtimeCache';
import { acquireLoginSlot, releaseSlot, throttle, recordLoginMetric } from '@/lib/connectionGuard';

const AUTH_PROFILE_CACHE_KEY = 'auth_profile_';
const AUTH_PROFILE_CACHE_TTL = 5 * 60_000; // 5 min
const AUTH_STORAGE_KEY = `sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID}-auth-token`;

// Prevent duplicate concurrent login calls
let loginInFlight = false;
let authRecoveryInFlight = false;

export type UserRole = 'admin' | 'employee' | 'station_manager' | 'kiosk' | 'training_manager' | 'hr' | 'area_manager';

const EMPLOYEE_EMAIL_DOMAIN = 'linkagency.com';

const normalizeArabicDigits = (value: string) =>
  value.replace(/[٠-٩]/g, (digit) => '٠١٢٣٤٥٦٧٨٩'.indexOf(digit).toString());

const normalizeLoginIdentifier = (value: string) => {
  const normalized = normalizeArabicDigits(value).trim().toLowerCase().replace(/\s+/g, '');
  if (!normalized) return '';
  if (normalized.includes('@')) return normalized;
  return `${normalized}@${EMPLOYEE_EMAIL_DOMAIN}`;
};

const isNetworkAuthError = (error: unknown) => {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  return /failed to fetch|network|authretryablefetcherror|refresh_token|timeout/i.test(message);
};

async function clearBrokenLocalSession() {
  if (authRecoveryInFlight) return;
  authRecoveryInFlight = true;
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch { /* ignore */ }
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  } catch { /* ignore */ } finally {
    authRecoveryInFlight = false;
  }
}

export interface AuthUser {
  id: string;
  name: string;
  nameAr: string;
  email?: string;
  employeeId?: string;
  employeeUuid?: string;
  role: UserRole;
  station?: string;
  stationId?: string;
  stations?: string[];
  stationIds?: string[];
  supabaseUserId: string;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── OPTIMISED PROFILE FETCH ───
// Uses indexed lookups, LIMIT 1, minimal columns — no full-table scans.
async function fetchUserProfile(supabaseUser: User): Promise<AuthUser | null> {
  const cached = getCachedValue<AuthUser>(AUTH_PROFILE_CACHE_KEY + supabaseUser.id);
  if (cached) return cached;

  try {
    await throttle();

    // 1. Role lookup — user_roles has unique(user_id, role), indexed
    const { data: roles, error: rolesError } = await withTimeout(
      supabase
        .from('user_roles')
        .select('role, station_id, employee_id')
        .eq('user_id', supabaseUser.id)
        .limit(1),
      5000,
      'user_roles'
    );

    if (rolesError || !roles?.length) {
      if (rolesError) console.error('Role lookup error:', rolesError.message);
      return null;
    }

    const userRole = roles[0];
    const role = userRole.role as UserRole;

    await throttle();

    // 2. Profile lookup — profiles.id is PK (indexed), single row
    const { data: profile } = await withTimeout(
      supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', supabaseUser.id)
        .maybeSingle(),
      5000,
      'profiles'
    );

    let stationCode: string | undefined;
    let employeeCode: string | undefined;
    let nameAr = profile?.full_name || supabaseUser.email || '';
    let employeeUuid: string | undefined;

    // 3. Station lookup — only for station_manager, by PK
    if (role === 'station_manager' && userRole.station_id) {
      await throttle();
      const { data: station } = await withTimeout(
        supabase
          .from('stations')
          .select('code, name_ar')
          .eq('id', userRole.station_id)
          .maybeSingle(),
        4000,
        'station'
      );
      stationCode = station?.code;
      nameAr = station?.name_ar ? `مدير محطة ${station.name_ar}` : nameAr;
    }

    // 4. Employee lookup — only for employee role, by PK (employees.id)
    if (role === 'employee' && userRole.employee_id) {
      employeeUuid = userRole.employee_id;
      await throttle();
      const { data: emp } = await withTimeout(
        supabase
          .from('employees')
          .select('employee_code, name_ar')
          .eq('id', userRole.employee_id)
          .maybeSingle(),
        4000,
        'employee'
      );
      employeeCode = emp?.employee_code;
      nameAr = emp?.name_ar || nameAr;
    }

    // 5. Area manager stations — small join table
    let stationCodes: string[] | undefined;
    let stationUuids: string[] | undefined;
    if (role === 'area_manager') {
      await throttle();
      const { data: amStations } = await withTimeout(
        supabase
          .from('area_manager_stations')
          .select('station_id')
          .eq('user_id', supabaseUser.id),
        4000,
        'am_stations'
      );
      if (amStations?.length) {
        stationUuids = amStations.map((s) => s.station_id);
        await throttle();
        const { data: stationData } = await withTimeout(
          supabase
            .from('stations')
            .select('code')
            .in('id', stationUuids),
          4000,
          'station_codes'
        );
        stationCodes = stationData?.map((s) => s.code) || [];
      }
    }

    const authUser: AuthUser = {
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

    setCachedValue(AUTH_PROFILE_CACHE_KEY + supabaseUser.id, authUser, AUTH_PROFILE_CACHE_TTL);
    return authUser;
  } catch (error) {
    console.error('Profile fetch error:', error);
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let loadingTimeout: ReturnType<typeof setTimeout>;

    const recoverAuthState = async (error?: unknown) => {
      if (!error || !isNetworkAuthError(error)) return;
      await clearBrokenLocalSession();
      setUser(null);
      setSession(null);
    };

    loadingTimeout = setTimeout(() => setLoading(false), 8000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        setTimeout(async () => {
          try {
            const profile = await fetchUserProfile(newSession.user);
            setUser(profile);
          } catch (error) {
            await recoverAuthState(error);
          } finally {
            setLoading(false);
            clearTimeout(loadingTimeout);
          }
        }, 0);
      } else {
        setUser(null);
        setLoading(false);
        clearTimeout(loadingTimeout);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      setSession(initialSession);
      if (initialSession?.user) {
        try {
          const profile = await fetchUserProfile(initialSession.user);
          setUser(profile);
        } catch (error) {
          await recoverAuthState(error);
        }
      }
      setLoading(false);
      clearTimeout(loadingTimeout);
    }).catch(async (error) => {
      await recoverAuthState(error);
      setLoading(false);
      clearTimeout(loadingTimeout);
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(loadingTimeout);
    };
  }, []);

  // Session timeout monitor — 30 min inactivity
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
    if (loginInFlight) {
      return { success: false, error: 'Login already in progress' };
    }
    loginInFlight = true;

    const normalizedEmail = normalizeLoginIdentifier(email);

    try {
      // Acquire a slot from the concurrency limiter (max 50)
      await acquireLoginSlot();
    } catch {
      loginInFlight = false;
      return { success: false, error: 'Server is busy, please try again' };
    }

    const loginStart = Date.now();
    let hadError = false;

    try {
      await clearBrokenLocalSession();

      for (let attempt = 1; attempt <= 3; attempt++) {
        const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        if (!error) return { success: true };

        const isServerError =
          error.message?.includes('timeout') ||
          error.message?.includes('504') ||
          error.message?.includes('500') ||
          error.message?.includes('context') ||
          error.status === 500 ||
          error.status === 504;

        if (!isServerError || attempt === 3) {
          hadError = true;
          return { success: false, error: error.message };
        }
        await new Promise((r) => setTimeout(r, attempt * 1000));
      }
      hadError = true;
      return { success: false, error: 'Login failed after retries' };
    } finally {
      recordLoginMetric(Date.now() - loginStart, hadError);
      releaseSlot();
      loginInFlight = false;
    }
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    if (user?.supabaseUserId) {
      import('@/lib/runtimeCache').then((m) => m.clearCachedValue(AUTH_PROFILE_CACHE_KEY + user.supabaseUserId));
    }
  }, [user]);

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
