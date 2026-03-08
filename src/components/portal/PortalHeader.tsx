import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployeeData } from '@/contexts/EmployeeDataContext';
import { cn } from '@/lib/utils';
import { Menu, Globe, User, LogOut, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';

interface PortalHeaderProps {
  onToggleSidebar: () => void;
  onRefresh?: () => void;
}

export const PortalHeader = ({ onToggleSidebar, onRefresh }: PortalHeaderProps) => {
  const { language, setLanguage, isRTL } = useLanguage();
  const { user, logout } = useAuth();
  const { getEmployeeById } = useEmployeeData();
  const navigate = useNavigate();

  const employeeId = user?.employeeId || '';
  const employee = getEmployeeById(employeeId);

  const displayName = language === 'ar'
    ? (employee?.nameAr || user?.nameAr || '')
    : (employee?.nameEn || user?.name || '');

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <header dir="rtl" className="h-14 md:h-16 bg-card border-b border-border flex items-center justify-between px-3 md:px-4 sticky top-0 z-10">
      <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-shrink">
        <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="md:hidden shrink-0">
          <Menu className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
            <User className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary-foreground" />
          </div>
          <div className="min-w-0 text-right">
            <p className="text-xs md:text-sm font-semibold leading-tight truncate">{displayName}</p>
            <p className="text-[10px] md:text-xs text-muted-foreground truncate">{employeeId}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold hidden md:block">
          {language === 'ar' ? 'بوابة الموظف' : 'Employee Portal'}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        {onRefresh && (
          <Button variant="ghost" size="icon" onClick={onRefresh} className="shrink-0">
            <RefreshCw className="w-4 h-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
        >
          <Globe className="w-4 h-4" />
          <span className="ml-1 text-xs">{language === 'ar' ? 'EN' : 'عربي'}</span>
        </Button>
        <NotificationDropdown variant="portal" employeeId={employeeId} portalFilter="employee" />
        <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1.5 text-destructive">
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">{language === 'ar' ? 'خروج' : 'Logout'}</span>
        </Button>
      </div>
    </header>
  );
};
