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
    </div>
  );
};
