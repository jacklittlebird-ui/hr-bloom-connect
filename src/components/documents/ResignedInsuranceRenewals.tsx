import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { usePagination } from '@/hooks/usePagination';
import { useReportExport } from '@/hooks/useReportExport';
import { Edit, Search, Printer, Download, Building2, MapPin, UserX, CheckCircle2, ListFilter, Check, X } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const RESIGNED_STATUSES = ['inactive', 'suspended', 'absent', 'pending_hire', 'resigned', 'under_resignation'] as const;
type ResignedStatus = typeof RESIGNED_STATUSES[number];

const STATUS_LABEL: Record<string, { ar: string; en: string }> = {
  inactive: { ar: 'غير نشط', en: 'Inactive' },
  suspended: { ar: 'موقوف', en: 'Suspended' },
  absent: { ar: 'منقطع', en: 'Absent' },
  pending_hire: { ar: 'تحت التعيين', en: 'Pending Hire' },
  resigned: { ar: 'مستقيل', en: 'Resigned' },
  under_resignation: { ar: 'تحت الاستقالة', en: 'Under Resignation' },
};

interface ResignedEmployee {
  id: string;
  employee_code: string;
  name_ar: string;
  name_en: string;
  status: string;
  social_insurance_no: string | null;
  social_insurance_start_date: string | null;
  social_insurance_end_date: string | null;
  social_insurance_closed: boolean | null;
  social_insurance_closed_date: string | null;
  documents_originals_received: boolean | null;
  national_id: string | null;
  education_ar: string | null;
  address: string | null;
  city: string | null;
  job_title_ar: string | null;
  job_title_en: string | null;
  phone: string | null;
  resignation_date: string | null;
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

export const ResignedInsuranceRenewals = () => {
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';
  const [employees, setEmployees] = useState<ResignedEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStation, setSelectedStation] = useState('all');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [closedFilter, setClosedFilter] = useState<'all' | 'open' | 'closed'>('open');
  const [insuranceClosedFilter, setInsuranceClosedFilter] = useState<'all' | 'closed' | 'not_closed'>('all');
  const [stations, setStations] = useState<StationDept[]>([]);
  const [departments, setDepartments] = useState<StationDept[]>([]);
  const [editDialog, setEditDialog] = useState<ResignedEmployee | null>(null);
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [newClosedDate, setNewClosedDate] = useState('');
  const [newClosed, setNewClosed] = useState(false);
  const [newDocsReceived, setNewDocsReceived] = useState(false);
  const { reportRef, handlePrint, exportBilingualCSV } = useReportExport();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('employees')
      .select('id, employee_code, name_ar, name_en, status, social_insurance_no, social_insurance_start_date, social_insurance_end_date, social_insurance_closed, social_insurance_closed_date, documents_originals_received, national_id, education_ar, address, city, job_title_ar, job_title_en, phone, resignation_date, station_id, department_id')
      .in('status', RESIGNED_STATUSES as unknown as ResignedStatus[])
      .order('resignation_date', { ascending: false, nullsFirst: false });

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

