import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Employee } from '@/types/employee';
import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface DepartmentsTabProps {
  employee: Employee;
  onUpdate?: (updates: Partial<Employee>) => void;
  readOnly?: boolean;
}

const DEPT_CODES = ['PS', 'LL', 'OO', 'RO', 'LC', 'SC', 'IA', 'AD', 'AC', 'WO', 'TR', 'MA'];

const parseCodes = (raw: string): string[] =>
  (raw || '').split(',').map(s => s.trim()).filter(Boolean);

export const DepartmentsTab = ({ employee, onUpdate, readOnly }: DepartmentsTabProps) => {
  const { t, isRTL } = useLanguage();
  const [selectedCodes, setSelectedCodes] = useState<string[]>(
    parseCodes((employee as any).deptCode || '')
  );

  const toggleCode = (code: string, checked: boolean) => {
    if (readOnly) return;
    const next = checked
      ? Array.from(new Set([...selectedCodes, code]))
      : selectedCodes.filter(c => c !== code);
    // Preserve declaration order from DEPT_CODES for consistency
    const ordered = DEPT_CODES.filter(c => next.includes(c));
    setSelectedCodes(ordered);
    onUpdate?.({ deptCode: ordered.join(',') } as any);
  };

  return (
    <div className="p-6">
      <div className="rounded-xl border border-border bg-muted/20 p-6">
        <div className={cn("flex items-center gap-2 mb-4", isRTL && "flex-row-reverse")}>
          <Building2 className="w-5 h-5 text-primary" />
          <h3 className={cn("text-lg font-semibold", isRTL && "text-right")}>{t('employees.tabs.departments')}</h3>
        </div>
        <div
          className="flex flex-wrap gap-4"
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          {DEPT_CODES.map((code) => (
            <div key={code} className="flex items-center gap-1.5">
              <Checkbox
                id={`dept-${code}`}
                checked={selectedCodes.includes(code)}
                onCheckedChange={(v) => toggleCode(code, !!v)}
                disabled={readOnly}
              />
              <Label htmlFor={`dept-${code}`} className="cursor-pointer text-sm font-medium">
                {code}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
