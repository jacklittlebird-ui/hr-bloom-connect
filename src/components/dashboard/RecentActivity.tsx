import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Calendar, FileText, Banknote, GraduationCap, UserPlus, Activity } from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'leave' | 'loan' | 'training' | 'employee' | 'payroll';
  text: string;
  time: string;
  status?: string;
}

export const RecentActivity = () => {
  const { isRTL } = useLanguage();
  const ar = isRTL;
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    const load = async () => {
      const items: ActivityItem[] = [];

      // Reduced limits: 2 per type instead of 3 (total 6 vs 9 rows)
      const [leavesRes, loansRes, empRes] = await Promise.all([
        supabase.from('leave_requests').select('id, status, created_at, leave_type').order('created_at', { ascending: false }).limit(2),
        supabase.from('loans').select('id, status, created_at, amount').order('created_at', { ascending: false }).limit(2),
        supabase.from('employees').select('id, name_ar, name_en, created_at').order('created_at', { ascending: false }).limit(2),
      ]);

      leavesRes.data?.forEach(l => items.push({
        id: l.id, type: 'leave',
        text: ar ? `طلب إجازة ${l.leave_type}` : `${l.leave_type} leave request`,
        time: new Date(l.created_at).toLocaleDateString(ar ? 'ar-EG' : 'en-US'),
        status: l.status,
      }));

      loansRes.data?.forEach(l => items.push({
        id: l.id, type: 'loan',
        text: ar ? `طلب سلفة بمبلغ ${l.amount}` : `Loan request: ${l.amount}`,
        time: new Date(l.created_at).toLocaleDateString(ar ? 'ar-EG' : 'en-US'),
        status: l.status,
      }));

      empRes.data?.forEach(e => items.push({
        id: e.id, type: 'employee',
        text: ar ? `موظف جديد: ${e.name_ar}` : `New employee: ${e.name_en}`,
        time: new Date(e.created_at).toLocaleDateString(ar ? 'ar-EG' : 'en-US'),
      }));

      items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setActivities(items.slice(0, 6));
    };
    load();
  }, [ar]);

  const iconMap = {
    leave: Calendar, loan: Banknote, training: GraduationCap,
    employee: UserPlus, payroll: FileText,
  };

  const typeColors = {
    leave: 'bg-stat-blue/10 text-stat-blue',
    loan: 'bg-stat-coral/10 text-stat-coral',
    training: 'bg-stat-purple/10 text-stat-purple',
    employee: 'bg-stat-teal/10 text-stat-teal',
    payroll: 'bg-stat-green/10 text-stat-green',
  };

  const statusVariant = (s?: string) => {
    if (s === 'approved' || s === 'active') return 'default';
    if (s === 'pending') return 'secondary';
    if (s === 'rejected') return 'destructive';
    return 'outline';
  };

  const statusLabel = (s?: string) => {
    if (!s) return null;
    const map: Record<string, string> = {
      pending: ar ? 'معلق' : 'Pending',
      approved: ar ? 'معتمد' : 'Approved',
      rejected: ar ? 'مرفوض' : 'Rejected',
      active: ar ? 'نشط' : 'Active',
    };
    return map[s] || s;
  };

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border/50 overflow-hidden">
      <div className="p-5 border-b border-border/30">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Activity className="w-4 h-4 text-primary" />
          </div>
          {ar ? 'آخر النشاطات' : 'Recent Activity'}
        </h3>
      </div>
      <div className="p-4 space-y-2">
        {activities.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">{ar ? 'لا توجد نشاطات' : 'No recent activity'}</p>
        ) : activities.map((a, i) => {
          const Icon = iconMap[a.type];
          return (
            <div
              key={a.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl transition-all duration-200",
                "hover:bg-muted/50 border border-transparent hover:border-border/30",
                "animate-fade-in"
              )}
              style={{ animationDelay: `${i * 0.05}s`, animationFillMode: 'backwards' }}
            >
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", typeColors[a.type])}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{a.text}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{a.time}</p>
              </div>
              {a.status && (
                <Badge variant={statusVariant(a.status) as any} className="shrink-0 text-xs rounded-full px-3">
                  {statusLabel(a.status)}
                </Badge>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
