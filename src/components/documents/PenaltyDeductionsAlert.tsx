import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { usePagination } from '@/hooks/usePagination';
import { Search, MinusCircle, AlertCircle, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PenaltyRow {
  id: string;
  employee_id: string;
  employee_code: string;
  employee_name_ar: string;
  employee_name_en: string;
  station_name?: string;
  department_name?: string;
  month: string;
  year: string;
  penalty_type: string;
  penalty_value: number;
  penalty_amount: number;
}

const monthLabel = (m: string, ar: boolean) => {
  const months_ar = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  const months_en = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const idx = parseInt(m, 10) - 1;
  if (idx < 0 || idx > 11) return m;
  return ar ? months_ar[idx] : months_en[idx];
};

const typeLabel = (t: string, ar: boolean) => {
  if (t === 'amount') return ar ? 'مبلغ' : 'Amount';
  if (t === 'days') return ar ? 'أيام' : 'Days';
  if (t === 'percentage') return ar ? 'نسبة %' : '%';
  return t;
};

export const PenaltyDeductionsAlert = () => {
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';

  const [rows, setRows] = useState<PenaltyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const now = new Date();
  const [fromYear, setFromYear] = useState(String(now.getFullYear()));
  const [fromMonth, setFromMonth] = useState('01');
  const [toYear, setToYear] = useState(String(now.getFullYear()));
  const [toMonth, setToMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: entries, error } = await supabase
      .from('payroll_entries')
      .select('id, employee_id, month, year, penalty_type, penalty_value, penalty_amount')
      .gt('penalty_amount', 0)
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (error) { setRows([]); setLoading(false); return; }

    const empIds = Array.from(new Set((entries || []).map(e => e.employee_id))).filter(Boolean);
    let empMap: Record<string, any> = {};
    if (empIds.length) {
      const { data: emps } = await supabase
        .from('employees')
        .select('id, employee_code, name_ar, name_en, station_id, department_id')
        .in('id', empIds);
      (emps || []).forEach(e => { empMap[e.id] = e; });
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

    const mapped: PenaltyRow[] = (entries || []).map((e: any) => {
      const emp = empMap[e.employee_id] || {};
      return {
        id: e.id,
        employee_id: e.employee_id,
        employee_code: emp.employee_code || '-',
        employee_name_ar: emp.name_ar || '-',
        employee_name_en: emp.name_en || '-',
        station_name: emp.station_id ? stationMap[emp.station_id] : '-',
        department_name: emp.department_id ? deptMap[emp.department_id] : '-',
        month: e.month,
        year: e.year,
        penalty_type: e.penalty_type || 'amount',
        penalty_value: Number(e.penalty_value) || 0,
        penalty_amount: Number(e.penalty_amount) || 0,
      };
    });

    setRows(mapped);
    setLoading(false);
  }, [ar]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    const fromKey = parseInt(fromYear) * 100 + parseInt(fromMonth);
    const toKey = parseInt(toYear) * 100 + parseInt(toMonth);
    const q = search.trim().toLowerCase();

    return rows.filter(r => {
      const key = parseInt(r.year) * 100 + parseInt(r.month);
      if (!(key >= fromKey && key <= toKey)) return false;
      if (!q) return true;
      return (
        r.employee_code.toLowerCase().includes(q) ||
        r.employee_name_ar.toLowerCase().includes(q) ||
        r.employee_name_en.toLowerCase().includes(q) ||
        (r.station_name || '').toLowerCase().includes(q) ||
        (r.department_name || '').toLowerCase().includes(q)
      );
    });
  }, [rows, search, fromYear, fromMonth, toYear, toMonth]);

  const totalAmount = filtered.reduce((s, r) => s + r.penalty_amount, 0);
  const totalEmployees = new Set(filtered.map(r => r.employee_id)).size;

  const { currentPage, setCurrentPage, totalPages, paginatedItems, totalItems, startIndex, endIndex } = usePagination(filtered, 25);

  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const years = Array.from({ length: 5 }, (_, i) => String(now.getFullYear() - 2 + i));

  return (
    <div className={cn("space-y-4", isRTL && "text-right")}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10"><MinusCircle className="w-5 h-5 text-red-600" /></div>
            <div>
              <p className="text-2xl font-bold">{filtered.length}</p>
              <p className="text-xs text-muted-foreground">{ar ? 'إجمالي الجزاءات' : 'Total Penalties'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10"><Wallet className="w-5 h-5 text-amber-600" /></div>
            <div>
              <p className="text-2xl font-bold">{totalAmount.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">{ar ? 'إجمالي مبلغ الخصم' : 'Total Deduction Amount'}</p>
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
            placeholder={ar ? 'بحث بالاسم، الكود، المحطة...' : 'Search by name, code, station...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={cn(isRTL ? "pr-10" : "pl-10")}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">{ar ? 'من' : 'From'}</label>
          <div className="flex gap-1">
            <select value={fromMonth} onChange={e => setFromMonth(e.target.value)} className="h-10 rounded-md border border-input bg-background px-2 text-sm">
              {months.map(m => <option key={m} value={m}>{monthLabel(m, ar)}</option>)}
            </select>
            <select value={fromYear} onChange={e => setFromYear(e.target.value)} className="h-10 rounded-md border border-input bg-background px-2 text-sm">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">{ar ? 'إلى' : 'To'}</label>
          <div className="flex gap-1">
            <select value={toMonth} onChange={e => setToMonth(e.target.value)} className="h-10 rounded-md border border-input bg-background px-2 text-sm">
              {months.map(m => <option key={m} value={m}>{monthLabel(m, ar)}</option>)}
            </select>
            <select value={toYear} onChange={e => setToYear(e.target.value)} className="h-10 rounded-md border border-input bg-background px-2 text-sm">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
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
                <TableHead>{ar ? 'الشهر' : 'Month'}</TableHead>
                <TableHead>{ar ? 'نوع الجزاء' : 'Penalty Type'}</TableHead>
                <TableHead>{ar ? 'القيمة' : 'Value'}</TableHead>
                <TableHead>{ar ? 'مبلغ الخصم' : 'Deduction Amount'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{ar ? 'جاري التحميل...' : 'Loading...'}</TableCell></TableRow>
              ) : paginatedItems.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{ar ? 'لا توجد خصومات في هذه الفترة' : 'No deductions in this period'}</TableCell></TableRow>
              ) : paginatedItems.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono">{r.employee_code}</TableCell>
                  <TableCell className="font-medium">{ar ? r.employee_name_ar : r.employee_name_en}</TableCell>
                  <TableCell>{r.station_name || '-'}</TableCell>
                  <TableCell>{r.department_name || '-'}</TableCell>
                  <TableCell>{monthLabel(r.month, ar)} {r.year}</TableCell>
                  <TableCell><Badge variant="outline">{typeLabel(r.penalty_type, ar)}</Badge></TableCell>
                  <TableCell>{r.penalty_value}</TableCell>
                  <TableCell>
                    <Badge className="bg-red-100 text-red-700 border-red-300">
                      {r.penalty_amount.toFixed(2)}
                    </Badge>
                  </TableCell>
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
