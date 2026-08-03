import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { usePagination } from '@/hooks/usePagination';
import { Search, Calendar as CalendarIcon, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ExportButton } from '@/components/leaves/ExportButton';
import type { ExportColumn } from '@/lib/leavesExport';

const STATUS_AR: Record<string, string> = {
  active: 'نشط', inactive: 'غير نشط', suspended: 'موقوف', external_stations: 'محطات خارجية',
  stopped: 'متوقف', absent: 'غائب', pending_hire: 'تحت التعيين', resigned: 'مستقيل', under_resignation: 'تحت الاستقالة',
};

const STATUS_OPTIONS = ['active', 'inactive', 'suspended', 'resigned', 'absent', 'pending_hire', 'under_resignation', 'external_stations', 'stopped'];


interface UnpaidLeaveRow {
  id: string;
  employee_id: string;
  employee_code: string;
  employee_name_ar: string;
  employee_name_en: string;
  station_name?: string;
  department_name?: string;
  start_date: string;
  end_date: string;
  days: number;
  reason?: string | null;
  status?: string;
}


const formatDate = (d: string) => {
  if (!d) return '-';
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yyyy = dt.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

export const UnpaidLeavesAlert = () => {
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';

  const [rows, setRows] = useState<UnpaidLeaveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];
  const yearStartStr = `${new Date().getFullYear()}-01-01`;
  const [fromDate, setFromDate] = useState(yearStartStr);
  const [toDate, setToDate] = useState(todayStr);
  const [statusFilter, setStatusFilter] = useState('all');


  const fetchData = useCallback(async () => {
    setLoading(true);
    const PAGE = 1000;
    const leaves: any[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('id, employee_id, leave_type, start_date, end_date, days, reason, status')
        .eq('leave_type', 'unpaid')
        .eq('status', 'approved')
        .order('start_date', { ascending: false })
        .range(from, from + PAGE - 1);
      if (error) { setRows([]); setLoading(false); return; }
      leaves.push(...(data || []));
      if (!data || data.length < PAGE) break;
    }

    const empIds = Array.from(new Set(leaves.map(l => l.employee_id))).filter(Boolean);
    let empMap: Record<string, any> = {};
    if (empIds.length) {
      const CHUNK = 200;
      for (let i = 0; i < empIds.length; i += CHUNK) {
        const { data: emps } = await supabase
          .from('employees')
          .select('id, employee_code, name_ar, name_en, station_id, department_id, status')
          .in('id', empIds.slice(i, i + CHUNK));

        (emps || []).forEach(e => { empMap[e.id] = e; });
      }
    }


    const stationIds = Array.from(new Set(Object.values(empMap).map((e: any) => e.station_id).filter(Boolean)));
    const deptIds = Array.from(new Set(Object.values(empMap).map((e: any) => e.department_id).filter(Boolean)));

    let stationMap: Record<string, string> = {};
    let deptMap: Record<string, string> = {};

    if (stationIds.length) {
      const { data: sts } = await supabase.from('stations').select('id, name_ar, name_en').in('id', stationIds as string[]);
      (sts || []).forEach((s: any) => { stationMap[s.id] = ar ? s.name_ar : s.name_en; });
    }
    if (deptIds.length) {
      const { data: ds } = await supabase.from('departments').select('id, name_ar, name_en').in('id', deptIds as string[]);
      (ds || []).forEach((d: any) => { deptMap[d.id] = ar ? d.name_ar : d.name_en; });
    }

    const mapped: UnpaidLeaveRow[] = leaves.map(l => {
      const emp = empMap[l.employee_id] || {};
      return {
        id: l.id,
        employee_id: l.employee_id,
        employee_code: emp.employee_code || '-',
        employee_name_ar: emp.name_ar || '-',
        employee_name_en: emp.name_en || '-',
        station_name: emp.station_id ? stationMap[emp.station_id] : '-',
        department_name: emp.department_id ? deptMap[emp.department_id] : '-',
        start_date: l.start_date,
        end_date: l.end_date,
        days: Number(l.days) || 0,
        reason: l.reason,
        status: emp.status || '',
      };
    });


    setRows(mapped);
    setLoading(false);
  }, [ar]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    const fromTs = fromDate ? new Date(fromDate).getTime() : -Infinity;
    const toTs = toDate ? new Date(toDate).getTime() + 86400000 - 1 : Infinity;
    const q = search.trim().toLowerCase();

    return rows.filter(r => {
      const startTs = new Date(r.start_date).getTime();
      const endTs = new Date(r.end_date || r.start_date).getTime();
      // Overlap: leave intersects [from, to] if start <= to AND end >= from
      if (!(startTs <= toTs && endTs >= fromTs)) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.employee_code.toLowerCase().includes(q) ||
        r.employee_name_ar.toLowerCase().includes(q) ||
        r.employee_name_en.toLowerCase().includes(q) ||
        (r.station_name || '').toLowerCase().includes(q) ||
        (r.department_name || '').toLowerCase().includes(q) ||
        (r.reason || '').toLowerCase().includes(q)
      );
    });
  }, [rows, search, fromDate, toDate, statusFilter]);


  const totalDays = filtered.reduce((sum, r) => sum + (r.days || 0), 0);
  const totalEmployees = new Set(filtered.map(r => r.employee_id)).size;

  const { currentPage, setCurrentPage, totalPages, paginatedItems, totalItems, startIndex, endIndex } = usePagination(filtered, 25);

  return (
    <div className={cn("space-y-4", isRTL && "text-right")}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10"><AlertCircle className="w-5 h-5 text-amber-600" /></div>
            <div>
              <p className="text-2xl font-bold">{filtered.length}</p>
              <p className="text-xs text-muted-foreground">{ar ? 'إجمالي الإجازات بدون راتب' : 'Total Unpaid Leaves'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10"><CalendarIcon className="w-5 h-5 text-red-600" /></div>
            <div>
              <p className="text-2xl font-bold">{totalDays}</p>
              <p className="text-xs text-muted-foreground">{ar ? 'إجمالي أيام الخصم' : 'Total Deduction Days'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><AlertCircle className="w-5 h-5 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold">{totalEmployees}</p>
              <p className="text-xs text-muted-foreground">{ar ? 'عدد الموظفين' : 'Employees Count'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className={cn("flex flex-wrap items-end gap-3", isRTL && "flex-row-reverse")}>
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
          <Input
            placeholder={ar ? 'بحث بالاسم، الكود، المحطة، السبب...' : 'Search by name, code, station, reason...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={cn(isRTL ? "pr-10" : "pl-10")}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">{ar ? 'من تاريخ' : 'From'}</label>
          <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-44" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">{ar ? 'إلى تاريخ' : 'To'}</label>
          <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-44" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">{ar ? 'حالة الموظف' : 'Employee Status'}</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder={ar ? 'الحالة' : 'Status'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ar ? 'كل الحالات' : 'All Statuses'}</SelectItem>
              {STATUS_OPTIONS.map(s => (
                <SelectItem key={s} value={s}>{ar ? (STATUS_AR[s] || s) : s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ExportButton
          rows={filtered}
          columns={[
            { header: ar ? 'كود الموظف' : 'Employee Code', accessor: r => r.employee_code },
            { header: ar ? 'اسم الموظف' : 'Employee Name', accessor: r => ar ? r.employee_name_ar : r.employee_name_en },
            { header: ar ? 'المحطة' : 'Station', accessor: r => r.station_name || '-' },
            { header: ar ? 'القسم' : 'Department', accessor: r => r.department_name || '-' },
            { header: ar ? 'الحالة' : 'Status', accessor: r => ar ? (STATUS_AR[r.status || ''] || r.status || '-') : (r.status || '-') },
            { header: ar ? 'من تاريخ' : 'From Date', accessor: r => formatDate(r.start_date) },
            { header: ar ? 'إلى تاريخ' : 'To Date', accessor: r => formatDate(r.end_date) },
            { header: ar ? 'أيام الخصم' : 'Deduction Days', accessor: r => r.days },
            { header: ar ? 'السبب' : 'Reason', accessor: r => r.reason || '-' },
          ] as ExportColumn<UnpaidLeaveRow>[]}
          filenameBase={ar ? 'الإجازات_بدون_راتب' : 'unpaid_leaves'}
          title={ar ? 'تقرير الإجازات بدون راتب' : 'Unpaid Leaves Report'}
        />

      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{ar ? 'كود الموظف' : 'Employee Code'}</TableHead>
                <TableHead>{ar ? 'اسم الموظف' : 'Employee Name'}</TableHead>
                <TableHead>{ar ? 'المحطة' : 'Station'}</TableHead>
                <TableHead>{ar ? 'القسم' : 'Department'}</TableHead>
                <TableHead>{ar ? 'الحالة' : 'Status'}</TableHead>
                <TableHead>{ar ? 'من تاريخ' : 'From Date'}</TableHead>
                <TableHead>{ar ? 'إلى تاريخ' : 'To Date'}</TableHead>
                <TableHead>{ar ? 'أيام الخصم' : 'Deduction Days'}</TableHead>
                <TableHead>{ar ? 'السبب' : 'Reason'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">{ar ? 'جاري التحميل...' : 'Loading...'}</TableCell></TableRow>
              ) : paginatedItems.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">{ar ? 'لا توجد إجازات بدون راتب في هذه الفترة' : 'No unpaid leaves in this period'}</TableCell></TableRow>
              ) : paginatedItems.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono">{r.employee_code}</TableCell>
                  <TableCell className="font-medium">{ar ? r.employee_name_ar : r.employee_name_en}</TableCell>
                  <TableCell>{r.station_name || '-'}</TableCell>
                  <TableCell>{r.department_name || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={r.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : r.status ? 'bg-amber-100 text-amber-700 border-amber-300' : ''}>
                      {ar ? (STATUS_AR[r.status || ''] || r.status || '-') : (r.status || '-')}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(r.start_date)}</TableCell>
                  <TableCell>{formatDate(r.end_date)}</TableCell>
                  <TableCell>
                    <Badge className="bg-red-100 text-red-700 border-red-300">
                      {r.days} {ar ? 'يوم' : 'days'}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">{r.reason || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>

          </Table>
        </CardContent>
      </Card>

      {filtered.length > 0 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          startIndex={startIndex}
          endIndex={endIndex}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
};
