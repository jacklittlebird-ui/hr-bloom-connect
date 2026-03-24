import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { initSessionMonitor } from '@/lib/security';

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
  login: (credentials: { email: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchUserProfile(supabaseUser: User): Promise<AuthUser | null> {
  try {
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role, station_id, employee_id')
      .eq('user_id', supabaseUser.id);

    if (rolesError) {
      console.error('Error fetching user roles:', rolesError);
      return null;
    }

    if (!roles || roles.length === 0) return null;

    const userRole = roles[0];
    const role = userRole.role as UserRole;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', supabaseUser.id)
      .maybeSingle();

    if (profileError) {
      console.warn('Profile lookup failed, continuing with auth user data:', profileError);
    }

    let stationCode: string | undefined;
    let employeeCode: string | undefined;
    let nameAr = profile?.full_name || supabaseUser.email || '';

    if (role === 'station_manager' && userRole.station_id) {
      const { data: station, error: stationError } = await supabase
        .from('stations')
        .select('code, name_ar')
        .eq('id', userRole.station_id)
        .maybeSingle();

      if (stationError) {
        console.warn('Station lookup failed:', stationError);
      }

      stationCode = station?.code;
      nameAr = station?.name_ar ? `مدير محطة ${station.name_ar}` : nameAr;
    }

    let employeeUuid: string | undefined;
    if (role === 'employee' && userRole.employee_id) {
      employeeUuid = userRole.employee_id;
      const { data: emp, error: empError } = await supabase
        .from('employees')
        .select('employee_code, name_ar, name_en')
        .eq('id', userRole.employee_id)
        .maybeSingle();

      if (empError) {
        console.warn('Employee lookup failed:', empError);
      }

      employeeCode = emp?.employee_code;
      nameAr = emp?.name_ar || nameAr;
    }

    let stationCodes: string[] | undefined;
    let stationUuids: string[] | undefined;
    if (role === 'area_manager') {
      const { data: amStations, error: amStationsError } = await supabase
        .from('area_manager_stations')
        .select('station_id')
        .eq('user_id', supabaseUser.id);

      if (amStationsError) {
        console.warn('Area manager stations lookup failed:', amStationsError);
      }

      if (amStations && amStations.length > 0) {
        stationUuids = amStations.map((s) => s.station_id);
        const { data: stationData, error: stationDataError } = await supabase
          .from('stations')
          .select('code')
          .in('id', stationUuids);

        if (stationDataError) {
          console.warn('Area manager station code lookup failed:', stationDataError);
        }

        stationCodes = stationData?.map((s) => s.code) || [];
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
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        // Use setTimeout to avoid potential deadlocks with Supabase client
        setTimeout(async () => {
          const profile = await fetchUserProfile(newSession.user);
          setUser(profile);
          setLoading(false);
        }, 0);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    // Then get initial session
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      setSession(initialSession);
      if (initialSession?.user) {
        const profile = await fetchUserProfile(initialSession.user);
        setUser(profile);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  }, []);

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
