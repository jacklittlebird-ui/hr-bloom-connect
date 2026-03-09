import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// All available module keys matching sidebar nav items
export const ALL_MODULES = [
  'dashboard', 'employee-portal', 'employees', 'departments', 'attendance',
  'leaves', 'salaries', 'salary-reports', 'loans', 'recruitment',
  'performance', 'assets', 'uniforms', 'documents', 'reports',
  'training', 'notifications', 'users', 'settings',
] as const;

export type ModuleKey = typeof ALL_MODULES[number];

export const MODULE_LABELS: Record<ModuleKey, { ar: string; en: string }> = {
  'dashboard': { ar: 'لوحة التحكم', en: 'Dashboard' },
  'employee-portal': { ar: 'بوابة الموظف', en: 'Employee Portal' },
  'employees': { ar: 'الموظفين', en: 'Employees' },
  'departments': { ar: 'الأقسام', en: 'Departments' },
  'attendance': { ar: 'الحضور والانصراف', en: 'Attendance' },
  'leaves': { ar: 'الإجازات', en: 'Leaves' },
  'salaries': { ar: 'الرواتب', en: 'Salaries' },
  'salary-reports': { ar: 'تقارير الرواتب', en: 'Salary Reports' },
  'loans': { ar: 'القروض والسلف', en: 'Loans' },
  'recruitment': { ar: 'التوظيف', en: 'Recruitment' },
  'performance': { ar: 'تقييم الأداء', en: 'Performance' },
  'assets': { ar: 'العهد والأصول', en: 'Assets' },
  'uniforms': { ar: 'الزي الرسمي', en: 'Uniforms' },
  'documents': { ar: 'المستندات', en: 'Documents' },
  'reports': { ar: 'التقارير', en: 'Reports' },
  'training': { ar: 'التدريب', en: 'Training' },
  'notifications': { ar: 'الإشعارات', en: 'Notifications' },
  'users': { ar: 'المستخدمين', en: 'Users' },
  'settings': { ar: 'الإعدادات', en: 'Settings' },
};

// Map route paths to module keys
export const PATH_TO_MODULE: Record<string, ModuleKey> = {
  '/': 'dashboard',
  '/employee-portal': 'employee-portal',
  '/employees': 'employees',
  '/departments': 'departments',
  '/attendance': 'attendance',
  '/leaves': 'leaves',
  '/salaries': 'salaries',
  '/salary-reports': 'salary-reports',
  '/loans': 'loans',
  '/recruitment': 'recruitment',
  '/performance': 'performance',
  '/assets': 'assets',
  '/uniforms': 'uniforms',
  '/documents': 'documents',
  '/reports': 'reports',
  '/training': 'training',
  '/notifications': 'notifications',
  '/users': 'users',
  '/groups': 'users',
  '/roles': 'users',
  '/settings': 'settings',
};

// Modules HR cannot access (salary-related)
const HR_BLOCKED_MODULES: ModuleKey[] = ['salaries', 'salary-reports'];

export function useModulePermissions() {
  const { session, user } = useAuth();
  const userRole = user?.role;
  const [allowedModules, setAllowedModules] = useState<ModuleKey[]>([...ALL_MODULES]);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!session?.user?.id) {
      setAllowedModules([...ALL_MODULES]);
      setLoading(false);
      return;
    }

    // Admins get everything by default
    if (userRole === 'admin') {
      setAllowedModules([...ALL_MODULES]);
      setLoading(false);
      return;
    }

    // HR gets everything except salary modules
    if (userRole === 'hr') {
      setAllowedModules(ALL_MODULES.filter(m => !HR_BLOCKED_MODULES.includes(m)));
      setLoading(false);
      return;
    }

    try {
      // Check user_module_permissions for this user
      const { data, error } = await supabase
        .from('user_module_permissions' as any)
        .select('custom_modules, profile_id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching permissions:', error);
        // Fallback: if no permissions set, give minimal access
        setAllowedModules(['dashboard', 'employee-portal']);
        setLoading(false);
        return;
      }

      if (data) {
        const record = data as any;
        // If custom_modules is set, use it directly
        if (record.custom_modules && Array.isArray(record.custom_modules)) {
          setAllowedModules(record.custom_modules as ModuleKey[]);
        } else if (record.profile_id) {
          // Fetch the profile's modules
          const { data: profile } = await supabase
            .from('permission_profiles' as any)
            .select('modules')
            .eq('id', record.profile_id)
            .maybeSingle();

          if (profile && (profile as any).modules) {
            setAllowedModules((profile as any).modules as ModuleKey[]);
          }
        } else {
          setAllowedModules(['dashboard', 'employee-portal']);
        }
      } else {
        // No permissions record - give role-based defaults
        if (userRole === 'station_manager') {
          setAllowedModules(['dashboard', 'employees', 'attendance', 'leaves', 'reports']);
        } else {
          setAllowedModules(['dashboard', 'employee-portal']);
        }
      }
    } catch (err) {
      console.error('Permission fetch error:', err);
      setAllowedModules(['dashboard', 'employee-portal']);
    }

    setLoading(false);
  }, [session?.user?.id, userRole]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasAccess = useCallback((moduleKey: ModuleKey): boolean => {
    if (userRole === 'admin') return true;
    return allowedModules.includes(moduleKey);
  }, [allowedModules, userRole]);

  const hasPathAccess = useCallback((path: string): boolean => {
    if (userRole === 'admin') return true;
    const moduleKey = PATH_TO_MODULE[path];
    if (!moduleKey) return true; // Unknown paths are allowed
    return allowedModules.includes(moduleKey);
  }, [allowedModules, userRole]);

  return { allowedModules, loading, hasAccess, hasPathAccess, refetch: fetchPermissions };
}
