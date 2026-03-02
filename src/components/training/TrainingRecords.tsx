import { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Plus, X, Calendar, Edit2, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEmployeeData } from '@/contexts/EmployeeDataContext';
import { stationLocations } from '@/data/stationLocations';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Employee {
  id: string;
  nameEn: string;
  nameAr: string;
  department: string;
  station: string;
  linkId: string;
  hireDate: string;
  mobile: string;
  jobFunctions: string[];
}

interface TrainingRecord {
  id: string;
  employeeId: string;
  courseId: string;
  courseName: string;
  startDate: string;
  endDate: string;
  result: 'passed' | 'failed' | 'pending';
  percentage?: number;
  provider?: string;
  location?: string;
  hasCert?: boolean;
  hasCr?: boolean;
  plannedDate?: string;
  isFavorite?: boolean;
}

interface CourseOption {
  id: string;
  nameEn: string;
  nameAr: string;
  validityYears: number;
}

const jobFunctionLabels: Record<string, { en: string; ar: string }> = {
  'PS': { en: 'Passenger Services', ar: 'خدمات الركاب' },
  'LL': { en: 'Lost & Found', ar: 'المفقودات' },
  'OO': { en: 'Operations Officer', ar: 'مسؤول العمليات' },
  'RO': { en: 'Ramp Officer', ar: 'مسؤول الساحة' },
  'LC': { en: 'Load Control', ar: 'التحميل' },
  'SC': { en: 'Security Coordinator', ar: 'منسق الأمن' },
  'IA': { en: 'Intl Affairs Officer', ar: 'مسؤول الشؤون الدولية' },
  'AD': { en: 'Administration', ar: 'الإدارة' },
  'AC': { en: 'Accountant', ar: 'محاسب' },
  'WO': { en: 'Worker', ar: 'عامل' },
  'TR': { en: 'Trainer', ar: 'مدرب' },
};

