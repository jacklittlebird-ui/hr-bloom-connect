import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { useModulePermissions, PATH_TO_MODULE, ModuleKey } from '@/hooks/useModulePermissions';
import {
  LayoutDashboard, Users, Building2, Clock, FileText, Calendar, Wallet,
  FileBarChart, HandCoins, UserPlus, Star, Monitor, Shirt, FolderOpen, BarChart3,
  GraduationCap, Settings, Shield, Layers, UserCog, UserCheck, Bell,
  ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen,
  ScanLine, ShieldCheck, Tv, Car,
} from 'lucide-react';

interface NavItem {
  key: string;
  icon: React.ElementType;
  path: string;
  moduleKey: ModuleKey;
}

const mainNavItems: NavItem[] = [
  { key: 'nav.dashboard', icon: LayoutDashboard, path: '/', moduleKey: 'dashboard' },
  { key: 'nav.employees', icon: Users, path: '/employees', moduleKey: 'employees' },
  { key: 'nav.departments', icon: Building2, path: '/departments', moduleKey: 'departments' },
  { key: 'nav.attendance', icon: Clock, path: '/attendance', moduleKey: 'attendance' },
  { key: 'nav.leaves', icon: Calendar, path: '/leaves', moduleKey: 'leaves' },
  { key: 'nav.salaries', icon: Wallet, path: '/salaries', moduleKey: 'salaries' },
  { key: 'nav.salaryReports', icon: FileBarChart, path: '/salary-reports', moduleKey: 'salary-reports' },
  { key: 'nav.loans', icon: HandCoins, path: '/loans', moduleKey: 'loans' },
  { key: 'nav.recruitment', icon: UserPlus, path: '/recruitment', moduleKey: 'recruitment' },
  { key: 'nav.performance', icon: Star, path: '/performance', moduleKey: 'performance' },
  { key: 'nav.assets', icon: Monitor, path: '/assets', moduleKey: 'assets' },
  { key: 'nav.uniforms', icon: Shirt, path: '/uniforms', moduleKey: 'uniforms' },
  { key: 'nav.vehicles', icon: Car, path: '/vehicles', moduleKey: 'vehicles' },
  { key: 'nav.documents', icon: FolderOpen, path: '/documents', moduleKey: 'documents' },
  { key: 'nav.reports', icon: BarChart3, path: '/reports', moduleKey: 'reports' },
  { key: 'nav.training', icon: GraduationCap, path: '/training', moduleKey: 'training' },
  { key: 'nav.notifications', icon: Bell, path: '/notifications', moduleKey: 'notifications' },
];

const configNavItems: NavItem[] = [
  { key: 'nav.attendanceScan', icon: ScanLine, path: '/attendance/scan', moduleKey: 'attendance' },
  { key: 'nav.attendanceAdmin', icon: ShieldCheck, path: '/attendance/admin', moduleKey: 'attendance' },
  { key: 'nav.attendanceKiosk', icon: Tv, path: '/attendance/kiosk', moduleKey: 'attendance' },
  { key: 'nav.users', icon: UserCog, path: '/users', moduleKey: 'users' },
  { key: 'nav.auditLogs', icon: Shield, path: '/audit-logs', moduleKey: 'settings' },
  { key: 'nav.settings', icon: Settings, path: '/settings', moduleKey: 'settings' },
];

interface SidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar = ({ open, onOpenChange, collapsed, onToggleCollapse }: SidebarProps) => {
  const { t, isRTL } = useLanguage();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { hasAccess } = useModulePermissions();

  const visibleMainItems = mainNavItems.filter(item => hasAccess(item.moduleKey));
  const visibleConfigItems = configNavItems.filter(item => hasAccess(item.moduleKey));

  const navContent = (
    <>
      {/* Collapse toggle - desktop only */}
      {!isMobile && (
        <div className={cn(
          "flex items-center px-3 py-4",
          collapsed ? "justify-center" : isRTL ? "justify-start" : "justify-end"
        )}>
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-muted transition-colors"
          >
            {collapsed
              ? <PanelLeftOpen className="w-4 h-4" />
              : <PanelLeftClose className="w-4 h-4" />
            }
          </button>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
        {visibleMainItems.map((item) => (
          <NavButton
            key={item.key}
            item={item}
            t={t}
            isRTL={isRTL}
            isActive={location.pathname === item.path}
            collapsed={collapsed && !isMobile}
            onNavigate={() => isMobile && onOpenChange(false)}
          />
        ))}

        {visibleConfigItems.length > 0 && (
          <>
            {(!collapsed || isMobile) && (
              <div className="pt-5 pb-1.5">
                <p className="px-3 text-[10px] font-bold text-sidebar-muted uppercase tracking-[0.15em]">
                  {t('nav.configurations')}
                </p>
              </div>
            )}
            {collapsed && !isMobile && (
              <div className="my-3 mx-2 border-t border-sidebar-border" />
            )}
            {visibleConfigItems.map((item) => (
              <NavButton
                key={item.key}
                item={item}
                t={t}
                isRTL={isRTL}
                isActive={location.pathname === item.path}
                collapsed={collapsed && !isMobile}
                onNavigate={() => isMobile && onOpenChange(false)}
              />
            ))}
          </>
        )}
      </nav>
    </>
  );

  // Mobile: use Sheet drawer
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-[272px] max-w-[85vw] p-0 bg-sidebar border-sidebar-border overflow-x-hidden"
        >
          <div className="h-full overflow-y-auto overflow-x-hidden pt-4">
            {navContent}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: collapsible sidebar
  return (
    <aside className={cn(
      "fixed top-16 h-[calc(100vh-4rem)] bg-sidebar border-sidebar-border overflow-y-auto transition-all duration-300 z-40 flex flex-col",
      isRTL ? "right-0 border-l" : "left-0 border-r",
      collapsed ? "w-[60px]" : "w-[260px]"
    )}>
      {navContent}
    </aside>
  );
};

interface NavButtonProps {
  item: NavItem;
  t: (key: string) => string;
  isRTL: boolean;
  isActive: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}

const NavButton: React.FC<NavButtonProps> = ({ item, t, isRTL, isActive, collapsed, onNavigate }) => {
  const Icon = item.icon;
  const navigate = useNavigate();

  return (
    <button
      onClick={() => { navigate(item.path); onNavigate?.(); }}
      title={collapsed ? t(item.key) : undefined}
      className={cn(
        "group w-full flex items-center gap-3 rounded-lg text-[13px] font-medium transition-all duration-150",
        collapsed ? "justify-center px-0 py-2.5" : cn("px-3 py-2", isRTL && "flex-row-reverse text-right"),
        isActive
          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm shadow-sidebar-primary/25"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
    >
      <Icon className={cn(
        "w-[18px] h-[18px] shrink-0 transition-colors",
        isActive ? "text-sidebar-primary-foreground" : "text-sidebar-muted group-hover:text-sidebar-accent-foreground"
      )} />
      {!collapsed && <span className="truncate">{t(item.key)}</span>}
    </button>
  );
};
