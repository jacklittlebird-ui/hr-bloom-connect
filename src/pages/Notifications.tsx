import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { useEmployeeData } from '@/contexts/EmployeeDataContext';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import {
  Send, Bell, Users, Building2, MapPin, Megaphone, CheckCircle, AlertCircle,
  Info, AlertTriangle, Trash2, Check, Search, Loader2, RefreshCw
} from 'lucide-react';

const typeIcons: Record<string, any> = { success: CheckCircle, warning: AlertTriangle, info: Info, error: AlertCircle };
const typeColors: Record<string, string> = { success: 'text-green-500', warning: 'text-yellow-500', info: 'text-blue-500', error: 'text-red-500' };

const NotificationsPage = () => {
  const { language, isRTL } = useLanguage();
  const { session } = useAuth();
  const { notifications, markAsRead, markAllAsRead, clearAll, refreshNotifications } = useNotifications();
  const { employees } = useEmployeeData();
  const ar = language === 'ar';

  // Compose form state
  const [targetType, setTargetType] = useState<string>('broadcast');
  const [titleAr, setTitleAr] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [descAr, setDescAr] = useState('');
  const [descEn, setDescEn] = useState('');
  const [notifType, setNotifType] = useState<string>('info');
  const [module, setModule] = useState<string>('general');
  const [senderName, setSenderName] = useState('');
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);

  // Target selections
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedStations, setSelectedStations] = useState<string[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState('');

  // Departments & stations
  const [departments, setDepartments] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);

  // Operation guards / unified refresh
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const refreshingRef = useRef(false);
  const [marking, setMarking] = useState(false);
  const markingRef = useRef(false);
  const [clearing, setClearing] = useState(false);
  const clearingRef = useRef(false);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: depts }, { data: stns }] = await Promise.all([
        supabase.from('departments').select('*').eq('is_active', true).order('name_ar'),
        supabase.from('stations').select('*').eq('is_active', true).order('name_ar'),
      ]);
      if (depts) setDepartments(depts);
      if (stns) setStations(stns);
    })();
  }, []);

  const filteredEmployees = employees.filter(e => {
    if (!employeeSearch) return true;
    const s = employeeSearch.toLowerCase();
    return e.nameAr.toLowerCase().includes(s) || e.nameEn.toLowerCase().includes(s) || e.employeeId.toLowerCase().includes(s);
  });

  const toggleEmployee = (id: string) => {
    setSelectedEmployees(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleDepartment = (id: string) => {
    setSelectedDepartments(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleStation = (id: string) => {
    setSelectedStations(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleRefresh = async () => {
    if (refreshingRef.current || sendingRef.current || markingRef.current || clearingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    try {
      await Promise.resolve(refreshNotifications());
      setRefreshKey(k => k + 1);
      await new Promise(r => setTimeout(r, 350));
      toast({ title: ar ? 'تم التحديث' : 'Refreshed', description: ar ? 'تم تحديث الإشعارات' : 'Notifications refreshed' });
    } catch (e: any) {
      toast({ title: ar ? 'خطأ' : 'Error', description: ar ? 'فشل التحديث' : 'Refresh failed', variant: 'destructive' });
    } finally {
      setRefreshing(false);
      refreshingRef.current = false;
    }
  };

  const handleSend = async () => {
    if (sendingRef.current) return;
    if (!titleAr || !titleEn) {
      toast({ title: ar ? 'خطأ' : 'Error', description: ar ? 'يرجى ملء العنوان بالعربية والإنجليزية' : 'Please fill title in both languages', variant: 'destructive' });
      return;
    }
    if (targetType === 'employee' && selectedEmployees.length === 0) {
      toast({ title: ar ? 'خطأ' : 'Error', description: ar ? 'يرجى اختيار موظف واحد على الأقل' : 'Please select at least one employee', variant: 'destructive' });
      return;
    }
    if (targetType === 'department' && selectedDepartments.length === 0) {
      toast({ title: ar ? 'خطأ' : 'Error', description: ar ? 'يرجى اختيار قسم واحد على الأقل' : 'Please select at least one department', variant: 'destructive' });
      return;
    }
    if (targetType === 'station' && selectedStations.length === 0) {
      toast({ title: ar ? 'خطأ' : 'Error', description: ar ? 'يرجى اختيار محطة واحدة على الأقل' : 'Please select at least one station', variant: 'destructive' });
      return;
    }

    sendingRef.current = true;
    setSending(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/send-notification`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          target_type: targetType,
          target_employee_ids: targetType === 'employee' ? selectedEmployees : undefined,
          target_department_ids: targetType === 'department' ? selectedDepartments : undefined,
          target_station_ids: targetType === 'station' ? selectedStations : undefined,
          title_ar: titleAr,
          title_en: titleEn,
          desc_ar: descAr || undefined,
          desc_en: descEn || undefined,
          type: notifType,
          module,
          sender_name: senderName || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast({
          title: ar ? 'تم الإرسال' : 'Sent',
          description: ar ? `تم إرسال الإشعار إلى ${json.count} مستخدم` : `Notification sent to ${json.count} users`,
        });
        setTitleAr(''); setTitleEn(''); setDescAr(''); setDescEn('');
        setSenderName('');
        setSelectedEmployees([]); setSelectedDepartments([]); setSelectedStations([]);
        refreshNotifications();
      } else {
        toast({ title: ar ? 'خطأ' : 'Error', description: json.error, variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: ar ? 'خطأ' : 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSending(false);
      sendingRef.current = false;
    }
  };

  const handleMarkAll = async () => {
    if (markingRef.current) return;
    markingRef.current = true;
    setMarking(true);
    try {
      await Promise.resolve(markAllAsRead());
      toast({ title: ar ? 'تم' : 'Done', description: ar ? 'تم تعليم جميع الإشعارات كمقروءة' : 'All notifications marked as read' });
    } catch {
      toast({ title: ar ? 'خطأ' : 'Error', description: ar ? 'فشلت العملية' : 'Operation failed', variant: 'destructive' });
    } finally {
      setMarking(false);
      markingRef.current = false;
    }
  };

  const handleClearAll = async () => {
    if (clearingRef.current) return;
    clearingRef.current = true;
    setClearing(true);
    try {
      await Promise.resolve(clearAll());
      toast({ title: ar ? 'تم المسح' : 'Cleared', description: ar ? 'تم مسح جميع الإشعارات' : 'All notifications cleared' });
    } catch {
      toast({ title: ar ? 'خطأ' : 'Error', description: ar ? 'فشل المسح' : 'Clear failed', variant: 'destructive' });
    } finally {
      setClearing(false);
      clearingRef.current = false;
      setConfirmClear(false);
    }
  };

  const formatTime = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return ar ? 'الآن' : 'Just now';
    if (mins < 60) return ar ? `منذ ${mins} دقيقة` : `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return ar ? `منذ ${hrs} ساعة` : `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return ar ? `منذ ${days} يوم` : `${days}d ago`;
  };

  const targetTypeLabel = (t: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      broadcast: { ar: 'رسالة عامة للجميع', en: 'Broadcast to All' },
      employee: { ar: 'موظفين محددين', en: 'Specific Employees' },
      department: { ar: 'أقسام محددة', en: 'Specific Departments' },
      station: { ar: 'محطات محددة', en: 'Specific Stations' },
    };
    return ar ? labels[t]?.ar : labels[t]?.en;
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const anyOpInProgress = sending || marking || clearing || refreshing;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" />
            {ar ? 'إدارة الإشعارات' : 'Notification Management'}
          </h1>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={anyOpInProgress}
            aria-label={ar ? 'تحديث' : 'Refresh'}
          >
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </div>

        {refreshing && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{ar ? 'جاري تحديث الإشعارات...' : 'Refreshing notifications...'}</span>
          </div>
        )}

        <Tabs defaultValue="compose" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="compose" className="gap-1.5">
              <Send className="w-4 h-4" />
              {ar ? 'إرسال إشعار' : 'Compose'}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5">
              <Bell className="w-4 h-4" />
              {ar ? 'السجل' : 'History'}
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ms-1 h-5 px-1.5 text-[10px]">{unreadCount}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* COMPOSE TAB */}
          <TabsContent value="compose" className="mt-6" key={`compose-${refreshKey}`}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Message form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="w-5 h-5 text-primary" />
                    {ar ? 'محتوى الرسالة' : 'Message Content'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{ar ? 'العنوان (عربي) *' : 'Title (Arabic) *'}</label>
                      <Input value={titleAr} onChange={e => setTitleAr(e.target.value)} dir="rtl" placeholder={ar ? 'عنوان الإشعار...' : 'Notification title...'} maxLength={200} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{ar ? 'العنوان (إنجليزي) *' : 'Title (English) *'}</label>
                      <Input value={titleEn} onChange={e => setTitleEn(e.target.value)} dir="ltr" placeholder="Notification title..." maxLength={200} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{ar ? 'التفاصيل (عربي)' : 'Description (Arabic)'}</label>
                      <Textarea value={descAr} onChange={e => setDescAr(e.target.value)} dir="rtl" rows={3} maxLength={1000} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{ar ? 'التفاصيل (إنجليزي)' : 'Description (English)'}</label>
                      <Textarea value={descEn} onChange={e => setDescEn(e.target.value)} dir="ltr" rows={3} maxLength={1000} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{ar ? 'النوع' : 'Type'}</label>
                      <Select value={notifType} onValueChange={setNotifType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="info">{ar ? 'معلومات' : 'Info'}</SelectItem>
                          <SelectItem value="success">{ar ? 'نجاح' : 'Success'}</SelectItem>
                          <SelectItem value="warning">{ar ? 'تحذير' : 'Warning'}</SelectItem>
                          <SelectItem value="error">{ar ? 'خطأ / عاجل' : 'Error / Urgent'}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{ar ? 'القسم' : 'Module'}</label>
                      <Select value={module} onValueChange={setModule}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">{ar ? 'عام' : 'General'}</SelectItem>
                          <SelectItem value="attendance">{ar ? 'حضور' : 'Attendance'}</SelectItem>
                          <SelectItem value="salary">{ar ? 'رواتب' : 'Salary'}</SelectItem>
                          <SelectItem value="leave">{ar ? 'إجازات' : 'Leaves'}</SelectItem>
                          <SelectItem value="training">{ar ? 'تدريب' : 'Training'}</SelectItem>
                          <SelectItem value="performance">{ar ? 'أداء' : 'Performance'}</SelectItem>
                          <SelectItem value="employee">{ar ? 'موظفين' : 'Employee'}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{ar ? 'اسم المرسل (اختياري)' : 'Sender Name (optional)'}</label>
                      <Input value={senderName} onChange={e => setSenderName(e.target.value)} placeholder={ar ? 'إدارة الموارد البشرية' : 'HR Department'} maxLength={100} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Target selector */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    {ar ? 'المستهدفين' : 'Target Audience'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select value={targetType} onValueChange={(v) => { setTargetType(v); setSelectedEmployees([]); setSelectedDepartments([]); setSelectedStations([]); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="broadcast">
                        <span className="flex items-center gap-2"><Megaphone className="w-4 h-4" /> {ar ? 'رسالة عامة للجميع' : 'Broadcast to All'}</span>
                      </SelectItem>
                      <SelectItem value="employee">
                        <span className="flex items-center gap-2"><Users className="w-4 h-4" /> {ar ? 'موظفين محددين' : 'Specific Employees'}</span>
                      </SelectItem>
                      <SelectItem value="department">
                        <span className="flex items-center gap-2"><Building2 className="w-4 h-4" /> {ar ? 'أقسام محددة' : 'Specific Departments'}</span>
                      </SelectItem>
                      <SelectItem value="station">
                        <span className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {ar ? 'محطات محددة' : 'Specific Stations'}</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {targetType === 'broadcast' && (
                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 text-center">
                      <Megaphone className="w-8 h-8 text-primary mx-auto mb-2" />
                      <p className="text-sm font-medium">{ar ? 'سيتم إرسال الإشعار لجميع الموظفين المسجلين' : 'Notification will be sent to all registered employees'}</p>
                    </div>
                  )}

                  {targetType === 'employee' && (
                    <div className="space-y-3">
                      <div className="relative">
                        <Search className="absolute top-2.5 start-3 w-4 h-4 text-muted-foreground" />
                        <Input
                          value={employeeSearch}
                          onChange={e => setEmployeeSearch(e.target.value)}
                          placeholder={ar ? 'بحث بالاسم أو الكود...' : 'Search by name or code...'}
                          className="ps-9"
                        />
                      </div>
                      {selectedEmployees.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {selectedEmployees.map(id => {
                            const emp = employees.find(e => e.id === id);
                            return (
                              <Badge key={id} variant="secondary" className="gap-1 cursor-pointer" onClick={() => toggleEmployee(id)}>
                                {ar ? emp?.nameAr : emp?.nameEn} ✕
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                      <ScrollArea className="h-48 border rounded-lg">
                        {filteredEmployees.slice(0, 50).map(emp => (
                          <div
                            key={emp.id}
                            className={cn(
                              "flex items-center gap-3 p-2.5 border-b last:border-0 cursor-pointer hover:bg-muted/50",
                              selectedEmployees.includes(emp.id) && "bg-primary/5"
                            )}
                            onClick={() => toggleEmployee(emp.id)}
                          >
                            <Checkbox checked={selectedEmployees.includes(emp.id)} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{ar ? emp.nameAr : emp.nameEn}</p>
                              <p className="text-xs text-muted-foreground">{emp.employeeId}</p>
                            </div>
                          </div>
                        ))}
                      </ScrollArea>
                      <p className="text-xs text-muted-foreground">{ar ? `${selectedEmployees.length} موظف محدد` : `${selectedEmployees.length} selected`}</p>
                    </div>
                  )}

                  {targetType === 'department' && (
                    <div className="space-y-2">
                      {departments.map(dept => (
                        <div
                          key={dept.id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50",
                            selectedDepartments.includes(dept.id) && "bg-primary/5 border-primary/30"
                          )}
                          onClick={() => toggleDepartment(dept.id)}
                        >
                          <Checkbox checked={selectedDepartments.includes(dept.id)} />
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{ar ? dept.name_ar : dept.name_en}</span>
                        </div>
                      ))}
                      <p className="text-xs text-muted-foreground">{ar ? `${selectedDepartments.length} قسم محدد` : `${selectedDepartments.length} selected`}</p>
                    </div>
                  )}

                  {targetType === 'station' && (
                    <div className="space-y-2">
                      {stations.map(stn => (
                        <div
                          key={stn.id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50",
                            selectedStations.includes(stn.id) && "bg-primary/5 border-primary/30"
                          )}
                          onClick={() => toggleStation(stn.id)}
                        >
                          <Checkbox checked={selectedStations.includes(stn.id)} />
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{ar ? stn.name_ar : stn.name_en}</span>
                        </div>
                      ))}
                      <p className="text-xs text-muted-foreground">{ar ? `${selectedStations.length} محطة محددة` : `${selectedStations.length} selected`}</p>
                    </div>
                  )}

                  <Button
                    onClick={handleSend}
                    disabled={sending || refreshing}
                    aria-label={ar ? 'إرسال الإشعار' : 'Send Notification'}
                    className="w-full gap-2"
                    size="lg"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {sending ? (ar ? 'جاري الإرسال...' : 'Sending...') : (ar ? 'إرسال الإشعار' : 'Send Notification')}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* HISTORY TAB */}
          <TabsContent value="history" className="mt-6" key={`history-${refreshKey}`}>
            <Card>
              <CardHeader>
                <div className={cn("flex items-center justify-between gap-2 flex-wrap", isRTL && "flex-row-reverse")}>
                  <CardTitle>
                    {ar ? 'سجل الإشعارات' : 'Notification History'}
                    <span className="ms-2 text-sm font-normal text-muted-foreground">
                      ({notifications.length}{unreadCount > 0 ? ` · ${unreadCount} ${ar ? 'غير مقروء' : 'unread'}` : ''})
                    </span>
                  </CardTitle>
                  <div className="flex gap-2">
                    {unreadCount > 0 && (
                      <Button variant="outline" size="sm" onClick={handleMarkAll} disabled={marking || clearing || refreshing}>
                        {marking ? <Loader2 className="w-4 h-4 me-1 animate-spin" /> : <Check className="w-4 h-4 me-1" />}
                        {ar ? 'قراءة الكل' : 'Mark all read'}
                      </Button>
                    )}
                    {notifications.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmClear(true)}
                        disabled={clearing || marking || refreshing}
                        className="text-destructive"
                      >
                        {clearing ? <Loader2 className="w-4 h-4 me-1 animate-spin" /> : <Trash2 className="w-4 h-4 me-1" />}
                        {ar ? 'مسح الكل' : 'Clear all'}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Bell className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    {ar ? 'لا توجد إشعارات' : 'No notifications'}
                  </div>
                ) : (
                  <ScrollArea className="h-[60vh]">
                    <div className="space-y-2 pe-2">
                      {notifications.map(n => {
                        const Icon = typeIcons[n.type] || Info;
                        return (
                          <div
                            key={n.id}
                            role="button"
                            tabIndex={0}
                            aria-label={ar ? n.titleAr : n.titleEn}
                            className={cn(
                              "flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors",
                              !n.read && "bg-primary/5 border-primary/20"
                            )}
                            onClick={() => !n.read && markAsRead(n.id)}
                            onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !n.read) { e.preventDefault(); markAsRead(n.id); } }}
                          >
                            <Icon className={cn("w-5 h-5 mt-0.5 shrink-0", typeColors[n.type] || 'text-blue-500')} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className={cn("text-sm whitespace-pre-wrap break-words", !n.read && "font-semibold")}>
                                  {ar ? n.titleAr : n.titleEn}
                                </p>
                                {n.targetType && n.targetType !== 'general' && (
                                  <Badge variant="outline" className="text-[10px]">
                                    {targetTypeLabel(n.targetType)}
                                  </Badge>
                                )}
                              </div>
                              {(n.descAr || n.descEn) && (
                                <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap break-words">
                                  {ar ? n.descAr : n.descEn}
                                </p>
                              )}
                              <div className="flex items-center gap-3 mt-1">
                                {n.senderName && <span className="text-[10px] text-primary/70">{n.senderName}</span>}
                                <span className="text-[10px] text-muted-foreground">{formatTime(n.timestamp)}</span>
                              </div>
                            </div>
                            {!n.read && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" aria-label={ar ? 'غير مقروء' : 'unread'} />}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <AlertDialog open={confirmClear} onOpenChange={(o) => !clearing && setConfirmClear(o)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{ar ? 'تأكيد مسح جميع الإشعارات' : 'Confirm Clear All Notifications'}</AlertDialogTitle>
              <AlertDialogDescription>
                {ar
                  ? `سيتم مسح ${notifications.length} إشعار نهائياً ولا يمكن التراجع عن هذه العملية.`
                  : `This will permanently clear ${notifications.length} notification(s). This action cannot be undone.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={clearing}>{ar ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => { e.preventDefault(); handleClearAll(); }}
                disabled={clearing}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {clearing ? <Loader2 className="w-4 h-4 me-1 animate-spin" /> : <Trash2 className="w-4 h-4 me-1" />}
                {ar ? 'تأكيد المسح' : 'Confirm Clear'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default NotificationsPage;
