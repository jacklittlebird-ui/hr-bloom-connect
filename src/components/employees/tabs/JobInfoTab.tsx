import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Employee } from '@/types/employee';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface JobInfoTabProps {
  employee: Employee;
  onUpdate?: (updates: Partial<Employee>) => void;
  readOnly?: boolean;
}

export const JobInfoTab = ({ employee, onUpdate, readOnly }: JobInfoTabProps) => {
  const { t, isRTL } = useLanguage();

  const [departments, setDepartments] = useState<{ id: string; name_ar: string; name_en: string }[]>([]);
  useEffect(() => {
    supabase.from('departments').select('id, name_ar, name_en').eq('is_active', true).then(({ data }) => {
      if (data) setDepartments(data);
    });
  }, []);

  const [formData, setFormData] = useState({
    departmentId: employee.departmentId || '',
    jobTitleAr: employee.jobTitleAr || employee.jobTitle || '',
    jobTitleEn: employee.jobTitleEn || '',
    jobDegree: employee.jobDegree || '',
    jobLevel: employee.jobLevel || '',
    hireDate: employee.hireDate || '',
    recruitedBy: employee.recruitedBy || '',
    status: employee.status || 'active',
    resigned: employee.resigned || false,
    resignationDate: employee.resignationDate || '',
    resignationReason: employee.resignationReason || '',
  });

  const updateField = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    onUpdate?.({ [field]: value } as Partial<Employee>);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <div className="space-y-2">
          <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.department')}</Label>
          <Select value={formData.departmentId} onValueChange={v => {
            updateField('departmentId', v);
            const dept = departments.find(d => d.id === v);
            if (dept) updateField('department', isRTL ? dept.name_ar : dept.name_en);
          }}>
            <SelectTrigger className={cn(isRTL && "text-right")}>
              <SelectValue placeholder={t('employees.selectDepartment')} />
            </SelectTrigger>
            <SelectContent>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {isRTL ? dept.name_ar : dept.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.jobTitleAr')}</Label>
          <Input value={formData.jobTitleAr} onChange={e => updateField('jobTitleAr', e.target.value)} className={cn(isRTL && "text-right")} />
        </div>
        <div className="space-y-2">
          <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.jobTitleEn')}</Label>
          <Input value={formData.jobTitleEn} onChange={e => updateField('jobTitleEn', e.target.value)} className={cn(isRTL && "text-right")} />
        </div>
        <div className="space-y-2">
          <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.jobDegree')} *</Label>
          <Select value={formData.jobDegree} onValueChange={v => updateField('jobDegree', v)}>
            <SelectTrigger className={cn(isRTL && "text-right")}>
              <SelectValue placeholder={t('employees.selectDegree')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AA">AA</SelectItem>
              <SelectItem value="A">A</SelectItem>
              <SelectItem value="B">B</SelectItem>
              <SelectItem value="C">C</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.jobLevel')}</Label>
          <Select value={formData.jobLevel} onValueChange={v => updateField('jobLevel', v)}>
            <SelectTrigger className={cn(isRTL && "text-right")}>
              <SelectValue placeholder={t('employees.select')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="worker">{t('employees.jobLevel.worker')}</SelectItem>
              <SelectItem value="driver">{t('employees.jobLevel.driver')}</SelectItem>
              <SelectItem value="messenger">{t('employees.jobLevel.messenger')}</SelectItem>
              <SelectItem value="junior">{t('employees.jobLevel.junior')}</SelectItem>
              <SelectItem value="mid">{t('employees.jobLevel.mid')}</SelectItem>
              <SelectItem value="senior">{t('employees.jobLevel.senior')}</SelectItem>
              <SelectItem value="shiftLeader">{t('employees.jobLevel.shiftLeader')}</SelectItem>
              <SelectItem value="supervisor">{t('employees.jobLevel.supervisor')}</SelectItem>
              <SelectItem value="manager">{t('employees.jobLevel.manager')}</SelectItem>
              <SelectItem value="director">{t('employees.jobLevel.director')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.hireDate')}</Label>
          <Input type="date" value={formData.hireDate} onChange={e => updateField('hireDate', e.target.value)} className={cn(isRTL && "text-right")} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        <div className="space-y-2">
          <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.recruitedBy')}</Label>
          <Input value={formData.recruitedBy} onChange={e => updateField('recruitedBy', e.target.value)} className={cn(isRTL && "text-right")} />
        </div>
        <div className="space-y-2">
          <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.employmentStatus')}</Label>
          <Select value={formData.status} onValueChange={v => updateField('status', v)}>
            <SelectTrigger className={cn(isRTL && "text-right")}>
              <SelectValue placeholder={t('employees.select')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">{isRTL ? 'نشط' : 'Active'}</SelectItem>
              <SelectItem value="inactive">{isRTL ? 'غير نشط' : 'Inactive'}</SelectItem>
              <SelectItem value="suspended">{isRTL ? 'موقوف' : 'Suspended'}</SelectItem>
              <SelectItem value="external_stations">{isRTL ? 'محطات خارجية' : 'External Stations'}</SelectItem>
              <SelectItem value="stopped">{isRTL ? 'موقوف' : 'Stopped'}</SelectItem>
              <SelectItem value="absent">{isRTL ? 'منقطع' : 'Absent'}</SelectItem>
              <SelectItem value="pending_hire">{isRTL ? 'تحت التعيين' : 'Pending Hire'}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="resigned" checked={formData.resigned as boolean} onCheckedChange={v => updateField('resigned', !!v)} />
          <Label htmlFor="resigned">{t('employees.fields.resigned')}</Label>
        </div>
        <div className="space-y-2">
          <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.resignationDate')}</Label>
          <Input type="date" value={formData.resignationDate} onChange={e => updateField('resignationDate', e.target.value)} className={cn(isRTL && "text-right")} />
        </div>
      </div>

      <div className="space-y-2">
        <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.resignationReason')}</Label>
        <Textarea value={formData.resignationReason} onChange={e => updateField('resignationReason', e.target.value)} className={cn("min-h-[100px]", isRTL && "text-right")} />
      </div>
    </div>
  );
};
