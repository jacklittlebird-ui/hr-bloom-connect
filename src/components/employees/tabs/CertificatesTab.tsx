import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Employee } from '@/types/employee';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface CertificatesTabProps {
  employee: Employee;
  onUpdate?: (updates: Partial<Employee>) => void;
  readOnly?: boolean;
}

export const CertificatesTab = ({ employee, onUpdate, readOnly }: CertificatesTabProps) => {
  const { t, isRTL } = useLanguage();

  const [formData, setFormData] = useState({
    hasQualificationCert: employee.hasQualificationCert || false,
    hasMilitaryServiceCert: employee.hasMilitaryServiceCert || false,
    hasBirthCert: employee.hasBirthCert || false,
    hasIdCopy: employee.hasIdCopy || false,
    hasPledge: employee.hasPledge || false,
    hasContract: employee.hasContract || false,
    hasReceipt: employee.hasReceipt || false,
    attachments: employee.attachments || '',
  });

  const updateField = (field: string, value: boolean | string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    onUpdate?.({ [field]: value } as Partial<Employee>);
  };

  const certificates = [
    { id: 'hasQualificationCert', labelKey: 'employees.fields.qualificationCert' },
    { id: 'hasMilitaryServiceCert', labelKey: 'employees.fields.militaryServiceCert' },
    { id: 'hasBirthCert', labelKey: 'employees.fields.birthCert' },
    { id: 'hasIdCopy', labelKey: 'employees.fields.idCopy' },
    { id: 'hasPledge', labelKey: 'employees.fields.pledge' },
    { id: 'hasContract', labelKey: 'employees.fields.contract' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
        {certificates.map((cert) => (
          <div key={cert.id} className="flex flex-col items-center gap-2">
            <Checkbox
              id={cert.id}
              className="w-5 h-5"
              checked={(formData as any)[cert.id] || false}
              onCheckedChange={(v) => updateField(cert.id, !!v)}
            />
            <Label htmlFor={cert.id} className="text-center text-sm">
              {t(cert.labelKey)}
            </Label>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col items-center gap-2">
          <Checkbox
            id="hasReceipt"
            className="w-5 h-5"
            checked={formData.hasReceipt}
            onCheckedChange={(v) => updateField('hasReceipt', !!v)}
          />
          <Label htmlFor="hasReceipt" className="text-center text-sm">
            {t('employees.fields.receipt')}
          </Label>
        </div>
      </div>

      <div className="space-y-2">
        <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.attachments')}</Label>
        <Input
          value={formData.attachments}
          onChange={e => updateField('attachments', e.target.value)}
          className={cn(isRTL && "text-right")}
        />
      </div>
    </div>
  );
};
