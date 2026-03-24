import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

// Module mappings per portal
const PORTAL_MODULES: Record<PortalFilter, string[] | null> = {
  admin: null, // sees everything
  employee: ['general', 'employee', 'salary', 'payroll', 'attendance', 'leave', 'loan', 'training', 'performance', 'portal', 'asset'],
  station_manager: ['general', 'attendance', 'performance', 'employee'],
  training: ['general', 'training'],
  kiosk: ['general', 'attendance'],
  all: null,
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const { user, isAuthenticated, loading } = useAuth();
  const userId = user?.supabaseUserId ?? null;

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated || !userId) {
      setNotifications([]);
      return;
    }

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (data) setNotifications(data.map(mapRow));
  }, [isAuthenticated, userId]);

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated || !userId) {
      setNotifications([]);
      return;
    }

    fetchNotifications();
  }, [fetchNotifications, isAuthenticated, loading, userId]);

  const getFilteredNotifications = useCallback((portal: PortalFilter, employeeId?: string): AppNotification[] => {
    let filtered = notifications;

    // For employee portal: RLS already filters by user_id = auth.uid()
    // So all fetched notifications belong to this user - just filter by relevant modules
    if (portal === 'employee') {
      const modules = PORTAL_MODULES.employee;
      if (modules) {
        filtered = filtered.filter(n => modules.includes(n.module));
      }
    }

    // For station_manager, show relevant modules
    if (portal === 'station_manager') {
      const modules = PORTAL_MODULES.station_manager;
      if (modules) {
        filtered = filtered.filter(n => modules.includes(n.module));
      }
    }

    // For training portal
    if (portal === 'training') {
      const modules = PORTAL_MODULES.training;
      if (modules) {
        filtered = filtered.filter(n => modules.includes(n.module));
      }
    }

    // For kiosk
    if (portal === 'kiosk') {
      const modules = PORTAL_MODULES.kiosk;
      if (modules) {
        filtered = filtered.filter(n => modules.includes(n.module));
      }
    }

    return filtered;
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
    fetchNotifications();
  }, [userId, fetchNotifications]);

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
