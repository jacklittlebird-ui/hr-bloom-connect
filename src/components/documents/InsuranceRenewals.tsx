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
}

export const InsuranceRenewals = () => {
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';
  const [employees, setEmployees] = useState<ExpiringEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editDialog, setEditDialog] = useState<ExpiringEmployee | null>(null);
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');

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

    if (error) {
      console.error('Error fetching expiring insurance:', error);
      setLoading(false);
      return;
    }

    // Fetch station and department names
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
      social_insurance_no: e.social_insurance_no,
      social_insurance_start_date: e.social_insurance_start_date,
      social_insurance_end_date: e.social_insurance_end_date,
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

  const handleEdit = (emp: ExpiringEmployee) => {
    setEditDialog(emp);
    setNewStartDate(emp.social_insurance_start_date || '');
    setNewEndDate(emp.social_insurance_end_date || '');
  };

  const handleSave = async () => {
    if (!editDialog || !newStartDate || !newEndDate) return;
    const { error } = await supabase
      .from('employees')
      .update({
        social_insurance_start_date: newStartDate,
        social_insurance_end_date: newEndDate,
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

  const handleNotify = async (emp: ExpiringEmployee) => {
    const { error } = await supabase.from('notifications').insert({
      title_ar: `تنبيه: تأمينك الاجتماعي يقترب من الانتهاء (${emp.social_insurance_end_date})`,
      title_en: `Alert: Your social insurance is expiring soon (${emp.social_insurance_end_date})`,
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
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="space-y-4">
      {/* Search */}
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
          {ar ? 'لا يوجد موظفين بتأمين اجتماعي قارب على الانتهاء' : 'No employees with expiring social insurance'}
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
                  <TableHead>{ar ? 'رقم التأمين' : 'Insurance No.'}</TableHead>
                  <TableHead>{ar ? 'تاريخ البدء' : 'Start Date'}</TableHead>
                  <TableHead>{ar ? 'تاريخ الانتهاء' : 'End Date'}</TableHead>
                  <TableHead>{ar ? 'المتبقي' : 'Remaining'}</TableHead>
                  <TableHead>{ar ? 'إجراءات' : 'Actions'}</TableHead>
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

      {/* Edit Dialog */}
      <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{ar ? 'تعديل تواريخ التأمين الاجتماعي' : 'Edit Social Insurance Dates'}</DialogTitle>
          </DialogHeader>
          {editDialog && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground font-medium">{ar ? editDialog.name_ar : editDialog.name_en}</p>
              <div className="space-y-2">
                <Label>{ar ? 'تاريخ بدء التأمين الاجتماعي' : 'Social Insurance Start Date'}</Label>
                <Input type="date" value={newStartDate} onChange={e => setNewStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{ar ? 'تاريخ انتهاء التأمين الاجتماعي' : 'Social Insurance End Date'}</Label>
                <Input type="date" value={newEndDate} onChange={e => setNewEndDate(e.target.value)} />
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
