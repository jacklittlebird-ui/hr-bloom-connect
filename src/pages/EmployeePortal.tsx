import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { requestGlobalRefresh } from '@/lib/portalRefresh';
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
import { PortalRoster } from '@/components/portal/sections/PortalRoster';
import { usePreventPullToRefresh } from '@/hooks/usePreventPullToRefresh';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';

export type PortalSection =
  | 'dashboard' | 'profile' | 'attendance' | 'leaves'
  | 'salary' | 'loans' | 'evaluations' | 'training'
  | 'custody' | 'documents' | 'missions' | 'violations'
  | 'requests' | 'notifications' | 'settings' | 'uniforms' | 'terms'
  | 'eid-bonuses' | 'bonuses' | 'roster';

const sectionComponents: Record<PortalSection, React.FC> = {
  dashboard: PortalDashboard,
  profile: PortalProfile,
  attendance: PortalAttendance,
  roster: PortalRoster,
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
  const { isRTL, language } = useLanguage();
  const isMobile = useIsMobile();
  const [activeSection, setActiveSection] = useState<PortalSection>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [ackDismissed, setAckDismissed] = useState(false);
  const [assetAckDismissed, setAssetAckDismissed] = useState(false);
  const [uniformAckDismissed, setUniformAckDismissed] = useState(false);
  const [systemAckDismissed, setSystemAckDismissed] = useState(false);

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

  const mainRef = useRef<HTMLDivElement>(null);
  usePreventPullToRefresh(mainRef, isMobile);
  useScrollRestoration(mainRef);

  const ActiveComponent = sectionComponents[activeSection];

  // Refresh the selected page: drop every cached query and every "already
  // loaded" guard in the data contexts, then remount the section so all of
  // its data is read from the database again.
  const handleRefresh = () => {
    requestGlobalRefresh();
    setRefreshKey((k) => k + 1);
    setRefreshing(true);
    window.setTimeout(() => setRefreshing(false), 900);
    toast.success(language === 'ar' ? 'تم تحديث بيانات الصفحة' : 'Page data refreshed');
  };

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
        dir={isRTL ? 'rtl' : 'ltr'}
        className={cn(
          'h-dvh min-h-screen bg-background flex flex-row-reverse font-arabic overflow-hidden',
          hidden && 'blur-lg pointer-events-none'
        )}
      >
        <div className="flex-1 flex flex-col h-full min-h-0 min-w-0 overflow-x-hidden">
          <PortalHeader onToggleSidebar={() => {
            if (isMobile) {
              setMobileOpen(!mobileOpen);
            } else {
              setSidebarCollapsed(!sidebarCollapsed);
            }
          }} onRefresh={handleRefresh} refreshing={refreshing} />
          <div
            ref={mainRef}
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden min-w-0 relative"
            style={{
              overscrollBehavior: 'none',
              overscrollBehaviorY: 'none',
              touchAction: 'pan-y',
              WebkitOverflowScrolling: 'touch' as any,
            }}
          >
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
