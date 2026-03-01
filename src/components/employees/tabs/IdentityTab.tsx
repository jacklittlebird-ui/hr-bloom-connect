import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Employee } from '@/types/employee';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface IdentityTabProps {
  employee: Employee;
  onUpdate?: (updates: Partial<Employee>) => void;
  readOnly?: boolean;
}

export const IdentityTab = ({ employee, onUpdate, readOnly }: IdentityTabProps) => {
  const { t, isRTL } = useLanguage();

  const [formData, setFormData] = useState({
    nationalId: employee.nationalId || '',
    idIssueDate: employee.idIssueDate || '',
    idExpiryDate: employee.idExpiryDate || '',
    issuingAuthority: employee.issuingAuthority || '',
    issuingGovernorate: employee.issuingGovernorate || '',
    militaryStatus: employee.militaryStatus || '',
  });

  useEffect(() => {
    if (formData.idIssueDate) {
      const issue = new Date(formData.idIssueDate);
      const expiry = new Date(issue);
      expiry.setFullYear(expiry.getFullYear() + 7);
      const exp = expiry.toISOString().split('T')[0];
      setFormData(prev => ({ ...prev, idExpiryDate: exp }));
      onUpdate?.({ idExpiryDate: exp });
    }
  }, [formData.idIssueDate]);

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    onUpdate?.({ [field]: value });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="space-y-2">
          <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.nationalId')}</Label>
          <Input value={formData.nationalId} onChange={e => updateField('nationalId', e.target.value)} className={cn(isRTL && "text-right")} dir="ltr" />
        </div>
        <div className="space-y-2">
          <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.idIssueDate')}</Label>
          <Input type="date" value={formData.idIssueDate} onChange={e => updateField('idIssueDate', e.target.value)} className={cn(isRTL && "text-right")} />
        </div>
        <div className="space-y-2">
          <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.idExpiryDate')}</Label>
          <Input type="date" value={formData.idExpiryDate} readOnly className={cn(isRTL && "text-right", "bg-muted")} />
        </div>
        <div className="space-y-2">
          <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.issuingAuthority')}</Label>
          <Input value={formData.issuingAuthority} onChange={e => updateField('issuingAuthority', e.target.value)} className={cn(isRTL && "text-right")} />
        </div>
        <div className="space-y-2">
          <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.issuingGovernorate')}</Label>
          <Input value={formData.issuingGovernorate} onChange={e => updateField('issuingGovernorate', e.target.value)} className={cn(isRTL && "text-right")} />
        </div>
        <div className="space-y-2">
          <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.militaryStatus')}</Label>
          <Select value={formData.militaryStatus} onValueChange={v => updateField('militaryStatus', v)}>
            <SelectTrigger className={cn(isRTL && "text-right")}>
              <SelectValue placeholder={t('employees.select')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="completed">{t('employees.military.completed')}</SelectItem>
              <SelectItem value="exempt">{t('employees.military.exempt')}</SelectItem>
              <SelectItem value="postponed">{t('employees.military.postponed')}</SelectItem>
              <SelectItem value="not-applicable">{t('employees.military.notApplicable')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};
