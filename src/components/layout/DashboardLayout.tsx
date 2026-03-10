import { ReactNode, useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { isRTL } = useLanguage();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className={cn(
      "min-h-screen bg-background",
      isRTL ? "font-arabic" : "font-sans"
    )}>
      <Header onToggleSidebar={() => {
        if (isMobile) {
          setSidebarOpen(!sidebarOpen);
        } else {
          setSidebarVisible(!sidebarVisible);
        }
      }} />
      {(isMobile || sidebarVisible) && (
        <Sidebar
          open={sidebarOpen}
          onOpenChange={setSidebarOpen}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      )}
      <main className={cn(
        "pt-16 min-h-screen transition-all duration-300",
        !isMobile && sidebarVisible && (sidebarCollapsed ? "ms-16" : "ms-64")
      )}>
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
};
