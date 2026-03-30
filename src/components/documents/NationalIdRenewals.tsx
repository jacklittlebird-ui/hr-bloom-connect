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
import { PaginationControls } from '@/components/ui/pagination-controls';
import { usePagination } from '@/hooks/usePagination';
import { Edit, Bell, AlertTriangle, Search } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ExpiringIdEmployee {
  id: string;
  employee_code: string;
  name_ar: string;
  name_en: string;
  national_id: string | null;
  id_issue_date: string | null;
  id_expiry_date: string | null;
  station_name?: string;
  department_name?: string;
}

export const NationalIdRenewals = () => {
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';
  const [employees, setEmployees] = useState<ExpiringIdEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editDialog, setEditDialog] = useState<ExpiringIdEmployee | null>(null);
  const [newIssueDate, setNewIssueDate] = useState('');
  const [newExpiryDate, setNewExpiryDate] = useState('');

  const fetchExpiring = useCallback(async () => {
    setLoading(true);
    const today = new Date();
    const threeMonthsFromNow = new Date(today);
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    const cutoffDate = threeMonthsFromNow.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('employees')
      .select('id, employee_code, name_ar, name_en, national_id, id_issue_date, id_expiry_date, station_id, department_id')
      .not('id_expiry_date', 'is', null)
      .lte('id_expiry_date', cutoffDate)
      .eq('status', 'active')
      .order('id_expiry_date', { ascending: true });

    if (error) {
      console.error('Error fetching expiring IDs:', error);
      setLoading(false);
      return;
    }

    const stationIds = [...new Set((data || []).map(e => e.station_id).filter(Boolean))];
    const deptIds = [...new Set((data || []).map(e => e.department_id).filter(Boolean))];

    const [stationsRes, deptsRes] = await Promise.all([
      stationIds.length > 0 ? supabase.from('stations').select('id, name_ar, name_en').in('id', stationIds) : { data: [] },
      deptIds.length > 0 ? supabase.from('departments').select('id, name_ar, name_en').in('id', deptIds) : { data: [] },
    ]);

    const stationMap = new Map((stationsRes.data || []).map(s => [s.id, ar ? s.name_ar : s.name_en]));
    const deptMap = new Map((deptsRes.data || []).map(d => [d.id, ar ? d.name_ar : d.name_en]));

    setEmployees((data || []).map(e => ({
      id: e.id,
      employee_code: e.employee_code,
      name_ar: e.name_ar,
      name_en: e.name_en,
      national_id: e.national_id,
      id_issue_date: e.id_issue_date,
      id_expiry_date: e.id_expiry_date,
      station_name: e.station_id ? stationMap.get(e.station_id) || '' : '',
      department_name: e.department_id ? deptMap.get(e.department_id) || '' : '',
    })));
    setLoading(false);
  }, [ar]);

  useEffect(() => { fetchExpiring(); }, [fetchExpiring]);

  const filtered = employees.filter(e => {
    if (!search) return true;
    const s = search.toLowerCase();
    return e.name_ar.includes(s) || e.name_en.toLowerCase().includes(s) || e.employee_code.toLowerCase().includes(s);
  });

  const { paginatedItems, currentPage, totalPages, totalItems, setCurrentPage, startIndex, endIndex } = usePagination(filtered, 30);

  const handleEdit = (emp: ExpiringIdEmployee) => {
    setEditDialog(emp);
    setNewIssueDate(emp.id_issue_date || '');
    setNewExpiryDate(emp.id_expiry_date || '');
  };

  const handleSave = async () => {
    if (!editDialog || !newIssueDate || !newExpiryDate) return;
    const { error } = await supabase
      .from('employees')
      .update({
        id_issue_date: newIssueDate,
        id_expiry_date: newExpiryDate,
      })
      .eq('id', editDialog.id);

    if (error) {
      toast({ title: ar ? 'خطأ' : 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: ar ? 'تم التحديث بنجاح' : 'Updated successfully' });
    setEditDialog(null);
    await fetchExpiring();
  };

  const handleNotify = async (emp: ExpiringIdEmployee) => {
    const { error } = await supabase.from('notifications').insert({
      title_ar: `تنبيه: بطاقة الرقم القومي تقترب من الانتهاء (${emp.id_expiry_date})`,
      title_en: `Alert: Your National ID is expiring soon (${emp.id_expiry_date})`,
      type: 'warning',
      module: 'employee',
      employee_id: emp.id,
    });

    if (error) {
      toast({ title: ar ? 'خطأ' : 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: ar ? 'تم إرسال الإشعار' : 'Notification sent' });
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const today = new Date();
    return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-4">
      <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
        <div className="relative flex-1 max-w-md">
          <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
          <Input
            placeholder={ar ? 'بحث بالاسم أو الكود...' : 'Search by name or code...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={cn(isRTL ? "pr-10" : "pl-10")}
          />
        </div>
        <Badge variant="outline" className="gap-1">
          <AlertTriangle className="w-3 h-3" />
          {ar ? `${filtered.length} موظف` : `${filtered.length} employees`}
        </Badge>
      </div>

      {loading ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">{ar ? 'جاري التحميل...' : 'Loading...'}</CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-30" />
          {ar ? 'لا يوجد موظفين ببطاقة رقم قومي قاربت على الانتهاء' : 'No employees with expiring National ID'}
        </CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{ar ? 'الكود' : 'Code'}</TableHead>
                  <TableHead>{ar ? 'اسم الموظف' : 'Employee Name'}</TableHead>
                  <TableHead>{ar ? 'المحطة' : 'Station'}</TableHead>
                  <TableHead>{ar ? 'القسم' : 'Department'}</TableHead>
                  <TableHead>{ar ? 'الرقم القومي' : 'National ID'}</TableHead>
                  <TableHead>{ar ? 'تاريخ الإصدار' : 'Issue Date'}</TableHead>
                  <TableHead>{ar ? 'تاريخ الانتهاء' : 'Expiry Date'}</TableHead>
                  <TableHead>{ar ? 'المتبقي' : 'Remaining'}</TableHead>
                  <TableHead>{ar ? 'إجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map(emp => {
                  const days = getDaysRemaining(emp.id_expiry_date!);
                  const isExpired = days < 0;
                  return (
                    <TableRow key={emp.id}>
                      <TableCell className="font-mono text-xs">{emp.employee_code}</TableCell>
                      <TableCell className="font-medium">{ar ? emp.name_ar : emp.name_en}</TableCell>
                      <TableCell>{emp.station_name || '-'}</TableCell>
                      <TableCell>{emp.department_name || '-'}</TableCell>
                      <TableCell>{emp.national_id || '-'}</TableCell>
                      <TableCell>{emp.id_issue_date || '-'}</TableCell>
                      <TableCell>{emp.id_expiry_date}</TableCell>
                      <TableCell>
                        <Badge variant={isExpired ? 'destructive' : days <= 30 ? 'destructive' : 'secondary'}>
                          {isExpired
                            ? (ar ? `منتهي منذ ${Math.abs(days)} يوم` : `Expired ${Math.abs(days)}d ago`)
                            : (ar ? `${days} يوم` : `${days} days`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => handleEdit(emp)}>
                            <Edit className="w-3 h-3" />
                            {ar ? 'تعديل' : 'Edit'}
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => handleNotify(emp)}>
                            <Bell className="w-3 h-3" />
                            {ar ? 'إشعار' : 'Notify'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              startIndex={startIndex}
              endIndex={endIndex}
              onPageChange={setCurrentPage}
            />
          </CardContent>
        </Card>
      )}

      <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{ar ? 'تعديل تواريخ البطاقة' : 'Edit National ID Dates'}</DialogTitle>
          </DialogHeader>
          {editDialog && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground font-medium">{ar ? editDialog.name_ar : editDialog.name_en}</p>
              <div className="space-y-2">
                <Label>{ar ? 'تاريخ إصدار البطاقة' : 'ID Issue Date'}</Label>
                <Input type="date" value={newIssueDate} onChange={e => setNewIssueDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{ar ? 'تاريخ انتهاء البطاقة' : 'ID Expiry Date'}</Label>
                <Input type="date" value={newExpiryDate} onChange={e => setNewExpiryDate(e.target.value)} />
              </div>
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
