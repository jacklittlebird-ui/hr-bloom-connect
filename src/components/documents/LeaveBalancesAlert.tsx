import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { usePagination } from '@/hooks/usePagination';
import { useReportExport } from '@/hooks/useReportExport';
import { Edit, AlertTriangle, Search, Printer, Download, Building2, MapPin } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface EligibleEmployee {
  id: string;
  employee_code: string;
  name_ar: string;
  name_en: string;
  hire_date: string;
  station_name?: string;
  department_name?: string;
  station_id?: string | null;
  department_id?: string | null;
  months_employed: number;
}

interface StationDept {
  id: string;
  name_ar: string;
  name_en: string;
}

export const LeaveBalancesAlert = () => {
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';
  const [employees, setEmployees] = useState<EligibleEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStation, setSelectedStation] = useState('all');
  const [selectedDept, setSelectedDept] = useState('all');
  const [stations, setStations] = useState<StationDept[]>([]);
  const [departments, setDepartments] = useState<StationDept[]>([]);
  const [editDialog, setEditDialog] = useState<EligibleEmployee | null>(null);
  const [annualTotal, setAnnualTotal] = useState('21');
  const [casualTotal, setCasualTotal] = useState('7');
  const [sickTotal, setSickTotal] = useState('7');
  const [permissionsTotal, setPermissionsTotal] = useState('3');
  const { reportRef, handlePrint, exportBilingualCSV } = useReportExport();

  const currentYear = new Date().getFullYear();

  const fetchEligible = useCallback(async () => {
    setLoading(true);
    const today = new Date();

    // Get active employees with hire_date
    const { data: allEmps, error } = await supabase
      .from('employees')
      .select('id, employee_code, name_ar, name_en, hire_date, station_id, department_id')
      .eq('status', 'active')
      .not('hire_date', 'is', null);

    if (error) { setLoading(false); return; }

    // Filter employees who completed 6+ months
    const eligible = (allEmps || []).filter(e => {
      const hire = new Date(e.hire_date!);
      const diffMs = today.getTime() - hire.getTime();
      const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30.44);
      return diffMonths >= 6;
    });

    if (eligible.length === 0) {
      setEmployees([]);
      setLoading(false);
      return;
    }

    const empIds = eligible.map(e => e.id);

    // Get leave_balances for current year for these employees (batch to avoid .in() limit)
    const allBalances: any[] = [];
    const BATCH = 200;
    for (let i = 0; i < empIds.length; i += BATCH) {
      const batch = empIds.slice(i, i + BATCH);
      const { data: balances } = await supabase
        .from('leave_balances')
        .select('employee_id, annual_total, casual_total, sick_total, permissions_total')
        .eq('year', currentYear)
        .in('employee_id', batch);
      if (balances) allBalances.push(...balances);
    }
    const balances = allBalances;

    // Find employees with NO balance record or all totals = 0
    const balanceMap = new Map((balances || []).map(b => [b.employee_id, b]));
    const needsBalance = eligible.filter(e => {
      const b = balanceMap.get(e.id);
      if (!b) return true; // no record at all
      return (b.annual_total === 0 && b.casual_total === 0 && b.sick_total === 0 && b.permissions_total === 0);
    });

    // Fetch stations/departments
    const stationIds = [...new Set(needsBalance.map(e => e.station_id).filter(Boolean))];
    const deptIds = [...new Set(needsBalance.map(e => e.department_id).filter(Boolean))];

    const [stationsRes, deptsRes] = await Promise.all([
      stationIds.length > 0 ? supabase.from('stations').select('id, name_ar, name_en').in('id', stationIds) : { data: [] },
      deptIds.length > 0 ? supabase.from('departments').select('id, name_ar, name_en').in('id', deptIds) : { data: [] },
    ]);

    const stationList = (stationsRes.data || []) as StationDept[];
    const deptList = (deptsRes.data || []) as StationDept[];
    setStations(stationList);
    setDepartments(deptList);

    const stationMap = new Map(stationList.map(s => [s.id, ar ? s.name_ar : s.name_en]));
    const deptMap = new Map(deptList.map(d => [d.id, ar ? d.name_ar : d.name_en]));

    const today2 = new Date();
    setEmployees(needsBalance.map(e => {
      const hire = new Date(e.hire_date!);
      const diffMonths = Math.floor((today2.getTime() - hire.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
      return {
        id: e.id, employee_code: e.employee_code, name_ar: e.name_ar, name_en: e.name_en,
        hire_date: e.hire_date!, station_id: e.station_id, department_id: e.department_id,
        station_name: e.station_id ? stationMap.get(e.station_id) || '' : '',
        department_name: e.department_id ? deptMap.get(e.department_id) || '' : '',
        months_employed: diffMonths,
      };
    }).sort((a, b) => a.months_employed - b.months_employed));

    setLoading(false);
  }, [ar, currentYear]);

  useEffect(() => { fetchEligible(); }, [fetchEligible]);

  const filtered = employees.filter(e => {
    if (search) {
      const s = search.toLowerCase();
      if (!e.name_ar.includes(s) && !e.name_en.toLowerCase().includes(s) && !e.employee_code.toLowerCase().includes(s)) return false;
    }
    if (selectedStation !== 'all' && e.station_id !== selectedStation) return false;
    if (selectedDept !== 'all' && e.department_id !== selectedDept) return false;
    return true;
  });

  const { paginatedItems, currentPage, totalPages, totalItems, setCurrentPage, startIndex, endIndex } = usePagination(filtered, 30);

  const handleEdit = (emp: EligibleEmployee) => {
    setEditDialog(emp);
    setAnnualTotal('21');
    setCasualTotal('7');
    setSickTotal('7');
    setPermissionsTotal('3');
  };

  const handleSave = async () => {
    if (!editDialog) return;
    const annual = parseInt(annualTotal) || 0;
    const casual = parseInt(casualTotal) || 0;
    const sick = parseInt(sickTotal) || 0;
    const permissions = parseInt(permissionsTotal) || 0;

    // Check if balance record exists
    const { data: existing } = await supabase
      .from('leave_balances')
      .select('id')
      .eq('employee_id', editDialog.id)
      .eq('year', currentYear)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase.from('leave_balances').update({
        annual_total: annual, casual_total: casual, sick_total: sick, permissions_total: permissions,
      }).eq('id', existing.id);
      if (error) { toast({ title: ar ? 'خطأ' : 'Error', description: error.message, variant: 'destructive' }); return; }
    } else {
      const { error } = await supabase.from('leave_balances').insert({
        employee_id: editDialog.id, year: currentYear,
        annual_total: annual, annual_used: 0,
        casual_total: casual, casual_used: 0,
        sick_total: sick, sick_used: 0,
        permissions_total: permissions, permissions_used: 0,
      });
      if (error) { toast({ title: ar ? 'خطأ' : 'Error', description: error.message, variant: 'destructive' }); return; }
    }

    toast({ title: ar ? 'تم تسجيل الأرصدة بنجاح' : 'Leave balances saved successfully' });
    setEditDialog(null);
    await fetchEligible();
  };

  const handleExportExcel = () => {
    const columns = [
      { headerAr: 'الكود', headerEn: 'Code', key: 'code' },
      { headerAr: 'اسم الموظف', headerEn: 'Employee Name', key: 'nameAr' },
      { headerAr: 'الاسم بالإنجليزية', headerEn: 'Name (EN)', key: 'nameEn' },
      { headerAr: 'المحطة', headerEn: 'Station', key: 'station' },
      { headerAr: 'القسم', headerEn: 'Department', key: 'dept' },
      { headerAr: 'تاريخ التعيين', headerEn: 'Hire Date', key: 'hireDate' },
      { headerAr: 'عدد الأشهر', headerEn: 'Months Employed', key: 'months' },
    ];
    const data = filtered.map(e => ({
      code: e.employee_code, nameAr: e.name_ar, nameEn: e.name_en,
      station: e.station_name || '-', dept: e.department_name || '-',
      hireDate: e.hire_date, months: String(e.months_employed),
    }));
    exportBilingualCSV({ titleAr: 'أرصدة الإجازات - موظفين بدون أرصدة', titleEn: 'Leave Balances - Employees Without Balances', data, columns, fileName: 'Leave_Balances_Alert',
      summaryCards: [{ label: ar ? 'إجمالي' : 'Total', value: String(filtered.length) }],
    });
  };

  const handlePrintReport = () => {
    handlePrint(ar ? 'أرصدة الإجازات - موظفين بدون أرصدة' : 'Leave Balances - Employees Without Balances',
      [{ label: ar ? 'إجمالي' : 'Total', value: String(filtered.length) }]);
  };

  return (
    <div className="space-y-4">
      <div className={cn("flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3", isRTL && "sm:flex-row-reverse")}>
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
          <Input placeholder={ar ? 'بحث بالاسم أو الكود...' : 'Search by name or code...'} value={search} onChange={e => setSearch(e.target.value)} className={cn("h-10", isRTL ? "pr-10" : "pl-10")} />
        </div>
        <Select value={selectedStation} onValueChange={setSelectedStation}>
          <SelectTrigger className="w-full sm:w-[200px] h-10">
            <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
            <SelectValue placeholder={ar ? 'كل المحطات' : 'All Stations'} />
          </SelectTrigger>
          <SelectContent className="w-80 max-h-[300px] overflow-y-auto">
            <SelectItem value="all">{ar ? 'كل المحطات' : 'All Stations'}</SelectItem>
            {stations.map(s => <SelectItem key={s.id} value={s.id}>{ar ? s.name_ar : s.name_en}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedDept} onValueChange={setSelectedDept}>
          <SelectTrigger className="w-full sm:w-[200px] h-10">
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <SelectValue placeholder={ar ? 'كل الأقسام' : 'All Departments'} />
          </SelectTrigger>
          <SelectContent className="w-80 max-h-[300px] overflow-y-auto">
            <SelectItem value="all">{ar ? 'كل الأقسام' : 'All Departments'}</SelectItem>
            {departments.map(d => <SelectItem key={d.id} value={d.id}>{ar ? d.name_ar : d.name_en}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1.5 h-10" onClick={handlePrintReport}>
            <Printer className="w-4 h-4" /> {ar ? 'طباعة' : 'Print'}
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 h-10" onClick={handleExportExcel}>
            <Download className="w-4 h-4" /> {ar ? 'تصدير Excel' : 'Export Excel'}
          </Button>
        </div>
        <Badge variant="outline" className="gap-1 h-10 px-3">
          <AlertTriangle className="w-3 h-3" />
          {ar ? `${filtered.length} موظف` : `${filtered.length} employees`}
        </Badge>
      </div>

      {loading ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">{ar ? 'جاري التحميل...' : 'Loading...'}</CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-30" />
          {ar ? 'لا يوجد موظفين أتموا 6 أشهر بدون أرصدة إجازات' : 'No employees with 6+ months and no leave balances'}
        </CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div ref={reportRef}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{ar ? 'الكود' : 'Code'}</TableHead>
                    <TableHead>{ar ? 'اسم الموظف' : 'Employee Name'}</TableHead>
                    <TableHead>{ar ? 'المحطة' : 'Station'}</TableHead>
                    <TableHead>{ar ? 'القسم' : 'Department'}</TableHead>
                    <TableHead>{ar ? 'تاريخ التعيين' : 'Hire Date'}</TableHead>
                    <TableHead>{ar ? 'عدد الأشهر' : 'Months'}</TableHead>
                    <TableHead className="print:hidden">{ar ? 'إجراءات' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map(emp => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-mono text-xs">{emp.employee_code}</TableCell>
                      <TableCell className="font-medium">{ar ? emp.name_ar : emp.name_en}</TableCell>
                      <TableCell>{emp.station_name || '-'}</TableCell>
                      <TableCell>{emp.department_name || '-'}</TableCell>
                      <TableCell>{emp.hire_date}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{ar ? `${emp.months_employed} شهر` : `${emp.months_employed} months`}</Badge>
                      </TableCell>
                      <TableCell className="print:hidden">
                        <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => handleEdit(emp)}>
                          <Edit className="w-3 h-3" />{ar ? 'تسجيل أرصدة' : 'Set Balances'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <PaginationControls currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} startIndex={startIndex} endIndex={endIndex} onPageChange={setCurrentPage} />
          </CardContent>
        </Card>
      )}

      <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{ar ? 'تسجيل أرصدة الإجازات' : 'Set Leave Balances'}</DialogTitle></DialogHeader>
          {editDialog && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground font-medium">{ar ? editDialog.name_ar : editDialog.name_en}</p>
              <p className="text-xs text-muted-foreground">{ar ? `السنة: ${currentYear}` : `Year: ${currentYear}`}</p>
              <div className="space-y-2"><Label>{ar ? 'رصيد الإجازات السنوية' : 'Annual Leave Total'}</Label><Input type="number" value={annualTotal} onChange={e => setAnnualTotal(e.target.value)} /></div>
              <div className="space-y-2"><Label>{ar ? 'رصيد الإجازات العارضة' : 'Casual Leave Total'}</Label><Input type="number" value={casualTotal} onChange={e => setCasualTotal(e.target.value)} /></div>
              <div className="space-y-2"><Label>{ar ? 'رصيد الإجازات المرضية' : 'Sick Leave Total'}</Label><Input type="number" value={sickTotal} onChange={e => setSickTotal(e.target.value)} /></div>
              <div className="space-y-2"><Label>{ar ? 'رصيد الأذونات' : 'Permissions Total'}</Label><Input type="number" value={permissionsTotal} onChange={e => setPermissionsTotal(e.target.value)} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)}>{ar ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleSave}>{ar ? 'حفظ' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