export const TrainingRecords = () => {
  const { t, language, isRTL } = useLanguage();
  const ar = language === 'ar';
  const { toast } = useToast();
  const { employees: contextEmployees } = useEmployeeData();
  const [searchName, setSearchName] = useState('');
  const [searchDept, setSearchDept] = useState('');
  const [searchStation, setSearchStation] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isAddRecordOpen, setIsAddRecordOpen] = useState(false);
  const [trainingRecords, setTrainingRecords] = useState<TrainingRecord[]>([]);
  const [courseOptions, setCourseOptions] = useState<CourseOption[]>([]);
  const [newRecord, setNewRecord] = useState({
    courseId: '', startDate: '', endDate: '', result: 'pending' as 'passed' | 'failed' | 'pending', score: '', provider: '', location: '', hasCert: false, hasCr: false, plannedDate: '',
  });
  const [providerOptions, setProviderOptions] = useState<string[]>([]);
  const [locationOptions, setLocationOptions] = useState<string[]>([]);
  const [newLocation, setNewLocation] = useState('');
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  // Fetch available courses and providers from DB
  useEffect(() => {
    const fetchCourses = async () => {
      const { data } = await supabase.from('training_courses').select('id, name_en, name_ar, provider, validity_years').eq('is_active', true);
      setCourseOptions((data || []).map((c: any) => ({ id: c.id, nameEn: c.name_en, nameAr: c.name_ar, validityYears: c.validity_years || 1 })));
      // Extract unique providers
      const providers = [...new Set((data || []).map((c: any) => c.provider).filter(Boolean))] as string[];
      setProviderOptions(providers);
    };
    const fetchLocations = async () => {
      const [{ data: d1 }, { data: d2 }] = await Promise.all([
        supabase.from('planned_courses').select('location'),
        supabase.from('training_records').select('location'),
      ]);
      const allLocs = [...(d1 || []), ...(d2 || [])].map((c: any) => c.location).filter(Boolean);
      const locs = [...new Set(allLocs)] as string[];
      setLocationOptions(locs);
    };
    fetchCourses();
    fetchLocations();
  }, []);

  const trainingEmployees: Employee[] = useMemo(() => contextEmployees.map((emp) => ({
    id: emp.id,
    nameEn: emp.nameEn,
    nameAr: emp.nameAr,
    department: emp.department,
    station: emp.stationLocation || 'HDQ',
    linkId: emp.employeeId.replace('Emp', ''),
    hireDate: emp.hireDate || '',
    mobile: emp.phone || '',
    jobFunctions: (emp as any).deptCode ? [(emp as any).deptCode] : [],
  })), [contextEmployees]);

  // Fetch training records from DB when employee is selected
  useEffect(() => {
    if (!selectedEmployee) { setTrainingRecords([]); return; }
    const fetch = async () => {
      const { data } = await supabase
        .from('training_records')
        .select('*, training_courses(name_en, name_ar)')
        .eq('employee_id', selectedEmployee.id);
      setTrainingRecords((data || []).map((r: any) => ({
        id: r.id,
        employeeId: r.employee_id,
        courseId: r.course_id || '',
        courseName: r.training_courses ? (ar ? r.training_courses.name_ar : r.training_courses.name_en) : '',
        startDate: r.start_date || '',
        endDate: r.end_date || '',
        result: r.status === 'completed' ? 'passed' : r.status === 'failed' ? 'failed' : 'pending',
        percentage: r.score || undefined,
        provider: r.provider || '',
        location: r.location || '',
        hasCert: r.has_cert || false,
        hasCr: r.has_cr || false,
        plannedDate: r.planned_date || '',
        isFavorite: r.is_favorite || false,
      })));
    };
    fetch();
  }, [selectedEmployee, language]);

  const filteredEmployees = trainingEmployees.filter(emp => {
    const nameMatch = emp.nameEn.toLowerCase().includes(searchName.toLowerCase()) || emp.nameAr.includes(searchName);
    const deptMatch = !searchDept || searchDept === 'all' || emp.department === searchDept;
    const stationMatch = !searchStation || searchStation === 'all' || emp.station.includes(searchStation);
    return nameMatch && deptMatch && stationMatch;
  });

  const handleAddRecord = async () => {
    if (!selectedEmployee || !newRecord.courseId) {
      toast({ title: ar ? 'خطأ' : 'Error', description: ar ? 'اختر الدورة' : 'Select a course', variant: 'destructive' });
      return;
    }
    const statusMap = { passed: 'completed', failed: 'failed', pending: 'enrolled' };
    await supabase.from('training_records').insert({
      employee_id: selectedEmployee.id,
      course_id: newRecord.courseId,
      start_date: newRecord.startDate || null,
      end_date: newRecord.endDate || null,
      status: statusMap[newRecord.result],
      score: newRecord.score ? parseFloat(newRecord.score) : null,
      provider: newRecord.provider || null,
      location: newRecord.location || null,
      has_cert: newRecord.hasCert,
      has_cr: newRecord.hasCr,
      planned_date: newRecord.plannedDate || null,
    } as any);
    toast({ title: ar ? 'تمت الإضافة' : 'Added' });
    setIsAddRecordOpen(false);
    setNewRecord({ courseId: '', startDate: '', endDate: '', result: 'pending', score: '', provider: '', location: '', hasCert: false, hasCr: false, plannedDate: '' });
    // Refresh
    const { data } = await supabase
      .from('training_records')
      .select('*, training_courses(name_en, name_ar)')
      .eq('employee_id', selectedEmployee.id);
    setTrainingRecords((data || []).map((r: any) => ({
      id: r.id, employeeId: r.employee_id, courseId: r.course_id || '',
      courseName: r.training_courses ? (ar ? r.training_courses.name_ar : r.training_courses.name_en) : '',
      startDate: r.start_date || '', endDate: r.end_date || '',
      result: r.status === 'completed' ? 'passed' : r.status === 'failed' ? 'failed' : 'pending',
      percentage: r.score || undefined,
      provider: r.provider || '',
      location: r.location || '',
      hasCert: r.has_cert || false,
      hasCr: r.has_cr || false,
      plannedDate: r.planned_date || '',
      isFavorite: r.is_favorite || false,
    })));
  };

  const handleToggleFavorite = async (record: TrainingRecord) => {
    const newVal = !record.isFavorite;
    await supabase.from('training_records').update({ is_favorite: newVal } as any).eq('id', record.id);
    setTrainingRecords(prev => prev.map(r => r.id === record.id ? { ...r, isFavorite: newVal } : r));
  };

  const handleDeleteRecord = async (id: string) => {
    await supabase.from('training_records').delete().eq('id', id);
    setTrainingRecords(prev => prev.filter(r => r.id !== id));
    toast({ title: ar ? 'تم الحذف' : 'Deleted' });
  };

  const handleEditRecord = (record: TrainingRecord) => {
    setEditingRecordId(record.id);
    setNewRecord({
      courseId: record.courseId,
      startDate: record.startDate,
      endDate: record.endDate,
      result: record.result,
      score: record.percentage ? String(record.percentage) : '',
      provider: record.provider || '',
      location: record.location || '',
      hasCert: record.hasCert || false,
      hasCr: record.hasCr || false,
      plannedDate: record.plannedDate || '',
    });
    setIsAddRecordOpen(true);
  };

  const handleUpdateRecord = async () => {
    if (!selectedEmployee || !editingRecordId || !newRecord.courseId) return;
    const statusMap = { passed: 'completed', failed: 'failed', pending: 'enrolled' } as const;
    await supabase.from('training_records').update({
      course_id: newRecord.courseId,
      start_date: newRecord.startDate || null,
      end_date: newRecord.endDate || null,
      status: statusMap[newRecord.result],
      score: newRecord.score ? parseFloat(newRecord.score) : null,
      provider: newRecord.provider || null,
      location: newRecord.location || null,
      has_cert: newRecord.hasCert,
      has_cr: newRecord.hasCr,
      planned_date: newRecord.plannedDate || null,
    } as any).eq('id', editingRecordId);
    toast({ title: ar ? 'تم التعديل' : 'Updated' });
    setIsAddRecordOpen(false);
    setEditingRecordId(null);
    setNewRecord({ courseId: '', startDate: '', endDate: '', result: 'pending', score: '', provider: '', location: '', hasCert: false, hasCr: false, plannedDate: '' });
    // Refresh
    const { data } = await supabase
      .from('training_records')
      .select('*, training_courses(name_en, name_ar)')
      .eq('employee_id', selectedEmployee.id);
    setTrainingRecords((data || []).map((r: any) => ({
      id: r.id, employeeId: r.employee_id, courseId: r.course_id || '',
      courseName: r.training_courses ? (ar ? r.training_courses.name_ar : r.training_courses.name_en) : '',
      startDate: r.start_date || '', endDate: r.end_date || '',
      result: r.status === 'completed' ? 'passed' : r.status === 'failed' ? 'failed' : 'pending',
      percentage: r.score || undefined,
      provider: r.provider || '',
      location: r.location || '',
      hasCert: r.has_cert || false,
      hasCr: r.has_cr || false,
      plannedDate: r.planned_date || '',
      isFavorite: r.is_favorite || false,
    })));
  };

  const getResultBadge = (result: string) => {
    switch(result) {
      case 'passed': return <Badge className="bg-stat-green">{t('training.result.passed')}</Badge>;
      case 'failed': return <Badge variant="destructive">{t('training.result.failed')}</Badge>;
      default: return <Badge variant="secondary">{t('training.result.pending')}</Badge>;
    }
  };

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className={cn("col-span-3 space-y-4", isRTL && "order-last")}>
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="relative">
              <Search className={cn("absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
              <Input placeholder={t('training.searchByName')} value={searchName} onChange={(e) => setSearchName(e.target.value)} className={cn(isRTL ? "pr-10" : "pl-10")} />
            </div>
            <Select value={searchDept} onValueChange={setSearchDept}>
              <SelectTrigger><SelectValue placeholder={t('training.searchByDept')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                <SelectItem value="Operations">{t('dept.operations')}</SelectItem>
                <SelectItem value="HR">{t('dept.hr')}</SelectItem>
                <SelectItem value="Finance">{t('dept.finance')}</SelectItem>
                <SelectItem value="IT">{t('dept.it')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={searchStation} onValueChange={setSearchStation}>
              <SelectTrigger><SelectValue placeholder={t('training.searchByStation')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                {stationLocations.map(s => (<SelectItem key={s.value} value={s.value}>{language === 'ar' ? s.labelAr : s.labelEn}</SelectItem>))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
        <div className="space-y-1 max-h-[500px] overflow-y-auto">
          {filteredEmployees.map(emp => (
            <button key={emp.id} onClick={() => setSelectedEmployee(emp)}
              className={cn("w-full text-start px-3 py-2 rounded-lg transition-colors text-sm",
                selectedEmployee?.id === emp.id ? "bg-primary text-primary-foreground" : "hover:bg-muted text-primary")}>
              {language === 'ar' ? emp.nameAr : emp.nameEn}
            </button>
          ))}
        </div>
      </div>

      <div className="col-span-9 space-y-6">
        {selectedEmployee ? (
          <>
            <Card>
              <CardContent className="p-6">
                <div className="flex gap-6">
                  <Avatar className="w-24 h-24"><AvatarFallback className="text-2xl">{selectedEmployee.nameEn.charAt(0)}</AvatarFallback></Avatar>
                  <div className="flex-1 space-y-4">
                    <div>
                      <h2 className="text-2xl font-bold">{language === 'ar' ? selectedEmployee.nameAr : selectedEmployee.nameEn}</h2>
                      <p className="text-muted-foreground">{selectedEmployee.department}</p>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div><span className="text-muted-foreground">{t('training.linkId')}: </span><span className="font-medium">{selectedEmployee.linkId}</span></div>
                      <div><span className="text-muted-foreground">{t('training.station')}: </span><span className="font-medium">{selectedEmployee.station}</span></div>
                      <div><span className="text-muted-foreground">{t('training.hireDate')}: </span><span className="font-medium">{selectedEmployee.hireDate}</span></div>
                      <div><span className="text-muted-foreground">{t('training.mobile')}: </span><span className="font-medium">{selectedEmployee.mobile}</span></div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">{t('training.jobFunction')}</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.keys(jobFunctionLabels).map(key => (
                          <label key={key} className="flex items-center gap-1 text-xs"><Checkbox checked={selectedEmployee.jobFunctions.includes(key)} disabled /><span>{key}</span></label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
              <p className="mb-1"><strong>{t('training.jobFunctionLegend')}:</strong></p>
              <p>{Object.entries(jobFunctionLabels).map(([key, val], i) => (<span key={key}>{key}= {language === 'ar' ? val.ar : val.en}{i < Object.keys(jobFunctionLabels).length - 1 ? '  |  ' : ''}</span>))}</p>
            </div>

            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">{t('training.records.title')}</h3>
                  <Button onClick={() => setIsAddRecordOpen(true)}><Plus className="h-4 w-4 mr-2" />{t('training.records.add')}</Button>
                </div>
                <Table>
                  <TableHeader>
                     <TableRow>
                      <TableHead></TableHead>
                      <TableHead>{t('training.courseName')}</TableHead>
                      <TableHead>{ar ? 'الجهة المقدمة' : 'Provider'}</TableHead>
                      <TableHead>{ar ? 'المكان' : 'Location'}</TableHead>
                      <TableHead>{t('training.startDate')}</TableHead>
                      <TableHead>{t('training.endDate')}</TableHead>
                      <TableHead>{t('training.result')}</TableHead>
                      <TableHead>{t('training.percentage')}</TableHead>
                       <TableHead>Cert</TableHead>
                       <TableHead>CR</TableHead>
                       <TableHead>{ar ? 'تاريخ التخطيط' : 'Planned Date'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trainingRecords.map(record => (
                      <TableRow key={record.id}>
                         <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleToggleFavorite(record)}>
                              <Star className={cn("h-3.5 w-3.5", record.isFavorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground")} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEditRecord(record)}><Edit2 className="h-3 w-3" /></Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteRecord(record.id)}><X className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                        <TableCell>{record.courseName}</TableCell>
                        <TableCell>{record.provider || '-'}</TableCell>
                        <TableCell>{record.location || '-'}</TableCell>
                        <TableCell>{record.startDate}</TableCell>
                        <TableCell>{record.endDate}</TableCell>
                        <TableCell>{getResultBadge(record.result)}</TableCell>
                        <TableCell>{record.percentage ? `${record.percentage}%` : '-'}</TableCell>
                        <TableCell><Checkbox checked={record.hasCert} disabled /></TableCell>
                        <TableCell><Checkbox checked={record.hasCr} disabled /></TableCell>
                        <TableCell>{record.plannedDate || '-'}</TableCell>
                      </TableRow>
                    ))}
                    {trainingRecords.length === 0 && (
                      <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground py-8">{t('training.noRecords')}</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card><CardContent className="p-12 text-center text-muted-foreground"><Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>{t('training.selectEmployee')}</p></CardContent></Card>
        )}
      </div>

      <Dialog open={isAddRecordOpen} onOpenChange={(open) => { setIsAddRecordOpen(open); if (!open) { setEditingRecordId(null); setNewRecord({ courseId: '', startDate: '', endDate: '', result: 'pending', score: '', provider: '', location: '', hasCert: false, hasCr: false, plannedDate: '' }); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editingRecordId ? (ar ? 'تعديل سجل التدريب' : 'Edit Training Record') : t('training.records.add')}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>{t('training.courseName')}</Label>
              <Select value={newRecord.courseId} onValueChange={(v) => {
                const selectedCourse = courseOptions.find(c => c.id === v);
                let plannedDate = newRecord.plannedDate;
                if (newRecord.endDate && selectedCourse) {
                  const d = new Date(newRecord.endDate);
                  d.setFullYear(d.getFullYear() + selectedCourse.validityYears);
                  d.setMonth(d.getMonth() - 1);
                  plannedDate = d.toISOString().split('T')[0];
                }
                setNewRecord({ ...newRecord, courseId: v, plannedDate });
              }}>
                <SelectTrigger><SelectValue placeholder={ar ? '-- اختر الدورة --' : '-- Select Course --'} /></SelectTrigger>
                <SelectContent>
                  {courseOptions.map(c => (
                    <SelectItem key={c.id} value={c.id}>{ar ? c.nameAr : c.nameEn}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{ar ? 'الجهة المقدمة' : 'Provider'}</Label>
              <Select value={newRecord.provider} onValueChange={(v) => setNewRecord({ ...newRecord, provider: v })}>
                <SelectTrigger><SelectValue placeholder={ar ? '-- اختر الجهة --' : '-- Select Provider --'} /></SelectTrigger>
                <SelectContent>
                  {providerOptions.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{ar ? 'مكان الدورة' : 'Course Location'}</Label>
              <Select value={newRecord.location} onValueChange={(v) => {
                if (v === '__add_new__') return;
                setNewRecord({ ...newRecord, location: v });
              }}>
                <SelectTrigger><SelectValue placeholder={ar ? '-- اختر المكان --' : '-- Select Location --'} /></SelectTrigger>
                <SelectContent>
                  {locationOptions.map(l => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2 mt-2">
                <Input placeholder={ar ? 'أضف مكان جديد' : 'Add new location'} value={newLocation} onChange={(e) => setNewLocation(e.target.value)} className="text-sm" />
                <Button type="button" variant="outline" size="sm" onClick={() => {
                  if (newLocation.trim() && !locationOptions.includes(newLocation.trim())) {
                    setLocationOptions(prev => [...prev, newLocation.trim()]);
                    setNewRecord({ ...newRecord, location: newLocation.trim() });
                    setNewLocation('');
                  }
                }}><Plus className="h-3 w-3" /></Button>
              </div>
            </div>
            <div><Label>{t('training.startDate')}</Label><Input type="date" value={newRecord.startDate} onChange={(e) => setNewRecord({ ...newRecord, startDate: e.target.value })} /></div>
            <div><Label>{t('training.endDate')}</Label><Input type="date" value={newRecord.endDate} onChange={(e) => {
              const endDate = e.target.value;
              // Auto-calculate planned date
              const selectedCourse = courseOptions.find(c => c.id === newRecord.courseId);
              let plannedDate = '';
              if (endDate && selectedCourse) {
                const d = new Date(endDate);
                d.setFullYear(d.getFullYear() + selectedCourse.validityYears);
                d.setMonth(d.getMonth() - 1);
                plannedDate = d.toISOString().split('T')[0];
              }
              setNewRecord({ ...newRecord, endDate, plannedDate });
            }} /></div>
            <div>
              <Label>{t('training.result')}</Label>
              <Select value={newRecord.result} onValueChange={(v) => setNewRecord({ ...newRecord, result: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">{t('training.result.pending')}</SelectItem>
                  <SelectItem value="passed">{t('training.result.passed')}</SelectItem>
                  <SelectItem value="failed">{t('training.result.failed')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>{t('training.percentage')}</Label><Input type="number" value={newRecord.score} onChange={(e) => setNewRecord({ ...newRecord, score: e.target.value })} /></div>
            <div>
              <Label>{ar ? 'تاريخ التخطيط' : 'Planned Date'}</Label>
              <Input type="date" value={newRecord.plannedDate} readOnly className="bg-muted" />
              <p className="text-xs text-muted-foreground mt-1">{ar ? 'يُحسب تلقائياً: تاريخ الانتهاء + سنوات الصلاحية - شهر' : 'Auto-calculated: End Date + Validity Years - 1 Month'}</p>
            </div>
            <div className="col-span-2 flex gap-6 items-center pt-2">
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={newRecord.hasCert} onCheckedChange={(v) => setNewRecord({ ...newRecord, hasCert: !!v })} /><span>Cert</span></label>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={newRecord.hasCr} onCheckedChange={(v) => setNewRecord({ ...newRecord, hasCr: !!v })} /><span>CR</span></label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddRecordOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={editingRecordId ? handleUpdateRecord : handleAddRecord}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
