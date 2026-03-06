import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { useModulePermissions, PATH_TO_MODULE, ModuleKey } from '@/hooks/useModulePermissions';
import {
  LayoutDashboard, Users, Building2, Clock, FileText, Calendar, Wallet,
  FileBarChart, HandCoins, UserPlus, Star, Monitor, Shirt, FolderOpen, BarChart3,
  GraduationCap, Settings, Shield, Layers, UserCog, UserCheck,
  ChevronLeft, ChevronRight,
} from 'lucide-react';

interface NavItem {
  key: string;
  icon: React.ElementType;
  path: string;
  moduleKey: ModuleKey;
}

const mainNavItems: NavItem[] = [
  { key: 'nav.dashboard', icon: LayoutDashboard, path: '/', moduleKey: 'dashboard' },
  { key: 'nav.employeePortal', icon: UserCheck, path: '/employee-portal', moduleKey: 'employee-portal' },
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
  { key: 'nav.documents', icon: FolderOpen, path: '/documents', moduleKey: 'documents' },
  { key: 'nav.reports', icon: BarChart3, path: '/reports', moduleKey: 'reports' },
  { key: 'nav.training', icon: GraduationCap, path: '/training', moduleKey: 'training' },
];

const configNavItems: NavItem[] = [
  { key: 'nav.users', icon: UserCog, path: '/users', moduleKey: 'users' },
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

  const CollapseIcon = collapsed ? ChevronLeft : ChevronRight;

  const visibleMainItems = mainNavItems.filter(item => hasAccess(item.moduleKey));
  const visibleConfigItems = configNavItems.filter(item => hasAccess(item.moduleKey));

  const navContent = (
    <>
      {/* Collapse toggle - desktop only */}
      {!isMobile && (
        <div className={cn("flex items-center p-3", collapsed ? "justify-center" : "justify-start")}>
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-md hover:bg-sidebar-accent/50 text-sidebar-foreground/60 transition-colors"
          >
            <CollapseIcon className="w-5 h-5" />
          </button>
        </div>
      )}

      <nav className="p-2 space-y-1">
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
              <div className="pt-6 pb-2">
                <p className="px-3 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
                  {t('nav.configurations')}
                </p>
              </div>
            )}
            {collapsed && !isMobile && <div className="pt-4 border-t border-sidebar-border my-2" />}
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
          side={isRTL ? 'right' : 'left'}
          className="w-64 p-0 bg-sidebar border-sidebar-border"
        >
          <div className="h-full overflow-y-auto pt-2">
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
      collapsed ? "w-16" : "w-64"
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
        "w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200",
        collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
        isRTL && !collapsed && "text-right"
      )}
    >
      <Icon className="w-5 h-5 shrink-0" />
      {!collapsed && <span>{t(item.key)}</span>}
    </button>
  );
};
