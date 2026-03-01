import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Employee } from '@/types/employee';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface PermitsTabProps {
  employee: Employee;
  onUpdate?: (updates: Partial<Employee>) => void;
  readOnly?: boolean;
}

export const PermitsTab = ({ employee, onUpdate, readOnly }: PermitsTabProps) => {
  const { t, isRTL } = useLanguage();

  const [formData, setFormData] = useState({
    hasCairoAirportTempPermit: employee.hasCairoAirportTempPermit || false,
    tempPermitNo: employee.tempPermitNo || '',
    hasCairoAirportAnnualPermit: employee.hasCairoAirportAnnualPermit || false,
    annualPermitNo: employee.annualPermitNo || '',
    hasAirportsTempPermit: employee.hasAirportsTempPermit || false,
    airportsTempPermitNo: employee.airportsTempPermitNo || '',
    hasAirportsAnnualPermit: employee.hasAirportsAnnualPermit || false,
    airportsAnnualPermitNo: employee.airportsAnnualPermitNo || '',
    airportsPermitType: employee.airportsPermitType || '',
    permitNameEn: employee.permitNameEn || '',
    permitNameAr: employee.permitNameAr || '',
  });

  const updateField = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    onUpdate?.({ [field]: value } as Partial<Employee>);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox id="cairoTempPermit" checked={formData.hasCairoAirportTempPermit} onCheckedChange={v => updateField('hasCairoAirportTempPermit', !!v)} />
            <Label htmlFor="cairoTempPermit">{t('employees.fields.cairoAirportTempPermit')}</Label>
          </div>
          <div className="space-y-2">
            <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.tempPermitNo')}</Label>
            <Input value={formData.tempPermitNo} onChange={e => updateField('tempPermitNo', e.target.value)} className={cn(isRTL && "text-right")} dir="ltr" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox id="cairoAnnualPermit" checked={formData.hasCairoAirportAnnualPermit} onCheckedChange={v => updateField('hasCairoAirportAnnualPermit', !!v)} />
            <Label htmlFor="cairoAnnualPermit">{t('employees.fields.cairoAirportAnnualPermit')}</Label>
          </div>
          <div className="space-y-2">
            <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.annualPermitNo')}</Label>
            <Input value={formData.annualPermitNo} onChange={e => updateField('annualPermitNo', e.target.value)} className={cn(isRTL && "text-right")} dir="ltr" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox id="airportsTempPermit" checked={formData.hasAirportsTempPermit} onCheckedChange={v => updateField('hasAirportsTempPermit', !!v)} />
            <Label htmlFor="airportsTempPermit">{t('employees.fields.airportsTempPermit')}</Label>
          </div>
          <div className="space-y-2">
            <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.airportsTempPermitNo')}</Label>
            <Input value={formData.airportsTempPermitNo} onChange={e => updateField('airportsTempPermitNo', e.target.value)} className={cn(isRTL && "text-right")} dir="ltr" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="airportsAnnualPermit"
              checked={formData.hasAirportsAnnualPermit}
              onCheckedChange={v => updateField('hasAirportsAnnualPermit', !!v)}
            />
            <Label htmlFor="airportsAnnualPermit">{t('employees.fields.airportsAnnualPermit')}</Label>
          </div>
          <div className="space-y-2">
            <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.airportsAnnualPermitNo')}</Label>
            <Input value={formData.airportsAnnualPermitNo} onChange={e => updateField('airportsAnnualPermitNo', e.target.value)} className={cn(isRTL && "text-right")} dir="ltr" />
          </div>
        </div>

        <div className="space-y-2">
          <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.airportsPermitType')}</Label>
          <Input value={formData.airportsPermitType} onChange={e => updateField('airportsPermitType', e.target.value)} className={cn(isRTL && "text-right")} />
        </div>

        <div className="space-y-2">
          <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.permitNameEn')}</Label>
          <Input value={formData.permitNameEn} onChange={e => updateField('permitNameEn', e.target.value)} className={cn(isRTL && "text-right")} />
        </div>
      </div>

      <div className="space-y-2 max-w-md">
        <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.permitNameAr')}</Label>
        <Input value={formData.permitNameAr} onChange={e => updateField('permitNameAr', e.target.value)} className={cn(isRTL && "text-right")} />
      </div>
    </div>
  );
};
