import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { PortalSection } from '@/pages/EmployeePortal';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  LayoutDashboard, User, Clock, Calendar, Wallet, HandCoins,
  Star, GraduationCap, Package, FileText, MapPin, Ban,
  ClipboardList, Bell, Settings, PanelLeftClose, PanelLeftOpen, Shirt, ShieldCheck,
  Gift, Award,
} from 'lucide-react';

interface SidebarGroup {
  labelAr: string;
  labelEn: string;
  items: { key: PortalSection; labelAr: string; labelEn: string; icon: React.ElementType }[];
}

const sidebarGroups: SidebarGroup[] = [
  {
    labelAr: 'الرئيسية',
    labelEn: 'Main',
    items: [
      { key: 'dashboard', labelAr: 'لوحة التحكم', labelEn: 'Dashboard', icon: LayoutDashboard },
      { key: 'profile', labelAr: 'ملفي الشخصي', labelEn: 'My Profile', icon: User },
    ],
  },
  {
    labelAr: 'العمل',
    labelEn: 'Work',
    items: [
      { key: 'attendance', labelAr: 'الحضور والانصراف', labelEn: 'Attendance', icon: Clock },
      { key: 'leaves', labelAr: 'الإجازات والأذونات', labelEn: 'Leaves & Permissions', icon: Calendar },
    ],
  },
  {
    labelAr: 'المالية',
    labelEn: 'Financial',
    items: [
      { key: 'salary', labelAr: 'الراتب', labelEn: 'Salary', icon: Wallet },
      { key: 'eid-bonuses', labelAr: 'العيديات', labelEn: 'Eid Bonuses', icon: Gift },
      { key: 'bonuses', labelAr: 'المكافآت', labelEn: 'Bonuses', icon: Award },
      { key: 'loans', labelAr: 'قروضي', labelEn: 'My Loans', icon: HandCoins },
    ],
  },
  {
    labelAr: 'الأداء',
    labelEn: 'Performance',
    items: [
      { key: 'evaluations', labelAr: 'تقييماتي', labelEn: 'Evaluations', icon: Star },
      { key: 'training', labelAr: 'التدريب', labelEn: 'Training', icon: GraduationCap },
    ],
  },
  {
    labelAr: 'العهد والمستندات',
    labelEn: 'Custody & Docs',
    items: [
      { key: 'custody', labelAr: 'عهد وتعهدات', labelEn: 'Custody', icon: Package },
      { key: 'uniforms', labelAr: 'اليونيفورم', labelEn: 'Uniforms', icon: Shirt },
      { key: 'documents', labelAr: 'المستندات', labelEn: 'Documents', icon: FileText },
    ],
  },
  {
    labelAr: 'الطلبات',
    labelEn: 'Requests',
    items: [
      { key: 'missions', labelAr: 'مأمورياتي', labelEn: 'Missions', icon: MapPin },
      { key: 'violations', labelAr: 'مخالفاتي', labelEn: 'Violations', icon: Ban },
      { key: 'requests', labelAr: 'الطلبات', labelEn: 'Requests', icon: ClipboardList },
    ],
  },
  {
    labelAr: 'النظام',
    labelEn: 'System',
    items: [
      { key: 'notifications', labelAr: 'الإشعارات', labelEn: 'Notifications', icon: Bell },
      { key: 'terms', labelAr: 'شروط الاستخدام', labelEn: 'Terms of Use', icon: ShieldCheck },
      { key: 'settings', labelAr: 'الإعدادات', labelEn: 'Settings', icon: Settings },
    ],
  },
];

interface PortalSidebarProps {
  activeSection: PortalSection;
  onSectionChange: (section: PortalSection) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

export const PortalSidebar = ({ activeSection, onSectionChange, collapsed, onToggleCollapse, mobileOpen, onMobileOpenChange }: PortalSidebarProps) => {
  const { language } = useLanguage();
  const isMobile = useIsMobile();

  const navContent = (
    <>
      {/* Collapse toggle - desktop only */}
      {!isMobile && (
        <div className={cn("flex items-center px-3 py-4", collapsed ? "justify-center" : "justify-start")}>
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

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-4">
        {sidebarGroups.map((group, gi) => (
          <div key={gi}>
            {!collapsed && (
              <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-sidebar-muted text-right">
                {language === 'ar' ? group.labelAr : group.labelEn}
              </p>
            )}
            {collapsed && gi > 0 && <div className="border-t border-sidebar-border my-2 mx-2" />}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      onSectionChange(item.key);
                      if (isMobile && onMobileOpenChange) onMobileOpenChange(false);
                    }}
                    title={collapsed ? (language === 'ar' ? item.labelAr : item.labelEn) : undefined}
                    className={cn(
                      "group w-full flex items-center gap-3 rounded-lg text-[13px] font-medium transition-all duration-150",
                      collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2 flex-row-reverse text-right",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm shadow-sidebar-primary/25"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <Icon className={cn(
                      "w-[18px] h-[18px] shrink-0 transition-colors",
                      isActive ? "text-sidebar-primary-foreground" : "text-sidebar-muted group-hover:text-sidebar-accent-foreground"
                    )} />
                    {!collapsed && <span className="truncate">{language === 'ar' ? item.labelAr : item.labelEn}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </>
  );

  // Mobile: use Sheet
  if (isMobile) {
    return (
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent
          side="right"
          className="w-[272px] p-0 bg-sidebar border-sidebar-border"
        >
          <div className="h-full overflow-y-auto pt-4">
            {navContent}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop - always visible, collapsible
  return (
    <aside
      className={cn(
        "h-screen sticky top-0 bg-sidebar border-sidebar-border flex flex-col transition-all duration-300 overflow-hidden shrink-0 border-l",
        collapsed ? "w-[60px]" : "w-[260px]"
      )}
    >
      {navContent}
    </aside>
  );
};
