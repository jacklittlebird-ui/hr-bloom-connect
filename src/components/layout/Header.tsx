import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export const Header = ({ onToggleSidebar }: HeaderProps) => {
  const { language, setLanguage, t, isRTL } = useLanguage();
  const { logout } = useAuth();

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-primary z-50 flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-2 md:gap-3">
        {onToggleSidebar && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="text-primary-foreground hover:bg-primary-foreground/10 shrink-0"
          >
            <Menu className="w-5 h-5" />
          </Button>
        )}
        <div className="hidden sm:flex items-center justify-center h-12 w-12 rounded-lg bg-white p-1">
          <img src="/images/one-hr-logo.png" alt="One HR" className="h-full w-full object-contain" />
        </div>
        <h1 className={cn(
          "text-lg md:text-xl font-bold text-primary-foreground truncate",
          isRTL ? "font-arabic" : "font-sans"
        )}>
          {t('app.title')}
        </h1>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <Button
          variant="secondary"
          size="sm"
          onClick={toggleLanguage}
          className="min-w-[60px] md:min-w-[80px] font-semibold text-xs md:text-sm"
        >
          {language === 'ar' ? 'EN' : 'عربي'}
        </Button>
        
        <NotificationDropdown variant="header" />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="text-primary-foreground hover:bg-primary-foreground/10"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">{language === 'ar' ? 'خروج' : 'Logout'}</span>
        </Button>
      </div>
    </header>
  );
};
