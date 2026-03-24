import React, { createContext, useContext, useCallback, useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { trackQuery, debouncedFetch, invalidateCache } from '@/lib/queryOptimizer';

export type PortalFilter = 'admin' | 'employee' | 'station_manager' | 'training' | 'kiosk' | 'all';

export interface AppNotification {
  id: string;
  titleAr: string;
  titleEn: string;
  descAr?: string;
  descEn?: string;
  type: 'success' | 'warning' | 'info' | 'error';
  module: string;
  employeeId?: string;
  userId?: string;
  targetType?: string;
  senderName?: string;
  read: boolean;
  timestamp: string;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (n: Omit<AppNotification, 'id' | 'read' | 'timestamp'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  getFilteredNotifications: (portal: PortalFilter, employeeId?: string) => AppNotification[];
  refreshNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Specific columns instead of SELECT *
const NOTIFICATION_COLS = 'id, title_ar, title_en, desc_ar, desc_en, type, module, employee_id, user_id, target_type, sender_name, is_read, created_at';

const mapRow = (r: any): AppNotification => ({
  id: r.id,
  titleAr: r.title_ar,
  titleEn: r.title_en,
  descAr: r.desc_ar || undefined,
  descEn: r.desc_en || undefined,
  type: r.type as AppNotification['type'],
  module: r.module,
  employeeId: r.employee_id || undefined,
  userId: r.user_id || undefined,
  targetType: r.target_type || 'general',
  senderName: r.sender_name || undefined,
  read: r.is_read,
  timestamp: r.created_at,
});

const PORTAL_MODULES: Record<PortalFilter, string[] | null> = {
  admin: null,
  employee: ['general', 'employee', 'salary', 'payroll', 'attendance', 'leave', 'loan', 'training', 'performance', 'portal', 'asset'],
  station_manager: ['general', 'attendance', 'performance', 'employee'],
  training: ['general', 'training'],
  kiosk: ['general', 'attendance'],
  all: null,
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    const result = await debouncedFetch('notifications', async () => {
      const { data } = await supabase
        .from('notifications')
        .select(NOTIFICATION_COLS)
        .order('created_at', { ascending: false })
        .limit(50);
      trackQuery('notifications', data?.length || 0);
      return (data || []).map(mapRow);
    }, { ttlMs: 30_000 });
    
    setNotifications(result);
  }, []);

  const hasMounted = useRef(false);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        if (!hasMounted.current) {
          hasMounted.current = true;
          fetchNotifications();
        }
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUserId(session.user.id);
        invalidateCache('notifications');
        fetchNotifications();
      } else if (event === 'SIGNED_OUT') {
        setUserId(null);
        setNotifications([]);
      }
    });
    return () => subscription.unsubscribe();
  }, [fetchNotifications]);

  const getFilteredNotifications = useCallback((portal: PortalFilter, employeeId?: string): AppNotification[] => {
    const modules = PORTAL_MODULES[portal];
    if (!modules) return notifications;
    return notifications.filter(n => modules.includes(n.module));
  }, [notifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = useCallback(async (n: Omit<AppNotification, 'id' | 'read' | 'timestamp'>) => {
    const tempId = `temp_${Date.now()}`;
    const localNotif: AppNotification = {
      ...n,
      id: tempId,
      read: false,
      timestamp: new Date().toISOString(),
    };
    setNotifications(prev => [localNotif, ...prev]);

    const payload: any = {
      title_ar: n.titleAr,
      title_en: n.titleEn,
      desc_ar: n.descAr || null,
      desc_en: n.descEn || null,
      type: n.type,
      module: n.module,
      employee_id: n.employeeId || null,
      user_id: userId,
      target_type: n.targetType || 'general',
    };
    await supabase.from('notifications').insert(payload);
    // Don't immediately refetch - the optimistic update is sufficient
  }, [userId]);

  const markAsRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    if (userId) {
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
    }
  }, [userId]);

  const clearAll = useCallback(async () => {
    setNotifications([]);
    if (userId) {
      await supabase.from('notifications').delete().eq('user_id', userId);
    }
  }, [userId]);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      clearAll,
      getFilteredNotifications,
      refreshNotifications: fetchNotifications,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};
