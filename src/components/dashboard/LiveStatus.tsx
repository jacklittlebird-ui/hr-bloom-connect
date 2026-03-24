import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Activity, Users, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

export const LiveStatus = () => {
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';
  const [stats, setStats] = useState({ checkedIn: 0, onLeave: 0, onMission: 0, late: 0 });

  const fetchLive = async () => {
    const today = new Date().toISOString().split('T')[0];
    // Use head:true count queries — zero row transfer
    const [attRes, leaveRes, missionRes, lateRes] = await Promise.all([
      supabase.from('attendance_records').select('id', { count: 'exact', head: true }).eq('date', today).not('check_in', 'is', null),
      supabase.from('leave_requests').select('id', { count: 'exact', head: true }).eq('status', 'approved').lte('start_date', today).gte('end_date', today),
      supabase.from('missions').select('id', { count: 'exact', head: true }).eq('status', 'approved').eq('date', today),
      supabase.from('attendance_records').select('id', { count: 'exact', head: true }).eq('date', today).eq('is_late', true),
    ]);
    setStats({
      checkedIn: attRes.count || 0,
      onLeave: leaveRes.count || 0,
      onMission: missionRes.count || 0,
      late: lateRes.count || 0,
    });
  };

  useEffect(() => {
    fetchLive();
    // Poll every 5 minutes instead of 1 minute (80% reduction)
    const iv = setInterval(fetchLive, 300_000);
    return () => clearInterval(iv);
  }, []);

  const items = [
    { icon: CheckCircle, label: ar ? 'حاضرون الآن' : 'Checked In', value: stats.checkedIn, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { icon: Clock, label: ar ? 'في إجازة' : 'On Leave', value: stats.onLeave, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { icon: Activity, label: ar ? 'في مأمورية' : 'On Mission', value: stats.onMission, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { icon: AlertTriangle, label: ar ? 'متأخرون' : 'Late Today', value: stats.late, color: 'text-red-500', bg: 'bg-red-500/10' },
  ];

  return (
    <div className="mb-6">
      <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
        </span>
        {ar ? 'الحالة المباشرة' : 'Live Status'}
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-card">
            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", item.bg)}>
              <item.icon className={cn("w-5 h-5", item.color)} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
