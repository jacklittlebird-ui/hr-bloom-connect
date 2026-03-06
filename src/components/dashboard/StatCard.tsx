import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  variant: 'coral' | 'blue' | 'purple' | 'teal' | 'green' | 'yellow' | 'pink';
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  delay?: number;
}

const variantStyles = {
  coral: { iconBg: 'bg-stat-coral', hoverBorder: 'hover:border-stat-coral/40' },
  blue: { iconBg: 'bg-stat-blue', hoverBorder: 'hover:border-stat-blue/40' },
  purple: { iconBg: 'bg-stat-purple', hoverBorder: 'hover:border-stat-purple/40' },
  teal: { iconBg: 'bg-stat-teal', hoverBorder: 'hover:border-stat-teal/40' },
  green: { iconBg: 'bg-stat-green', hoverBorder: 'hover:border-stat-green/40' },
  yellow: { iconBg: 'bg-stat-yellow', hoverBorder: 'hover:border-stat-yellow/40' },
  pink: { iconBg: 'bg-stat-pink', hoverBorder: 'hover:border-stat-pink/40' },
};

const trendConfig = {
  up: { icon: TrendingUp, color: 'text-success' },
  down: { icon: TrendingDown, color: 'text-destructive' },
  neutral: { icon: Minus, color: 'text-muted-foreground' },
};

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, variant, trend, trendValue, delay = 0 }) => {
  const { isRTL } = useLanguage();
  const styles = variantStyles[variant];

  return (
    <div
      dir="rtl"
      className={cn(
        "bg-card rounded-xl p-5 shadow-sm border border-border/50 transition-all duration-300",
        "hover:shadow-lg hover:-translate-y-1",
        styles.hoverBorder,
        "flex items-center gap-4 animate-fade-in"
      )}
      style={{ animationDelay: `${delay * 0.08}s`, animationFillMode: 'backwards' }}
    >
      <div className={cn(
        "w-14 h-14 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110",
        styles.iconBg
      )}>
        <Icon className="w-7 h-7 text-primary-foreground" />
      </div>

      <div className="flex flex-col flex-1 min-w-0 items-end">
        <span className="text-3xl font-bold text-foreground">{value}</span>
        <span className="text-sm text-muted-foreground truncate">{title}</span>
        {trend && trendValue && (
          <div className="flex items-center gap-1 mt-1 flex-row-reverse">
            {(() => {
              const TrendIcon = trendConfig[trend].icon;
              return <TrendIcon className={cn("w-3.5 h-3.5", trendConfig[trend].color)} />;
            })()}
            <span className={cn("text-xs font-medium", trendConfig[trend].color)}>{trendValue}</span>
          </div>
        )}
      </div>
    </div>
  );
};
