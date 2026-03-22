import { useState, useCallback, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { TrainingAcknowledgmentModal } from '@/components/portal/TrainingAcknowledgmentModal';
import { SystemUsageAcknowledgmentModal } from '@/components/portal/SystemUsageAcknowledgmentModal';
import { AssetAcknowledgmentModal } from '@/components/portal/AssetAcknowledgmentModal';
import { UniformAcknowledgmentModal } from '@/components/portal/UniformAcknowledgmentModal';
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
import { PortalEidBonuses } from '@/components/portal/sections/PortalEidBonuses';
import { PortalBonuses } from '@/components/portal/sections/PortalBonuses';

export type PortalSection =
  | 'dashboard' | 'profile' | 'attendance' | 'leaves'
  | 'salary' | 'loans' | 'evaluations' | 'training'
  | 'custody' | 'documents' | 'missions' | 'violations'
  | 'requests' | 'notifications' | 'settings' | 'uniforms' | 'terms'
  | 'eid-bonuses' | 'bonuses';

const sectionComponents: Record<PortalSection, React.FC> = {
  dashboard: PortalDashboard,
  profile: PortalProfile,
  attendance: PortalAttendance,
  leaves: PortalLeaves,
  salary: PortalSalary,
  'eid-bonuses': PortalEidBonuses,
  bonuses: PortalBonuses,
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
  const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
  const enablePullToRefresh = isMobile && !isAndroid;
  const [activeSection, setActiveSection] = useState<PortalSection>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [ackDismissed, setAckDismissed] = useState(false);
  const [assetAckDismissed, setAssetAckDismissed] = useState(false);
  const [uniformAckDismissed, setUniformAckDismissed] = useState(false);
  const [systemAckDismissed, setSystemAckDismissed] = useState(false);

  // Apply saved portal color on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('portal_primary_color');
      if (saved) {
        import('@/lib/themeUtils').then(({ applyThemeSettings }) => {
          applyThemeSettings({ primaryColor: saved });
        });
      }
    } catch {}
  }, []);

  // Pull-to-refresh
  const mainRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const isPulling = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enablePullToRefresh) return;
    const el = mainRef.current;
    if (!el || refreshing) return;
    if (el.scrollTop <= 0) {
      touchStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, [enablePullToRefresh, refreshing]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enablePullToRefresh) return;
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
  }, [enablePullToRefresh, refreshing]);

  const onTouchEnd = useCallback(() => {
    if (!enablePullToRefresh) return;
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
  }, [enablePullToRefresh, pullDistance, refreshing]);

  const touchHandlers = enablePullToRefresh
    ? {
        onTouchStart,
        onTouchMove,
        onTouchEnd,
      }
    : {};

  const ActiveComponent = sectionComponents[activeSection];

  // Prevent screenshot: blur content when app goes to background
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const handleVisibility = () => {
      setHidden(document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return (
    <>
      {!systemAckDismissed && <SystemUsageAcknowledgmentModal onAcknowledged={() => setSystemAckDismissed(true)} />}
      {systemAckDismissed && !ackDismissed && <TrainingAcknowledgmentModal onAllAcknowledged={() => setAckDismissed(true)} />}
      {systemAckDismissed && ackDismissed && !assetAckDismissed && <AssetAcknowledgmentModal onAllAcknowledged={() => setAssetAckDismissed(true)} />}
      {systemAckDismissed && ackDismissed && assetAckDismissed && !uniformAckDismissed && <UniformAcknowledgmentModal onAllAcknowledged={() => setUniformAckDismissed(true)} />}
      <div
        dir="rtl"
        className={cn(
          "h-dvh min-h-screen bg-background flex flex-row-reverse font-arabic overflow-hidden",
          hidden && "blur-lg pointer-events-none"
        )}
      >
      <div className="flex-1 flex flex-col h-full min-h-0 min-w-0 overflow-x-hidden">
        <PortalHeader onToggleSidebar={() => {
          if (isMobile) {
            setMobileOpen(!mobileOpen);
          } else {
            setSidebarCollapsed(!sidebarCollapsed);
          }
        }} onRefresh={() => setRefreshKey(k => k + 1)} />
        <div
          ref={mainRef}
          {...touchHandlers}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden min-w-0 relative"
          style={{
            overscrollBehaviorY: 'contain',
            touchAction: 'auto',
            WebkitOverflowScrolling: 'touch' as any,
          }}
        >
          {/* Pull-to-refresh indicator */}
          {enablePullToRefresh && (
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
          )}
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
