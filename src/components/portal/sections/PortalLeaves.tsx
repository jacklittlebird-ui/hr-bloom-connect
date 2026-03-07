import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePortalData } from '@/contexts/PortalDataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Calendar, Plus, Clock, CalendarIcon, Palmtree, HeartPulse, Umbrella } from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePortalEmployee } from '@/hooks/usePortalEmployee';

export const PortalLeaves = () => {
  const PORTAL_EMPLOYEE_ID = usePortalEmployee();
  const { language } = useLanguage();
  const ar = language === 'ar';
  const { getLeaveBalances, getLeaveRequests, addLeaveRequest, getPermissions, addPermission } = usePortalData();
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showPermDialog, setShowPermDialog] = useState(false);

  // Leave form state
  const [leaveType, setLeaveType] = useState('');
  const [leaveStartDate, setLeaveStartDate] = useState<Date>();
  const [leaveEndDate, setLeaveEndDate] = useState<Date>();
  const [leaveReason, setLeaveReason] = useState('');

  // Permission form state
  const [permType, setPermType] = useState('');
  const [permDate, setPermDate] = useState<Date>();
  const [permFrom, setPermFrom] = useState('');
  const [permTo, setPermTo] = useState('');
  const [permReason, setPermReason] = useState('');

  const balances = useMemo(() => getLeaveBalances(PORTAL_EMPLOYEE_ID), [getLeaveBalances]);
  const requests = useMemo(() => getLeaveRequests(PORTAL_EMPLOYEE_ID), [getLeaveRequests]);
  const permissions = useMemo(() => getPermissions(PORTAL_EMPLOYEE_ID), [getPermissions]);

  const statusCls: Record<string, string> = {
    approved: 'bg-success/10 text-success border-success',
    pending: 'bg-warning/10 text-warning border-warning',
    rejected: 'bg-destructive/10 text-destructive border-destructive',
  };
  const statusLabel: Record<string, { ar: string; en: string }> = {
    approved: { ar: 'مقبول', en: 'Approved' },
    pending: { ar: 'معلق', en: 'Pending' },
    rejected: { ar: 'مرفوض', en: 'Rejected' },
  };

  const leaveTypes = [
    { value: 'annual', ar: 'سنوية', en: 'Annual' },
    { value: 'sick', ar: 'مرضية', en: 'Sick' },
    { value: 'casual', ar: 'عارضة', en: 'Casual' },
    { value: 'unpaid', ar: 'بدون راتب', en: 'Unpaid' },
  ];

  // Check balances for availability
  const annualBalance = balances.find(b => b.typeEn === 'Annual');
  const casualBalance = balances.find(b => b.typeEn === 'Casual');
  const hasAnnualBalance = (annualBalance?.remaining ?? 0) > 0;
  const hasCasualBalance = (casualBalance?.remaining ?? 0) > 0;

  // Filter available leave types based on balance
  const availableLeaveTypes = useMemo(() => {
    if (!hasAnnualBalance && !hasCasualBalance) {
      return leaveTypes.filter(t => t.value === 'unpaid');
    }
    return leaveTypes.filter(t => {
      if (t.value === 'annual') return hasAnnualBalance;
      if (t.value === 'casual') return hasCasualBalance;
      return true;
    });
  }, [hasAnnualBalance, hasCasualBalance]);

  const permTypes = [
    { value: 'early_leave', ar: 'انصراف مبكر', en: 'Early Leave' },
    { value: 'late_arrival', ar: 'تأخر صباحي', en: 'Late Arrival' },
    { value: 'personal', ar: 'شخصي', en: 'Personal' },
    { value: 'medical', ar: 'طبي', en: 'Medical' },
  ];

  const calculateDays = () => (leaveStartDate && leaveEndDate ? differenceInDays(leaveEndDate, leaveStartDate) + 1 : 0);

  const handleSubmitLeave = () => {
    if (!leaveType || !leaveStartDate || !leaveEndDate || !leaveReason) {
      toast.error(ar ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Annual leave: must be future date (not today or before)
    if (leaveType === 'annual' && leaveStartDate < tomorrow) {
      toast.error(ar ? 'الإجازة السنوية لا يمكن طلبها في نفس اليوم أو قبله، يجب أن تبدأ من الغد على الأقل' : 'Annual leave must start from tomorrow or later');
      return;
    }

    // Sick leave: show warning about medical report
    if (leaveType === 'sick') {
      toast.warning(
        ar ? 'تنبيه: بدون إرسال تقرير طبي معتمد من التأمين الصحي فلن تُقبل الإجازة المرضية' 
           : 'Warning: Sick leave will not be accepted without an approved medical report from health insurance',
        { duration: 8000 }
      );
    }

    const t = leaveTypes.find(l => l.value === leaveType);
    const days = calculateDays();
    addLeaveRequest({
      employeeId: PORTAL_EMPLOYEE_ID,
      typeAr: t?.ar || '',
      typeEn: t?.en || '',
      from: format(leaveStartDate, 'yyyy-MM-dd'),
      to: format(leaveEndDate, 'yyyy-MM-dd'),
      days,
    });
    toast.success(ar ? 'تم تقديم طلب الإجازة بنجاح' : 'Leave request submitted');
    setShowLeaveDialog(false);
    setLeaveType(''); setLeaveStartDate(undefined); setLeaveEndDate(undefined); setLeaveReason('');
  };

  const handleSubmitPerm = async () => {
    if (!permType || !permDate || !permFrom || !permTo || !permReason) {
      toast.error(ar ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }
    const [fH, fM] = permFrom.split(':').map(Number);
    const [tH, tM] = permTo.split(':').map(Number);
    const durationHours = Math.max(0, (tH * 60 + tM - fH * 60 - fM) / 60);
    if (durationHours > 2) {
      toast.error(ar ? 'الحد الأقصى للإذن ساعتان' : 'Maximum permission duration is 2 hours');
      return;
    }
    if (durationHours < 0.5) {
      toast.error(ar ? 'الحد الأدنى للإذن نصف ساعة' : 'Minimum permission duration is 30 minutes');
      return;
    }
    const t = permTypes.find(p => p.value === permType);
    try {
      await addPermission({
        employeeId: PORTAL_EMPLOYEE_ID,
        typeAr: t?.ar || '',
        typeEn: t?.en || '',
        date: format(permDate, 'yyyy-MM-dd'),
        fromTime: permFrom,
        toTime: permTo,
        reason: permReason,
      });
      toast.success(ar ? 'تم تقديم طلب الإذن بنجاح' : 'Permission request submitted');
      setShowPermDialog(false);
      setPermType(''); setPermDate(undefined); setPermFrom(''); setPermTo(''); setPermReason('');
    } catch (err: any) {
      if (err.message === 'LEAVE_CONFLICT') {
        toast.error(ar ? 'لا يمكن طلب إذن في يوم به إجازة مسجلة بالفعل' : 'Cannot request permission on a day with an existing leave request');
      } else {
        toast.error(ar ? 'حدث خطأ أثناء تقديم الطلب' : 'Error submitting request');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-xl md:text-2xl font-bold">{ar ? 'الإجازات والأذونات' : 'Leaves & Permissions'}</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button onClick={() => setShowPermDialog(true)} variant="outline" size="sm" className="flex-1 sm:flex-none text-xs sm:text-sm"><Clock className="w-4 h-4 me-1" />{ar ? 'طلب إذن' : 'Permission'}</Button>
          <Button onClick={() => setShowLeaveDialog(true)} size="sm" className="flex-1 sm:flex-none text-xs sm:text-sm"><Plus className="w-4 h-4 me-1" />{ar ? 'طلب إجازة' : 'Leave'}</Button>
        </div>
      </div>

      {/* Balances */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {balances.map((b, i) => {
          const colorSets = [
            { gradient: 'from-blue-500 to-cyan-500', bg: 'bg-blue-50 dark:bg-blue-950/40', icon: Palmtree },
            { gradient: 'from-red-500 to-rose-500', bg: 'bg-red-50 dark:bg-red-950/40', icon: HeartPulse },
            { gradient: 'from-amber-500 to-orange-500', bg: 'bg-amber-50 dark:bg-amber-950/40', icon: Umbrella },
            { gradient: 'from-emerald-500 to-green-500', bg: 'bg-emerald-50 dark:bg-emerald-950/40', icon: Calendar },
            { gradient: 'from-violet-500 to-purple-500', bg: 'bg-violet-50 dark:bg-violet-950/40', icon: Clock },
            { gradient: 'from-pink-500 to-rose-500', bg: 'bg-pink-50 dark:bg-pink-950/40', icon: Calendar },
          ];
          const cs = colorSets[i % colorSets.length];
          const IconComp = cs.icon;
          return (
            <Card key={i} className={cn("border-0 shadow-sm", cs.bg)}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br", cs.gradient)}>
                    <IconComp className="w-5 h-5 text-white" />
                  </div>
                  <p className="font-semibold text-lg">{ar ? b.typeAr : b.typeEn}</p>
                </div>
                <div className="flex justify-between mt-3 text-sm">
                  <span className="text-muted-foreground">{ar ? 'الإجمالي' : 'Total'}: <strong>{b.total}</strong></span>
                  <span className="text-destructive">{ar ? 'مستخدم' : 'Used'}: <strong>{b.used}</strong></span>
                  <span className="text-success">{ar ? 'متبقي' : 'Left'}: <strong>{b.remaining}</strong></span>
                </div>
                <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full" style={{ width: `${(b.used / b.total) * 100}%` }} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tables */}
      <Tabs defaultValue="leaves" dir="rtl">
        <TabsList>
          <TabsTrigger value="leaves">{ar ? 'الإجازات' : 'Leaves'}</TabsTrigger>
          <TabsTrigger value="permissions">{ar ? 'الأذونات' : 'Permissions'}</TabsTrigger>
        </TabsList>

        <TabsContent value="leaves">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5" />{ar ? 'طلبات الإجازات' : 'Leave Requests'}</CardTitle></CardHeader>
            <CardContent>
             <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>{ar ? 'النوع' : 'Type'}</TableHead>
                  <TableHead>{ar ? 'من' : 'From'}</TableHead>
                  <TableHead>{ar ? 'إلى' : 'To'}</TableHead>
                  <TableHead>{ar ? 'الأيام' : 'Days'}</TableHead>
                  <TableHead>{ar ? 'الحالة' : 'Status'}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {requests.map(r => (
                    <TableRow key={r.id}>
                      <TableCell>{ar ? r.typeAr : r.typeEn}</TableCell>
                      <TableCell>{r.from}</TableCell>
                      <TableCell>{r.to}</TableCell>
                      <TableCell>{r.days}</TableCell>
                      <TableCell><Badge variant="outline" className={statusCls[r.status]}>{ar ? statusLabel[r.status].ar : statusLabel[r.status].en}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {requests.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-4">{ar ? 'لا توجد طلبات' : 'No requests'}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
             </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5" />{ar ? 'طلبات الأذونات' : 'Permission Requests'}</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>{ar ? 'النوع' : 'Type'}</TableHead>
                  <TableHead>{ar ? 'التاريخ' : 'Date'}</TableHead>
                  <TableHead>{ar ? 'من' : 'From'}</TableHead>
                  <TableHead>{ar ? 'إلى' : 'To'}</TableHead>
                  <TableHead>{ar ? 'الحالة' : 'Status'}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {permissions.map(p => (
                    <TableRow key={p.id}>
                      <TableCell>{ar ? p.typeAr : p.typeEn}</TableCell>
                      <TableCell>{p.date}</TableCell>
                      <TableCell>{p.fromTime}</TableCell>
                      <TableCell>{p.toTime}</TableCell>
                      <TableCell><Badge variant="outline" className={statusCls[p.status]}>{ar ? statusLabel[p.status].ar : statusLabel[p.status].en}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {permissions.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-4">{ar ? 'لا توجد أذونات' : 'No permissions'}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Leave Dialog */}
      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>{ar ? 'طلب إجازة جديدة' : 'New Leave Request'}</DialogTitle></DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{ar ? 'نوع الإجازة' : 'Leave Type'} <span className="text-destructive">*</span></Label>
                <Select value={leaveType} onValueChange={setLeaveType}>
                  <SelectTrigger><SelectValue placeholder={ar ? 'اختر النوع' : 'Select type'} /></SelectTrigger>
                  <SelectContent>
                    {availableLeaveTypes.map(t => <SelectItem key={t.value} value={t.value}>{ar ? t.ar : t.en}</SelectItem>)}
                    {!hasAnnualBalance && !hasCasualBalance && (
                      <div className="px-3 py-2 text-xs text-destructive">{ar ? 'لا يوجد رصيد سنوي أو عارض - متاح فقط إجازة بدون راتب' : 'No annual or casual balance - only unpaid leave available'}</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{ar ? 'إجمالي الأيام' : 'Total Days'}</Label>
                <Input value={calculateDays()} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>{ar ? 'تاريخ البداية' : 'Start Date'} <span className="text-destructive">*</span></Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start font-normal", !leaveStartDate && "text-muted-foreground")}>
                      <CalendarIcon className="me-2 h-4 w-4" />
                      {leaveStartDate ? format(leaveStartDate, 'yyyy/MM/dd') : (ar ? 'اختر التاريخ' : 'Pick a date')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-50" align="start">
                    <CalendarComponent mode="single" selected={leaveStartDate} onSelect={setLeaveStartDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>{ar ? 'تاريخ النهاية' : 'End Date'} <span className="text-destructive">*</span></Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start font-normal", !leaveEndDate && "text-muted-foreground")}>
                      <CalendarIcon className="me-2 h-4 w-4" />
                      {leaveEndDate ? format(leaveEndDate, 'yyyy/MM/dd') : (ar ? 'اختر التاريخ' : 'Pick a date')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-50" align="start">
                    <CalendarComponent mode="single" selected={leaveEndDate} onSelect={setLeaveEndDate} disabled={leaveStartDate ? (d) => d < leaveStartDate : undefined} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{ar ? 'السبب' : 'Reason'} <span className="text-destructive">*</span></Label>
              <Textarea value={leaveReason} onChange={e => setLeaveReason(e.target.value)} placeholder={ar ? 'أدخل سبب الإجازة' : 'Enter leave reason'} rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLeaveDialog(false)}>{ar ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleSubmitLeave}>{ar ? 'تقديم الطلب' : 'Submit'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permission Dialog */}
      <Dialog open={showPermDialog} onOpenChange={setShowPermDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>{ar ? 'طلب إذن جديد' : 'New Permission Request'}</DialogTitle></DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{ar ? 'نوع الإذن' : 'Permission Type'} <span className="text-destructive">*</span></Label>
                <Select value={permType} onValueChange={setPermType}>
                  <SelectTrigger><SelectValue placeholder={ar ? 'اختر النوع' : 'Select type'} /></SelectTrigger>
                  <SelectContent>
                    {permTypes.map(t => <SelectItem key={t.value} value={t.value}>{ar ? t.ar : t.en}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{ar ? 'التاريخ' : 'Date'} <span className="text-destructive">*</span></Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start font-normal", !permDate && "text-muted-foreground")}>
                      <CalendarIcon className="me-2 h-4 w-4" />
                      {permDate ? format(permDate, 'yyyy/MM/dd') : (ar ? 'اختر التاريخ' : 'Pick a date')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-50" align="start">
                    <CalendarComponent mode="single" selected={permDate} onSelect={setPermDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>{ar ? 'من الساعة' : 'From Time'} <span className="text-destructive">*</span></Label>
                <Input type="time" value={permFrom} onChange={e => setPermFrom(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{ar ? 'إلى الساعة' : 'To Time'} <span className="text-destructive">*</span></Label>
                <Input type="time" value={permTo} onChange={e => setPermTo(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{ar ? 'السبب' : 'Reason'} <span className="text-destructive">*</span></Label>
              <Textarea value={permReason} onChange={e => setPermReason(e.target.value)} placeholder={ar ? 'أدخل سبب الإذن' : 'Enter permission reason'} rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPermDialog(false)}>{ar ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleSubmitPerm}>{ar ? 'تقديم الطلب' : 'Submit'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};