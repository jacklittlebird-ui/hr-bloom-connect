import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Employee } from '@/types/employee';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface InsuranceTabProps {
  employee: Employee;
  onUpdate?: (updates: Partial<Employee>) => void;
  readOnly?: boolean;
}

export const InsuranceTab = ({ employee, onUpdate, readOnly }: InsuranceTabProps) => {
  const { t, isRTL } = useLanguage();

  const [formData, setFormData] = useState({
    socialInsuranceNo: employee.socialInsuranceNo || '',
    socialInsuranceStartDate: employee.socialInsuranceStartDate || '',
    socialInsuranceEndDate: employee.socialInsuranceEndDate || '',
    healthInsuranceCardNo: employee.healthInsuranceCardNo || '',
    hasHealthInsurance: employee.hasHealthInsurance || false,
    hasGovHealthInsurance: employee.hasGovHealthInsurance || false,
    hasSocialInsurance: employee.hasSocialInsurance || false,
    contractType: employee.contractType || '',
  });

  const updateField = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    onUpdate?.({ [field]: value } as Partial<Employee>);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="space-y-2">
          <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.socialInsuranceNo')}</Label>
          <Input value={formData.socialInsuranceNo} onChange={e => updateField('socialInsuranceNo', e.target.value)} className={cn(isRTL && "text-right")} dir="ltr" />
        </div>
        <div className="space-y-2">
          <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.socialInsuranceStartDate')}</Label>
          <Input type="date" value={formData.socialInsuranceStartDate} onChange={e => updateField('socialInsuranceStartDate', e.target.value)} className={cn(isRTL && "text-right")} />
        </div>
        <div className="space-y-2">
          <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.socialInsuranceEndDate')}</Label>
          <Input type="date" value={formData.socialInsuranceEndDate} onChange={e => updateField('socialInsuranceEndDate', e.target.value)} className={cn(isRTL && "text-right")} />
        </div>
        <div className="space-y-2">
          <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.healthInsuranceCardNo')}</Label>
          <Input value={formData.healthInsuranceCardNo} onChange={e => updateField('healthInsuranceCardNo', e.target.value)} className={cn(isRTL && "text-right")} dir="ltr" />
        </div>
        <div className="flex items-center gap-2 pt-6">
          <Checkbox id="healthInsurance" checked={formData.hasHealthInsurance as boolean} onCheckedChange={v => updateField('hasHealthInsurance', !!v)} />
          <Label htmlFor="healthInsurance">{t('employees.fields.healthInsurance')}</Label>
        </div>
        <div className="flex items-center gap-2 pt-6">
          <Checkbox id="govHealthInsurance" checked={formData.hasGovHealthInsurance as boolean} onCheckedChange={v => updateField('hasGovHealthInsurance', !!v)} />
          <Label htmlFor="govHealthInsurance">{t('employees.fields.govHealthInsurance')}</Label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center gap-2">
          <Checkbox id="socialInsurance" checked={formData.hasSocialInsurance as boolean} onCheckedChange={v => updateField('hasSocialInsurance', !!v)} />
          <Label htmlFor="socialInsurance">{t('employees.fields.socialInsurance')}</Label>
        </div>
        <div className="space-y-2">
          <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.contractType')}</Label>
          <Select value={formData.contractType} onValueChange={v => updateField('contractType', v)}>
            <SelectTrigger className={cn(isRTL && "text-right")}>
              <SelectValue placeholder={t('employees.selectContractType')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="permanent">{t('employees.contract.permanent')}</SelectItem>
              <SelectItem value="sixMonths">{t('employees.contract.sixMonths')}</SelectItem>
              <SelectItem value="oneYear">{t('employees.contract.oneYear')}</SelectItem>
              <SelectItem value="fourYears">{t('employees.contract.fourYears')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};
