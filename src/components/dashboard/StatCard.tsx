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
  coral: { iconBg: 'bg-stat-coral', ring: 'ring-stat-coral/20', glow: 'shadow-[0_8px_30px_-6px_hsl(16_85%_58%/0.25)]' },
  blue: { iconBg: 'bg-stat-blue', ring: 'ring-stat-blue/20', glow: 'shadow-[0_8px_30px_-6px_hsl(210_80%_55%/0.25)]' },
  purple: { iconBg: 'bg-stat-purple', ring: 'ring-stat-purple/20', glow: 'shadow-[0_8px_30px_-6px_hsl(265_75%_55%/0.25)]' },
  teal: { iconBg: 'bg-stat-teal', ring: 'ring-stat-teal/20', glow: 'shadow-[0_8px_30px_-6px_hsl(172_70%_40%/0.25)]' },
  green: { iconBg: 'bg-stat-green', ring: 'ring-stat-green/20', glow: 'shadow-[0_8px_30px_-6px_hsl(145_65%_42%/0.25)]' },
  yellow: { iconBg: 'bg-stat-yellow', ring: 'ring-stat-yellow/20', glow: 'shadow-[0_8px_30px_-6px_hsl(40_95%_50%/0.25)]' },
  pink: { iconBg: 'bg-stat-pink', ring: 'ring-stat-pink/20', glow: 'shadow-[0_8px_30px_-6px_hsl(340_75%_55%/0.25)]' },
};

const trendConfig = {
  up: { icon: TrendingUp, color: 'text-success', bg: 'bg-success/10' },
  down: { icon: TrendingDown, color: 'text-destructive', bg: 'bg-destructive/10' },
  neutral: { icon: Minus, color: 'text-muted-foreground', bg: 'bg-muted' },
};

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, variant, trend, trendValue, delay = 0 }) => {
  const { isRTL } = useLanguage();
  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        "group bg-card rounded-xl p-5 border border-border/50 transition-all duration-300",
        "hover:-translate-y-1 cursor-default",
        "hover:shadow-lg",
        "animate-fade-in relative overflow-hidden"
      )}
      style={{ animationDelay: `${delay * 0.08}s`, animationFillMode: 'backwards' }}
    >
      {/* Subtle gradient accent at top */}
      <div className={cn("absolute top-0 inset-x-0 h-1 rounded-t-xl opacity-80 transition-opacity group-hover:opacity-100", styles.iconBg)} />

      <div className="flex items-center gap-4">
        <div className={cn(
          "w-14 h-14 rounded-xl flex items-center justify-center shrink-0",
          "transition-all duration-300 group-hover:scale-110 group-hover:rotate-3",
          "ring-4",
          styles.iconBg,
          styles.ring,
        )}>
          <Icon className="w-7 h-7 text-primary-foreground drop-shadow-sm" />
        </div>

        <div className="flex flex-col flex-1 min-w-0">
          <span className="text-3xl font-bold text-foreground tracking-tight">{value}</span>
          <span className="text-sm text-muted-foreground truncate">{title}</span>
          {trend && trendValue && (
            <div className={cn("flex items-center gap-1.5 mt-1.5")}>
              <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", trendConfig[trend].bg, trendConfig[trend].color)}>
                {(() => {
                  const TrendIcon = trendConfig[trend].icon;
                  return <TrendIcon className="w-3 h-3" />;
                })()}
                {trendValue}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
