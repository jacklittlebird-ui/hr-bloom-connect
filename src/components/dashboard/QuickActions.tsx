import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  UserPlus, CalendarCheck, FileText, DollarSign, GraduationCap, 
  ClipboardList, Shield, Briefcase
} from 'lucide-react';

export const QuickActions = () => {
  const { language, isRTL } = useLanguage();
  const navigate = useNavigate();
  const ar = language === 'ar';

  const actions = [
    { icon: UserPlus, label: ar ? 'إضافة موظف' : 'Add Employee', path: '/employees', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
    { icon: CalendarCheck, label: ar ? 'تسجيل حضور' : 'Mark Attendance', path: '/attendance', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    { icon: FileText, label: ar ? 'طلب إجازة' : 'Leave Request', path: '/leaves', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
    { icon: DollarSign, label: ar ? 'معالجة الرواتب' : 'Process Payroll', path: '/salaries', color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400' },
    { icon: GraduationCap, label: ar ? 'تدريب جديد' : 'New Training', path: '/training', color: 'bg-pink-500/10 text-pink-600 dark:text-pink-400' },
    { icon: ClipboardList, label: ar ? 'تقييم أداء' : 'Performance Review', path: '/performance', color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400' },
    { icon: Shield, label: ar ? 'إدارة الأصول' : 'Manage Assets', path: '/assets', color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
    { icon: Briefcase, label: ar ? 'التوظيف' : 'Recruitment', path: '/recruitment', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
  ];

  return (
    <div className="mb-6">
      <h2 className={cn("text-lg font-bold text-foreground mb-3 flex items-center gap-2", isRTL && "flex-row-reverse")}>
        ⚡ {ar ? 'إجراءات سريعة' : 'Quick Actions'}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={() => navigate(action.path)}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-xl border border-border/50 bg-card",
              "hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5",
              "transition-all duration-200 group cursor-pointer"
            )}
          >
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", action.color)}>
              <action.icon className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground text-center leading-tight">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
