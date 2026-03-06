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
    <div className="flex items-center justify-between mb-6 bg-card/50 backdrop-blur-sm rounded-xl px-5 py-4 border border-border/30">
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-8 rounded-full bg-gradient-to-b from-primary to-primary/50" />
        {Icon && (
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        )}
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
      </div>
      {children && (
        <div className="flex gap-2">
          {children}
        </div>
      )}
    </div>
  );
};
