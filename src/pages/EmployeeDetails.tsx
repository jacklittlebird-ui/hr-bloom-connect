import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEmployeeData } from '@/contexts/EmployeeDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ArrowRight, Save, Edit, Eye, User, Phone, CreditCard, Briefcase, Wallet, Calendar,
  Shield, FileCheck, Award, Building2, Clock, CalendarDays, MapPin,
  BarChart3, AlertTriangle, FileText, Receipt, HandCoins, GraduationCap, StickyNote, IdCard, Gift, Landmark,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BasicInfoTab } from '@/components/employees/tabs/BasicInfoTab';
import { ContactInfoTab } from '@/components/employees/tabs/ContactInfoTab';
import { IdentityTab } from '@/components/employees/tabs/IdentityTab';
import { JobInfoTab } from '@/components/employees/tabs/JobInfoTab';
import { InsuranceTab } from '@/components/employees/tabs/InsuranceTab';
import { PermitsTab } from '@/components/employees/tabs/PermitsTab';
import { CertificatesTab } from '@/components/employees/tabs/CertificatesTab';
import { DepartmentsTab } from '@/components/employees/tabs/DepartmentsTab';
import { LeaveBalanceTab } from '@/components/employees/tabs/LeaveBalanceTab';
import { LeaveRecordTab } from '@/components/employees/tabs/LeaveRecordTab';
import { MissionRecordTab } from '@/components/employees/tabs/MissionRecordTab';
import { SalaryTab } from '@/components/employees/tabs/SalaryTab';
import { OtherTab } from '@/components/employees/tabs/OtherTab';
import { AttendanceRecordTab } from '@/components/employees/tabs/AttendanceRecordTab';
import { EvaluationsTab } from '@/components/employees/tabs/EvaluationsTab';
import { ViolationsTab } from '@/components/employees/tabs/ViolationsTab';
import { DocumentsTab } from '@/components/employees/tabs/DocumentsTab';
import { SalaryRecordTab } from '@/components/employees/tabs/SalaryRecordTab';
import { LoansAdvancesTab } from '@/components/employees/tabs/LoansAdvancesTab';
import { TrainingTab } from '@/components/employees/tabs/TrainingTab';
import { NotesTab } from '@/components/employees/tabs/NotesTab';
import { BonusesEidTab } from '@/components/employees/tabs/BonusesEidTab';
import { BankAccountTab } from '@/components/employees/tabs/BankAccountTab';
import { EmployeeIdCards } from '@/components/training/EmployeeIdCards';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { toast } from '@/hooks/use-toast';
import { Employee } from '@/types/employee';

// Tabs hidden from HR role (salary-related only)
const HR_HIDDEN_TABS = ['salary', 'salaryRecord'];
const ADMIN_ONLY_TABS = ['bonusesEid'];
const allDetailTabs = [
  { id: 'basic', icon: User, labelKey: 'employees.tabs.basicInfo' },
  { id: 'contact', icon: Phone, labelKey: 'employees.tabs.contactInfo' },
  { id: 'identity', icon: CreditCard, labelKey: 'employees.tabs.identity' },
  { id: 'job', icon: Briefcase, labelKey: 'employees.tabs.jobInfo' },
  { id: 'salary', icon: Wallet, labelKey: 'employees.tabs.salary' },
  { id: 'bankAccount', icon: Landmark, labelKey: 'employees.tabs.bankAccount' },
  { id: 'leave', icon: Calendar, labelKey: 'employees.tabs.leaveBalance' },
  { id: 'insurance', icon: Shield, labelKey: 'employees.tabs.insurance' },
  { id: 'permits', icon: FileCheck, labelKey: 'employees.tabs.permits' },
  { id: 'certificates', icon: Award, labelKey: 'employees.tabs.certificates' },
  { id: 'departments', icon: Building2, labelKey: 'employees.tabs.departments' },
  { id: 'attendanceRecord', icon: Clock, labelKey: 'employees.tabs.attendanceRecord' },
  { id: 'leaveRecord', icon: CalendarDays, labelKey: 'employees.tabs.leaveRecord' },
  { id: 'missionRecord', icon: MapPin, labelKey: 'employees.tabs.missionRecord' },
  { id: 'evaluations', icon: BarChart3, labelKey: 'employees.tabs.evaluations' },
  { id: 'violations', icon: AlertTriangle, labelKey: 'employees.tabs.violations' },
  { id: 'documents', icon: FileText, labelKey: 'employees.tabs.documents' },
  { id: 'salaryRecord', icon: Receipt, labelKey: 'employees.tabs.salaryRecord' },
  { id: 'loansAdvances', icon: HandCoins, labelKey: 'employees.tabs.loansAdvances' },
  { id: 'training', icon: GraduationCap, labelKey: 'employees.tabs.training' },
  { id: 'companyCard', icon: IdCard, labelKey: 'employees.tabs.companyCard' },
  { id: 'bonusesEid', icon: Gift, labelKey: 'employees.tabs.bonusesEid' },
  { id: 'notes', icon: StickyNote, labelKey: 'employees.tabs.notes' },
];

