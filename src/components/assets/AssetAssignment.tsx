import { useState, useEffect, useCallback } from 'react';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Plus, Search, Undo2, UserCheck, Package, ArrowRightLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Station {
  id: string;
  nameAr: string;
  nameEn: string;
}

interface Employee {
  id: string;
  nameAr: string;
  nameEn: string;
  employeeCode: string;
  stationId: string | null;
}

interface AssetOption {
  id: string;
  assetCode: string;
  nameAr: string;
  nameEn: string;
}

interface AssignedAsset {
  id: string;
  assetCode: string;
  nameAr: string;
  nameEn: string;
  assignedTo: string | null;
  employeeName: string;
  employeeCode: string;
  stationName: string;
  status: string;
  notes: string;
}

export const AssetAssignment = () => {
  const { t, isRTL, language } = useLanguage();
  const ar = language === 'ar';
  const { toast } = useToast();

  const [stations, setStations] = useState<Station[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [availableAssets, setAvailableAssets] = useState<AssetOption[]>([]);
  const [assignedAssets, setAssignedAssets] = useState<AssignedAsset[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [employeePopoverOpen, setEmployeePopoverOpen] = useState(false);

  // Form state
  const [selectedStation, setSelectedStation] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedAsset, setSelectedAsset] = useState('');
  const [notes, setNotes] = useState('');

  const filteredEmployees = allEmployees.filter(e => e.stationId === selectedStation);

  const fetchData = useCallback(async () => {
    const [stationsRes, employeesRes, assetsRes] = await Promise.all([
      supabase.from('stations').select('id, name_ar, name_en').eq('is_active', true).order('name_ar'),
      supabase.from('employees').select('id, name_ar, name_en, employee_code, station_id').eq('status', 'active').order('employee_code'),
      supabase.from('assets').select('*').order('created_at', { ascending: false }),
    ]);

    if (stationsRes.data) {
      setStations(stationsRes.data.map(s => ({ id: s.id, nameAr: s.name_ar, nameEn: s.name_en })));
    }
    if (employeesRes.data) {
      setAllEmployees(employeesRes.data.map(e => ({
        id: e.id, nameAr: e.name_ar, nameEn: e.name_en,
        employeeCode: e.employee_code, stationId: e.station_id,
      })));
    }
    if (assetsRes.data) {
      const available = assetsRes.data.filter(a => a.status === 'available');
      setAvailableAssets(available.map(a => ({
        id: a.id, assetCode: a.asset_code, nameAr: a.name_ar, nameEn: a.name_en,
      })));

      const assigned = assetsRes.data.filter(a => a.status === 'assigned' && a.assigned_to);
      const empMap = new Map((employeesRes.data || []).map(e => [e.id, e]));
      const stMap = new Map((stationsRes.data || []).map(s => [s.id, s]));

      setAssignedAssets(assigned.map(a => {
        const emp = empMap.get(a.assigned_to!);
        const st = emp ? stMap.get(emp.station_id!) : null;
        return {
          id: a.id, assetCode: a.asset_code, nameAr: a.name_ar, nameEn: a.name_en,
          assignedTo: a.assigned_to,
          employeeName: emp ? (ar ? emp.name_ar : emp.name_en) : '-',
          employeeCode: emp?.employee_code || '-',
          stationName: st ? (ar ? st.name_ar : st.name_en) : '-',
          status: a.status, notes: a.notes || '',
        };
      }));
    }
  }, [ar]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const stats = [
    { label: ar ? 'أصول معيّنة' : 'Assigned', value: assignedAssets.length, icon: UserCheck, bg: 'bg-primary/10', color: 'text-primary' },
    { label: ar ? 'أصول متاحة' : 'Available', value: availableAssets.length, icon: Package, bg: 'bg-green-100', color: 'text-green-600' },
  ];

  const filtered = assignedAssets.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return a.nameAr.includes(search) || a.nameEn.toLowerCase().includes(q) ||
      a.assetCode.toLowerCase().includes(q) || a.employeeName.includes(search) ||
      a.employeeCode.toLowerCase().includes(q) || a.stationName.includes(search);
  });

  const { paginatedItems: paginatedAssigned, currentPage: aaPage, totalPages: aaTotalPages, totalItems: aaTotalItems, startIndex: aaStart, endIndex: aaEnd, setCurrentPage: setAaPage } = usePagination(filtered, 20);

  const handleAssign = async () => {
    if (!selectedAsset || !selectedEmployee) {
      toast({ title: ar ? 'خطأ' : 'Error', description: ar ? 'اختر الأصل والموظف' : 'Select asset and employee', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('assets').update({
      assigned_to: selectedEmployee,
      status: 'assigned',
      notes: notes || null,
    }).eq('id', selectedAsset);

    if (error) {
      toast({ title: ar ? 'خطأ' : 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: ar ? 'تم' : 'Done', description: ar ? 'تم تعيين الأصل بنجاح' : 'Asset assigned successfully' });
    setDialogOpen(false);
    resetForm();
    await fetchData();
  };

  const handleReturn = async (assetId: string) => {
    await supabase.from('assets').update({ assigned_to: null, status: 'available', notes: null }).eq('id', assetId);
    toast({ title: ar ? 'تم' : 'Done', description: ar ? 'تم إرجاع الأصل' : 'Asset returned' });
    await fetchData();
  };

  const resetForm = () => {
    setSelectedStation('');
    setSelectedEmployee('');
    setSelectedAsset('');
    setNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
        {stats.map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
                <div className={cn("p-2.5 rounded-lg", stat.bg)}><stat.icon className={cn("w-5 h-5", stat.color)} /></div>
                <div><p className="text-sm text-muted-foreground">{stat.label}</p><p className="text-2xl font-bold">{stat.value}</p></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters + Add */}
      <Card>
        <CardContent className="p-4">
          <div className={cn("flex flex-wrap gap-3 items-center justify-between", isRTL && "flex-row-reverse")}>
            <div className="relative flex-1 max-w-sm">
              <Search className={cn("absolute top-2.5 w-4 h-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
              <Input placeholder={ar ? 'بحث بالاسم أو الكود أو الموظف...' : 'Search...'} value={search} onChange={e => setSearch(e.target.value)} className={cn(isRTL ? "pr-9" : "pl-9")} />
            </div>
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4" />{ar ? 'تعيين أصل' : 'Assign Asset'}</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>{ar ? 'تعيين أصل لموظف' : 'Assign Asset to Employee'}</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                  {/* Asset selection */}
                  <div className="space-y-2">
                    <Label>{ar ? 'الأصل' : 'Asset'}</Label>
                    <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                      <SelectTrigger><SelectValue placeholder={ar ? 'اختر أصل متاح...' : 'Select available asset...'} /></SelectTrigger>
                      <SelectContent>
                        {availableAssets.map(a => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.assetCode} - {ar ? a.nameAr : a.nameEn}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Station selection */}
                  <div className="space-y-2">
                    <Label>{ar ? 'المحطة / الموقع' : 'Station / Location'}</Label>
                    <Select value={selectedStation} onValueChange={v => { setSelectedStation(v); setSelectedEmployee(''); }}>
                      <SelectTrigger><SelectValue placeholder={ar ? 'اختر المحطة...' : 'Select station...'} /></SelectTrigger>
                      <SelectContent>
                        {stations.map(s => (
                          <SelectItem key={s.id} value={s.id}>{ar ? s.nameAr : s.nameEn}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Employee selection (filtered by station) */}
                  <div className="space-y-2">
                    <Label>{ar ? 'الموظف' : 'Employee'}</Label>
                    <Popover open={employeePopoverOpen} onOpenChange={setEmployeePopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" aria-expanded={employeePopoverOpen} disabled={!selectedStation} className="w-full justify-between font-normal">
                          {selectedEmployee
                            ? (() => { const emp = filteredEmployees.find(e => e.id === selectedEmployee); return emp ? `${ar ? emp.nameAr : emp.nameEn} (${emp.employeeCode})` : ''; })()
                            : (selectedStation ? (ar ? 'اختر الموظف...' : 'Select employee...') : (ar ? 'اختر المحطة أولاً' : 'Select station first'))}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <Command>
                          <CommandInput placeholder={ar ? 'ابحث بالاسم أو الكود...' : 'Search by name or code...'} />
                          <CommandList>
                            <CommandEmpty>{ar ? 'لا توجد نتائج' : 'No results found'}</CommandEmpty>
                            <CommandGroup>
                              {filteredEmployees.map(e => (
                                <CommandItem
                                  key={e.id}
                                  value={`${e.nameAr} ${e.nameEn} ${e.employeeCode}`}
                                  onSelect={() => { setSelectedEmployee(e.id); setEmployeePopoverOpen(false); }}
                                >
                                  <Check className={cn("mr-2 h-4 w-4", selectedEmployee === e.id ? "opacity-100" : "opacity-0")} />
                                  {ar ? e.nameAr : e.nameEn} ({e.employeeCode})
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label>{ar ? 'ملاحظات' : 'Notes'}</Label>
                    <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
                  </div>

                  <Button onClick={handleAssign} className="w-full">{ar ? 'تعيين' : 'Assign'}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Assigned Assets Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{ar ? 'كود الأصل' : 'Asset Code'}</TableHead>
                <TableHead>{ar ? 'اسم الأصل' : 'Asset Name'}</TableHead>
                <TableHead>{ar ? 'الموظف' : 'Employee'}</TableHead>
                <TableHead>{ar ? 'المحطة' : 'Station'}</TableHead>
                <TableHead>{ar ? 'ملاحظات' : 'Notes'}</TableHead>
                <TableHead>{ar ? 'إجراءات' : 'Actions'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {ar ? 'لا توجد أصول معيّنة' : 'No assigned assets'}
                  </TableCell>
                </TableRow>
              ) : paginatedAssigned.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-sm">{a.assetCode}</TableCell>
                  <TableCell className="font-medium">{ar ? a.nameAr : a.nameEn}</TableCell>
                  <TableCell>
                    <div><p className="font-medium">{a.employeeName}</p><p className="text-xs text-muted-foreground">{a.employeeCode}</p></div>
                  </TableCell>
                  <TableCell>{a.stationName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{a.notes || '-'}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => handleReturn(a.id)}>
                      <Undo2 className="w-3 h-3 mr-1" />{ar ? 'إرجاع' : 'Return'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <PaginationControls currentPage={aaPage} totalPages={aaTotalPages} totalItems={aaTotalItems} startIndex={aaStart} endIndex={aaEnd} onPageChange={setAaPage} />
        </CardContent>
      </Card>
    </div>
  );
};
