import { useState, useMemo, useCallback, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, Search, Plus, Edit2, Building2, Plane, Timer,
  Clock, Filter, Trash2, UsersRound, UserPlus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { sampleShiftDefinitions, ScheduleType } from '@/types/attendance';
import { useEmployeeData } from '@/contexts/EmployeeDataContext';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DbRule {
  id: string;
  name: string;
  name_ar: string;
  schedule_type: string;
}

interface Assignment {
  id: string;
  employeeId: string;
  ruleId: string;
  stationId: string;
  stationName: string;
  shiftId?: string;
  effectiveFrom: string;
  isActive: boolean;
}

interface StationOption { id: string; name: string; }
interface DeptOption { id: string; name: string; }

export const EmployeeAssignment = () => {
  const { t, isRTL, language } = useLanguage();
  const ar = language === 'ar';
  const { employees: contextEmployees } = useEmployeeData();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [rules, setRules] = useState<DbRule[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [stationFilter, setStationFilter] = useState<string>('all');
  const [ruleFilter, setRuleFilter] = useState<string>('all');
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<string | null>(null);
  const [assignMode, setAssignMode] = useState<'single' | 'bulk'>('single');

  const [formData, setFormData] = useState({
    employeeId: '',
    ruleId: '',
    stationId: '',
    shiftId: '',
    effectiveFrom: new Date().toISOString().split('T')[0],
  });

  const [bulkData, setBulkData] = useState({
    ruleId: '',
    shiftId: '',
    effectiveFrom: new Date().toISOString().split('T')[0],
    bulkStationId: '',
    bulkDepartmentId: '',
  });

  const [empSearch, setEmpSearch] = useState('');
  const [stations, setStations] = useState<StationOption[]>([]);
  const [departments, setDepartments] = useState<DeptOption[]>([]);

  const shifts = sampleShiftDefinitions;

  // Fetch rules, stations, departments, and assignments
  const fetchAll = useCallback(async () => {
    const [rulesRes, stationsRes, deptsRes, assignRes] = await Promise.all([
      supabase.from('attendance_rules').select('id, name, name_ar, schedule_type').eq('is_active', true).order('name'),
      supabase.from('stations').select('id, name_ar, name_en').eq('is_active', true).order('name_ar'),
      supabase.from('departments').select('id, name_ar, name_en').eq('is_active', true).order('name_ar'),
      supabase.from('attendance_assignments').select('*, stations(name_ar, name_en)').eq('is_active', true).order('created_at', { ascending: false }),
    ]);
    if (rulesRes.data) setRules(rulesRes.data);
    if (stationsRes.data) setStations(stationsRes.data.map(s => ({ id: s.id, name: ar ? s.name_ar : s.name_en })));
    if (deptsRes.data) setDepartments(deptsRes.data.map(d => ({ id: d.id, name: ar ? d.name_ar : d.name_en })));
    if (assignRes.data) {
      setAssignments(assignRes.data.map((a: any) => ({
        id: a.id,
        employeeId: a.employee_id,
        ruleId: a.rule_id,
        stationId: a.station_id || '',
        stationName: a.stations ? (ar ? a.stations.name_ar : a.stations.name_en) : '',
        shiftId: a.shift_id || undefined,
        effectiveFrom: a.effective_from,
        isActive: a.is_active,
      })));
    }
  }, [ar]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const getRule = (ruleId: string) => rules.find(r => r.id === ruleId);
  const getShift = (shiftId?: string) => shiftId ? shifts.find(s => s.id === shiftId) : null;
  const getEmployee = (empId: string) => contextEmployees.find(e => e.id === empId);

  const getRuleBadgeColor = (ruleId: string) => {
    const rule = getRule(ruleId);
    if (!rule) return 'bg-gray-100 text-gray-700';
    switch (rule.schedule_type) {
      case 'fixed': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'flexible': return 'bg-green-100 text-green-700 border-green-300';
      case 'shift': return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'fully-flexible': return 'bg-amber-100 text-amber-700 border-amber-300';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getRuleIcon = (ruleId: string) => {
    const rule = getRule(ruleId);
    if (!rule) return <Clock className="w-4 h-4" />;
    switch (rule.schedule_type) {
      case 'fixed': return <Building2 className="w-4 h-4" />;
      case 'flexible': return <Timer className="w-4 h-4" />;
      case 'shift': return <Plane className="w-4 h-4" />;
      case 'fully-flexible': return <Clock className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const filteredEmployeesForForm = useMemo(() => {
    let list = contextEmployees.filter(e => e.status === 'active');
    if (formData.stationId && formData.stationId !== 'all') {
      list = list.filter(e => e.stationId === formData.stationId);
    }
    if (empSearch) {
      const q = empSearch.toLowerCase();
      list = list.filter(e =>
        e.nameAr.toLowerCase().includes(q) ||
        e.nameEn.toLowerCase().includes(q) ||
        e.employeeId.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => {
      const numA = parseInt(a.employeeId.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.employeeId.replace(/\D/g, '')) || 0;
      return numA - numB;
    });
  }, [contextEmployees, formData.stationId, empSearch]);

  const bulkEmployees = useMemo(() => {
    let list = contextEmployees.filter(e => e.status === 'active');
    if (bulkData.bulkStationId && bulkData.bulkStationId !== 'all') {
      list = list.filter(e => e.stationId === bulkData.bulkStationId);
    }
    if (bulkData.bulkDepartmentId && bulkData.bulkDepartmentId !== 'all') {
      list = list.filter(e => e.departmentId === bulkData.bulkDepartmentId);
    }
    return list;
  }, [contextEmployees, bulkData.bulkStationId, bulkData.bulkDepartmentId]);

  const handleSaveAssignment = async () => {
    if (!formData.employeeId || !formData.ruleId) {
      toast({ title: ar ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    const emp = getEmployee(formData.employeeId);

    if (editingAssignment) {
      const { error } = await supabase.from('attendance_assignments').update({
        rule_id: formData.ruleId,
        station_id: formData.stationId && formData.stationId !== 'all' ? formData.stationId : emp?.stationId || null,
        shift_id: formData.shiftId || null,
        effective_from: formData.effectiveFrom,
      }).eq('id', editingAssignment);
      if (error) {
        toast({ title: ar ? 'خطأ في التحديث' : 'Update failed', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: ar ? 'تم تحديث التعيين بنجاح' : 'Assignment updated successfully' });
    } else {
      // Deactivate existing active assignment for this employee
      await supabase.from('attendance_assignments').update({ is_active: false }).eq('employee_id', formData.employeeId).eq('is_active', true);

      const { error } = await supabase.from('attendance_assignments').insert({
        employee_id: formData.employeeId,
        rule_id: formData.ruleId,
        station_id: formData.stationId && formData.stationId !== 'all' ? formData.stationId : emp?.stationId || null,
        shift_id: formData.shiftId || null,
        effective_from: formData.effectiveFrom,
        is_active: true,
      });
      if (error) {
        toast({ title: ar ? 'خطأ في التعيين' : 'Assignment failed', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: ar ? 'تم التعيين بنجاح' : 'Assignment saved successfully' });
    }

    resetForm();
    setIsAssignDialogOpen(false);
    await fetchAll();
  };

  const handleBulkAssign = async () => {
    if (!bulkData.ruleId || (!bulkData.bulkStationId && !bulkData.bulkDepartmentId)) {
      toast({ title: ar ? 'يرجى اختيار القاعدة والمحطة أو القسم' : 'Please select rule and station or department', variant: 'destructive' });
      return;
    }

    const existingEmpIds = new Set(assignments.filter(a => a.isActive).map(a => a.employeeId));
    const newEmps = bulkEmployees.filter(e => !existingEmpIds.has(e.id));

    if (newEmps.length === 0) {
      toast({ title: ar ? 'جميع الموظفين معينين بالفعل' : 'All employees already assigned', variant: 'destructive' });
      return;
    }

    // Batch insert
    const rows = newEmps.map(emp => ({
      employee_id: emp.id,
      rule_id: bulkData.ruleId,
      station_id: emp.stationId || null,
      shift_id: bulkData.shiftId || null,
      effective_from: bulkData.effectiveFrom,
      is_active: true,
    }));

    // Insert in batches of 100
    let count = 0;
    for (let i = 0; i < rows.length; i += 100) {
      const batch = rows.slice(i, i + 100);
      const { error } = await supabase.from('attendance_assignments').insert(batch);
      if (!error) count += batch.length;
    }

    toast({ title: ar ? `تم تعيين ${count} موظف بنجاح` : `${count} employees assigned successfully` });
    resetForm();
    setIsAssignDialogOpen(false);
    await fetchAll();
  };

  const handleEditAssignment = (assignment: Assignment) => {
    setFormData({
      employeeId: assignment.employeeId,
      ruleId: assignment.ruleId,
      stationId: assignment.stationId,
      shiftId: assignment.shiftId || '',
      effectiveFrom: assignment.effectiveFrom,
    });
    setEditingAssignment(assignment.id);
    setAssignMode('single');
    setIsAssignDialogOpen(true);
  };

  const handleDeleteAssignment = async (id: string) => {
    const { error } = await supabase.from('attendance_assignments').delete().eq('id', id);
    if (error) {
      toast({ title: ar ? 'خطأ في الحذف' : 'Delete failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: ar ? 'تم حذف التعيين' : 'Assignment deleted' });
    await fetchAll();
  };

  const resetForm = () => {
    setFormData({ employeeId: '', ruleId: '', stationId: '', shiftId: '', effectiveFrom: new Date().toISOString().split('T')[0] });
    setBulkData({ ruleId: '', shiftId: '', effectiveFrom: new Date().toISOString().split('T')[0], bulkStationId: '', bulkDepartmentId: '' });
    setEditingAssignment(null);
    setEmpSearch('');
    setAssignMode('single');
  };

  const filteredAssignments = assignments.filter(a => {
    const emp = getEmployee(a.employeeId);
    const matchesSearch = emp ? (
      emp.nameAr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.nameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
    ) : false;
    const matchesStation = stationFilter === 'all' || a.stationId === stationFilter;
    const matchesRule = ruleFilter === 'all' || a.ruleId === ruleFilter;
    return (searchTerm === '' || matchesSearch) && matchesStation && matchesRule;
  });

  const selectedRule = getRule(formData.ruleId);
  const isShiftRule = selectedRule?.schedule_type === 'shift';
  const bulkSelectedRule = getRule(bulkData.ruleId);
  const isBulkShiftRule = bulkSelectedRule?.schedule_type === 'shift';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={cn("flex justify-between items-center flex-wrap gap-4", isRTL && "flex-row-reverse")}>
        <div>
          <h2 className="text-xl font-semibold">{t('attendance.assignment.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('attendance.assignment.subtitle')}</p>
        </div>
        <Dialog open={isAssignDialogOpen} onOpenChange={(open) => { setIsAssignDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className={cn("gap-2", isRTL && "flex-row-reverse")}>
              <Plus className="w-4 h-4" />
              {t('attendance.assignment.assignEmployee')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAssignment ? (ar ? 'تعديل التعيين' : 'Edit Assignment') : (ar ? 'تعيين موظف' : 'Assign Employee')}
              </DialogTitle>
            </DialogHeader>

            {!editingAssignment && (
              <Tabs value={assignMode} onValueChange={(v) => setAssignMode(v as 'single' | 'bulk')}>
                <TabsList className="grid grid-cols-2 mb-2">
                  <TabsTrigger value="single" className="gap-2">
                    <UserPlus className="w-4 h-4" />
                    {ar ? 'فردي' : 'Single'}
                  </TabsTrigger>
                  <TabsTrigger value="bulk" className="gap-2">
                    <UsersRound className="w-4 h-4" />
                    {ar ? 'جماعي' : 'Bulk'}
                  </TabsTrigger>
                </TabsList>

                {/* Single Assignment */}
                <TabsContent value="single" className="space-y-4">
                  <div className="space-y-2">
                    <Label>{ar ? 'فلترة بالمحطة (اختياري)' : 'Filter by Station (optional)'}</Label>
                    <Select value={formData.stationId} onValueChange={(v) => setFormData(prev => ({ ...prev, stationId: v, employeeId: '' }))}>
                      <SelectTrigger><SelectValue placeholder={ar ? 'جميع المحطات' : 'All Stations'} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{ar ? 'جميع المحطات' : 'All Stations'}</SelectItem>
                        {stations.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{ar ? 'الموظف' : 'Employee'}</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder={ar ? 'ابحث بالاسم أو الرقم الوظيفي...' : 'Search by name or code...'}
                        value={empSearch}
                        onChange={e => setEmpSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <ScrollArea className="h-48 border rounded-md">
                      {filteredEmployeesForForm.length === 0 ? (
                        <p className="text-center text-muted-foreground py-6 text-sm">{ar ? 'لا توجد نتائج' : 'No results'}</p>
                      ) : (
                        <div className="p-1">
                          {filteredEmployeesForForm.map(emp => (
                            <div
                              key={emp.id}
                              className={cn(
                                "flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-accent transition-colors",
                                formData.employeeId === emp.id && "bg-accent border border-primary"
                              )}
                              onClick={() => setFormData(prev => ({ ...prev, employeeId: emp.id }))}
                            >
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={emp.avatar} />
                                <AvatarFallback className="text-xs">{emp.nameEn?.split(' ').map(n => n[0]).join('').slice(0, 2)}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{ar ? emp.nameAr : emp.nameEn}</p>
                                <p className="text-xs text-muted-foreground">{emp.employeeId} • {emp.stationName || emp.department}</p>
                              </div>
                              {formData.employeeId === emp.id && <Badge variant="default" className="text-xs">{ar ? 'محدد' : 'Selected'}</Badge>}
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>

                  <div className="space-y-2">
                    <Label>{ar ? 'قاعدة الحضور' : 'Attendance Rule'}</Label>
                    <Select value={formData.ruleId} onValueChange={(v) => setFormData(prev => ({ ...prev, ruleId: v, shiftId: '' }))}>
                      <SelectTrigger><SelectValue placeholder={ar ? 'اختر القاعدة' : 'Select Rule'} /></SelectTrigger>
                      <SelectContent>
                        {rules.map(rule => (
                          <SelectItem key={rule.id} value={rule.id}>{ar ? rule.name_ar : rule.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {isShiftRule && (
                    <div className="space-y-2">
                      <Label>{ar ? 'الوردية' : 'Shift'}</Label>
                      <Select value={formData.shiftId} onValueChange={(v) => setFormData(prev => ({ ...prev, shiftId: v }))}>
                        <SelectTrigger><SelectValue placeholder={ar ? 'اختر الوردية' : 'Select Shift'} /></SelectTrigger>
                        <SelectContent>
                          {shifts.map(shift => (
                            <SelectItem key={shift.id} value={shift.id}>{ar ? shift.nameAr : shift.name} ({shift.startTime} - {shift.endTime})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>{ar ? 'تاريخ البدء' : 'Effective From'}</Label>
                    <Input type="date" value={formData.effectiveFrom} onChange={e => setFormData(prev => ({ ...prev, effectiveFrom: e.target.value }))} />
                  </div>

                  <Button className="w-full" onClick={handleSaveAssignment}>{ar ? 'حفظ التعيين' : 'Save Assignment'}</Button>
                </TabsContent>

                {/* Bulk Assignment */}
                <TabsContent value="bulk" className="space-y-4">
                  <div className="space-y-2">
                    <Label>{ar ? 'المحطة' : 'Station'}</Label>
                    <Select value={bulkData.bulkStationId} onValueChange={v => setBulkData(prev => ({ ...prev, bulkStationId: v }))}>
                      <SelectTrigger><SelectValue placeholder={ar ? 'اختر المحطة' : 'Select Station'} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{ar ? 'جميع المحطات' : 'All Stations'}</SelectItem>
                        {stations.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{ar ? 'القسم (اختياري - للتصفية داخل المحطة)' : 'Department (optional - filter within station)'}</Label>
                    <Select value={bulkData.bulkDepartmentId} onValueChange={v => setBulkData(prev => ({ ...prev, bulkDepartmentId: v }))}>
                      <SelectTrigger><SelectValue placeholder={ar ? 'جميع الأقسام' : 'All Departments'} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{ar ? 'جميع الأقسام' : 'All Departments'}</SelectItem>
                        {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm font-medium">{ar ? 'الموظفون المستهدفون:' : 'Target Employees:'} <span className="text-primary font-bold">{bulkEmployees.length}</span></p>
                  </div>

                  <div className="space-y-2">
                    <Label>{ar ? 'قاعدة الحضور' : 'Attendance Rule'}</Label>
                    <Select value={bulkData.ruleId} onValueChange={v => setBulkData(prev => ({ ...prev, ruleId: v, shiftId: '' }))}>
                      <SelectTrigger><SelectValue placeholder={ar ? 'اختر القاعدة' : 'Select Rule'} /></SelectTrigger>
                      <SelectContent>
                        {rules.map(rule => <SelectItem key={rule.id} value={rule.id}>{ar ? rule.name_ar : rule.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {isBulkShiftRule && (
                    <div className="space-y-2">
                      <Label>{ar ? 'الوردية' : 'Shift'}</Label>
                      <Select value={bulkData.shiftId} onValueChange={v => setBulkData(prev => ({ ...prev, shiftId: v }))}>
                        <SelectTrigger><SelectValue placeholder={ar ? 'اختر الوردية' : 'Select Shift'} /></SelectTrigger>
                        <SelectContent>
                          {shifts.map(shift => <SelectItem key={shift.id} value={shift.id}>{ar ? shift.nameAr : shift.name} ({shift.startTime} - {shift.endTime})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>{ar ? 'تاريخ البدء' : 'Effective From'}</Label>
                    <Input type="date" value={bulkData.effectiveFrom} onChange={e => setBulkData(prev => ({ ...prev, effectiveFrom: e.target.value }))} />
                  </div>

                  <Button className="w-full" onClick={handleBulkAssign} disabled={bulkEmployees.length === 0}>
                    <UsersRound className="w-4 h-4 mr-2" />
                    {ar ? `تعيين ${bulkEmployees.length} موظف` : `Assign ${bulkEmployees.length} Employees`}
                  </Button>
                </TabsContent>
              </Tabs>
            )}

            {/* Edit mode (single only) */}
            {editingAssignment && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>{ar ? 'قاعدة الحضور' : 'Attendance Rule'}</Label>
                  <Select value={formData.ruleId} onValueChange={(v) => setFormData(prev => ({ ...prev, ruleId: v, shiftId: '' }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {rules.map(rule => <SelectItem key={rule.id} value={rule.id}>{ar ? rule.name_ar : rule.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {isShiftRule && (
                  <div className="space-y-2">
                    <Label>{ar ? 'الوردية' : 'Shift'}</Label>
                    <Select value={formData.shiftId} onValueChange={(v) => setFormData(prev => ({ ...prev, shiftId: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {shifts.map(shift => <SelectItem key={shift.id} value={shift.id}>{ar ? shift.nameAr : shift.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>{ar ? 'تاريخ البدء' : 'Effective From'}</Label>
                  <Input type="date" value={formData.effectiveFrom} onChange={e => setFormData(prev => ({ ...prev, effectiveFrom: e.target.value }))} />
                </div>
                <Button className="w-full" onClick={handleSaveAssignment}>{ar ? 'حفظ التعديلات' : 'Save Changes'}</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className={cn("flex flex-wrap gap-4", isRTL && "flex-row-reverse")}>
            <div className="relative flex-1 min-w-[200px]">
              <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
              <Input
                placeholder={ar ? 'بحث بالاسم أو الرقم الوظيفي...' : 'Search by name or code...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={cn(isRTL ? "pr-10" : "pl-10")}
              />
            </div>
            <Select value={stationFilter} onValueChange={setStationFilter}>
              <SelectTrigger className="w-[200px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{ar ? 'جميع المحطات' : 'All Stations'}</SelectItem>
                {stations.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={ruleFilter} onValueChange={setRuleFilter}>
              <SelectTrigger className="w-[200px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{ar ? 'جميع القواعد' : 'All Rules'}</SelectItem>
                {rules.map(rule => <SelectItem key={rule.id} value={rule.id}>{ar ? rule.name_ar : rule.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30"><Users className="w-5 h-5 text-blue-600" /></div>
              <div>
                <p className="text-2xl font-bold">{assignments.length}</p>
                <p className="text-sm text-muted-foreground">{ar ? 'إجمالي التعيينات' : 'Total Assignments'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30"><Building2 className="w-5 h-5 text-green-600" /></div>
              <div>
                <p className="text-2xl font-bold">{new Set(assignments.map(a => a.stationId).filter(Boolean)).size}</p>
                <p className="text-sm text-muted-foreground">{ar ? 'المحطات المغطاة' : 'Stations Covered'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
              <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30"><Clock className="w-5 h-5 text-purple-600" /></div>
              <div>
                <p className="text-2xl font-bold">{assignments.filter(a => a.shiftId).length}</p>
                <p className="text-sm text-muted-foreground">{ar ? 'بنظام الورديات' : 'On Shift System'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assignments Table */}
      <Card>
        <CardHeader>
          <CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
            <Users className="w-5 h-5" />
            {ar ? 'التعيينات' : 'Assignments'}
          </CardTitle>
          <CardDescription>{filteredAssignments.length} {ar ? 'تعيين' : 'assignments'}</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredAssignments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{ar ? 'لا توجد تعيينات بعد. اضغط على زر "تعيين موظف" للبدء.' : 'No assignments yet. Click "Assign Employee" to get started.'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{ar ? 'الموظف' : 'Employee'}</TableHead>
                    <TableHead>{ar ? 'المحطة' : 'Station'}</TableHead>
                    <TableHead>{ar ? 'قاعدة الحضور' : 'Attendance Rule'}</TableHead>
                    <TableHead>{ar ? 'الوردية' : 'Shift'}</TableHead>
                    <TableHead>{ar ? 'تاريخ البدء' : 'Effective From'}</TableHead>
                    <TableHead>{ar ? 'إجراءات' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssignments.map((assignment) => {
                    const emp = getEmployee(assignment.employeeId);
                    const rule = getRule(assignment.ruleId);
                    const shift = getShift(assignment.shiftId);
                    return (
                      <TableRow key={assignment.id}>
                        <TableCell>
                          <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={emp?.avatar} />
                              <AvatarFallback>{emp ? emp.nameEn.split(' ').map(n => n[0]).join('').slice(0, 2) : '?'}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{emp ? (ar ? emp.nameAr : emp.nameEn) : assignment.employeeId}</p>
                              <p className="text-sm text-muted-foreground">{emp?.employeeId}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1"><Building2 className="w-3 h-3" />{assignment.stationName || '-'}</Badge>
                        </TableCell>
                        <TableCell>
                          {rule && (
                            <Badge variant="outline" className={cn("gap-1", getRuleBadgeColor(assignment.ruleId))}>
                              {getRuleIcon(assignment.ruleId)}
                              {ar ? rule.name_ar : rule.name}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {shift ? (
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: shift.color }} />
                              <span className="text-sm">{ar ? shift.nameAr : shift.name}</span>
                            </div>
                          ) : <span className="text-sm text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell className="text-sm">{assignment.effectiveFrom}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditAssignment(assignment)}><Edit2 className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteAssignment(assignment.id)}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
