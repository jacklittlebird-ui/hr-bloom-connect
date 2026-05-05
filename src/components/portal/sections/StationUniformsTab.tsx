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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Plus, Trash2, RefreshCw, Shirt, Check, ChevronsUpDown, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  const [employeeId, setEmployeeId] = useState('');
  const [empPickerOpen, setEmpPickerOpen] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<Array<{ typeIdx: string; quantity: number; unit_price: number }>>([
    { typeIdx: '0', quantity: 1, unit_price: 0 },
  ]);

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

  const reset = () => {
    setEmployeeId('');
    setDeliveryDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setItems([{ typeIdx: '0', quantity: 1, unit_price: 0 }]);
  };

  const updateItem = (idx: number, patch: Partial<{ typeIdx: string; quantity: number; unit_price: number }>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };
  const addItem = () => setItems((prev) => [...prev, { typeIdx: '0', quantity: 1, unit_price: 0 }]);
  const removeItem = (idx: number) => setItems((prev) => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);

  const grandTotal = items.reduce((sum, it) => sum + it.quantity * it.unit_price, 0);

  const submit = async () => {
    if (!employeeId) {
      toast({ title: t('اختر موظفاً', 'Select an employee'), variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const payload = items.map((it) => {
      const type = UNIFORM_TYPES[parseInt(it.typeIdx)];
      return {
        employee_id: employeeId,
        type_ar: type.ar,
        type_en: type.en,
        quantity: it.quantity,
        unit_price: it.unit_price,
        delivery_date: deliveryDate,
        notes: notes || null,
      };
    });
    const { error } = await supabase.from('uniforms').insert(payload as any);
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
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('تسجيل يونيفورم جديد', 'Register New Uniform')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t('الموظف', 'Employee')}</Label>
                <Popover open={empPickerOpen} onOpenChange={setEmpPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                      {employeeId
                        ? (() => {
                            const e = stationEmployees.find((x) => x.id === employeeId);
                            return e ? (ar ? e.nameAr : e.nameEn) : t('اختر موظفاً', 'Select employee');
                          })()
                        : t('اختر موظفاً', 'Select employee')}
                      <ChevronsUpDown className="ms-2 h-4 w-4 opacity-50 shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command
                      filter={(value, search) => {
                        if (value.toLowerCase().includes(search.toLowerCase())) return 1;
                        return 0;
                      }}
                    >
                      <CommandInput placeholder={t('ابحث بالاسم...', 'Search by name...')} />
                      <CommandList>
                        <CommandEmpty>{t('لا توجد نتائج', 'No results')}</CommandEmpty>
                        <CommandGroup>
                          {stationEmployees.map((e) => {
                            const label = `${e.nameAr} ${e.nameEn} ${e.employeeId || ''}`;
                            return (
                              <CommandItem
                                key={e.id}
                                value={label}
                                onSelect={() => {
                                  setEmployeeId(e.id);
                                  setEmpPickerOpen(false);
                                }}
                              >
                                <Check className={cn('me-2 h-4 w-4', employeeId === e.id ? 'opacity-100' : 'opacity-0')} />
                                <span>{ar ? e.nameAr : e.nameEn}</span>
                                {e.employeeId && <span className="ms-2 text-xs text-muted-foreground">({e.employeeId})</span>}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>{t('تاريخ التسليم', 'Delivery Date')}</Label>
                <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t('الأصناف', 'Items')}</Label>
                <Button type="button" size="sm" variant="outline" onClick={addItem}>
                  <Plus className="w-4 h-4 me-1" />
                  {t('إضافة صنف', 'Add Item')}
                </Button>
              </div>
              <div className="space-y-2">
                {items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end p-2 border rounded-md">
                    <div className="col-span-12 md:col-span-5 space-y-1">
                      <Label className="text-xs">{t('الصنف', 'Item')}</Label>
                      <Select value={it.typeIdx} onValueChange={(v) => updateItem(idx, { typeIdx: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {UNIFORM_TYPES.map((u, i) => (
                            <SelectItem key={i} value={String(i)}>{ar ? u.ar : u.en}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-4 md:col-span-2 space-y-1">
                      <Label className="text-xs">{t('الكمية', 'Qty')}</Label>
                      <Input type="number" min={1} value={it.quantity} onChange={(e) => updateItem(idx, { quantity: parseInt(e.target.value) || 1 })} />
                    </div>
                    <div className="col-span-4 md:col-span-2 space-y-1">
                      <Label className="text-xs">{t('سعر الوحدة', 'Unit Price')}</Label>
                      <Input type="number" min={0} value={it.unit_price} onChange={(e) => updateItem(idx, { unit_price: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div className="col-span-3 md:col-span-2 space-y-1">
                      <Label className="text-xs">{t('الإجمالي', 'Total')}</Label>
                      <div className="h-10 flex items-center px-2 rounded-md bg-muted text-sm font-semibold">
                        {(it.quantity * it.unit_price).toLocaleString()}
                      </div>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button type="button" size="sm" variant="ghost" onClick={() => removeItem(idx)} disabled={items.length === 1}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('ملاحظات', 'Notes')}</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="text-sm text-muted-foreground">
              {t('الإجمالي الكلي', 'Grand Total')}: <span className="font-bold text-foreground">{grandTotal.toLocaleString()}</span>
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