    setEmployees((data || []).map((e: any) => ({
      ...e,
      station_name: e.station_id ? stationMap.get(e.station_id) || '' : '',
      department_name: e.department_id ? deptMap.get(e.department_id) || '' : '',
    })));
    setLoading(false);
  }, [ar]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = employees.filter(e => {
    if (search) {
      const s = search.toLowerCase();
      if (!e.name_ar.includes(s) && !e.name_en.toLowerCase().includes(s) && !e.employee_code.toLowerCase().includes(s)) return false;
    }
    if (selectedStation !== 'all' && e.station_id !== selectedStation) return false;
    if (selectedDept !== 'all' && e.department_id !== selectedDept) return false;
    if (selectedStatuses.length > 0 && !selectedStatuses.includes(e.status)) return false;
    // "open" means employee still pending closure: either insurance not closed OR docs not received
    if (closedFilter === 'closed' && (!e.social_insurance_closed || !e.documents_originals_received)) return false;
    if (closedFilter === 'open' && e.social_insurance_closed && e.documents_originals_received) return false;
    return true;
  });

  const { paginatedItems, currentPage, totalPages, totalItems, setCurrentPage, startIndex, endIndex } = usePagination(filtered, 30);

  const handleEdit = (emp: ResignedEmployee) => {
    setEditDialog(emp);
    setNewStartDate(emp.social_insurance_start_date || '');
    setNewEndDate(emp.social_insurance_end_date || '');
    setNewClosedDate(emp.social_insurance_closed_date || '');
    setNewClosed(!!emp.social_insurance_closed);
    setNewDocsReceived(!!emp.documents_originals_received);
  };

  const handleSave = async () => {
    if (!editDialog) return;
    const { error } = await supabase.from('employees').update({
      social_insurance_start_date: newStartDate || null,
      social_insurance_end_date: newEndDate || null,
      social_insurance_closed: newClosed,
      social_insurance_closed_date: newClosedDate || null,
      documents_originals_received: newDocsReceived,
    }).eq('id', editDialog.id);
    if (error) { toast({ title: ar ? 'خطأ' : 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: ar ? 'تم التحديث بنجاح' : 'Updated successfully' });
    setEditDialog(null);
    await fetchData();
  };

  const statusLabel = (s: string) => STATUS_LABEL[s] ? (ar ? STATUS_LABEL[s].ar : STATUS_LABEL[s].en) : s;

  const toggleStatus = (v: string) =>
    setSelectedStatuses(prev => prev.includes(v) ? prev.filter(s => s !== v) : [...prev, v]);

  const statusButtonLabel = () => {
    if (selectedStatuses.length === 0) return ar ? 'كل الحالات' : 'All Statuses';
    if (selectedStatuses.length === 1) return statusLabel(selectedStatuses[0]);
    return ar ? `${selectedStatuses.length} حالات محددة` : `${selectedStatuses.length} selected`;
  };

  const handleExportExcel = () => {
    const columns = [
      { headerAr: 'الكود', headerEn: 'Code', key: 'code' },
      { headerAr: 'اسم الموظف', headerEn: 'Employee Name', key: 'nameAr' },
      { headerAr: 'الاسم بالإنجليزية', headerEn: 'Name (EN)', key: 'nameEn' },
      { headerAr: 'الحالة', headerEn: 'Status', key: 'status' },
      { headerAr: 'الرقم القومي', headerEn: 'National ID', key: 'nationalId' },
      { headerAr: 'المسمى الوظيفي', headerEn: 'Job Title', key: 'jobTitle' },
      { headerAr: 'رقم الموبايل', headerEn: 'Mobile', key: 'phone' },
      { headerAr: 'المؤهل الدراسي', headerEn: 'Education', key: 'education' },
      { headerAr: 'العنوان', headerEn: 'Address', key: 'address' },
      { headerAr: 'المركز / المدينة', headerEn: 'City', key: 'city' },
      { headerAr: 'المحطة', headerEn: 'Station', key: 'station' },
      { headerAr: 'القسم', headerEn: 'Department', key: 'dept' },
      { headerAr: 'رقم التأمين', headerEn: 'Insurance No.', key: 'insNo' },
      { headerAr: 'تاريخ البدء', headerEn: 'Start Date', key: 'startDate' },
      { headerAr: 'تاريخ الانتهاء', headerEn: 'End Date', key: 'endDate' },
      { headerAr: 'تاريخ الاستقالة', headerEn: 'Resignation Date', key: 'resDate' },
      { headerAr: 'تم اغلاق التأمين', headerEn: 'Insurance Closed', key: 'closed' },
      { headerAr: 'تاريخ اغلاق التأمينات', headerEn: 'Insurance Closure Date', key: 'closedDate' },
      { headerAr: 'تم استلام أصول المستندات', headerEn: 'Documents Received', key: 'docs' },
    ];
    const data = filtered.map(e => ({
      code: e.employee_code, nameAr: e.name_ar, nameEn: e.name_en,
      status: statusLabel(e.status),
      nationalId: e.national_id || '-',
      jobTitle: (ar ? e.job_title_ar : e.job_title_en) || e.job_title_ar || e.job_title_en || '-',
      phone: e.phone || '-',
      education: e.education_ar || '-',
      address: e.address || '-',
      city: e.city || '-',
      station: e.station_name || '-', dept: e.department_name || '-',
      insNo: e.social_insurance_no || '-',
      startDate: e.social_insurance_start_date || '-',
      endDate: e.social_insurance_end_date || '-',
      resDate: e.resignation_date || '-',
      closed: e.social_insurance_closed ? (ar ? 'نعم' : 'Yes') : (ar ? 'لا' : 'No'),
      closedDate: e.social_insurance_closed_date || '-',
      docs: e.documents_originals_received ? (ar ? 'نعم' : 'Yes') : (ar ? 'لا' : 'No'),
    }));
    exportBilingualCSV({
      titleAr: 'تأمينات الموظفين المستقيلين', titleEn: 'Resigned Employees Insurance',
      data, columns, fileName: 'Resigned_Insurance',
      summaryCards: [
        { label: ar ? 'إجمالي' : 'Total', value: String(filtered.length) },
        { label: ar ? 'تم الإغلاق' : 'Closed', value: String(filtered.filter(e => e.social_insurance_closed).length) },
        { label: ar ? 'لم يغلق' : 'Open', value: String(filtered.filter(e => !e.social_insurance_closed).length) },
      ],
    });
  };

  const handlePrintReport = () => {
    handlePrint(ar ? 'تأمينات الموظفين المستقيلين' : 'Resigned Employees Insurance',
      [
        { label: ar ? 'إجمالي' : 'Total', value: String(filtered.length) },
        { label: ar ? 'تم الإغلاق' : 'Closed', value: String(filtered.filter(e => e.social_insurance_closed).length) },
      ]);
  };

  const closedCount = filtered.filter(e => e.social_insurance_closed && e.documents_originals_received).length;
  const openCount = filtered.length - closedCount;

  return (
    <div className="space-y-4">
      <div className={cn("flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3", isRTL && "sm:flex-row-reverse")}>
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
          <Input placeholder={ar ? 'بحث بالاسم أو الكود...' : 'Search by name or code...'} value={search} onChange={e => setSearch(e.target.value)} className={cn("h-10", isRTL ? "pr-10" : "pl-10")} />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "h-10 w-full sm:w-[200px] justify-between gap-2 font-normal",
                selectedStatuses.length > 0 && "border-primary bg-primary/5"
              )}
            >
              <span className="flex items-center gap-2 min-w-0">
                <ListFilter className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate text-sm">{statusButtonLabel()}</span>
              </span>
              {selectedStatuses.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 min-w-[20px] justify-center">
                  {selectedStatuses.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align={isRTL ? 'end' : 'start'}>
            <div className="p-2 border-b flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{ar ? 'الحالة' : 'Status'}</span>
              {selectedStatuses.length > 0 && (
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setSelectedStatuses([])}>
                  {ar ? 'مسح' : 'Clear'}
                </Button>
              )}
            </div>
            <div className="p-1">
              {RESIGNED_STATUSES.map(s => {
                const checked = selectedStatuses.includes(s);
                return (
                  <label
                    key={s}
                    className={cn(
                      "flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer hover:bg-accent text-sm",
                      isRTL && "flex-row-reverse text-right"
                    )}
                  >
                    <Checkbox checked={checked} onCheckedChange={() => toggleStatus(s)} />
                    <Badge variant="outline" className="text-xs">{statusLabel(s)}</Badge>
                    {checked && <Check className="w-3.5 h-3.5 text-primary ms-auto" />}
                  </label>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
        <Select value={closedFilter} onValueChange={v => setClosedFilter(v as any)}>
          <SelectTrigger className="w-full sm:w-[180px] h-10">
            <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{ar ? 'كل الحالات' : 'All'}</SelectItem>
            <SelectItem value="open">{ar ? 'لم يكتمل (تأمين أو مستندات)' : 'Pending (Insurance or Docs)'}</SelectItem>
            <SelectItem value="closed">{ar ? 'مكتمل بالكامل' : 'Fully Completed'}</SelectItem>
          </SelectContent>
        </Select>
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
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="border-primary/20"><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">{ar ? 'إجمالي' : 'Total'}</p><p className="text-2xl font-bold">{filtered.length}</p></CardContent></Card>
        <Card className="border-emerald-500/30"><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">{ar ? 'تم الإغلاق' : 'Closed'}</p><p className="text-2xl font-bold text-emerald-600">{closedCount}</p></CardContent></Card>
        <Card className="border-amber-500/30"><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">{ar ? 'لم يغلق' : 'Not Closed'}</p><p className="text-2xl font-bold text-amber-600">{openCount}</p></CardContent></Card>
      </div>

      {loading ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">{ar ? 'جاري التحميل...' : 'Loading...'}</CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          <UserX className="w-8 h-8 mx-auto mb-2 opacity-30" />
          {ar ? 'لا يوجد موظفين في هذه الحالات' : 'No employees with these statuses'}
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
                    <TableHead>{ar ? 'الحالة' : 'Status'}</TableHead>
                    <TableHead>{ar ? 'الرقم القومي' : 'National ID'}</TableHead>
                    <TableHead>{ar ? 'المسمى الوظيفي' : 'Job Title'}</TableHead>
                    <TableHead>{ar ? 'رقم الموبايل' : 'Mobile'}</TableHead>
                    <TableHead>{ar ? 'المحطة' : 'Station'}</TableHead>
                    <TableHead>{ar ? 'القسم' : 'Department'}</TableHead>
                    <TableHead>{ar ? 'رقم التأمين' : 'Insurance No.'}</TableHead>
                    <TableHead>{ar ? 'تاريخ البدء' : 'Start Date'}</TableHead>
                    <TableHead>{ar ? 'تاريخ الانتهاء' : 'End Date'}</TableHead>
                    <TableHead>{ar ? 'تاريخ الاستقالة' : 'Resignation Date'}</TableHead>
                    <TableHead>{ar ? 'إغلاق التأمين' : 'Insurance Closed'}</TableHead>
                    <TableHead>{ar ? 'تاريخ اغلاق التأمينات' : 'Closure Date'}</TableHead>
                    <TableHead>{ar ? 'استلام المستندات' : 'Docs Received'}</TableHead>
                    <TableHead className="print:hidden">{ar ? 'إجراءات' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map(emp => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-mono text-xs">{emp.employee_code}</TableCell>
                      <TableCell className="font-medium">{ar ? emp.name_ar : emp.name_en}</TableCell>
                      <TableCell><Badge variant="outline">{statusLabel(emp.status)}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{emp.national_id || '-'}</TableCell>
                      <TableCell>{(ar ? emp.job_title_ar : emp.job_title_en) || emp.job_title_ar || emp.job_title_en || '-'}</TableCell>
                      <TableCell className="font-mono text-xs" dir="ltr">{emp.phone || '-'}</TableCell>
                      <TableCell>{emp.station_name || '-'}</TableCell>
                      <TableCell>{emp.department_name || '-'}</TableCell>
                      <TableCell>{emp.social_insurance_no || '-'}</TableCell>
                      <TableCell>{emp.social_insurance_start_date || '-'}</TableCell>
                      <TableCell>{emp.social_insurance_end_date || '-'}</TableCell>
                      <TableCell>{emp.resignation_date || '-'}</TableCell>
                      <TableCell>
                        {emp.social_insurance_closed
                          ? <Badge className="bg-emerald-600 hover:bg-emerald-700">{ar ? 'تم الإغلاق' : 'Closed'}</Badge>
                          : <Badge variant="destructive">{ar ? 'لم يغلق' : 'Not Closed'}</Badge>}
                      </TableCell>
                      <TableCell>{emp.social_insurance_closed_date || '-'}</TableCell>
                      <TableCell>
                        {emp.documents_originals_received
                          ? <Badge className="bg-emerald-600 hover:bg-emerald-700">{ar ? 'تم الاستلام' : 'Received'}</Badge>
                          : <Badge variant="destructive">{ar ? 'لم يستلم' : 'Not Received'}</Badge>}
                      </TableCell>
                      <TableCell className="print:hidden">
                        <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => handleEdit(emp)}>
                          <Edit className="w-3 h-3" />{ar ? 'تعديل' : 'Edit'}
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
          <DialogHeader><DialogTitle>{ar ? 'تعديل بيانات التأمين' : 'Edit Insurance Data'}</DialogTitle></DialogHeader>
          {editDialog && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground font-medium">{ar ? editDialog.name_ar : editDialog.name_en}</p>
              <div className="space-y-2"><Label>{ar ? 'تاريخ بدء التأمين' : 'Insurance Start Date'}</Label><Input type="date" value={newStartDate} onChange={e => setNewStartDate(e.target.value)} /></div>
              <div className="space-y-2"><Label>{ar ? 'تاريخ انتهاء التأمين' : 'Insurance End Date'}</Label><Input type="date" value={newEndDate} onChange={e => setNewEndDate(e.target.value)} /></div>
              <div className="flex items-center gap-2 pt-2">
                <Checkbox id="closedSI" checked={newClosed} onCheckedChange={v => setNewClosed(!!v)} />
                <Label htmlFor="closedSI">{ar ? 'تم اغلاق التأمين الإجتماعي' : 'Social Insurance Closed'}</Label>
              </div>
              <div className="space-y-2"><Label>{ar ? 'تاريخ اغلاق التأمينات' : 'Insurance Closure Date'}</Label><Input type="date" value={newClosedDate} onChange={e => setNewClosedDate(e.target.value)} /></div>
              <div className="flex items-center gap-2">
                <Checkbox id="docsReceived" checked={newDocsReceived} onCheckedChange={v => setNewDocsReceived(!!v)} />
                <Label htmlFor="docsReceived">{ar ? 'تم استلام أصول مستنداته' : 'Original Documents Received'}</Label>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditDialog(null)}>{ar ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleSave}>{ar ? 'حفظ' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
