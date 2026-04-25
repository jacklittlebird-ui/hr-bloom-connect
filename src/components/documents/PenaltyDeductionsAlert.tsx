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

interface ViolationRow {
  id: string;
  employee_id: string;
  employee_code: string;
  employee_name_ar: string;
  employee_name_en: string;
  station_name?: string;
  department_name?: string;
  date: string;
  type: string;
  description?: string;
  penalty?: string;
  penalty_amount: number;
  status: string;
  created_by_name?: string;
}

const statusBadge = (s: string, ar: boolean) => {
  if (s === 'approved') return { label: ar ? 'معتمد' : 'Approved', cls: 'bg-emerald-100 text-emerald-700 border-emerald-300' };
  if (s === 'rejected') return { label: ar ? 'مرفوض' : 'Rejected', cls: 'bg-red-100 text-red-700 border-red-300' };
  return { label: ar ? 'قيد المراجعة' : 'Pending', cls: 'bg-amber-100 text-amber-700 border-amber-300' };
};

// Try to extract a numeric amount from the penalty string (e.g. "100", "100 جنيه", "100 EGP")
const parsePenaltyAmount = (penalty?: string): number => {
  if (!penalty) return 0;
  const match = penalty.toString().match(/[\d.]+/);
  return match ? parseFloat(match[0]) || 0 : 0;
};

export const PenaltyDeductionsAlert = () => {
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';

  const [rows, setRows] = useState<ViolationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const now = new Date();
  const firstOfYear = `${now.getFullYear()}-01-01`;
  const todayStr = now.toISOString().slice(0, 10);
  const [fromDate, setFromDate] = useState(firstOfYear);
  const [toDate, setToDate] = useState(todayStr);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: viols, error } = await supabase
      .from('violations')
      .select('id, employee_id, type, description, penalty, date, status, created_by')
      .order('date', { ascending: false });

    if (error) { setRows([]); setLoading(false); return; }

    const empIds = Array.from(new Set((viols || []).map(v => v.employee_id))).filter(Boolean);
    const userIds = Array.from(new Set((viols || []).map(v => v.created_by).filter(Boolean) as string[]));

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
    let userMap: Record<string, string> = {};

    if (stationIds.length) {
      const { data: sts } = await supabase.from('stations').select('id, name_ar, name_en').in('id', stationIds as string[]);
      (sts || []).forEach((s: any) => { stationMap[s.id] = ar ? s.name_ar : s.name_en; });
    }
    if (deptIds.length) {
      const { data: ds } = await supabase.from('departments').select('id, name_ar, name_en').in('id', deptIds as string[]);
      (ds || []).forEach((d: any) => { deptMap[d.id] = ar ? d.name_ar : d.name_en; });
    }
    if (userIds.length) {
      const { data: profs } = await supabase.from('profiles').select('id, full_name, email').in('id', userIds);
      (profs || []).forEach((p: any) => { userMap[p.id] = p.full_name || p.email || ''; });
    }

    const mapped: ViolationRow[] = (viols || []).map((v: any) => {
      const emp = empMap[v.employee_id] || {};
      return {
        id: v.id,
        employee_id: v.employee_id,
        employee_code: emp.employee_code || '-',
        employee_name_ar: emp.name_ar || '-',
        employee_name_en: emp.name_en || '-',
        station_name: emp.station_id ? stationMap[emp.station_id] : '-',
        department_name: emp.department_id ? deptMap[emp.department_id] : '-',
        date: v.date,
        type: v.type,
        description: v.description,
        penalty: v.penalty,
        penalty_amount: parsePenaltyAmount(v.penalty),
        status: v.status,
        created_by_name: v.created_by ? userMap[v.created_by] : '-',
      };
    });

    setRows(mapped);
    setLoading(false);
  }, [ar]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      if (r.date < fromDate || r.date > toDate) return false;
      if (!q) return true;
      return (
        r.employee_code.toLowerCase().includes(q) ||
        r.employee_name_ar.toLowerCase().includes(q) ||
        r.employee_name_en.toLowerCase().includes(q) ||
        (r.station_name || '').toLowerCase().includes(q) ||
        (r.department_name || '').toLowerCase().includes(q) ||
        (r.type || '').toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q)
      );
    });
  }, [rows, search, fromDate, toDate]);

  const totalAmount = filtered.reduce((s, r) => s + r.penalty_amount, 0);
  const totalEmployees = new Set(filtered.map(r => r.employee_id)).size;

  const { currentPage, setCurrentPage, totalPages, paginatedItems, totalItems, startIndex, endIndex } = usePagination(filtered, 25);

  const formatDate = (d: string) => {
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };

  return (
    <div className={cn("space-y-4", isRTL && "text-right")}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10"><MinusCircle className="w-5 h-5 text-red-600" /></div>
            <div>
              <p className="text-2xl font-bold">{filtered.length}</p>
              <p className="text-xs text-muted-foreground">{ar ? 'إجمالي المخالفات / الخصومات' : 'Total Violations / Penalties'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10"><Wallet className="w-5 h-5 text-amber-600" /></div>
            <div>
              <p className="text-2xl font-bold">{totalAmount.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">{ar ? 'إجمالي قيمة الجزاءات' : 'Total Penalty Value'}</p>
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
            placeholder={ar ? 'بحث بالاسم، الكود، المحطة، النوع...' : 'Search by name, code, station, type...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={cn(isRTL ? "pr-10" : "pl-10")}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">{ar ? 'من تاريخ' : 'From'}</label>
          <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="h-10 w-44" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">{ar ? 'إلى تاريخ' : 'To'}</label>
          <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="h-10 w-44" />
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{ar ? 'كود الموظف' : 'Employee Code'}</TableHead>
                <TableHead>{ar ? 'اسم الموظف' : 'Employee Name'}</TableHead>
                <TableHead>{ar ? 'المحطة' : 'Station'}</TableHead>
                <TableHead>{ar ? 'القسم' : 'Department'}</TableHead>
                <TableHead>{ar ? 'التاريخ' : 'Date'}</TableHead>
                <TableHead>{ar ? 'النوع' : 'Type'}</TableHead>
                <TableHead>{ar ? 'الوصف' : 'Description'}</TableHead>
                <TableHead>{ar ? 'الجزاء' : 'Penalty'}</TableHead>
                <TableHead>{ar ? 'سُجلت بواسطة' : 'Registered By'}</TableHead>
                <TableHead>{ar ? 'الحالة' : 'Status'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">{ar ? 'جاري التحميل...' : 'Loading...'}</TableCell></TableRow>
              ) : paginatedItems.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">{ar ? 'لا توجد خصومات مسجلة في هذه الفترة' : 'No penalties registered in this period'}</TableCell></TableRow>
              ) : paginatedItems.map(r => {
                const sb = statusBadge(r.status, ar);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono">{r.employee_code}</TableCell>
                    <TableCell className="font-medium">{ar ? r.employee_name_ar : r.employee_name_en}</TableCell>
                    <TableCell>{r.station_name || '-'}</TableCell>
                    <TableCell>{r.department_name || '-'}</TableCell>
                    <TableCell>{formatDate(r.date)}</TableCell>
                    <TableCell>{r.type}</TableCell>
                    <TableCell className="max-w-xs truncate" title={r.description || ''}>{r.description || '-'}</TableCell>
                    <TableCell>
                      <Badge className="bg-red-100 text-red-700 border-red-300">
                        {r.penalty || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell>{r.created_by_name || '-'}</TableCell>
                    <TableCell><Badge variant="outline" className={sb.cls}>{sb.label}</Badge></TableCell>
                  </TableRow>
                );
              })}
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
