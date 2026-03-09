import { useState, useCallback, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { TrainingAcknowledgmentModal } from '@/components/portal/TrainingAcknowledgmentModal';
import { SystemUsageAcknowledgmentModal } from '@/components/portal/SystemUsageAcknowledgmentModal';
import { cn } from '@/lib/utils';
import { PortalSidebar } from '@/components/portal/PortalSidebar';
import { PortalHeader } from '@/components/portal/PortalHeader';
import { PortalDashboard } from '@/components/portal/sections/PortalDashboard';
import { PortalProfile } from '@/components/portal/sections/PortalProfile';
import { PortalAttendance } from '@/components/portal/sections/PortalAttendance';
import { PortalLeaves } from '@/components/portal/sections/PortalLeaves';
import { PortalSalary } from '@/components/portal/sections/PortalSalary';
import { PortalLoans } from '@/components/portal/sections/PortalLoans';
import { PortalEvaluations } from '@/components/portal/sections/PortalEvaluations';
import { PortalTraining } from '@/components/portal/sections/PortalTraining';
import { PortalCustody } from '@/components/portal/sections/PortalCustody';
import { PortalDocuments } from '@/components/portal/sections/PortalDocuments';
import { PortalMissions } from '@/components/portal/sections/PortalMissions';
import { PortalViolations } from '@/components/portal/sections/PortalViolations';
import { PortalRequests } from '@/components/portal/sections/PortalRequests';
import { PortalNotifications } from '@/components/portal/sections/PortalNotifications';
import { PortalSettings } from '@/components/portal/sections/PortalSettings';
import { PortalUniforms } from '@/components/portal/sections/PortalUniforms';
import { PortalTerms } from '@/components/portal/sections/PortalTerms';
import { PortalWelcomeBanner } from '@/components/portal/PortalWelcomeBanner';

export type PortalSection =
  | 'dashboard' | 'profile' | 'attendance' | 'leaves'
  | 'salary' | 'loans' | 'evaluations' | 'training'
  | 'custody' | 'documents' | 'missions' | 'violations'
  | 'requests' | 'notifications' | 'settings' | 'uniforms' | 'terms';

const sectionComponents: Record<PortalSection, React.FC> = {
  dashboard: PortalDashboard,
  profile: PortalProfile,
  attendance: PortalAttendance,
  leaves: PortalLeaves,
  salary: PortalSalary,
  loans: PortalLoans,
  evaluations: PortalEvaluations,
  training: PortalTraining,
  custody: PortalCustody,
  uniforms: PortalUniforms,
  documents: PortalDocuments,
  missions: PortalMissions,
  violations: PortalViolations,
  requests: PortalRequests,
  notifications: PortalNotifications,
  settings: PortalSettings,
  terms: PortalTerms,
};

const EmployeePortal = () => {
  const { isRTL } = useLanguage();
  const isMobile = useIsMobile();
  const [activeSection, setActiveSection] = useState<PortalSection>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [ackDismissed, setAckDismissed] = useState(false);
  const [systemAckDismissed, setSystemAckDismissed] = useState(false);

  // Pull-to-refresh
  const mainRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const isPulling = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const el = mainRef.current;
    if (!el || refreshing) return;
    if (el.scrollTop <= 0) {
      touchStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, [refreshing]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current || refreshing) return;
    const el = mainRef.current;
    if (!el || el.scrollTop > 0) {
      isPulling.current = false;
      setPullDistance(0);
      return;
    }
    const dy = e.touches[0].clientY - touchStartY.current;
    if (dy > 0) {
      setPullDistance(Math.min(dy * 0.4, 80));
    }
  }, [refreshing]);

  const onTouchEnd = useCallback(() => {
    if (!isPulling.current) return;
    isPulling.current = false;
    if (pullDistance > 60 && !refreshing) {
      setRefreshing(true);
      setPullDistance(50);
      setTimeout(() => {
        setRefreshKey(k => k + 1);
        setRefreshing(false);
        setPullDistance(0);
      }, 600);
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, refreshing]);

  const ActiveComponent = sectionComponents[activeSection];

  // Prevent screenshot: blur content when app goes to background
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const handleVisibility = () => {
      setHidden(document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Prevent context menu (long-press save on mobile)
    const preventContext = (e: Event) => e.preventDefault();
    document.addEventListener('contextmenu', preventContext);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('contextmenu', preventContext);
    };
  }, []);

  return (
    <>
      {!systemAckDismissed && <SystemUsageAcknowledgmentModal onAcknowledged={() => setSystemAckDismissed(true)} />}
      {systemAckDismissed && !ackDismissed && <TrainingAcknowledgmentModal onAllAcknowledged={() => setAckDismissed(true)} />}
      <div
        dir="rtl"
        className={cn(
          "min-h-screen bg-background flex flex-row-reverse font-arabic select-none",
          hidden && "blur-lg pointer-events-none"
        )}
        style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
      >
      <div className="flex-1 flex flex-col min-h-screen min-w-0 overflow-hidden">
        <PortalHeader onToggleSidebar={() => {
          if (isMobile) {
            setMobileOpen(!mobileOpen);
          } else {
            setSidebarCollapsed(!sidebarCollapsed);
          }
        }} onRefresh={() => setRefreshKey(k => k + 1)} />
        <div
          ref={mainRef}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="flex-1 overflow-auto min-w-0 relative"
          style={{ overscrollBehavior: 'none' }}
        >
          {/* Pull-to-refresh indicator */}
          <div
            className="flex justify-center items-center overflow-hidden transition-all duration-200"
            style={{ height: pullDistance > 0 || refreshing ? `${pullDistance}px` : '0px' }}
          >
            <div className={cn(
              "w-6 h-6 border-2 border-primary border-t-transparent rounded-full",
              refreshing ? "animate-spin" : pullDistance > 60 ? "text-primary" : "opacity-50"
            )}
            style={{
              transform: refreshing ? undefined : `rotate(${pullDistance * 3}deg)`,
              transition: 'transform 0.1s'
            }}
            />
          </div>
          <div className="p-3 md:p-6">
            <PortalWelcomeBanner />
            <ActiveComponent key={refreshKey} />
          </div>
        </div>
      </div>
      <PortalSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        collapsed={isMobile ? false : sidebarCollapsed}
        onToggleCollapse={() => {
          if (isMobile) {
            setMobileOpen(!mobileOpen);
          } else {
            setSidebarCollapsed(!sidebarCollapsed);
          }
        }}
        mobileOpen={mobileOpen}
        onMobileOpenChange={setMobileOpen}
      />
      </div>
    </>
  );
};

export default EmployeePortal;
