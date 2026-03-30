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
import { Edit, Bell, AlertTriangle, Search, Printer, Download, Building2, MapPin } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ExpiringEmployee {
  id: string;
  employee_code: string;
  name_ar: string;
  name_en: string;
  social_insurance_no: string | null;
  social_insurance_start_date: string | null;
  social_insurance_end_date: string | null;
  station_name?: string;
  department_name?: string;
  station_id?: string | null;
  department_id?: string | null;
}

interface StationDept {
  id: string;
  name_ar: string;
  name_en: string;
}

export const InsuranceRenewals = () => {
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';
  const [employees, setEmployees] = useState<ExpiringEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStation, setSelectedStation] = useState('all');
  const [selectedDept, setSelectedDept] = useState('all');
  const [stations, setStations] = useState<StationDept[]>([]);
  const [departments, setDepartments] = useState<StationDept[]>([]);
  const [editDialog, setEditDialog] = useState<ExpiringEmployee | null>(null);
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const { reportRef, handlePrint, exportBilingualCSV } = useReportExport();

  const fetchExpiring = useCallback(async () => {
    setLoading(true);
    const today = new Date();
    const twoMonthsFromNow = new Date(today);
    twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2);
    const cutoffDate = twoMonthsFromNow.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('employees')
      .select('id, employee_code, name_ar, name_en, social_insurance_no, social_insurance_start_date, social_insurance_end_date, station_id, department_id')
      .not('social_insurance_end_date', 'is', null)
      .lte('social_insurance_end_date', cutoffDate)
      .eq('status', 'active')
      .order('social_insurance_end_date', { ascending: true });

    if (error) { setLoading(false); return; }

    const stationIds = [...new Set((data || []).map(e => e.station_id).filter(Boolean))];
    const deptIds = [...new Set((data || []).map(e => e.department_id).filter(Boolean))];

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

    setEmployees((data || []).map(e => ({
      id: e.id, employee_code: e.employee_code, name_ar: e.name_ar, name_en: e.name_en,
      social_insurance_no: e.social_insurance_no, social_insurance_start_date: e.social_insurance_start_date,
      social_insurance_end_date: e.social_insurance_end_date,
      station_id: e.station_id, department_id: e.department_id,
      station_name: e.station_id ? stationMap.get(e.station_id) || '' : '',
      department_name: e.department_id ? deptMap.get(e.department_id) || '' : '',
    })));
    setLoading(false);
  }, [ar]);

  useEffect(() => { fetchExpiring(); }, [fetchExpiring]);

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

  const getDaysRemaining = (endDate: string) => {
    const diff = Math.ceil((new Date(endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const handleEdit = (emp: ExpiringEmployee) => {
    setEditDialog(emp);
    setNewStartDate(emp.social_insurance_start_date || '');
    setNewEndDate(emp.social_insurance_end_date || '');
  };

  const handleSave = async () => {
    if (!editDialog || !newStartDate || !newEndDate) return;
    const { error } = await supabase.from('employees').update({ social_insurance_start_date: newStartDate, social_insurance_end_date: newEndDate }).eq('id', editDialog.id);
    if (error) { toast({ title: ar ? 'خطأ' : 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: ar ? 'تم التحديث بنجاح' : 'Updated successfully' });
    setEditDialog(null);
    await fetchExpiring();
  };

  const handleNotify = async (emp: ExpiringEmployee) => {
    const { data: empData } = await supabase.from('employees').select('user_id').eq('id', emp.id).single();
    const { error } = await supabase.from('notifications').insert({
      title_ar: `تنبيه: تأمينك الاجتماعي يقترب من الانتهاء (${emp.social_insurance_end_date})`,
      title_en: `Alert: Your social insurance is expiring soon (${emp.social_insurance_end_date})`,
      type: 'warning', module: 'employee', employee_id: emp.id, user_id: empData?.user_id || null,
    });
    if (error) { toast({ title: ar ? 'خطأ' : 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: ar ? 'تم إرسال الإشعار' : 'Notification sent' });
  };

  const handleExportExcel = () => {
    const columns = [
      { headerAr: 'الكود', headerEn: 'Code', key: 'code' },
      { headerAr: 'اسم الموظف', headerEn: 'Employee Name', key: 'nameAr' },
      { headerAr: 'الاسم بالإنجليزية', headerEn: 'Name (EN)', key: 'nameEn' },
      { headerAr: 'المحطة', headerEn: 'Station', key: 'station' },
      { headerAr: 'القسم', headerEn: 'Department', key: 'dept' },
      { headerAr: 'رقم التأمين', headerEn: 'Insurance No.', key: 'insNo' },
      { headerAr: 'تاريخ البدء', headerEn: 'Start Date', key: 'startDate' },
      { headerAr: 'تاريخ الانتهاء', headerEn: 'End Date', key: 'endDate' },
      { headerAr: 'المتبقي (يوم)', headerEn: 'Remaining (days)', key: 'remaining' },
    ];
    const data = filtered.map(e => {
      const days = getDaysRemaining(e.social_insurance_end_date!);
      return {
        code: e.employee_code, nameAr: e.name_ar, nameEn: e.name_en,
        station: e.station_name || '-', dept: e.department_name || '-',
        insNo: e.social_insurance_no || '-', startDate: e.social_insurance_start_date || '-',
        endDate: e.social_insurance_end_date, remaining: days < 0 ? `منتهي (${Math.abs(days)})` : String(days),
      };
    });
    exportBilingualCSV({ titleAr: 'تجديدات التأمين الاجتماعي', titleEn: 'Social Insurance Renewals', data, columns, fileName: 'Insurance_Renewals',
      summaryCards: [{ label: ar ? 'إجمالي' : 'Total', value: String(filtered.length) }],
    });
  };

  const handlePrintReport = () => {
    handlePrint(ar ? 'تجديدات التأمين الاجتماعي' : 'Social Insurance Renewals',
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
          {ar ? 'لا يوجد موظفين بتأمين اجتماعي قارب على الانتهاء' : 'No employees with expiring social insurance'}
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
                    <TableHead>{ar ? 'رقم التأمين' : 'Insurance No.'}</TableHead>
                    <TableHead>{ar ? 'تاريخ البدء' : 'Start Date'}</TableHead>
                    <TableHead>{ar ? 'تاريخ الانتهاء' : 'End Date'}</TableHead>
                    <TableHead>{ar ? 'المتبقي' : 'Remaining'}</TableHead>
                    <TableHead className="print:hidden">{ar ? 'إجراءات' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map(emp => {
                    const days = getDaysRemaining(emp.social_insurance_end_date!);
                    const isExpired = days < 0;
                    return (
                      <TableRow key={emp.id}>
                        <TableCell className="font-mono text-xs">{emp.employee_code}</TableCell>
                        <TableCell className="font-medium">{ar ? emp.name_ar : emp.name_en}</TableCell>
                        <TableCell>{emp.station_name || '-'}</TableCell>
                        <TableCell>{emp.department_name || '-'}</TableCell>
                        <TableCell>{emp.social_insurance_no || '-'}</TableCell>
                        <TableCell>{emp.social_insurance_start_date || '-'}</TableCell>
                        <TableCell>{emp.social_insurance_end_date}</TableCell>
                        <TableCell>
                          <Badge variant={isExpired ? 'destructive' : days <= 30 ? 'destructive' : 'secondary'}>
                            {isExpired ? (ar ? `منتهي منذ ${Math.abs(days)} يوم` : `Expired ${Math.abs(days)}d ago`) : (ar ? `${days} يوم` : `${days} days`)}
                          </Badge>
                        </TableCell>
                        <TableCell className="print:hidden">
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => handleEdit(emp)}><Edit className="w-3 h-3" />{ar ? 'تعديل' : 'Edit'}</Button>
                            <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => handleNotify(emp)}><Bell className="w-3 h-3" />{ar ? 'إشعار' : 'Notify'}</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <PaginationControls currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} startIndex={startIndex} endIndex={endIndex} onPageChange={setCurrentPage} />
          </CardContent>
        </Card>
      )}

      <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{ar ? 'تعديل تواريخ التأمين الاجتماعي' : 'Edit Social Insurance Dates'}</DialogTitle></DialogHeader>
          {editDialog && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground font-medium">{ar ? editDialog.name_ar : editDialog.name_en}</p>
              <div className="space-y-2"><Label>{ar ? 'تاريخ بدء التأمين الاجتماعي' : 'Social Insurance Start Date'}</Label><Input type="date" value={newStartDate} onChange={e => setNewStartDate(e.target.value)} /></div>
              <div className="space-y-2"><Label>{ar ? 'تاريخ انتهاء التأمين الاجتماعي' : 'Social Insurance End Date'}</Label><Input type="date" value={newEndDate} onChange={e => setNewEndDate(e.target.value)} /></div>
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
