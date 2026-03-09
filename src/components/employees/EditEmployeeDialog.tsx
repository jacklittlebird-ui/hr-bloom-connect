import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Employee } from '@/types/employee';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { X, User, Phone, CreditCard, Briefcase, Shield, FileCheck, Award, Building2, MoreHorizontal, Calendar, Wallet, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BasicInfoTab } from './tabs/BasicInfoTab';
import { ContactInfoTab } from './tabs/ContactInfoTab';
import { IdentityTab } from './tabs/IdentityTab';
import { JobInfoTab } from './tabs/JobInfoTab';
import { InsuranceTab } from './tabs/InsuranceTab';
import { PermitsTab } from './tabs/PermitsTab';
import { CertificatesTab } from './tabs/CertificatesTab';
import { DepartmentsTab } from './tabs/DepartmentsTab';
import { OtherTab } from './tabs/OtherTab';
import { LeaveBalanceTab } from './tabs/LeaveBalanceTab';
import { SalaryTab } from './tabs/SalaryTab';

interface EditEmployeeDialogProps {
  employee: Employee | null;
  open: boolean;
  onClose: () => void;
}

const allTabs = [
  { id: 'basic', icon: User, labelKey: 'employees.tabs.basicInfo' },
  { id: 'contact', icon: Phone, labelKey: 'employees.tabs.contactInfo' },
  { id: 'identity', icon: CreditCard, labelKey: 'employees.tabs.identity' },
  { id: 'job', icon: Briefcase, labelKey: 'employees.tabs.jobInfo' },
  { id: 'insurance', icon: Shield, labelKey: 'employees.tabs.insurance' },
  { id: 'permits', icon: FileCheck, labelKey: 'employees.tabs.permits' },
  { id: 'certificates', icon: Award, labelKey: 'employees.tabs.certificates' },
  { id: 'departments', icon: Building2, labelKey: 'employees.tabs.departments' },
  { id: 'other', icon: MoreHorizontal, labelKey: 'employees.tabs.other' },
  { id: 'leave', icon: Calendar, labelKey: 'employees.tabs.leaveBalance' },
  { id: 'salary', icon: Wallet, labelKey: 'employees.tabs.salary' },
];

export const EditEmployeeDialog = ({ employee, open, onClose }: EditEmployeeDialogProps) => {
  const { t, isRTL } = useLanguage();

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-full h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="bg-primary px-6 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-primary-foreground hover:bg-primary-foreground/20"
          >
            <X className="w-5 h-5" />
          </Button>
          <h2 className="text-lg font-semibold text-primary-foreground">
            {t('employees.editEmployee')}
          </h2>
        </div>

        {/* Content */}
        <Tabs defaultValue="basic" className="flex flex-col h-[calc(90vh-60px)]" dir={isRTL ? 'rtl' : 'ltr'}>
          {/* Tabs Navigation */}
          <div className="border-b bg-background">
            <ScrollArea className="w-full">
              <TabsList className={cn(
                "inline-flex h-12 items-center justify-start bg-transparent p-0 w-max"
              )} dir="rtl">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className={cn(
                        "inline-flex items-center gap-2 px-4 py-3 text-sm font-medium text-muted-foreground border-b-2 border-transparent rounded-none",
                        "data-[state=active]:text-primary data-[state=active]:border-primary",
                        "hover:text-foreground transition-colors",
                        isRTL && "flex-row-reverse"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="whitespace-nowrap">{t(tab.labelKey)}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>

          {/* Tab Contents */}
          <div className="flex-1 overflow-auto">
            <TabsContent value="basic" className="mt-0 h-full">
              <BasicInfoTab employee={employee} />
            </TabsContent>
            <TabsContent value="contact" className="mt-0 h-full">
              <ContactInfoTab employee={employee} />
            </TabsContent>
            <TabsContent value="identity" className="mt-0 h-full">
              <IdentityTab employee={employee} />
            </TabsContent>
            <TabsContent value="job" className="mt-0 h-full">
              <JobInfoTab employee={employee} />
            </TabsContent>
            <TabsContent value="insurance" className="mt-0 h-full">
              <InsuranceTab employee={employee} />
            </TabsContent>
            <TabsContent value="permits" className="mt-0 h-full">
              <PermitsTab employee={employee} />
            </TabsContent>
            <TabsContent value="certificates" className="mt-0 h-full">
              <CertificatesTab employee={employee} />
            </TabsContent>
            <TabsContent value="departments" className="mt-0 h-full">
              <DepartmentsTab employee={employee} />
            </TabsContent>
            <TabsContent value="other" className="mt-0 h-full">
              <OtherTab employee={employee} />
            </TabsContent>
            <TabsContent value="leave" className="mt-0 h-full">
              <LeaveBalanceTab employee={employee} />
            </TabsContent>
            <TabsContent value="salary" className="mt-0 h-full">
              <SalaryTab employee={employee} />
            </TabsContent>
          </div>

          {/* Footer */}
          <div className={cn(
            "border-t bg-muted/30 px-6 py-4 flex gap-3",
            isRTL ? "flex-row-reverse" : "flex-row"
          )}>
            <Button className="gap-2">
              <Save className="w-4 h-4" />
              {t('employees.save')}
            </Button>
            <Button variant="outline" onClick={onClose}>
              {t('employees.cancel')}
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
