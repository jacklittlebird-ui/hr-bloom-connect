import { useState, useMemo, useCallback, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSalaryData, calcFullGross, calcNet, SalaryRecord } from '@/contexts/SalaryDataContext';
import { Employee } from '@/types/employee';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Save, Calendar, Edit, Trash2, Wallet, TrendingUp, TrendingDown, Building2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { stationLocations } from '@/data/stationLocations';

interface SalaryTabProps {
  employee: Employee;
  onUpdate?: (updates: Partial<Employee>) => void;
  readOnly?: boolean;
}

const years = Array.from({ length: 11 }, (_, i) => String(2025 + i));

const calcEmployerContributions = (r: Pick<SalaryRecord, 'employerSocialInsurance' | 'healthInsurance' | 'incomeTax'>) =>
  r.employerSocialInsurance + r.healthInsurance + r.incomeTax;

export const SalaryTab = ({ employee, onUpdate, readOnly }: SalaryTabProps) => {
  const { isRTL, language } = useLanguage();
  const ar = language === 'ar';
  const { salaryRecords, saveSalaryRecord, deleteSalaryRecord, ensureLoaded } = useSalaryData();

  useEffect(() => { ensureLoaded(); }, [ensureLoaded]);


  const [selectedYear, setSelectedYear] = useState('');
  const [formData, setFormData] = useState({
    basicSalary: 0, transportAllowance: 0, incentives: 0, livingAllowance: 0,
    stationAllowance: 0, mobileAllowance: 0, rosterAllowance: 0, employeeInsurance: 0,
    employerSocialInsurance: 0, healthInsurance: 0, incomeTax: 0,
  });

  const employeeRecords = useMemo(
    () => salaryRecords.filter(r => r.employeeId === employee.id).sort((a, b) => b.year.localeCompare(a.year)),
    [salaryRecords, employee.id]
  );

  const existingRecord = useMemo(
    () => employeeRecords.find(r => r.year === selectedYear),
    [employeeRecords, selectedYear]
  );

  const handleYearChange = useCallback((year: string) => {
    setSelectedYear(year);
    const existing = salaryRecords.find(r => r.employeeId === employee.id && r.year === year);
    if (existing) {
      const { year: _, employeeId: __, stationLocation: ___, ...rest } = existing;
      setFormData(rest);
    } else {
      setFormData({
        basicSalary: 0, transportAllowance: 0, incentives: 0, livingAllowance: 0,
        stationAllowance: 0, mobileAllowance: 0, rosterAllowance: 0, employeeInsurance: 0,
        employerSocialInsurance: 0, healthInsurance: 0, incomeTax: 0,
      });
    }
  }, [salaryRecords, employee.id]);

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
  };

  const gross = useMemo(() => calcFullGross(formData), [formData]);
  const net = useMemo(() => calcNet(formData), [formData]);
  const employerTotal = useMemo(() => calcEmployerContributions(formData), [formData]);

  const handleSaveSalary = () => {
    if (!selectedYear) {
      toast({ title: ar ? 'خطأ' : 'Error', description: ar ? 'اختر السنة أولاً' : 'Select a year first', variant: 'destructive' });
      return;
    }
    saveSalaryRecord({ year: selectedYear, employeeId: employee.id, stationLocation: employee.stationLocation || '', ...formData });
    toast({ title: ar ? 'تم الحفظ' : 'Saved', description: ar ? `تم حفظ راتب سنة ${selectedYear}` : `Salary for ${selectedYear} saved` });
  };


  const handleDeleteRecord = (year: string) => {
    deleteSalaryRecord(employee.id, year);
    toast({ title: ar ? 'تم الحذف' : 'Deleted' });
  };

  const fieldRow = (label: string, field: keyof typeof formData) => (
    <div className="space-y-1.5">
      <Label className={cn("text-xs", isRTL && "text-right block")}>{label}</Label>
      <Input
        type="number"
        value={formData[field] || ''}
        onChange={e => updateField(field, e.target.value)}
        className={cn("h-9 text-sm", isRTL && "text-right")}
      />
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* ====== SALARY ENTRY ====== */}
      <Card>
        <CardHeader className="pb-3">
          <div className={cn("flex items-center justify-between flex-wrap gap-3", isRTL && "flex-row-reverse")}>
            <CardTitle className={cn("flex items-center gap-2 text-lg", isRTL && "flex-row-reverse")}>
              <Calendar className="h-5 w-5 text-primary" />
              {ar ? 'مكونات الراتب السنوي' : 'Annual Salary Components'}
            </CardTitle>
            <div className="flex items-center gap-3">
              <Select value={selectedYear} onValueChange={handleYearChange}>
                <SelectTrigger className="w-32 h-9"><SelectValue placeholder={ar ? 'اختر السنة' : 'Select Year'} /></SelectTrigger>
                <SelectContent>
                  {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
              {existingRecord && (
                <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300">
                  {ar ? 'تعديل بيانات موجودة' : 'Editing existing'}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {!selectedYear ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{ar ? 'اختر السنة لعرض وتعديل مكونات الراتب' : 'Select a year to view and edit salary components'}</p>
            </div>
          ) : (
            <>
              <div>
                <h4 className={cn("font-semibold text-sm mb-3 flex items-center gap-2", isRTL && "flex-row-reverse")}>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  {ar ? 'مكونات الراتب' : 'Salary Components'}
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {fieldRow(ar ? 'الراتب الأساسي' : 'Basic Salary', 'basicSalary')}
                  {fieldRow(ar ? 'بدل المواصلات' : 'Transport Allowance', 'transportAllowance')}
                  {fieldRow(ar ? 'حوافز' : 'Incentives', 'incentives')}
                  {fieldRow(ar ? 'بدل معيشة' : 'Living Allowance', 'livingAllowance')}
                  {fieldRow(ar ? 'بدل محطات' : 'Station Allowance', 'stationAllowance')}
                  {fieldRow(ar ? 'بدل محمول' : 'Mobile Allowance', 'mobileAllowance')}
                  {fieldRow(ar ? 'بدل روستر' : 'Roster Allowance', 'rosterAllowance')}
                </div>
              </div>

              <Separator />

              <div>
                <h4 className={cn("font-semibold text-sm mb-3 flex items-center gap-2", isRTL && "flex-row-reverse")}>
                  <TrendingDown className="h-4 w-4 text-destructive" />
                  {ar ? 'الخصومات (حصة الموظف)' : 'Deductions (Employee Share)'}
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {fieldRow(ar ? 'تأمينات (حصة موظف)' : 'Insurance (Employee)', 'employeeInsurance')}
                </div>
              </div>

              <Separator />

              <div>
                <h4 className={cn("font-semibold text-sm mb-3 flex items-center gap-2", isRTL && "flex-row-reverse")}>
                  <Building2 className="h-4 w-4 text-blue-600" />
                  {ar ? 'مساهمات الشركة' : 'Company Contributions'}
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {fieldRow(ar ? 'التأمينات الاجتماعية - الشركة' : 'Social Insurance - Company', 'employerSocialInsurance')}
                  {fieldRow(ar ? 'التأمين الصحي' : 'Health Insurance', 'healthInsurance')}
                  {fieldRow(ar ? 'ضريبة الدخل' : 'Income Tax', 'incomeTax')}
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">{ar ? 'الراتب الإجمالي' : 'Gross Salary'}</p>
                    <p className="text-2xl font-bold text-green-700">{gross.toLocaleString()} <span className="text-sm">{ar ? 'ج.م' : 'EGP'}</span></p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">{ar ? 'الراتب الصافي' : 'Net Salary'}</p>
                    <p className="text-2xl font-bold text-blue-700">{net.toLocaleString()} <span className="text-sm">{ar ? 'ج.م' : 'EGP'}</span></p>
                  </CardContent>
                </Card>
                <Card className="bg-purple-50 border-purple-200">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">{ar ? 'مساهمات الشركة' : 'Company Contributions'}</p>
                    <p className="text-2xl font-bold text-purple-700">{employerTotal.toLocaleString()} <span className="text-sm">{ar ? 'ج.م' : 'EGP'}</span></p>
                  </CardContent>
                </Card>
              </div>

              <div className={cn("flex", isRTL ? "justify-start" : "justify-end")}>
                <Button onClick={handleSaveSalary} className="gap-1">
                  <Save className="h-4 w-4" />
                  {existingRecord ? (ar ? 'تحديث الراتب' : 'Update Salary') : (ar ? 'حفظ الراتب' : 'Save Salary')}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ====== SALARY HISTORY ====== */}
      {employeeRecords.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className={cn("flex items-center gap-2 text-lg", isRTL && "flex-row-reverse")}>
              <Wallet className="h-5 w-5 text-primary" />
              {ar ? 'سجل الرواتب' : 'Salary History'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">{ar ? 'السنة' : 'Year'}</TableHead>
                    <TableHead>{ar ? 'المحطة' : 'Station'}</TableHead>
                    <TableHead>{ar ? 'الأساسي' : 'Basic'}</TableHead>
                    <TableHead>{ar ? 'مواصلات' : 'Transport'}</TableHead>
                    <TableHead>{ar ? 'حوافز' : 'Incentives'}</TableHead>
                    <TableHead>{ar ? 'معيشة' : 'Living'}</TableHead>
                    <TableHead>{ar ? 'محطات' : 'Station'}</TableHead>
                    <TableHead>{ar ? 'محمول' : 'Mobile'}</TableHead>
                    <TableHead>{ar ? 'روستر' : 'Roster'}</TableHead>
                    <TableHead className="text-green-700">{ar ? 'الإجمالي' : 'Gross'}</TableHead>
                    <TableHead className="text-destructive">{ar ? 'تأمين موظف' : 'Emp. Ins.'}</TableHead>
                    <TableHead className="text-blue-700">{ar ? 'الصافي' : 'Net'}</TableHead>
                    <TableHead className="text-purple-700">{ar ? 'مساهمات الشركة' : 'Company'}</TableHead>
                    <TableHead className="text-center">{ar ? 'إجراءات' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeeRecords.map(r => {
                    const stLabel = stationLocations.find(s => s.value === r.stationLocation);
                    return (
                      <TableRow key={r.year}>
                        <TableCell className="text-center font-bold"><Badge variant="outline">{r.year}</Badge></TableCell>
                        <TableCell>{stLabel ? (ar ? stLabel.labelAr : stLabel.labelEn) : '-'}</TableCell>
                        <TableCell>{r.basicSalary.toLocaleString()}</TableCell>
                        <TableCell>{r.transportAllowance.toLocaleString()}</TableCell>
                        <TableCell>{r.incentives.toLocaleString()}</TableCell>
                        <TableCell>{r.livingAllowance.toLocaleString()}</TableCell>
                        <TableCell>{r.stationAllowance.toLocaleString()}</TableCell>
                        <TableCell>{r.mobileAllowance.toLocaleString()}</TableCell>
                        <TableCell>{r.rosterAllowance.toLocaleString()}</TableCell>
                        <TableCell className="font-bold text-green-700">{calcFullGross(r).toLocaleString()}</TableCell>
                        <TableCell className="text-destructive">{r.employeeInsurance.toLocaleString()}</TableCell>
                        <TableCell className="font-bold text-blue-700">{calcNet(r).toLocaleString()}</TableCell>
                        <TableCell className="text-purple-700">{calcEmployerContributions(r).toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 justify-center">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleYearChange(r.year)}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleDeleteRecord(r.year)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
};
