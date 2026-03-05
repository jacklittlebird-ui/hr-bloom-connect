import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Calendar, FileText, DollarSign, GraduationCap, UserPlus } from 'lucide-react';

interface Activity {
  id: string;
  type: 'leave' | 'loan' | 'training' | 'employee' | 'payroll';
  text: string;
  time: string;
  status?: string;
}

export const RecentActivity = () => {
  const { isRTL } = useLanguage();
  const ar = isRTL;
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    const load = async () => {
      const items: Activity[] = [];

      const [leavesRes, loansRes, empRes] = await Promise.all([
        supabase.from('leave_requests').select('id, status, created_at, leave_type').order('created_at', { ascending: false }).limit(3),
        supabase.from('loans').select('id, status, created_at, amount').order('created_at', { ascending: false }).limit(3),
        supabase.from('employees').select('id, name_ar, name_en, created_at').order('created_at', { ascending: false }).limit(3),
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
      setActivities(items.slice(0, 8));
    };
    load();
  }, [ar]);

  const iconMap = {
    leave: Calendar, loan: DollarSign, training: GraduationCap,
    employee: UserPlus, payroll: FileText,
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
    <div className="bg-card rounded-xl p-6 shadow-sm border border-border/50">
      <h3 className={cn("text-lg font-semibold text-foreground mb-4 flex items-center gap-2", ar && "flex-row-reverse")}>
        <span className="text-primary">🕐</span>
        {ar ? 'آخر النشاطات' : 'Recent Activity'}
      </h3>
      <div className="space-y-3">
        {activities.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">{ar ? 'لا توجد نشاطات' : 'No recent activity'}</p>
        ) : activities.map(a => {
          const Icon = iconMap[a.type];
          return (
            <div key={a.id} className={cn("flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors", ar && "flex-row-reverse")}>
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div className={cn("flex-1 min-w-0", ar && "text-right")}>
                <p className="text-sm font-medium text-foreground truncate">{a.text}</p>
                <p className="text-xs text-muted-foreground">{a.time}</p>
              </div>
              {a.status && (
                <Badge variant={statusVariant(a.status) as any} className="shrink-0 text-xs">
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
