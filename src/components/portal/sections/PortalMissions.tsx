import { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePortalData, PortalMissionType } from '@/contexts/PortalDataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { MapPin, Plus, CalendarIcon, Send } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { usePortalEmployee } from '@/hooks/usePortalEmployee';

const missionTypeLabels: Record<PortalMissionType, { ar: string; en: string; timeAr: string; timeEn: string }> = {
  morning: { ar: 'مأمورية صباحية', en: 'Morning Mission', timeAr: 'تسجيل تلقائي 09:00', timeEn: 'Auto check-in 09:00' },
  evening: { ar: 'مأمورية مسائية', en: 'Evening Mission', timeAr: 'تسجيل تلقائي 14:00', timeEn: 'Auto check-in 14:00' },
  full_day: { ar: 'مأمورية يوم كامل', en: 'Full Day Mission', timeAr: '09:00 إلى 17:00', timeEn: '09:00 to 17:00' },
};

export const PortalMissions = () => {
  const PORTAL_EMPLOYEE_ID = usePortalEmployee();
  const { language } = useLanguage();
  const ar = language === 'ar';
  const { getMissions, addMission, ensureMissions } = usePortalData();
  useEffect(() => { ensureMissions(); }, [ensureMissions]);
  const missions = useMemo(() => getMissions(PORTAL_EMPLOYEE_ID), [getMissions, PORTAL_EMPLOYEE_ID]);
  const [showForm, setShowForm] = useState(false);
  const [missionType, setMissionType] = useState<string>('');
  const [date, setDate] = useState<Date>();
  const [dest, setDest] = useState('');
  const [reason, setReason] = useState('');

  const statusCls: Record<string, string> = {
    approved: 'bg-success/10 text-success border-success',
    pending: 'bg-warning/10 text-warning border-warning',
    rejected: 'bg-destructive/10 text-destructive border-destructive',
  };

  const missionTypeCls: Record<string, string> = {
    morning: 'bg-blue-100 text-blue-700 border-blue-300',
    evening: 'bg-purple-100 text-purple-700 border-purple-300',
    full_day: 'bg-green-100 text-green-700 border-green-300',
  };

  const missionOptions = [
    { value: 'morning', labelAr: 'مأمورية صباحية (تسجيل تلقائي 09:00)', labelEn: 'Morning Mission (auto check-in 09:00)' },
    { value: 'evening', labelAr: 'مأمورية مسائية (تسجيل تلقائي 14:00)', labelEn: 'Evening Mission (auto check-in 14:00)' },
    { value: 'full_day', labelAr: 'مأمورية يوم كامل (09:00 إلى 17:00)', labelEn: 'Full Day Mission (09:00 to 17:00)' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!missionType || !date || !reason) {
      toast.error(ar ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }
    addMission({
      employeeId: PORTAL_EMPLOYEE_ID,
      missionType: missionType as PortalMissionType,
      date: format(date, 'yyyy-MM-dd'),
      destAr: dest,
      destEn: dest,
      reasonAr: reason,
      reasonEn: reason,
    });
    toast.success(ar ? 'تم تقديم طلب المأمورية بنجاح' : 'Mission request submitted');
    setShowForm(false);
    setMissionType('');
    setDate(undefined);
    setDest('');
    setReason('');
  };

  const resetForm = () => {
    setShowForm(false);
    setMissionType('');
    setDate(undefined);
    setDest('');
    setReason('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-xl md:text-2xl font-bold">{ar ? 'مأمورياتي' : 'My Missions'}</h1>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          <Plus className="w-4 h-4 me-1" />{ar ? 'طلب مأمورية' : 'New Mission'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              {ar ? 'طلب مأمورية جديدة' : 'New Mission Request'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    {ar ? 'نوع المأمورية' : 'Mission Type'} <span className="text-destructive">*</span>
                  </Label>
                  <Select value={missionType} onValueChange={setMissionType}>
                    <SelectTrigger>
                      <SelectValue placeholder={ar ? 'اختر نوع المأمورية' : 'Select mission type'} />
                    </SelectTrigger>
                    <SelectContent>
                      {missionOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {ar ? opt.labelAr : opt.labelEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{ar ? 'التاريخ' : 'Date'} <span className="text-destructive">*</span></Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start font-normal", !date && "text-muted-foreground")}>
                        <CalendarIcon className="me-2 h-4 w-4" />
                        {date ? format(date, 'yyyy/MM/dd') : (ar ? 'اختر التاريخ' : 'Pick a date')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-50" align="start">
                      <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>{ar ? 'الوجهة' : 'Destination'}</Label>
                  <Input value={dest} onChange={e => setDest(e.target.value)} placeholder={ar ? 'أدخل الوجهة' : 'Enter destination'} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{ar ? 'السبب' : 'Reason'} <span className="text-destructive">*</span></Label>
                <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder={ar ? 'أدخل سبب المأمورية' : 'Enter mission reason'} rows={4} />
              </div>

              <div className="flex gap-3 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>
                  {ar ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button type="submit">
                  <Send className="w-4 h-4 me-1" />
                  {ar ? 'تقديم الطلب' : 'Submit Request'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />{ar ? 'سجل المأموريات' : 'Mission Records'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{ar ? 'النوع' : 'Type'}</TableHead>
                <TableHead>{ar ? 'التاريخ' : 'Date'}</TableHead>
                <TableHead>{ar ? 'الوجهة' : 'Destination'}</TableHead>
                <TableHead>{ar ? 'السبب' : 'Reason'}</TableHead>
                <TableHead>{ar ? 'الحالة' : 'Status'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {missions.map(m => (
                <TableRow key={m.id}>
                  <TableCell>
                    <Badge variant="outline" className={missionTypeCls[m.missionType]}>
                      {ar ? missionTypeLabels[m.missionType].ar : missionTypeLabels[m.missionType].en}
                    </Badge>
                  </TableCell>
                  <TableCell>{m.date}</TableCell>
                  <TableCell>{ar ? m.destAr : m.destEn}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{ar ? m.reasonAr : m.reasonEn}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusCls[m.status]}>
                      {m.status === 'approved' ? (ar ? 'مقبول' : 'Approved') : m.status === 'pending' ? (ar ? 'معلق' : 'Pending') : (ar ? 'مرفوض' : 'Rejected')}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {missions.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-4">{ar ? 'لا توجد مأموريات' : 'No missions'}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};