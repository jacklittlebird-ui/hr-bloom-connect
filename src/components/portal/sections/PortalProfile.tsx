import { useLanguage } from '@/contexts/LanguageContext';
import { useEmployeeData } from '@/contexts/EmployeeDataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { User, Building2, Briefcase, Mail, Phone, CreditCard, Calendar, FileText, Shield, Landmark } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { usePortalEmployee } from '@/hooks/usePortalEmployee';

const InfoItem = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) => (
  <div className="flex items-start gap-3">
    <Icon className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || '—'}</p>
    </div>
  </div>
);

const maritalStatusMap: Record<string, string> = { single: 'أعزب', married: 'متزوج', divorced: 'مطلق', widowed: 'أرمل' };
const accountTypeMap: Record<string, string> = { savings: 'توفير', current: 'جاري', salary: 'راتب' };

const tr = (value: string | undefined, map: Record<string, string>, isAr: boolean): string => {
  if (!value) return '';
  if (!isAr) return value;
  return map[value.toLowerCase()] || value;
};

export const PortalProfile = () => {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const portalEmployeeId = usePortalEmployee();
  const { getEmployee } = useEmployeeData();
  const employee = getEmployee(portalEmployeeId);

  if (!employee) {
    return <div className="p-10 text-center text-muted-foreground">{ar ? 'لم يتم العثور على بيانات الموظف' : 'Employee data not found'}</div>;
  }

  const statusLabel = employee.status === 'active' ? (ar ? 'نشط' : 'Active') : employee.status === 'inactive' ? (ar ? 'غير نشط' : 'Inactive') : (ar ? 'موقوف' : 'Suspended');
  const statusColor = employee.status === 'active' ? 'bg-success/10 text-success border-success' : 'bg-destructive/10 text-destructive border-destructive';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">{ar ? 'ملفي الشخصي' : 'My Profile'}</h1>
        <p className="text-sm text-muted-foreground">{ar ? 'عرض معلوماتك الشخصية' : 'View your personal info'}</p>
      </div>

      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Avatar className="w-14 h-14 md:w-16 md:h-16 border-2 border-primary shrink-0">
              {employee.avatar ? (
                <AvatarImage src={employee.avatar} alt={ar ? employee.nameAr : employee.nameEn} />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-primary text-xl md:text-2xl font-bold">
                {employee.nameAr[0]}
              </AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-start">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="text-lg md:text-xl font-bold">{ar ? employee.nameAr : employee.nameEn}</h2>
                <Badge className={statusColor}>{statusLabel}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{employee.jobTitle}</p>
              <p className="text-sm text-muted-foreground">{employee.department}</p>
              <p className="text-xs text-muted-foreground">{ar ? 'الرقم الوظيفي:' : 'ID:'} {employee.employeeId}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-4"><CardTitle className="flex items-center gap-2 text-lg"><Building2 className="w-5 h-5" />{ar ? 'معلومات الوظيفة' : 'Job Information'}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <InfoItem icon={Building2} label={ar ? 'القسم' : 'Department'} value={employee.department} />
            <InfoItem icon={Briefcase} label={ar ? 'المسمى الوظيفي' : 'Job Title'} value={employee.jobTitle} />
            <InfoItem icon={Briefcase} label={ar ? 'المسمى بالإنجليزية' : 'Job Title (EN)'} value={employee.jobTitleEn || ''} />
            <InfoItem icon={Calendar} label={ar ? 'تاريخ الالتحاق' : 'Hire Date'} value={employee.hireDate || ''} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4"><CardTitle className="flex items-center gap-2 text-lg"><User className="w-5 h-5" />{ar ? 'المعلومات الشخصية' : 'Personal Information'}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <InfoItem icon={Mail} label={ar ? 'البريد الإلكتروني' : 'Email'} value={employee.email || ''} />
            <InfoItem icon={Phone} label={ar ? 'الهاتف' : 'Phone'} value={employee.phone || ''} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4"><CardTitle className="flex items-center gap-2 text-lg"><Landmark className="w-5 h-5" />{ar ? 'المعلومات البنكية' : 'Bank Information'}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <InfoItem icon={Landmark} label={ar ? 'اسم البنك' : 'Bank Name'} value={employee.bankName || ''} />
            <InfoItem icon={CreditCard} label={ar ? 'رقم الحساب' : 'Account Number'} value={employee.bankAccountNumber || ''} />
            <InfoItem icon={CreditCard} label={ar ? 'رقم التعريف البنكي' : 'Bank ID'} value={employee.bankIdNumber || ''} />
            <InfoItem icon={FileText} label={ar ? 'نوع الحساب' : 'Account Type'} value={tr(employee.bankAccountType, accountTypeMap, ar)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4"><CardTitle className="flex items-center gap-2 text-lg"><Shield className="w-5 h-5" />{ar ? 'التأمينات الاجتماعية' : 'Social Insurance'}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <InfoItem icon={Shield} label={ar ? 'رقم التأمين الاجتماعي' : 'Social Insurance No.'} value={employee.socialInsuranceNo || ''} />
            <InfoItem icon={Shield} label={ar ? 'بطاقة التأمين الصحي' : 'Health Insurance Card'} value={employee.healthInsuranceCardNo || ''} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4"><CardTitle className="flex items-center gap-2 text-lg"><User className="w-5 h-5" />{ar ? 'معلومات إضافية' : 'Additional Info'}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <InfoItem icon={User} label={ar ? 'الحالة الاجتماعية' : 'Marital Status'} value={tr(employee.maritalStatus, maritalStatusMap, ar)} />
            <InfoItem icon={User} label={ar ? 'عدد الأطفال' : 'Children Count'} value={String(employee.childrenCount ?? 0)} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};