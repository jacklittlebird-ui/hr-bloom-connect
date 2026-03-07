import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Send, FileText, ShieldCheck, Briefcase, PlusCircle, X } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { EmployeeSelector } from './EmployeeSelector';
import { useEmployeeData } from '@/contexts/EmployeeDataContext';

interface NewRequestFormProps {
  onSubmitLeave: (data: any) => void;
  onSubmitPermission: (data: any) => void;
  onSubmitMission: (data: any) => void;
  onSubmitOvertime: (data: any) => void;
}

export const NewRequestForm = ({ onSubmitLeave, onSubmitPermission, onSubmitMission, onSubmitOvertime }: NewRequestFormProps) => {
  const { t, isRTL } = useLanguage();
  const [requestType, setRequestType] = useState('leave');

  return (
    <Card>
      <CardHeader>
        <CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
          <Send className="w-5 h-5 text-primary" />
          {t('leaves.newRequest.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={requestType} onValueChange={setRequestType}>
          <TabsList className={cn("grid w-full grid-cols-4 mb-6")} dir="rtl">
            <TabsTrigger value="leave" className="flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">{t('leaves.newRequest.leaveTab')}</span>
            </TabsTrigger>
            <TabsTrigger value="permission" className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span className="hidden sm:inline">{t('leaves.newRequest.permissionTab')}</span>
            </TabsTrigger>
            <TabsTrigger value="mission" className="flex items-center gap-1.5">
              <Briefcase className="w-4 h-4" />
              <span className="hidden sm:inline">{t('leaves.newRequest.missionTab')}</span>
            </TabsTrigger>
            <TabsTrigger value="overtime" className="flex items-center gap-1.5">
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">{t('leaves.newRequest.overtimeTab')}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="leave">
            <LeaveForm onSubmit={onSubmitLeave} />
          </TabsContent>
          <TabsContent value="permission">
            <PermissionForm onSubmit={onSubmitPermission} />
          </TabsContent>
          <TabsContent value="mission">
            <MissionForm onSubmit={onSubmitMission} />
          </TabsContent>
          <TabsContent value="overtime">
            <OvertimeForm onSubmit={onSubmitOvertime} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

// ==================== Leave Form ====================
const LeaveForm = ({ onSubmit }: { onSubmit: (data: any) => void }) => {
  const { t, isRTL } = useLanguage();
  const { employees: allEmployees } = useEmployeeData();
  const [employeeId, setEmployeeId] = useState('');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [leaveType, setLeaveType] = useState('');
  const [reason, setReason] = useState('');
  const [status] = useState('pending');

  const calculateDays = () => (startDate && endDate ? differenceInDays(endDate, startDate) + 1 : 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !startDate || !endDate || !leaveType || !reason) {
      toast({ title: t('leaves.form.error'), description: t('leaves.form.fillAllFields'), variant: 'destructive' });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Annual leave: must be future date
    if (leaveType === 'annual' && startDate < tomorrow) {
      toast({ title: t('leaves.form.error'), description: isRTL ? 'الإجازة السنوية لا يمكن طلبها في نفس اليوم أو قبله' : 'Annual leave must start from tomorrow or later', variant: 'destructive' });
      return;
    }

    // Sick leave warning
    if (leaveType === 'sick') {
      toast({ title: isRTL ? 'تنبيه' : 'Warning', description: isRTL ? 'بدون إرسال تقرير طبي معتمد من التأمين الصحي فلن تُقبل الإجازة المرضية' : 'Sick leave will not be accepted without an approved medical report from health insurance' });
    }

    const emp = allEmployees.find((e: any) => e.employeeId === employeeId);
    onSubmit({
      employeeId,
      employeeName: emp?.nameEn || '',
      employeeNameAr: emp?.nameAr || '',
      department: emp?.department || '',
      leaveType,
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      days: calculateDays(),
      reason,
    });
    toast({ title: t('leaves.form.success'), description: t('leaves.form.requestSubmitted') });
    setEmployeeId(''); setStartDate(undefined); setEndDate(undefined); setLeaveType(''); setReason('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <EmployeeSelector value={employeeId} onChange={setEmployeeId} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>{t('leaves.form.leaveType')} <span className="text-destructive">*</span></Label>
          <Select value={leaveType} onValueChange={setLeaveType}>
            <SelectTrigger><SelectValue placeholder={t('leaves.form.selectType')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="annual">{t('leaves.types.annual')}</SelectItem>
              <SelectItem value="sick">{t('leaves.types.sick')}</SelectItem>
              <SelectItem value="casual">{t('leaves.types.casual')}</SelectItem>
              <SelectItem value="unpaid">{t('leaves.types.unpaid')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t('leaves.form.totalDays')}</Label>
          <Input value={calculateDays()} readOnly className="bg-muted" />
        </div>
        <DatePickerField label={t('leaves.form.startDate')} date={startDate} onSelect={setStartDate} />
        <DatePickerField label={t('leaves.form.endDate')} date={endDate} onSelect={setEndDate} disableBefore={startDate} />
      </div>
      <div className="space-y-2">
        <Label>{t('leaves.form.reason')} <span className="text-destructive">*</span></Label>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('leaves.form.reasonPlaceholder')} rows={4} />
      </div>
      <FormActions isRTL={isRTL} submitLabel={t('leaves.newRequest.saveRequest')} />
    </form>
  );
};

// ==================== Permission Form ====================
const PermissionForm = ({ onSubmit }: { onSubmit: (data: any) => void }) => {
  const { t, isRTL } = useLanguage();
  const { employees: allEmployees } = useEmployeeData();
  const [employeeId, setEmployeeId] = useState('');
  const [permissionType, setPermissionType] = useState('');
  const [date, setDate] = useState<Date>();
  const [fromTime, setFromTime] = useState('');
  const [toTime, setToTime] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !permissionType || !date || !fromTime || !toTime || !reason) {
      toast({ title: t('leaves.form.error'), description: t('leaves.form.fillAllFields'), variant: 'destructive' });
      return;
    }
    const emp = allEmployees.find((e: any) => e.employeeId === employeeId);
    const [fH, fM] = fromTime.split(':').map(Number);
    const [tH, tM] = toTime.split(':').map(Number);
    const durationHours = Math.max(0, (tH * 60 + tM - fH * 60 - fM) / 60);
    if (durationHours > 2) {
      toast({ title: t('leaves.form.error'), description: isRTL ? 'الحد الأقصى للإذن ساعتان' : 'Maximum permission duration is 2 hours', variant: 'destructive' });
      return;
    }
    if (durationHours < 0.5) {
      toast({ title: t('leaves.form.error'), description: isRTL ? 'الحد الأدنى للإذن نصف ساعة' : 'Minimum permission duration is 30 minutes', variant: 'destructive' });
      return;
    }
    onSubmit({
      employeeId,
      employeeName: emp?.nameEn || '',
      employeeNameAr: emp?.nameAr || '',
      department: emp?.department || '',
      permissionType,
      date: format(date, 'yyyy-MM-dd'),
      fromTime,
      toTime,
      durationHours: Math.round(durationHours * 10) / 10,
      reason,
    });
    toast({ title: t('leaves.form.success'), description: t('leaves.permissions.requestSubmitted') });
    setEmployeeId(''); setPermissionType(''); setDate(undefined); setFromTime(''); setToTime(''); setReason('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <EmployeeSelector value={employeeId} onChange={setEmployeeId} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>{t('leaves.permissions.type')} <span className="text-destructive">*</span></Label>
          <Select value={permissionType} onValueChange={setPermissionType}>
            <SelectTrigger><SelectValue placeholder={t('leaves.permissions.selectType')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="early_leave">{t('leaves.permTypes.early_leave')}</SelectItem>
              <SelectItem value="late_arrival">{t('leaves.permTypes.late_arrival')}</SelectItem>
              <SelectItem value="personal">{t('leaves.permTypes.personal')}</SelectItem>
              <SelectItem value="medical">{t('leaves.permTypes.medical')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DatePickerField label={t('leaves.permissions.date')} date={date} onSelect={setDate} />
        <div className="space-y-2">
          <Label>{t('leaves.permissions.fromTime')} <span className="text-destructive">*</span></Label>
          <Input type="time" value={fromTime} onChange={(e) => setFromTime(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{t('leaves.permissions.toTime')} <span className="text-destructive">*</span></Label>
          <Input type="time" value={toTime} onChange={(e) => setToTime(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>{t('leaves.form.reason')} <span className="text-destructive">*</span></Label>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('leaves.permissions.reasonPlaceholder')} rows={4} />
      </div>
      <FormActions isRTL={isRTL} submitLabel={t('leaves.newRequest.saveRequest')} />
    </form>
  );
};

// ==================== Mission Form ====================
const MissionForm = ({ onSubmit }: { onSubmit: (data: any) => void }) => {
  const { t, isRTL, language } = useLanguage();
  const { employees: allEmployees } = useEmployeeData();
  const ar = language === 'ar';
  const [employeeId, setEmployeeId] = useState('');
  const [missionType, setMissionType] = useState('');
  const [date, setDate] = useState<Date>();
  const [destination, setDestination] = useState('');
  const [reason, setReason] = useState('');

  const missionOptions = [
    { value: 'morning', labelAr: 'مأمورية صباحية (تسجيل تلقائي 09:00)', labelEn: 'Morning Mission (auto check-in 09:00)' },
    { value: 'evening', labelAr: 'مأمورية مسائية (تسجيل تلقائي 17:00)', labelEn: 'Evening Mission (auto check-in 14:00)' },
    { value: 'full_day', labelAr: 'مأمورية يوم كامل (09:00 إلى 17:00)', labelEn: 'Full Day Mission (09:00 to 17:00)' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !missionType || !date || !reason) {
      toast({ title: t('leaves.form.error'), description: t('leaves.form.fillAllFields'), variant: 'destructive' });
      return;
    }
    const emp = allEmployees.find((e: any) => e.employeeId === employeeId);
    onSubmit({
      employeeId,
      employeeName: emp?.nameEn || '',
      employeeNameAr: emp?.nameAr || '',
      department: emp?.department || '',
      missionType,
      date: format(date, 'yyyy-MM-dd'),
      destination,
      reason,
    });
    toast({ title: t('leaves.form.success'), description: t('leaves.missions.requestSubmitted') });
    setEmployeeId(''); setMissionType(''); setDate(undefined); setDestination(''); setReason('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <EmployeeSelector value={employeeId} onChange={setEmployeeId} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
            {t('leaves.missions.type')} <span className="text-destructive">*</span>
          </Label>
          <Select value={missionType} onValueChange={setMissionType}>
            <SelectTrigger><SelectValue placeholder={ar ? 'اختر نوع المأمورية' : 'Select mission type'} /></SelectTrigger>
            <SelectContent>
              {missionOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{ar ? opt.labelAr : opt.labelEn}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DatePickerField label={t('leaves.missions.date')} date={date} onSelect={setDate} />
        <div className="space-y-2 md:col-span-2">
          <Label>{t('leaves.missions.destination')}</Label>
          <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder={t('leaves.missions.destinationPlaceholder')} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>{t('leaves.missions.reason')} <span className="text-destructive">*</span></Label>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('leaves.missions.reasonPlaceholder')} rows={4} />
      </div>
      <FormActions isRTL={isRTL} submitLabel={t('leaves.newRequest.saveRequest')} />
    </form>
  );
};

// ==================== Overtime Form ====================
const OvertimeForm = ({ onSubmit }: { onSubmit: (data: any) => void }) => {
  const { t, isRTL } = useLanguage();
  const { employees: allEmployees } = useEmployeeData();
  const [employeeId, setEmployeeId] = useState('');
  const [overtimeType, setOvertimeType] = useState('');
  const [date, setDate] = useState<Date>();
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !overtimeType || !date || !reason) {
      toast({ title: t('leaves.form.error'), description: t('leaves.form.fillAllFields'), variant: 'destructive' });
      return;
    }
    const emp = allEmployees.find((e: any) => e.employeeId === employeeId);
    onSubmit({
      employeeId,
      employeeName: emp?.nameEn || '',
      employeeNameAr: emp?.nameAr || '',
      department: emp?.department || '',
      date: format(date, 'yyyy-MM-dd'),
      hours: 0,
      overtimeType,
      reason,
    });
    toast({ title: t('leaves.form.success'), description: t('leaves.overtime.requestSubmitted') });
    setEmployeeId(''); setOvertimeType(''); setDate(undefined); setReason('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <EmployeeSelector value={employeeId} onChange={setEmployeeId} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>{t('leaves.overtime.type')} <span className="text-destructive">*</span></Label>
          <Select value={overtimeType} onValueChange={setOvertimeType}>
            <SelectTrigger><SelectValue placeholder={t('leaves.overtime.selectType')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="regular">{t('leaves.overtimeTypes.regular')}</SelectItem>
              <SelectItem value="holiday">{t('leaves.overtimeTypes.holiday')}</SelectItem>
              <SelectItem value="weekend">{t('leaves.overtimeTypes.weekend')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DatePickerField label={t('leaves.overtime.date')} date={date} onSelect={setDate} />
      </div>
      <div className="space-y-2">
        <Label>{t('leaves.overtime.reason')} <span className="text-destructive">*</span></Label>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('leaves.overtime.reasonPlaceholder')} rows={4} />
      </div>
      <FormActions isRTL={isRTL} submitLabel={t('leaves.newRequest.saveRequest')} />
    </form>
  );
};

// ==================== Shared Components ====================
const DatePickerField = ({ label, date, onSelect, disableBefore }: { label: string; date?: Date; onSelect: (d: Date | undefined) => void; disableBefore?: Date }) => {
  const { t } = useLanguage();
  return (
    <div className="space-y-2">
      <Label>{label} <span className="text-destructive">*</span></Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, 'yyyy/MM/dd') : t('leaves.form.pickDate')}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-50" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={onSelect}
            disabled={disableBefore ? (d) => d < disableBefore : undefined}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

const FormActions = ({ isRTL, submitLabel }: { isRTL: boolean; submitLabel: string }) => {
  const { t } = useLanguage();
  return (
    <div className={cn("flex gap-3 pt-4", isRTL ? "justify-start" : "justify-end")}>
      <Button type="button" variant="outline" className="flex items-center gap-2">
        <X className="w-4 h-4" />
        {t('employees.cancel')}
      </Button>
      <Button type="submit" className="min-w-[200px] bg-gradient-to-r from-primary to-primary/80">
        <Send className={cn("w-4 h-4", isRTL ? "ml-2" : "mr-2")} />
        {submitLabel}
      </Button>
    </div>
  );
};
