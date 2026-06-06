import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type FeatureFlags = {
  show_bonus_percentage?: boolean;
  [key: string]: boolean | undefined;
};

/**
 * Reads per-user feature flags stored in user_module_permissions.feature_flags.
 * Falls back to role-based defaults when no explicit override is set.
 */
export function useUserFeatureFlags() {
  const { session, user } = useAuth();
  const [flags, setFlags] = useState<FeatureFlags>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!session?.user?.id) {
        setFlags({});
        setLoading(false);
        return;
      }
      // Admin: everything ON by default
      if (user?.role === 'admin') {
        if (!cancelled) {
          setFlags({ show_bonus_percentage: true });
          setLoading(false);
        }
        return;
      }
      try {
        const { data } = await supabase
          .from('user_module_permissions' as any)
          .select('feature_flags')
          .eq('user_id', session.user.id)
          .maybeSingle();
        const stored = ((data as any)?.feature_flags as FeatureFlags) || {};
        // Role-based defaults when no explicit setting
        const defaults: FeatureFlags = {
          show_bonus_percentage: user?.role === 'area_manager',
        };
        const merged: FeatureFlags = {
          ...defaults,
          ...stored,
        };
        if (!cancelled) setFlags(merged);
      } catch {
        if (!cancelled) setFlags({ show_bonus_percentage: user?.role === 'area_manager' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [session?.user?.id, user?.role]);

  return { flags, loading };
}
