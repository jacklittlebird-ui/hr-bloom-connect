import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Clock, LogIn, LogOut, Calendar, Timer, User, MapPin, Building2, PenLine, Save, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEmployeeData } from '@/contexts/EmployeeDataContext';
import { supabase } from '@/integrations/supabase/client';
import { AttendanceRecord } from '@/pages/Attendance';
import { toast } from '@/hooks/use-toast';

interface CheckInOutProps {
  records: AttendanceRecord[];
  onCheckIn: (employeeId: string, employeeName: string, employeeNameAr: string, department: string) => void;
  onCheckOut: (recordId: string) => void;
  onRefresh?: () => Promise<void>;
}


export const CheckInOut = ({ records, onCheckIn, onCheckOut, onRefresh }: CheckInOutProps) => {
  const { t, isRTL, language } = useLanguage();
  const { employees: contextEmployees } = useEmployeeData();
  const [currentTime, setCurrentTime] = useState(new Date());
  const ar = language === 'ar';

  const employees = useMemo(() => contextEmployees.map(emp => ({
    id: emp.employeeId,
    name: emp.nameEn,
    nameAr: emp.nameAr,
    department: emp.department,
    departmentId: emp.departmentId || '',
    stationId: emp.stationId || '',
    location: 'HQ',
  })), [contextEmployees]);

  // Derive unique stations from employees
  const stations = useMemo(() => {
    const stationMap = new Map<string, { id: string; nameAr: string; nameEn: string }>();
    contextEmployees.forEach(emp => {
      if (emp.stationId && emp.stationName) {
        stationMap.set(emp.stationId, { id: emp.stationId, nameAr: emp.stationName, nameEn: emp.stationName });
      }
    });
    return Array.from(stationMap.values());
  }, [contextEmployees]);

  const getDepartmentsForStation = (stationFilter: string) => {
    const deptMap = new Map<string, { id: string; nameAr: string; nameEn: string }>();
    contextEmployees.forEach(emp => {
      if (emp.departmentId && emp.department) {
        if (stationFilter === 'all' || emp.stationId === stationFilter) {
          deptMap.set(emp.departmentId, { id: emp.departmentId, nameAr: emp.department, nameEn: emp.department });
        }
      }
    });
    return Array.from(deptMap.values());
  };
  
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-GB', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: false 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get today's attendance summary
  const todayStats = {
    totalCheckedIn: records.filter(r => r.date === today && r.checkIn).length,
    totalCheckedOut: records.filter(r => r.date === today && r.checkOut).length,
    totalLate: records.filter(r => r.date === today && r.status === 'late').length,
  };

  // Get recent check-ins/outs for display
  const recentActivity = records
    .filter(r => r.date === today)
    .sort((a, b) => {
      const timeA = a.checkOut || a.checkIn || '';
      const timeB = b.checkOut || b.checkIn || '';
      return timeB.localeCompare(timeA);
    })
    .slice(0, 5);

  // Selected employee for direct check-in/out
  const [selectedStation, setSelectedStation] = useState<string>('all');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');

  // Manual entry state
  const [manualMode, setManualMode] = useState(false);
  const [manualStation, setManualStation] = useState<string>('all');
  const [manualDept, setManualDept] = useState<string>('all');
  const [manualEmployee, setManualEmployee] = useState<string>('');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualCheckIn, setManualCheckIn] = useState('');
  const [manualCheckOut, setManualCheckOut] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [manualSaving, setManualSaving] = useState(false);

  const manualDepartments = useMemo(() => getDepartmentsForStation(manualStation), [contextEmployees, manualStation]);
  const manualFilteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      if (manualStation !== 'all' && emp.stationId !== manualStation) return false;
      if (manualDept !== 'all' && emp.departmentId !== manualDept) return false;
      return true;
    });
  }, [employees, manualStation, manualDept]);

  const handleManualSave = useCallback(async () => {
    if (!manualEmployee || !manualDate || !manualCheckIn) {
      toast({ title: ar ? 'يرجى تعبئة الحقول المطلوبة' : 'Please fill required fields', variant: 'destructive' });
      return;
    }
    setManualSaving(true);
    try {
      const ciTs = `${manualDate}T${manualCheckIn}:00`;
      const coTs = manualCheckOut ? `${manualDate}T${manualCheckOut}:00` : null;

      // Handle overnight: if checkout is before checkin, add a day
      let finalCoTs = coTs;
      if (coTs && manualCheckOut < manualCheckIn) {
        const nextDay = new Date(manualDate);
        nextDay.setDate(nextDay.getDate() + 1);
        finalCoTs = `${nextDay.toISOString().split('T')[0]}T${manualCheckOut}:00`;
      }

      const { error } = await supabase.from('attendance_records').insert({
        employee_id: manualEmployee,
        date: manualDate,
        check_in: ciTs,
        check_out: finalCoTs,
        status: 'present',
        notes: manualNotes || (ar ? 'تسجيل يدوي' : 'Manual entry'),
      });

      if (error) throw error;

      toast({ title: ar ? 'تم حفظ التسجيل اليدوي بنجاح' : 'Manual entry saved successfully' });
      setManualCheckIn('');
      setManualCheckOut('');
      setManualNotes('');
      setManualEmployee('');
      if (onRefresh) await onRefresh();
    } catch (e: any) {
      toast({ title: ar ? 'خطأ في الحفظ' : 'Save failed', description: e.message, variant: 'destructive' });
    } finally {
      setManualSaving(false);
    }
  }, [manualEmployee, manualDate, manualCheckIn, manualCheckOut, manualNotes, ar, onRefresh]);

  const mainDepartments = useMemo(() => getDepartmentsForStation(selectedStation), [contextEmployees, selectedStation]);
  
  const filteredEmployeesList = useMemo(() => {
    return employees.filter(emp => {
      if (selectedStation !== 'all' && emp.stationId !== selectedStation) return false;
      if (selectedDept !== 'all' && emp.departmentId !== selectedDept) return false;
      return true;
    });
  }, [employees, selectedStation, selectedDept]);

  const selectedEmpData = employees.find(e => e.id === selectedEmployee);
  const selectedEmpTodayRecord = records.find(r => r.date === today && r.employeeId === selectedEmployee);
  const isCheckedIn = selectedEmpTodayRecord?.checkIn && !selectedEmpTodayRecord?.checkOut;
  const isFullyDone = selectedEmpTodayRecord?.checkIn && selectedEmpTodayRecord?.checkOut;

  const handleDirectCheckIn = () => {
    if (!selectedEmployee || !selectedEmpData) return;
    onCheckIn(selectedEmpData.id, selectedEmpData.name, selectedEmpData.nameAr, selectedEmpData.department);
    toast({
      title: t('attendance.checkin.success'),
      description: `${language === 'ar' ? selectedEmpData.nameAr : selectedEmpData.name} - ${currentTime.toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}`,
    });
  };

  const handleDirectCheckOut = () => {
    if (!selectedEmployee || !selectedEmpTodayRecord) return;
    onCheckOut(selectedEmpTodayRecord.id);
    const emp = selectedEmpData;
    toast({
      title: t('attendance.checkout.success'),
      description: `${language === 'ar' ? emp?.nameAr : emp?.name}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Current Time Card */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-primary" />
              <span className="text-muted-foreground">{formatDate(currentTime)}</span>
            </div>
            <div className="text-6xl font-bold text-primary mb-6 font-mono">
              {formatTime(currentTime)}
            </div>
          </div>

          {/* Cascading Filters */}
          <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-4 mb-6", isRTL && "direction-rtl")}>
            {/* Station */}
            <div>
              <Label className="mb-2 block text-sm font-medium">
                <MapPin className="w-4 h-4 inline-block mr-1" />
                {language === 'ar' ? 'المحطة' : 'Station'}
              </Label>
              <Select value={selectedStation} onValueChange={(v) => { setSelectedStation(v); setSelectedDept('all'); setSelectedEmployee(''); }}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === 'ar' ? 'جميع المحطات' : 'All Stations'}</SelectItem>
                  {stations.map(s => <SelectItem key={s.id} value={s.id}>{s.nameAr}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {/* Department */}
            <div>
              <Label className="mb-2 block text-sm font-medium">
                <Building2 className="w-4 h-4 inline-block mr-1" />
                {language === 'ar' ? 'القسم' : 'Department'}
              </Label>
              <Select value={selectedDept} onValueChange={(v) => { setSelectedDept(v); setSelectedEmployee(''); }}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === 'ar' ? 'جميع الأقسام' : 'All Departments'}</SelectItem>
                  {mainDepartments.map(d => <SelectItem key={d.id} value={d.id}>{d.nameAr}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {/* Employee */}
            <div>
              <Label className="mb-2 block text-sm font-medium">
                <User className="w-4 h-4 inline-block mr-1" />
                {language === 'ar' ? 'الموظف' : 'Employee'}
              </Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={language === 'ar' ? 'اختر الموظف' : 'Select Employee'} />
                </SelectTrigger>
                <SelectContent>
                  {filteredEmployeesList.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      {language === 'ar' ? 'لا يوجد موظفين' : 'No employees'}
                    </div>
                  ) : (
                    filteredEmployeesList.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {language === 'ar' ? emp.nameAr : emp.name} ({emp.id})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Employee Status & Action Buttons */}
          {selectedEmployee && selectedEmpData && (
            <div className="p-4 rounded-xl border border-border/30 bg-background/50 mb-4">
              <div className={cn("flex items-center justify-between flex-wrap gap-4", isRTL && "flex-row-reverse")}>
                <div>
                  <p className="text-lg font-bold">{language === 'ar' ? selectedEmpData.nameAr : selectedEmpData.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedEmpData.department} • {selectedEmpData.id}</p>
                  {selectedEmpTodayRecord?.checkIn && (
                    <Badge variant="outline" className="mt-1 bg-success/10 text-success border-success">
                      <LogIn className="w-3 h-3 mr-1" />
                      {language === 'ar' ? 'تسجيل حضور' : 'Checked in'}: {selectedEmpTodayRecord.checkIn}
                    </Badge>
                  )}
                </div>
                <div className={cn("flex gap-3", isRTL && "flex-row-reverse")}>
                  {!selectedEmpTodayRecord?.checkIn && (
                    <Button size="lg" className="bg-success hover:bg-success/90 h-14 text-lg gap-2 shadow-lg" onClick={handleDirectCheckIn}>
                      <LogIn className="w-5 h-5" />
                      {t('attendance.checkin.button')}
                    </Button>
                  )}
                  {isCheckedIn && (
                    <Button size="lg" variant="destructive" className="h-14 text-lg gap-2 shadow-lg" onClick={handleDirectCheckOut}>
                      <LogOut className="w-5 h-5" />
                      {t('attendance.checkout.button')}
                    </Button>
                  )}
                  {isFullyDone && (
                    <Badge className="bg-muted text-muted-foreground text-sm px-4 py-2">
                      {language === 'ar' ? 'تم تسجيل الحضور والانصراف' : 'Fully checked in/out'}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          {!selectedEmployee && (
            <div className="text-center text-muted-foreground py-4">
              {language === 'ar' ? 'اختر المحطة والقسم ثم الموظف لتسجيل الحضور أو الانصراف' : 'Select station, department, then employee to check in/out'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today's Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl p-5 bg-stat-green-bg flex items-center gap-4 shadow-sm border border-border/30">
          <div className={cn("flex items-center gap-4 w-full", isRTL && "flex-row-reverse")}>
            <div className="p-3 rounded-xl bg-stat-green shrink-0">
              <LogIn className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('attendance.totalCheckedIn')}</p>
              <p className="text-3xl font-bold text-foreground">{todayStats.totalCheckedIn}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl p-5 bg-stat-blue-bg flex items-center gap-4 shadow-sm border border-border/30">
          <div className={cn("flex items-center gap-4 w-full", isRTL && "flex-row-reverse")}>
            <div className="p-3 rounded-xl bg-stat-blue shrink-0">
              <LogOut className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('attendance.totalCheckedOut')}</p>
              <p className="text-3xl font-bold text-foreground">{todayStats.totalCheckedOut}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl p-5 bg-stat-coral-bg flex items-center gap-4 shadow-sm border border-border/30">
          <div className={cn("flex items-center gap-4 w-full", isRTL && "flex-row-reverse")}>
            <div className="p-3 rounded-xl bg-stat-coral shrink-0">
              <Clock className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('attendance.totalLate')}</p>
              <p className="text-3xl font-bold text-foreground">{todayStats.totalLate}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
              <Timer className="w-5 h-5" />
              {t('attendance.recentActivity')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((record, index) => (
                <div 
                  key={`${record.id}-${index}`}
                  className={cn(
                    "flex items-center justify-between p-3 bg-muted/50 rounded-lg",
                    isRTL && "flex-row-reverse"
                  )}
                >
                  <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {language === 'ar' ? record.employeeNameAr : record.employeeName}
                      </p>
                      <p className="text-sm text-muted-foreground">{record.department}</p>
                    </div>
                  </div>
                  <div className={cn("flex items-center gap-4", isRTL && "flex-row-reverse")}>
                    {record.checkIn && (
                      <Badge variant="outline" className="bg-success/10 text-success border-success">
                        <LogIn className="w-3 h-3 mr-1" />
                        {record.checkIn}
                      </Badge>
                    )}
                    {record.checkOut && (
                      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive">
                        <LogOut className="w-3 h-3 mr-1" />
                        {record.checkOut}
                      </Badge>
                    )}
                    <Badge 
                      variant="outline" 
                      className={cn(
                        record.status === 'present' && "bg-success/10 text-success",
                        record.status === 'late' && "bg-warning/10 text-warning",
                        record.status === 'early-leave' && "bg-stat-coral/10 text-stat-coral",
                      )}
                    >
                      {t(`attendance.status.${record.status}`)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Entry Section */}
      <Card className="border-dashed border-2 border-primary/30">
        <CardHeader className="cursor-pointer" onClick={() => setManualMode(!manualMode)}>
          <CardTitle className={cn("flex items-center gap-2 text-base", isRTL && "flex-row-reverse")}>
            <PenLine className="w-5 h-5 text-primary" />
            {ar ? 'تسجيل حضور / انصراف يدوي (في حالة النسيان)' : 'Manual Check-in/out (Forgot to register)'}
            <Badge variant="outline" className="ms-auto">{manualMode ? (ar ? 'إغلاق' : 'Close') : (ar ? 'فتح' : 'Open')}</Badge>
          </CardTitle>
        </CardHeader>
        {manualMode && (
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-warning text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {ar ? 'هذا التسجيل اليدوي مخصص للحالات التي نسي فيها الموظف تسجيل الحضور أو الانصراف.' : 'This manual entry is for cases where the employee forgot to check in/out.'}
            </div>

            {/* Filters */}
            <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-4", isRTL && "direction-rtl")}>
              <div>
                <Label className="mb-1 block text-sm"><MapPin className="w-3.5 h-3.5 inline-block mr-1" />{ar ? 'المحطة' : 'Station'}</Label>
                <Select value={manualStation} onValueChange={v => { setManualStation(v); setManualDept('all'); setManualEmployee(''); }}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{ar ? 'جميع المحطات' : 'All Stations'}</SelectItem>
                    {stations.map(s => <SelectItem key={s.id} value={s.id}>{s.nameAr}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block text-sm"><Building2 className="w-3.5 h-3.5 inline-block mr-1" />{ar ? 'القسم' : 'Department'}</Label>
                <Select value={manualDept} onValueChange={v => { setManualDept(v); setManualEmployee(''); }}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{ar ? 'جميع الأقسام' : 'All Departments'}</SelectItem>
                    {manualDepartments.map(d => <SelectItem key={d.id} value={d.id}>{d.nameAr}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block text-sm"><User className="w-3.5 h-3.5 inline-block mr-1" />{ar ? 'الموظف' : 'Employee'}</Label>
                <Select value={manualEmployee} onValueChange={setManualEmployee}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={ar ? 'اختر الموظف' : 'Select Employee'} />
                  </SelectTrigger>
                  <SelectContent>
                    {manualFilteredEmployees.length === 0 ? (
                      <div className="p-3 text-center text-muted-foreground text-sm">{ar ? 'لا يوجد موظفين' : 'No employees'}</div>
                    ) : (
                      manualFilteredEmployees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {ar ? emp.nameAr : emp.name} ({emp.id})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date & Time */}
            <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-4", isRTL && "direction-rtl")}>
              <div>
                <Label className="mb-1 block text-sm"><Calendar className="w-3.5 h-3.5 inline-block mr-1" />{ar ? 'التاريخ' : 'Date'}</Label>
                <Input type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} max={new Date().toISOString().split('T')[0]} />
              </div>
              <div>
                <Label className="mb-1 block text-sm"><LogIn className="w-3.5 h-3.5 inline-block mr-1" />{ar ? 'وقت الحضور' : 'Check-in Time'}</Label>
                <Input type="time" value={manualCheckIn} onChange={e => setManualCheckIn(e.target.value)} />
              </div>
              <div>
                <Label className="mb-1 block text-sm"><LogOut className="w-3.5 h-3.5 inline-block mr-1" />{ar ? 'وقت الانصراف (اختياري)' : 'Check-out Time (optional)'}</Label>
                <Input type="time" value={manualCheckOut} onChange={e => setManualCheckOut(e.target.value)} />
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label className="mb-1 block text-sm">{ar ? 'ملاحظات' : 'Notes'}</Label>
              <Textarea value={manualNotes} onChange={e => setManualNotes(e.target.value)} placeholder={ar ? 'سبب التسجيل اليدوي...' : 'Reason for manual entry...'} rows={2} />
            </div>

            <Button onClick={handleManualSave} disabled={manualSaving || !manualEmployee || !manualCheckIn} className="gap-2 w-full md:w-auto">
              <Save className="w-4 h-4" />
              {manualSaving ? (ar ? 'جاري الحفظ...' : 'Saving...') : (ar ? 'حفظ التسجيل اليدوي' : 'Save Manual Entry')}
            </Button>
          </CardContent>
        )}
      </Card>

    </div>
  );
};
