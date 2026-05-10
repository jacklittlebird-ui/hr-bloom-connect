import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Search, QrCode, Navigation, Layers, UserCog, X, Plus, ChevronsUpDown, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface EmpRow {
  id: string;
  employee_code: string;
  name_ar: string;
  name_en: string;
  checkin_method_override: string | null;
  station_id: string | null;
  stations: { name_ar: string; name_en: string; checkin_method: string } | null;
}

const labels = {
  qr: { ar: '📱 QR فقط', en: '📱 QR Only', icon: QrCode, color: 'bg-blue-100 text-blue-700 border-blue-300' },
  gps: { ar: '📍 GPS فقط', en: '📍 GPS Only', icon: Navigation, color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  both: { ar: '🔄 QR + GPS', en: '🔄 QR + GPS', icon: Layers, color: 'bg-purple-100 text-purple-700 border-purple-300' },
};

export const EmployeeCheckinOverrides = () => {
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';
  const [overrides, setOverrides] = useState<EmpRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [allEmps, setAllEmps] = useState<EmpRow[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<string>('');
  const [newMethod, setNewMethod] = useState<string>('gps');

  const fetchOverrides = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('employees')
      .select('id, employee_code, name_ar, name_en, checkin_method_override, station_id, stations(name_ar, name_en, checkin_method)')
      .not('checkin_method_override', 'is', null)
      .order('name_ar');
    setOverrides((data as any) || []);
    setLoading(false);
  };

  const fetchAllEmps = async () => {
    const { data } = await supabase
      .from('employees')
      .select('id, employee_code, name_ar, name_en, checkin_method_override, station_id, stations(name_ar, name_en, checkin_method)')
      .eq('status', 'active')
      .order('name_ar')
      .limit(2000);
    setAllEmps((data as any) || []);
  };

  useEffect(() => { fetchOverrides(); fetchAllEmps(); }, []);

  const updateOverride = async (empId: string, method: string | null) => {
    const { error } = await supabase
      .from('employees')
      .update({ checkin_method_override: method } as any)
      .eq('id', empId);
    if (error) { toast.error(ar ? 'حدث خطأ' : 'Error'); return; }
    toast.success(ar ? 'تم التحديث' : 'Updated');
    fetchOverrides();
    fetchAllEmps();
  };

  const handleAdd = async () => {
    if (!selectedEmp) return;
    await updateOverride(selectedEmp, newMethod);
    setAddOpen(false);
    setSelectedEmp('');
    setNewMethod('gps');
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return overrides;
    return overrides.filter(e =>
      e.name_ar?.toLowerCase().includes(q) ||
      e.name_en?.toLowerCase().includes(q) ||
      e.employee_code?.toLowerCase().includes(q)
    );
  }, [overrides, search]);

  const availableEmps = useMemo(
    () => allEmps.filter(e => !e.checkin_method_override),
    [allEmps]
  );

  return (
    <div className="space-y-4 mt-8">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <UserCog className="w-5 h-5 text-primary" />
          <div>
            <h2 className="text-lg font-bold">{ar ? 'استثناءات الموظفين' : 'Employee Overrides'}</h2>
            <p className="text-sm text-muted-foreground">
              {ar ? 'موظفون لهم طريقة تسجيل مختلفة عن محطتهم' : 'Employees with a different check-in method than their station'}
            </p>
          </div>
        </div>
        <Button onClick={() => setAddOpen(true)} size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> {ar ? 'إضافة استثناء' : 'Add Override'}
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", isRTL ? 'right-3' : 'left-3')} />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={ar ? 'بحث بالاسم أو الكود...' : 'Search by name or code...'}
          className={isRTL ? 'pr-9' : 'pl-9'}
        />
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">{ar ? 'جاري التحميل...' : 'Loading...'}</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">
          {ar ? 'لا توجد استثناءات حالياً' : 'No overrides yet'}
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(emp => {
            const method = (emp.checkin_method_override || 'qr') as keyof typeof labels;
            const cfg = labels[method] || labels.qr;
            const stationMethod = (emp.stations?.checkin_method || 'qr') as keyof typeof labels;
            return (
              <Card key={emp.id} className="border shadow-sm">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{ar ? emp.name_ar : emp.name_en}</p>
                      <p className="text-xs text-muted-foreground">{emp.employee_code}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {ar ? 'المحطة:' : 'Station:'} {emp.stations ? (ar ? emp.stations.name_ar : emp.stations.name_en) : '-'}
                        <span className="mx-1">•</span>
                        <span className="text-muted-foreground/70">
                          {ar ? 'الافتراضي:' : 'Default:'} {ar ? labels[stationMethod]?.ar : labels[stationMethod]?.en}
                        </span>
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => updateOverride(emp.id, null)} title={ar ? 'إزالة الاستثناء' : 'Remove override'}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <Badge variant="outline" className={cfg.color}>{ar ? cfg.ar : cfg.en}</Badge>
                  <Select value={method} onValueChange={(v) => updateOverride(emp.id, v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="qr">{ar ? labels.qr.ar : labels.qr.en}</SelectItem>
                      <SelectItem value="gps">{ar ? labels.gps.ar : labels.gps.en}</SelectItem>
                      <SelectItem value="both">{ar ? labels.both.ar : labels.both.en}</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {addOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setAddOpen(false)}>
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardContent className="p-6 space-y-4">
              <h3 className="font-bold text-lg">{ar ? 'إضافة استثناء جديد' : 'Add New Override'}</h3>

              <div className="space-y-2">
                <label className="text-sm font-medium">{ar ? 'الموظف' : 'Employee'}</label>
                <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between">
                      {selectedEmp
                        ? (() => {
                            const e = availableEmps.find(x => x.id === selectedEmp);
                            return e ? `${e.employee_code} - ${ar ? e.name_ar : e.name_en}` : '';
                          })()
                        : (ar ? 'اختر موظف...' : 'Select employee...')}
                      <ChevronsUpDown className="ms-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder={ar ? 'بحث...' : 'Search...'} />
                      <CommandList>
                        <CommandEmpty>{ar ? 'لا يوجد' : 'None'}</CommandEmpty>
                        <CommandGroup>
                          {availableEmps.map(e => (
                            <CommandItem key={e.id} value={`${e.employee_code} ${e.name_ar} ${e.name_en}`} onSelect={() => { setSelectedEmp(e.id); setPickerOpen(false); }}>
                              <Check className={cn('me-2 h-4 w-4', selectedEmp === e.id ? 'opacity-100' : 'opacity-0')} />
                              <span className="text-xs text-muted-foreground me-2">{e.employee_code}</span>
                              <span>{ar ? e.name_ar : e.name_en}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{ar ? 'طريقة التسجيل' : 'Check-in Method'}</label>
                <Select value={newMethod} onValueChange={setNewMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="qr">{ar ? labels.qr.ar : labels.qr.en}</SelectItem>
                    <SelectItem value="gps">{ar ? labels.gps.ar : labels.gps.en}</SelectItem>
                    <SelectItem value="both">{ar ? labels.both.ar : labels.both.en}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setAddOpen(false)}>{ar ? 'إلغاء' : 'Cancel'}</Button>
                <Button onClick={handleAdd} disabled={!selectedEmp}>{ar ? 'حفظ' : 'Save'}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
