import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEmployeeData } from '@/contexts/EmployeeDataContext';
import { useUniformData, UNIFORM_TYPES, getDepreciationPercent, getCurrentValue } from '@/contexts/UniformDataContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Check, ChevronsUpDown, Plus, Trash2, Edit2, Shirt, Users, TrendingUp, Package, RefreshCw, Info, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useReportExport } from '@/hooks/useReportExport';
import { stationLocations } from '@/data/stationLocations';

const Uniforms = () => {
  const { language, isRTL, t } = useLanguage();
  const { employees } = useEmployeeData();
  const { uniforms, addUniform, deleteUniform, updateUniform } = useUniformData();
  const { reportRef, handlePrint, exportToCSV } = useReportExport();

  const [employeeId, setEmployeeId] = useState(''); // This stores employee code for display
  const [employeeUUID, setEmployeeUUID] = useState(''); // This stores the actual UUID for DB
  const [empOpen, setEmpOpen] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<{ typeIndex: string; quantity: number; unitPrice: number }[]>([
    { typeIndex: '', quantity: 1, unitPrice: 0 },
  ]);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ typeAr: '', typeEn: '', quantity: 1, unitPrice: 0, deliveryDate: '', notes: '' });

  const activeEmployees = useMemo(() => employees.filter(e => e.status === 'active'), [employees]);
  const selectedEmployee = activeEmployees.find(e => e.id === employeeUUID);

  const addRow = () => setItems(prev => [...prev, { typeIndex: '', quantity: 1, unitPrice: 0 }]);
  const removeRow = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateRow = (i: number, field: string, value: any) => {
    setItems(prev => prev.map((row, idx) => idx === i ? { ...row, [field]: value } : row));
  };

  const grandTotal = items.reduce((sum, r) => sum + r.quantity * r.unitPrice, 0);

  const handleSave = () => {
    if (!employeeUUID || !deliveryDate) {
      toast.error(language === 'ar' ? 'يرجى اختيار الموظف وتاريخ التسليم' : 'Please select employee and delivery date');
      return;
    }
    const validItems = items.filter(r => r.typeIndex !== '' && r.quantity > 0 && r.unitPrice > 0);
    if (validItems.length === 0) {
      toast.error(language === 'ar' ? 'يرجى إضافة صنف واحد على الأقل' : 'Please add at least one item');
      return;
    }
    validItems.forEach(r => {
      const uType = UNIFORM_TYPES[parseInt(r.typeIndex)];
      addUniform({
        employeeId: employeeUUID,
        typeAr: uType.ar,
        typeEn: uType.en,
        quantity: r.quantity,
        unitPrice: r.unitPrice,
        totalPrice: r.quantity * r.unitPrice,
        deliveryDate,
        notes,
      });
    });
    toast.success(language === 'ar' ? 'تم حفظ اليونيفورم بنجاح' : 'Uniform saved successfully');
    handleReset();
  };

  const handleReset = () => {
    setEmployeeId('');
    setEmployeeUUID('');
    setDeliveryDate('');
    setNotes('');
    setItems([{ typeIndex: '', quantity: 1, unitPrice: 0 }]);
  };

  const handleEdit = (u: typeof uniforms[0]) => {
    setEditingId(u.id);
    setEditForm({ typeAr: u.typeAr, typeEn: u.typeEn, quantity: u.quantity, unitPrice: u.unitPrice, deliveryDate: u.deliveryDate, notes: u.notes || '' });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (editingId === null) return;
    updateUniform(editingId, {
      typeAr: editForm.typeAr,
      typeEn: editForm.typeEn,
      quantity: editForm.quantity,
      unitPrice: editForm.unitPrice,
      totalPrice: editForm.quantity * editForm.unitPrice,
      deliveryDate: editForm.deliveryDate,
      notes: editForm.notes,
    });
    toast.success(language === 'ar' ? 'تم التعديل بنجاح' : 'Updated successfully');
    setEditDialogOpen(false);
    setEditingId(null);
  };

  const handleDelete = (id: number) => {
    deleteUniform(id);
    toast.success(language === 'ar' ? 'تم الحذف بنجاح' : 'Deleted successfully');
  };

  // Stats
  const totalItems = uniforms.length;
  const totalEmployees = new Set(uniforms.map(u => u.employeeId)).size;
  const totalOriginalValue = uniforms.reduce((s, u) => s + u.totalPrice, 0);
  const totalCurrentValue = uniforms.reduce((s, u) => s + getCurrentValue(u.totalPrice, u.deliveryDate), 0);

  // Report data
  const reportByEmployee = useMemo(() => {
    const map: Record<string, { empId: string; name: string; station: string; dept: string; items: number; original: number; current: number }> = {};
    uniforms.forEach(u => {
      const emp = employees.find(e => e.id === u.employeeId);
      if (!map[u.employeeId]) {
        const st = emp?.stationLocation || '';
        const stLabel = stationLocations.find(s => s.value === st);
        map[u.employeeId] = {
          empId: emp?.employeeId || u.employeeId,
          name: emp ? (language === 'ar' ? emp.nameAr : emp.nameEn) : u.employeeId,
          station: stLabel ? (language === 'ar' ? stLabel.labelAr : stLabel.labelEn) : st,
          dept: emp?.department || '',
          items: 0, original: 0, current: 0,
        };
      }
      map[u.employeeId].items += u.quantity;
      map[u.employeeId].original += u.totalPrice;
      map[u.employeeId].current += getCurrentValue(u.totalPrice, u.deliveryDate);
    });
    return Object.values(map);
  }, [uniforms, employees, language]);

  const handleExportCSV = () => {
    exportToCSV({
      title: language === 'ar' ? 'تقرير اليونيفورم' : 'Uniform Report',
      columns: [
        { header: language === 'ar' ? 'رقم الموظف' : 'Emp ID', key: 'empId' },
        { header: language === 'ar' ? 'الاسم' : 'Name', key: 'name' },
        { header: language === 'ar' ? 'المحطة' : 'Station', key: 'station' },
        { header: language === 'ar' ? 'القسم' : 'Dept', key: 'dept' },
        { header: language === 'ar' ? 'عدد الأصناف' : 'Items', key: 'items' },
        { header: language === 'ar' ? 'القيمة الأصلية' : 'Original', key: 'original' },
        { header: language === 'ar' ? 'القيمة الحالية' : 'Current', key: 'current' },
      ],
      data: reportByEmployee as any[],
      fileName: 'uniform_report',
    });
  };

  return (
    <DashboardLayout>
      <div className={cn("space-y-6", isRTL && "text-right")}>
        {/* Header */}
        <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
          <h1 className={cn("text-2xl font-bold flex items-center gap-2", isRTL && "flex-row-reverse")}>
            <Shirt className="w-7 h-7 text-primary" />
            {language === 'ar' ? 'إدارة يونيفورم الموظفين' : 'Employee Uniform Management'}
          </h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: language === 'ar' ? 'إجمالي الأصناف' : 'Total Items', value: totalItems, icon: Package, color: 'text-blue-600 bg-blue-100' },
            { label: language === 'ar' ? 'عدد الموظفين' : 'Employees', value: totalEmployees, icon: Users, color: 'text-green-600 bg-green-100' },
            { label: language === 'ar' ? 'القيمة الإجمالية' : 'Total Value', value: totalOriginalValue.toLocaleString(), icon: TrendingUp, color: 'text-amber-600 bg-amber-100' },
            { label: language === 'ar' ? 'القيمة الحالية' : 'Current Value', value: totalCurrentValue.toLocaleString(), icon: TrendingUp, color: 'text-purple-600 bg-purple-100' },
          ].map((s, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
                  <div>
                    <p className="text-sm text-muted-foreground">{s.label}</p>
                    <p className="text-2xl font-bold mt-1">{s.value}</p>
                  </div>
                  <div className={cn("p-3 rounded-xl", s.color)}>
                    <s.icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="manage" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manage">{language === 'ar' ? 'إدارة اليونيفورم' : 'Manage Uniforms'}</TabsTrigger>
            <TabsTrigger value="report">{language === 'ar' ? 'التقرير الشامل' : 'Full Report'}</TabsTrigger>
          </TabsList>

          <TabsContent value="manage" className="space-y-6 mt-6">
            {/* Depreciation info */}
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-4">
                <h3 className={cn("font-bold flex items-center gap-2 mb-3", isRTL && "flex-row-reverse")}>
                  <Info className="w-5 h-5 text-amber-600" />
                  {language === 'ar' ? 'نظام حساب الاستهلاك التلقائي' : 'Auto Depreciation System'}
                </h3>
                <ul className={cn("space-y-1 text-sm", isRTL && "text-right")}>
                  {[
                    { ar: 'بعد 3 أشهر: تنخفض القيمة إلى 75% (استهلاك 25%)', en: 'After 3 months: value drops to 75% (25% depreciation)' },
                    { ar: 'بعد 6 أشهر: تنخفض القيمة إلى 50% (استهلاك 50%)', en: 'After 6 months: value drops to 50% (50% depreciation)' },
                    { ar: 'بعد 9 أشهر: تنخفض القيمة إلى 25% (استهلاك 75%)', en: 'After 9 months: value drops to 25% (75% depreciation)' },
                    { ar: 'بعد 12 شهر: تصبح القيمة 0% ويتم الحذف التلقائي', en: 'After 12 months: value becomes 0% and auto-removed' },
                  ].map((rule, i) => (
                    <li key={i} className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      {language === 'ar' ? rule.ar : rule.en}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Add form */}
            <Card>
              <CardHeader>
                <CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                  <Plus className="w-5 h-5" />
                  {language === 'ar' ? 'إضافة يونيفورم جديد' : 'Add New Uniform'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Employee selector */}
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'اختر الموظف' : 'Select Employee'}</Label>
                  <Popover open={empOpen} onOpenChange={setEmpOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className={cn("w-full justify-between", isRTL && "flex-row-reverse")}>
                        {selectedEmployee
                          ? `${selectedEmployee.employeeId} - ${language === 'ar' ? selectedEmployee.nameAr : selectedEmployee.nameEn}`
                          : (language === 'ar' ? '-- اختر الموظف --' : '-- Select Employee --')}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 bg-popover z-50" align="start">
                      <Command>
                        <CommandInput placeholder={language === 'ar' ? 'بحث...' : 'Search...'} />
                        <CommandList>
                          <CommandEmpty>{language === 'ar' ? 'لا نتائج' : 'No results'}</CommandEmpty>
                          <CommandGroup>
                            {activeEmployees.map(emp => (
                              <CommandItem key={emp.id} value={`${emp.nameAr} ${emp.nameEn} ${emp.employeeId}`}
                                onSelect={() => { setEmployeeId(emp.employeeId); setEmployeeUUID(emp.id); setEmpOpen(false); }}>
                                <Check className={cn("mr-2 h-4 w-4", employeeUUID === emp.id ? "opacity-100" : "opacity-0")} />
                                <span>{emp.employeeId} - {language === 'ar' ? emp.nameAr : emp.nameEn}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'رقم الموظف' : 'Employee ID'}</Label>
                    <Input value={employeeId} readOnly className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'تاريخ الاستلام' : 'Delivery Date'}</Label>
                    <Input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} />
                  </div>
                </div>

                {/* Items table */}
                <div className="space-y-2">
                  <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
                    <Label className="font-bold">{language === 'ar' ? 'الأصناف' : 'Items'}</Label>
                    <Button size="sm" onClick={addRow} className="gap-1">
                      <Plus className="w-4 h-4" />
                      {language === 'ar' ? 'إضافة صنف' : 'Add Item'}
                    </Button>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{language === 'ar' ? 'نوع الصنف' : 'Type'}</TableHead>
                        <TableHead>{language === 'ar' ? 'قيمة الصنف' : 'Unit Price'}</TableHead>
                        <TableHead>{language === 'ar' ? 'العدد' : 'Qty'}</TableHead>
                        <TableHead>{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                        <TableHead>{language === 'ar' ? 'إجراءات' : 'Actions'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Select value={row.typeIndex} onValueChange={v => updateRow(i, 'typeIndex', v)}>
                              <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر الصنف' : 'Select type'} /></SelectTrigger>
                              <SelectContent className="bg-popover z-50">
                                {UNIFORM_TYPES.map((ut, idx) => (
                                  <SelectItem key={idx} value={String(idx)}>{language === 'ar' ? ut.ar : ut.en}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input type="number" min={0} step={0.01} value={row.unitPrice || ''} onChange={e => updateRow(i, 'unitPrice', parseFloat(e.target.value) || 0)} />
                          </TableCell>
                          <TableCell>
                            <Input type="number" min={1} value={row.quantity} onChange={e => updateRow(i, 'quantity', parseInt(e.target.value) || 1)} />
                          </TableCell>
                          <TableCell className="font-bold">{(row.quantity * row.unitPrice).toFixed(2)}</TableCell>
                          <TableCell>
                            <Button variant="destructive" size="icon" onClick={() => removeRow(i)} disabled={items.length === 1}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="text-center font-bold text-lg mt-2">
                    {language === 'ar' ? 'الإجمالي الكلي' : 'Grand Total'}: <span className="text-primary">{grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
                  <Textarea value={notes} onChange={e => setNotes(e.target.value)} />
                </div>

                <div className={cn("flex gap-3 justify-end", isRTL && "flex-row-reverse")}>
                  <Button variant="outline" onClick={handleReset} className="gap-1.5">
                    <RefreshCw className="w-4 h-4" />
                    {language === 'ar' ? 'إعادة تعيين' : 'Reset'}
                  </Button>
                  <Button onClick={handleSave} className="gap-1.5">
                    <Package className="w-4 h-4" />
                    {language === 'ar' ? 'حفظ جميع الأصناف' : 'Save All Items'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Uniforms list */}
            <Card>
              <CardHeader>
                <CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                  <Package className="w-5 h-5" />
                  {language === 'ar' ? 'قائمة اليونيفورم' : 'Uniforms List'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'ar' ? 'رقم الموظف' : 'Emp ID'}</TableHead>
                      <TableHead>{language === 'ar' ? 'اسم الموظف' : 'Name'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الصنف' : 'Type'}</TableHead>
                      <TableHead>{language === 'ar' ? 'القيمة الأصلية' : 'Original'}</TableHead>
                      <TableHead>{language === 'ar' ? 'القيمة الحالية' : 'Current'}</TableHead>
                      <TableHead>{language === 'ar' ? 'العدد' : 'Qty'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الإجمالي الحالي' : 'Current Total'}</TableHead>
                      <TableHead>{language === 'ar' ? 'تاريخ الاستلام' : 'Delivery'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الاستهلاك' : 'Depreciation'}</TableHead>
                      <TableHead>{language === 'ar' ? 'إجراءات' : 'Actions'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uniforms.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                          {language === 'ar' ? 'لا توجد بيانات' : 'No data'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      uniforms.map(u => {
                        const emp = employees.find(e => e.id === u.employeeId);
                        const depPct = getDepreciationPercent(u.deliveryDate);
                        const curVal = getCurrentValue(u.totalPrice, u.deliveryDate);
                        const usedPct = 100 - depPct;
                        return (
                          <TableRow key={u.id}>
                            <TableCell className="font-mono">{emp?.employeeId || u.employeeId}</TableCell>
                            <TableCell>{emp ? (language === 'ar' ? emp.nameAr : emp.nameEn) : '-'}</TableCell>
                            <TableCell>{language === 'ar' ? u.typeAr : u.typeEn}</TableCell>
                            <TableCell>{u.unitPrice.toFixed(2)}</TableCell>
                            <TableCell>{(u.unitPrice * depPct / 100).toFixed(2)}</TableCell>
                            <TableCell>{u.quantity}</TableCell>
                            <TableCell className="font-bold">{curVal.toFixed(2)}</TableCell>
                            <TableCell>{u.deliveryDate}</TableCell>
                            <TableCell>
                              <Badge variant={usedPct >= 75 ? 'destructive' : usedPct >= 50 ? 'secondary' : 'outline'}>
                                {usedPct}%
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => handleEdit(u)}>
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(u.id)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="report" className="space-y-6 mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                  <FileText className="w-5 h-5" />
                  {language === 'ar' ? 'تقرير اليونيفورم الشامل' : 'Comprehensive Uniform Report'}
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handlePrint(language === 'ar' ? 'تقرير اليونيفورم' : 'Uniform Report')}>
                    {language === 'ar' ? 'طباعة' : 'Print'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportCSV}>
                    {language === 'ar' ? 'تصدير CSV' : 'Export CSV'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div ref={reportRef}>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-primary text-primary-foreground">
                        <TableHead className="text-primary-foreground">{language === 'ar' ? 'رقم الموظف' : 'Emp ID'}</TableHead>
                        <TableHead className="text-primary-foreground">{language === 'ar' ? 'اسم الموظف' : 'Name'}</TableHead>
                        <TableHead className="text-primary-foreground">{language === 'ar' ? 'المحطة' : 'Station'}</TableHead>
                        <TableHead className="text-primary-foreground">{language === 'ar' ? 'القسم' : 'Dept'}</TableHead>
                        <TableHead className="text-primary-foreground">{language === 'ar' ? 'عدد الأصناف' : 'Items'}</TableHead>
                        <TableHead className="text-primary-foreground">{language === 'ar' ? 'القيمة الأصلية' : 'Original'}</TableHead>
                        <TableHead className="text-primary-foreground">{language === 'ar' ? 'القيمة الحالية' : 'Current'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportByEmployee.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            {language === 'ar' ? 'لا توجد بيانات' : 'No data'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        <>
                          {reportByEmployee.map(r => (
                            <TableRow key={r.empId}>
                              <TableCell className="font-mono">{r.empId}</TableCell>
                              <TableCell className="font-medium">{r.name}</TableCell>
                              <TableCell>{r.station || '-'}</TableCell>
                              <TableCell>{r.dept}</TableCell>
                              <TableCell>{r.items}</TableCell>
                              <TableCell>{r.original.toLocaleString()}</TableCell>
                              <TableCell className="font-bold text-primary">{r.current.toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-muted font-bold">
                            <TableCell colSpan={4}>{language === 'ar' ? 'الإجمالي' : 'Total'}</TableCell>
                            <TableCell>{reportByEmployee.reduce((s, r) => s + r.items, 0)}</TableCell>
                            <TableCell>{reportByEmployee.reduce((s, r) => s + r.original, 0).toLocaleString()}</TableCell>
                            <TableCell className="text-primary">{reportByEmployee.reduce((s, r) => s + r.current, 0).toLocaleString()}</TableCell>
                          </TableRow>
                        </>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{language === 'ar' ? 'تعديل اليونيفورم' : 'Edit Uniform'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'نوع الصنف' : 'Type'}</Label>
              <Select value={UNIFORM_TYPES.findIndex(ut => ut.ar === editForm.typeAr).toString()} onValueChange={v => {
                const ut = UNIFORM_TYPES[parseInt(v)];
                setEditForm(p => ({ ...p, typeAr: ut.ar, typeEn: ut.en }));
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {UNIFORM_TYPES.map((ut, idx) => (
                    <SelectItem key={idx} value={String(idx)}>{language === 'ar' ? ut.ar : ut.en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'العدد' : 'Qty'}</Label>
                <Input type="number" min={1} value={editForm.quantity} onChange={e => setEditForm(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))} />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'سعر الوحدة' : 'Unit Price'}</Label>
                <Input type="number" min={0} step={0.01} value={editForm.unitPrice} onChange={e => setEditForm(p => ({ ...p, unitPrice: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'تاريخ الاستلام' : 'Delivery Date'}</Label>
              <Input type="date" value={editForm.deliveryDate} onChange={e => setEditForm(p => ({ ...p, deliveryDate: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
              <Textarea value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>{language === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleSaveEdit}>{language === 'ar' ? 'حفظ' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Uniforms;
