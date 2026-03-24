import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { initSessionMonitor } from '@/lib/security';
import { withTimeout } from '@/lib/asyncControl';
import { getCachedValue, setCachedValue } from '@/lib/runtimeCache';

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
  } catch {
    // Ignore network-related signout issues; we still remove local state below.
  }

  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // Ignore storage access issues.
  } finally {
    authRecoveryInFlight = false;
  }
}

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
  login: (credentials: { email: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchUserProfile(supabaseUser: User): Promise<AuthUser | null> {
  // Check cache first
  const cached = getCachedValue<AuthUser>(AUTH_PROFILE_CACHE_KEY + supabaseUser.id);
  if (cached) return cached;

  try {
    const { data: roles, error: rolesError } = await withTimeout(supabase
      .from('user_roles')
      .select('role, station_id, employee_id')
      .eq('user_id', supabaseUser.id), 8000, 'user_roles');

    if (rolesError) {
      console.error('Error fetching user roles:', rolesError);
      return null;
    }

    if (!roles || roles.length === 0) return null;

    const userRole = roles[0];
    const role = userRole.role as UserRole;

    const { data: profile, error: profileError } = await withTimeout(supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', supabaseUser.id)
      .maybeSingle(), 8000, 'profiles');

    if (profileError) {
      console.warn('Profile lookup failed, continuing with auth user data:', profileError);
    }

    let stationCode: string | undefined;
    let employeeCode: string | undefined;
    let nameAr = profile?.full_name || supabaseUser.email || '';

    if (role === 'station_manager' && userRole.station_id) {
      const { data: station, error: stationError } = await withTimeout(supabase
        .from('stations')
        .select('code, name_ar')
        .eq('id', userRole.station_id)
        .maybeSingle(), 5000, 'station');

      if (stationError) {
        console.warn('Station lookup failed:', stationError);
      }

      stationCode = station?.code;
      nameAr = station?.name_ar ? `مدير محطة ${station.name_ar}` : nameAr;
    }

    let employeeUuid: string | undefined;
    if (role === 'employee' && userRole.employee_id) {
      employeeUuid = userRole.employee_id;
      const { data: emp, error: empError } = await withTimeout(supabase
        .from('employees')
        .select('employee_code, name_ar, name_en')
        .eq('id', userRole.employee_id)
        .maybeSingle(), 5000, 'employee');

      if (empError) {
        console.warn('Employee lookup failed:', empError);
      }

      employeeCode = emp?.employee_code;
      nameAr = emp?.name_ar || nameAr;
    }

    let stationCodes: string[] | undefined;
    let stationUuids: string[] | undefined;
    if (role === 'area_manager') {
      const { data: amStations, error: amStationsError } = await withTimeout(supabase
        .from('area_manager_stations')
        .select('station_id')
        .eq('user_id', supabaseUser.id), 5000, 'am_stations');

      if (amStationsError) {
        console.warn('Area manager stations lookup failed:', amStationsError);
      }

      if (amStations && amStations.length > 0) {
        stationUuids = amStations.map((s) => s.station_id);
        const { data: stationData, error: stationDataError } = await withTimeout(supabase
          .from('stations')
          .select('code')
          .in('id', stationUuids), 5000, 'station_codes');

        if (stationDataError) {
          console.warn('Area manager station code lookup failed:', stationDataError);
        }

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

    // Cache the result
    setCachedValue(AUTH_PROFILE_CACHE_KEY + supabaseUser.id, authUser, AUTH_PROFILE_CACHE_TTL);

    return authUser;
  } catch (error) {
    console.error('Unexpected error fetching user profile:', error);
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

    // Safety: if loading takes more than 8 seconds, stop loading so login page shows
    loadingTimeout = setTimeout(() => {
      setLoading(false);
    }, 8000);

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        // Use setTimeout to avoid potential deadlocks with Supabase client
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

    // Then get initial session
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
      // If getSession fails (timeout/network), stop loading so login page shows
      setLoading(false);
      clearTimeout(loadingTimeout);
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(loadingTimeout);
    };
  }, []);

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
    // Prevent duplicate concurrent login requests
    if (loginInFlight) {
      return { success: false, error: 'Login already in progress' };
    }
    loginInFlight = true;

    const normalizedEmail = normalizeLoginIdentifier(email);

    try {
      await clearBrokenLocalSession();

      // Retry up to 3 times on timeout/server errors
      for (let attempt = 1; attempt <= 3; attempt++) {
        const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        if (!error) return { success: true };
        
        const isServerError = error.message?.includes('timeout') || 
                             error.message?.includes('504') || 
                             error.message?.includes('500') ||
                             error.message?.includes('context') ||
                             error.status === 500 || error.status === 504;
        
        if (!isServerError || attempt === 3) {
          return { success: false, error: error.message };
        }
        
        await new Promise(r => setTimeout(r, attempt * 1000));
      }
      return { success: false, error: 'Login failed after retries' };
    } finally {
      loginInFlight = false;
    }
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    // Clear profile cache on logout
    if (user?.supabaseUserId) {
      import('@/lib/runtimeCache').then(m => m.clearCachedValue(AUTH_PROFILE_CACHE_KEY + user.supabaseUserId));
    }
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
