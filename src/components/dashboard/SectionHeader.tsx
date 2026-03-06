import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { LucideIcon } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  icon?: LucideIcon;
  children?: React.ReactNode;
}

export const SectionHeader = ({ title, icon: Icon, children }: SectionHeaderProps) => {
  const { isRTL } = useLanguage();

  return (
    <div className={cn(
      "flex items-center justify-between mb-6",
      isRTL && "flex-row-reverse"
    )}>
      <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
        <div className="w-1 h-7 rounded-full bg-primary" />
        {Icon && <Icon className="w-5 h-5 text-primary" />}
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      </div>
      {children && (
        <div className={cn("flex gap-3", isRTL && "flex-row-reverse")}>
          {children}
        </div>
      )}
    </div>
  );
};
