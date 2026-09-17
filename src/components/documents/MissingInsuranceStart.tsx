import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { Edit, AlertTriangle, Search, Printer, Download, Building2, MapPin, ShieldAlert } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Row {
  id: string;
  employee_code: string;
  name_ar: string;
  name_en: string;
  social_insurance_no: string | null;
  social_insurance_end_date: string | null;
  national_id: string | null;
  job_title_ar: string | null;
  job_title_en: string | null;
  phone: string | null;
  contract_type: string | null;
  station_id: string | null;
  department_id: string | null;
  station_name?: string;
  department_name?: string;
}

interface Opt { id: string; name_ar: string; name_en: string }

export const MissingInsuranceStart = () => {
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStation, setSelectedStation] = useState('all');
  const [selectedDept, setSelectedDept] = useState('all');
  const [stations, setStations] = useState<Opt[]>([]);
  const [departments, setDepartments] = useState<Opt[]>([]);
  const [editRow, setEditRow] = useState<Row | null>(null);
  const [form, setForm] = useState({ startDate: '', endDate: '', insuranceNo: '', contractType: '' });
  const [saving, setSaving] = useState(false);
  const { reportRef, handlePrint, exportBilingualCSV } = useReportExport();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const all: any[] = [];
    let from = 0;
    const PAGE = 1000;
    while (true) {
      const { data, error } = await supabase
        .from('employees')
        .select('id, employee_code, name_ar, name_en, social_insurance_no, social_insurance_start_date, social_insurance_end_date, national_id, job_title_ar, job_title_en, phone, contract_type, station_id, department_id')
        .eq('status', 'active')
        .is('social_insurance_start_date', null)
        .range(from, from + PAGE - 1);
      if (error) break;
      if (data) all.push(...data);
      if (!data || data.length < PAGE) break;
      from += PAGE;
    }

    const stationIds = [...new Set(all.map(e => e.station_id).filter(Boolean))];
    const deptIds = [...new Set(all.map(e => e.department_id).filter(Boolean))];
    const [sRes, dRes] = await Promise.all([
      stationIds.length ? supabase.from('stations').select('id, name_ar, name_en').in('id', stationIds) : { data: [] },
      deptIds.length ? supabase.from('departments').select('id, name_ar, name_en').in('id', deptIds) : { data: [] },
    ]);
    const sList = (sRes.data || []) as Opt[];
    const dList = (dRes.data || []) as Opt[];
    setStations(sList); setDepartments(dList);
    const sMap = new Map(sList.map(x => [x.id, ar ? x.name_ar : x.name_en]));
    const dMap = new Map(dList.map(x => [x.id, ar ? x.name_ar : x.name_en]));

    setRows(all.map(e => ({
      ...e,
      station_name: e.station_id ? sMap.get(e.station_id) || '' : '',
      department_name: e.department_id ? dMap.get(e.department_id) || '' : '',
    })));
    setLoading(false);
  }, [ar]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => rows.filter(e => {
    if (search) {
      const s = search.toLowerCase();
      if (!e.name_ar.includes(s) && !e.name_en.toLowerCase().includes(s) && !e.employee_code.toLowerCase().includes(s)) return false;
    }
    if (selectedStation !== 'all' && e.station_id !== selectedStation) return false;
    if (selectedDept !== 'all' && e.department_id !== selectedDept) return false;
    return true;
  }), [rows, search, selectedStation, selectedDept]);

  const { paginatedItems, currentPage, totalPages, totalItems, setCurrentPage, startIndex, endIndex } = usePagination(filtered, 30);

  const openEdit = (r: Row) => {
    setEditRow(r);
    setForm({
      startDate: '',
      endDate: r.social_insurance_end_date || '',
      insuranceNo: r.social_insurance_no || '',
      contractType: r.contract_type || '',
    });
  };

  const handleSave = async () => {
    if (!editRow) return;
    if (!form.startDate) {
      toast({ title: ar ? 'يرجى إدخال تاريخ البدء' : 'Please enter start date', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('employees').update({
      social_insurance_start_date: form.startDate,
      social_insurance_end_date: form.endDate || null,
      social_insurance_no: form.insuranceNo || null,
      contract_type: form.contractType || null,
    }).eq('id', editRow.id);
    setSaving(false);
    if (error) { toast({ title: ar ? 'خطأ' : 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: ar ? 'تم الحفظ' : 'Saved' });
    setEditRow(null);
    fetchData();
  };

  const handleExportExcel = () => {
    const columns = [
      { headerAr: 'الكود', headerEn: 'Code', key: 'code' },
      { headerAr: 'الاسم', headerEn: 'Name', key: 'nameAr' },
      { headerAr: 'الاسم بالإنجليزية', headerEn: 'Name (EN)', key: 'nameEn' },
      { headerAr: 'الرقم القومي', headerEn: 'National ID', key: 'nationalId' },
      { headerAr: 'المسمى الوظيفي', headerEn: 'Job Title', key: 'jobTitle' },
      { headerAr: 'رقم الموبايل', headerEn: 'Mobile', key: 'phone' },
      { headerAr: 'المحطة', headerEn: 'Station', key: 'station' },
      { headerAr: 'القسم', headerEn: 'Department', key: 'dept' },
      { headerAr: 'رقم التأمين', headerEn: 'Insurance No.', key: 'insNo' },
      { headerAr: 'نوع العقد', headerEn: 'Contract Type', key: 'contract' },
    ];
    const data = filtered.map(e => ({
      code: e.employee_code, nameAr: e.name_ar, nameEn: e.name_en,
      nationalId: e.national_id || '-',
      jobTitle: (ar ? e.job_title_ar : e.job_title_en) || '-',
      phone: e.phone || '-',
      station: e.station_name || '-', dept: e.department_name || '-',
      insNo: e.social_insurance_no || '-', contract: e.contract_type || '-',
    }));
    exportBilingualCSV({
      titleAr: 'موظفون بدون تاريخ بدء التأمينات', titleEn: 'Employees without Social Insurance Start Date',
      data, columns, fileName: 'Missing_Insurance_Start',
      summaryCards: [{ label: ar ? 'الإجمالي' : 'Total', value: String(filtered.length) }],
    });
  };

  return (
    <div className="space-y-4">
      <div className={cn("flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3", isRTL && "sm:flex-row-reverse")}>
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
          <Input placeholder={ar ? 'بحث بالاسم أو الكود...' : 'Search by name or code...'} value={search} onChange={e => setSearch(e.target.value)} className={cn("h-10", isRTL ? "pr-10" : "pl-10")} />
        </div>
        <Select value={selectedStation} onValueChange={setSelectedStation}>
          <SelectTrigger className="w-full sm:w-[200px] h-10"><MapPin className="h-4 w-4 text-muted-foreground shrink-0" /><SelectValue placeholder={ar ? 'كل المحطات' : 'All Stations'} /></SelectTrigger>
          <SelectContent className="w-80 max-h-[300px] overflow-y-auto">
            <SelectItem value="all">{ar ? 'كل المحطات' : 'All Stations'}</SelectItem>
            {stations.map(s => <SelectItem key={s.id} value={s.id}>{ar ? s.name_ar : s.name_en}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedDept} onValueChange={setSelectedDept}>
          <SelectTrigger className="w-full sm:w-[200px] h-10"><Building2 className="h-4 w-4 text-muted-foreground shrink-0" /><SelectValue placeholder={ar ? 'كل الأقسام' : 'All Departments'} /></SelectTrigger>
          <SelectContent className="w-80 max-h-[300px] overflow-y-auto">
            <SelectItem value="all">{ar ? 'كل الأقسام' : 'All Departments'}</SelectItem>
            {departments.map(d => <SelectItem key={d.id} value={d.id}>{ar ? d.name_ar : d.name_en}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1.5 h-10" onClick={() => handlePrint(ar ? 'موظفون بدون تاريخ بدء التأمينات' : 'Missing Insurance Start', [{ label: ar ? 'إجمالي' : 'Total', value: String(filtered.length) }])}>
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
          <ShieldAlert className="w-8 h-8 mx-auto mb-2 opacity-30" />
          {ar ? 'جميع الموظفين لديهم تاريخ بدء تأمينات مسجل' : 'All employees have insurance start dates recorded'}
        </CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div ref={reportRef}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{ar ? 'الكود' : 'Code'}</TableHead>
                    <TableHead>{ar ? 'الاسم' : 'Name'}</TableHead>
                    <TableHead>{ar ? 'الرقم القومي' : 'National ID'}</TableHead>
                    <TableHead>{ar ? 'المسمى الوظيفي' : 'Job Title'}</TableHead>
                    <TableHead>{ar ? 'رقم الموبايل' : 'Mobile'}</TableHead>
                    <TableHead>{ar ? 'المحطة' : 'Station'}</TableHead>
                    <TableHead>{ar ? 'القسم' : 'Department'}</TableHead>
                    <TableHead>{ar ? 'رقم التأمين' : 'Insurance No.'}</TableHead>
                    <TableHead>{ar ? 'نوع العقد' : 'Contract'}</TableHead>
                    <TableHead>{ar ? 'الحالة' : 'Status'}</TableHead>
                    <TableHead className="print:hidden">{ar ? 'إجراءات' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.employee_code}</TableCell>
                      <TableCell className="font-medium">{ar ? r.name_ar : r.name_en}</TableCell>
                      <TableCell className="font-mono text-xs">{r.national_id || '-'}</TableCell>
                      <TableCell>{(ar ? r.job_title_ar : r.job_title_en) || '-'}</TableCell>
                      <TableCell className="font-mono text-xs" dir="ltr">{r.phone || '-'}</TableCell>
                      <TableCell>{r.station_name || '-'}</TableCell>
                      <TableCell>{r.department_name || '-'}</TableCell>
                      <TableCell>{r.social_insurance_no || '-'}</TableCell>
                      <TableCell>{r.contract_type || '-'}</TableCell>
                      <TableCell><Badge variant="destructive" className="text-xs">{ar ? 'غير مسجل' : 'Missing'}</Badge></TableCell>
                      <TableCell className="print:hidden">
                        <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => openEdit(r)}><Edit className="w-3 h-3" />{ar ? 'تعديل' : 'Edit'}</Button>
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

      <Dialog open={!!editRow} onOpenChange={() => setEditRow(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{ar ? 'إضافة بيانات التأمينات الاجتماعية' : 'Add Social Insurance Data'}</DialogTitle></DialogHeader>
          {editRow && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground font-medium">{ar ? editRow.name_ar : editRow.name_en}</p>
              <div className="space-y-2"><Label>{ar ? 'رقم التأمين الاجتماعي' : 'Social Insurance No.'}</Label><Input value={form.insuranceNo} onChange={e => setForm(f => ({ ...f, insuranceNo: e.target.value }))} /></div>
              <div className="space-y-2"><Label>{ar ? 'تاريخ بدء التأمين الاجتماعي *' : 'Start Date *'}</Label><Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} /></div>
              <div className="space-y-2"><Label>{ar ? 'تاريخ انتهاء التأمين الاجتماعي' : 'End Date'}</Label><Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} /></div>
              <div className="space-y-2">
                <Label>{ar ? 'نوع العقد' : 'Contract Type'}</Label>
                <Select value={form.contractType} onValueChange={v => setForm(f => ({ ...f, contractType: v }))}>
                  <SelectTrigger><SelectValue placeholder={ar ? 'اختر نوع العقد' : 'Select contract type'} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="permanent">{ar ? 'دائم' : 'Permanent'}</SelectItem>
                    <SelectItem value="sixMonths">{ar ? '6 أشهر' : '6 Months'}</SelectItem>
                    <SelectItem value="oneYear">{ar ? 'سنة' : '1 Year'}</SelectItem>
                    <SelectItem value="fourYears">{ar ? '4 سنوات' : '4 Years'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRow(null)}>{ar ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? (ar ? 'جاري الحفظ...' : 'Saving...') : (ar ? 'حفظ' : 'Save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
