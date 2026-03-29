import { ReactNode, useState, useRef } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { isRTL } = useLanguage();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const mainRef = useRef<HTMLElement>(null);
  useScrollRestoration(mainRef);

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className={cn(
      "h-dvh min-h-screen bg-background flex flex-col overflow-hidden w-full max-w-full",
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
      <main ref={mainRef} className={cn(
        "flex-1 min-h-0 min-w-0 max-w-full pt-16 overflow-y-auto overflow-x-hidden transition-all duration-300",
        !isMobile && sidebarVisible && (sidebarCollapsed ? "ms-16" : "ms-64")
      )}
        style={{
          overscrollBehaviorY: 'contain',
          touchAction: 'auto',
          WebkitOverflowScrolling: 'touch' as any,
        }}
      >
        <div className="p-4 md:p-6 w-full max-w-full overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  );
};