const PlaceholderTab = ({ label }: { label: string }) => (
  <div className="p-8 flex flex-col items-center justify-center text-muted-foreground min-h-[200px]">
    <FileText className="w-12 h-12 mb-4 opacity-40" />
    <p className="text-lg font-medium">{label}</p>
    <p className="text-sm mt-1 opacity-60">قريباً...</p>
  </div>
);

const EmployeeDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isViewMode = location.pathname.endsWith('/view');
  const { t, isRTL, language } = useLanguage();
  const { getEmployee, updateEmployee, ensureFullEmployee } = useEmployeeData();
  const { user } = useAuth();
  const isHR = user?.role === 'hr';
  const isAdmin = user?.role === 'admin';
  const [activeTab, setActiveTab] = useState('basic');
  const [fullLoaded, setFullLoaded] = useState(false);

  // Load full employee data on mount
  useEffect(() => {
    if (id) {
      ensureFullEmployee(id).then(() => setFullLoaded(true));
    }
  }, [id, ensureFullEmployee]);

  // Filter out salary tabs for HR users
  const detailTabs = useMemo(
    () => {
      let tabs = allDetailTabs;
      if (isHR) tabs = tabs.filter(tab => !HR_HIDDEN_TABS.includes(tab.id));
      if (!isAdmin) tabs = tabs.filter(tab => !ADMIN_ONLY_TABS.includes(tab.id));
      return tabs;
    },
    [isHR, isAdmin]
  );

  // Accumulate all field changes from all tabs
  const pendingUpdates = useRef<Partial<Employee>>({});

  const handleFieldChange = useCallback((updates: Partial<Employee>) => {
    pendingUpdates.current = { ...pendingUpdates.current, ...updates };
  }, []);

  const readOnlyHandler = useCallback((_updates: Partial<Employee>) => {
    // no-op in view mode
  }, []);

  const employee = getEmployee(id || '');

  if (!employee) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground text-lg">الموظف غير موجود</p>
        </div>
      </DashboardLayout>
    );
  }

  const handleSave = async () => {
    const updates = pendingUpdates.current;
    if (Object.keys(updates).length > 0) {
      try {
        await updateEmployee(employee.id, updates);
        pendingUpdates.current = {};
        toast({
          title: language === 'ar' ? 'تم الحفظ' : 'Saved',
          description: language === 'ar' ? 'تم حفظ جميع بيانات الموظف بنجاح' : 'All employee data saved successfully',
        });
      } catch (err) {
        toast({
          title: language === 'ar' ? 'خطأ' : 'Error',
          description: language === 'ar' ? 'حدث خطأ أثناء حفظ البيانات' : 'An error occurred while saving',
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: language === 'ar' ? 'لا توجد تغييرات' : 'No changes',
        description: language === 'ar' ? 'لم يتم إجراء أي تغييرات' : 'No changes were made',
      });
    }
  };

  const effectiveHandler = isViewMode ? readOnlyHandler : handleFieldChange;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'basic': return <BasicInfoTab employee={employee} onUpdate={effectiveHandler} readOnly={isViewMode} />;
      case 'contact': return <ContactInfoTab employee={employee} onUpdate={effectiveHandler} readOnly={isViewMode} />;
      case 'identity': return <IdentityTab employee={employee} onUpdate={effectiveHandler} readOnly={isViewMode} />;
      case 'job': return <JobInfoTab employee={employee} onUpdate={effectiveHandler} readOnly={isViewMode} />;
      case 'salary': return <SalaryTab employee={employee} onUpdate={effectiveHandler} readOnly={isViewMode} />;
      case 'bankAccount': return <BankAccountTab employee={employee} onUpdate={effectiveHandler} readOnly={isViewMode} />;
      case 'leave': return <LeaveBalanceTab employee={employee} onUpdate={effectiveHandler} onDirectSave={async (updates) => { if (!isViewMode) await updateEmployee(employee.id, updates); }} readOnly={isViewMode} />;
      case 'leaveRecord': return <LeaveRecordTab employee={employee} />;
      case 'missionRecord': return <MissionRecordTab employee={employee} />;
      case 'insurance': return <InsuranceTab employee={employee} onUpdate={effectiveHandler} readOnly={isViewMode} />;
      case 'permits': return <PermitsTab employee={employee} onUpdate={effectiveHandler} readOnly={isViewMode} />;
      case 'certificates': return <CertificatesTab employee={employee} onUpdate={effectiveHandler} readOnly={isViewMode} />;
      case 'departments': return <DepartmentsTab employee={employee} onUpdate={effectiveHandler} readOnly={isViewMode} />;
      case 'attendanceRecord': return <AttendanceRecordTab employee={employee} />;
      case 'evaluations': return <EvaluationsTab employee={employee} />;
      case 'violations': return <ViolationsTab employee={employee} />;
      case 'documents': return <DocumentsTab employee={employee} />;
      case 'salaryRecord': return <SalaryRecordTab employee={employee} />;
      case 'loansAdvances': return <LoansAdvancesTab employee={employee} />;
      case 'training': return <TrainingTab employee={employee} />;
      case 'companyCard': return <EmployeeIdCards filterEmployeeId={employee.id} />;
      case 'bonusesEid': return <BonusesEidTab employee={employee} />;
      case 'notes': return <NotesTab employee={employee} onUpdate={effectiveHandler} readOnly={isViewMode} />;
      default: return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-primary rounded-xl p-6">
          <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
            <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
              <h1 className="text-2xl font-bold text-primary-foreground">
                {t('employees.details.title')}
              </h1>
              {isViewMode && (
                <Badge className="bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30">
                  <Eye className="w-3 h-3 mr-1" />
                  {language === 'ar' ? 'وضع العرض' : 'View Mode'}
                </Badge>
              )}
            </div>
            <div className={cn("flex gap-3 items-center", isRTL && "flex-row-reverse")}>
              <NotificationDropdown variant="header" employeeId={employee.employeeId} />
              <Button variant="secondary" size="sm" className="gap-2" onClick={() => navigate('/employees')}>
                <ArrowRight className={cn("w-4 h-4", !isRTL && "rotate-180")} />
                {t('employees.details.backToList')}
              </Button>
              {isViewMode ? (
                <Button
                  size="sm"
                  className="gap-2 bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground"
                  onClick={() => navigate(`/employees/${employee.id}`)}
                >
                  <Edit className="w-4 h-4" />
                  {language === 'ar' ? 'تعديل' : 'Edit'}
                </Button>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-2"
                    onClick={() => navigate(`/employees/${employee.id}/view`)}
                  >
                    <Eye className="w-4 h-4" />
                    {language === 'ar' ? 'عرض' : 'View'}
                  </Button>
                  <Button
                    size="sm"
                    className="gap-2 bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground"
                    onClick={handleSave}
                  >
                    <Save className="w-4 h-4" />
                    {t('employees.save')}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Employee Info Card */}
        <div className="border-2 border-destructive/30 rounded-xl p-6 bg-card">
          <div className={cn("flex items-center gap-6", isRTL && "flex-row-reverse")}>
            <Avatar className="w-24 h-24 border-4 border-primary/20">
              <AvatarImage src={employee.avatar} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {employee.nameAr.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className={cn("flex-1 space-y-3", isRTL && "text-right")}>
              <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
                <span className="text-muted-foreground font-medium">{t('employees.details.nameAr')} :</span>
                <span className="text-lg font-bold text-primary">{employee.nameAr}</span>
              </div>
              <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
                <span className="text-muted-foreground font-medium">{t('employees.details.nameEn')} :</span>
                <span className="text-lg font-bold text-primary">{employee.nameEn}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Grid */}
        <div className="border-2 border-warning/40 rounded-xl p-5 bg-card">
          <div className="flex flex-wrap gap-3">
            {detailTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all text-sm font-medium",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-md"
                      : "bg-card text-foreground border-border hover:border-primary/50 hover:bg-muted/50",
                    isRTL && "flex-row-reverse"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="whitespace-nowrap">{t(tab.labelKey)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className={cn("border rounded-xl bg-card overflow-hidden", isViewMode && "relative")}>
          {isViewMode && ['basic', 'contact', 'identity', 'job', 'salary', 'bankAccount', 'leave', 'insurance', 'permits', 'certificates', 'notes'].includes(activeTab) && (
            <div className="absolute inset-0 z-10 pointer-events-auto" style={{ background: 'transparent' }}>
              <style>{`
                .view-mode-overlay input, .view-mode-overlay select, .view-mode-overlay textarea, .view-mode-overlay button[role="combobox"] {
                  pointer-events: none !important;
                  opacity: 0.7 !important;
                }
              `}</style>
            </div>
          )}
          <div className={isViewMode && ['basic', 'contact', 'identity', 'job', 'salary', 'bankAccount', 'leave', 'insurance', 'permits', 'certificates', 'notes'].includes(activeTab) ? 'view-mode-overlay' : ''}>
            {renderTabContent()}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default EmployeeDetails;
