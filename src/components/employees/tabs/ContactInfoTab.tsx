import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Employee } from '@/types/employee';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface ContactInfoTabProps {
  employee: Employee;
  onUpdate?: (updates: Partial<Employee>) => void;
  readOnly?: boolean;
}

export const ContactInfoTab = ({ employee, onUpdate, readOnly }: ContactInfoTabProps) => {
  const { t, isRTL } = useLanguage();

  const [formData, setFormData] = useState({
    email: employee.email || '',
    homePhone: employee.homePhone || '',
    phone: employee.phone || '',
    address: employee.address || '',
    city: employee.city || '',
    governorate: employee.governorate || '',
    emergencyContactName1: employee.emergencyContactName1 || '',
    emergencyContactMobile1: employee.emergencyContactMobile1 || '',
    emergencyContactName2: employee.emergencyContactName2 || '',
    emergencyContactMobile2: employee.emergencyContactMobile2 || '',
  });

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    onUpdate?.({ [field]: value });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.email')}</Label>
          <Input type="email" value={formData.email} onChange={e => updateField('email', e.target.value)} className={cn(isRTL && "text-right")} />
        </div>
        <div className="space-y-2">
          <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.homePhone')}</Label>
          <Input value={formData.homePhone} onChange={e => updateField('homePhone', e.target.value)} className={cn(isRTL && "text-right")} dir="ltr" />
        </div>
        <div className="space-y-2">
          <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.mobile')}</Label>
          <Input value={formData.phone} onChange={e => updateField('phone', e.target.value)} className={cn(isRTL && "text-right")} dir="ltr" />
        </div>
      </div>

      <div className="space-y-2">
        <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.address')}</Label>
        <Textarea
          value={formData.address}
          onChange={e => updateField('address', e.target.value)}
          className={cn("min-h-[100px]", isRTL && "text-right")}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.city')}</Label>
          <Input value={formData.city} onChange={e => updateField('city', e.target.value)} className={cn(isRTL && "text-right")} />
        </div>
        <div className="space-y-2">
          <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.governorate')}</Label>
          <Input value={formData.governorate} onChange={e => updateField('governorate', e.target.value)} className={cn(isRTL && "text-right")} />
        </div>
      </div>

      {/* Emergency Contacts */}
      <div className="border-t pt-4">
        <h3 className={cn("font-semibold text-base mb-4", isRTL && "text-right")}>
          {isRTL ? 'اتصال في حالات الطوارئ' : 'Emergency Contact'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
          <div className="space-y-2">
            <Label className={cn(isRTL && "text-right block")}>{isRTL ? 'اسم 1' : 'Name 1'}</Label>
            <Input value={formData.emergencyContactName1} onChange={e => updateField('emergencyContactName1', e.target.value)} className={cn(isRTL && "text-right")} />
          </div>
          <div className="space-y-2">
            <Label className={cn(isRTL && "text-right block")}>{isRTL ? 'موبايل 1' : 'Mobile 1'}</Label>
            <Input value={formData.emergencyContactMobile1} onChange={e => updateField('emergencyContactMobile1', e.target.value)} className={cn(isRTL && "text-right")} dir="ltr" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className={cn(isRTL && "text-right block")}>{isRTL ? 'اسم 2' : 'Name 2'}</Label>
            <Input value={formData.emergencyContactName2} onChange={e => updateField('emergencyContactName2', e.target.value)} className={cn(isRTL && "text-right")} />
          </div>
          <div className="space-y-2">
            <Label className={cn(isRTL && "text-right block")}>{isRTL ? 'موبايل 2' : 'Mobile 2'}</Label>
            <Input value={formData.emergencyContactMobile2} onChange={e => updateField('emergencyContactMobile2', e.target.value)} className={cn(isRTL && "text-right")} dir="ltr" />
          </div>
        </div>
      </div>
    </div>
  );
};
