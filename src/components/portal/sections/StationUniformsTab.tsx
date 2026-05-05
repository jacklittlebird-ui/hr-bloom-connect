import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, RefreshCw, Shirt } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { UNIFORM_TYPES, getDepreciationPercent, getCurrentValue } from '@/contexts/UniformDataContext';

interface Props {
  stationEmployees: Array<{ id: string; nameAr: string; nameEn: string; employeeId?: string }>;
}

interface UniformRow {
  id: number;
  employee_id: string;
  type_ar: string;
  type_en: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  delivery_date: string;
  notes: string | null;
}

export const StationUniformsTab = ({ stationEmployees }: Props) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const ar = language === 'ar';
  const t = (a: string, e: string) => (ar ? a : e);
  const canEdit = user?.role === 'station_hr' || user?.role === 'admin' || user?.role === 'hr';

  const [rows, setRows] = useState<UniformRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    employee_id: '',
    typeIdx: '0',
    quantity: 1,
    unit_price: 0,
    delivery_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const empIds = useMemo(() => stationEmployees.map((e) => e.id), [stationEmployees]);

  const fetchRows = useCallback(async () => {
    if (empIds.length === 0) {
      setRows([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('uniforms')
      .select('id, employee_id, type_ar, type_en, quantity, unit_price, total_price, delivery_date, notes')
      .in('employee_id', empIds)
      .order('delivery_date', { ascending: false });
    if (error) {
      toast({ title: t('تعذر تحميل البيانات', 'Failed to load'), description: error.message, variant: 'destructive' });
    }
    setRows((data as any) || []);
    setLoading(false);
  }, [empIds]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const empName = (id: string) => {
    const e = stationEmployees.find((x) => x.id === id);
    return e ? (ar ? e.nameAr : e.nameEn) : '-';
  };

  const reset = () => setForm({ employee_id: '', typeIdx: '0', quantity: 1, unit_price: 0, delivery_date: new Date().toISOString().split('T')[0], notes: '' });

  const submit = async () => {
    if (!form.employee_id) {
      toast({ title: t('اختر موظفاً', 'Select an employee'), variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const type = UNIFORM_TYPES[parseInt(form.typeIdx)];
    const { error } = await supabase.from('uniforms').insert({
      employee_id: form.employee_id,
      type_ar: type.ar,
      type_en: type.en,
      quantity: form.quantity,
      unit_price: form.unit_price,
      delivery_date: form.delivery_date,
      notes: form.notes || null,
    } as any);
    setSubmitting(false);
    if (error) {
      toast({ title: t('تعذر الحفظ', 'Save failed'), description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: t('تم تسجيل اليونيفورم', 'Uniform recorded') });
    setOpen(false);
    reset();
    fetchRows();
  };

  const remove = async (id: number) => {
    if (!confirm(t('تأكيد الحذف؟', 'Confirm delete?'))) return;
    const { error } = await supabase.from('uniforms').delete().eq('id', id as any);
    if (error) {
      toast({ title: t('تعذر الحذف', 'Delete failed'), description: error.message, variant: 'destructive' });
      return;
    }
    fetchRows();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
        <CardTitle className="flex items-center gap-2">
          <Shirt className="w-5 h-5 text-primary" />
          {t('يونيفورم موظفي المحطة', 'Station Uniforms')}
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchRows} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          {canEdit && (
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="w-4 h-4 me-1" />
              {t('تسجيل يونيفورم', 'Register Uniform')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('الموظف', 'Employee')}</TableHead>
                <TableHead>{t('الصنف', 'Item')}</TableHead>
                <TableHead>{t('الكمية', 'Qty')}</TableHead>
                <TableHead>{t('سعر الوحدة', 'Unit Price')}</TableHead>
                <TableHead>{t('الإجمالي', 'Total')}</TableHead>
                <TableHead>{t('تاريخ التسليم', 'Delivery Date')}</TableHead>
                <TableHead>{t('القيمة الحالية', 'Current Value')}</TableHead>
                {canEdit && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 8 : 7} className="text-center text-muted-foreground py-8">
                    {t('لا توجد بيانات يونيفورم', 'No uniform records')}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => {
                  const dep = getDepreciationPercent(r.delivery_date);
                  const cur = getCurrentValue(r.total_price, r.delivery_date);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{empName(r.employee_id)}</TableCell>
                      <TableCell>{ar ? r.type_ar : r.type_en}</TableCell>
                      <TableCell>{r.quantity}</TableCell>
                      <TableCell>{r.unit_price.toLocaleString()}</TableCell>
                      <TableCell>{r.total_price.toLocaleString()}</TableCell>
                      <TableCell>{r.delivery_date}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{cur.toLocaleString()}</span>
                          <Badge variant={dep === 0 ? 'destructive' : 'secondary'}>{dep}%</Badge>
                        </div>
                      </TableCell>
                      {canEdit && (
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); setOpen(v); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('تسجيل يونيفورم جديد', 'Register New Uniform')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('الموظف', 'Employee')}</Label>
              <Select value={form.employee_id} onValueChange={(v) => setForm({ ...form, employee_id: v })}>
                <SelectTrigger><SelectValue placeholder={t('اختر موظفاً', 'Select employee')} /></SelectTrigger>
                <SelectContent>
                  {stationEmployees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{ar ? e.nameAr : e.nameEn}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('الصنف', 'Item')}</Label>
              <Select value={form.typeIdx} onValueChange={(v) => setForm({ ...form, typeIdx: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNIFORM_TYPES.map((u, i) => (
                    <SelectItem key={i} value={String(i)}>{ar ? u.ar : u.en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t('الكمية', 'Quantity')}</Label>
                <Input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })} />
              </div>
              <div className="space-y-2">
                <Label>{t('سعر الوحدة', 'Unit Price')}</Label>
                <Input type="number" min={0} value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('تاريخ التسليم', 'Delivery Date')}</Label>
              <Input type="date" value={form.delivery_date} onChange={(e) => setForm({ ...form, delivery_date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('ملاحظات', 'Notes')}</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="text-sm text-muted-foreground">
              {t('الإجمالي', 'Total')}: <span className="font-bold text-foreground">{(form.quantity * form.unit_price).toLocaleString()}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t('إلغاء', 'Cancel')}</Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting ? t('جاري الحفظ...', 'Saving...') : t('حفظ', 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
