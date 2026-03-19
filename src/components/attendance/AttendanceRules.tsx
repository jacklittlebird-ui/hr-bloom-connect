import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  Clock, Plus, Edit2, Trash2, Settings2, Building2, 
  Plane, Timer, AlertCircle, CheckCircle2, Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AttendanceRule, ScheduleType } from '@/types/attendance';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface DbRule {
  id: string;
  name: string;
  name_ar: string;
  description: string;
  description_ar: string;
  schedule_type: string;
  is_active: boolean;
  fixed_schedule: any;
  flexible_schedule: any;
  fully_flexible_schedule: any;
  shift_schedule: any;
  weekend_days: any;
  working_days_per_week: number;
  max_overtime_hours_daily: number;
  max_overtime_hours_weekly: number;
}

const dbToRule = (r: DbRule): AttendanceRule => ({
  id: r.id,
  name: r.name,
  nameAr: r.name_ar,
  description: r.description || '',
  descriptionAr: r.description_ar || '',
  scheduleType: r.schedule_type as ScheduleType,
  isActive: r.is_active,
  fixedSchedule: r.fixed_schedule || undefined,
  flexibleSchedule: r.flexible_schedule || undefined,
  fullyFlexibleSchedule: r.fully_flexible_schedule || undefined,
  shiftSchedule: r.shift_schedule || undefined,
  weekendDays: r.weekend_days || [5, 6],
  workingDaysPerWeek: r.working_days_per_week || 5,
  maxOvertimeHoursDaily: r.max_overtime_hours_daily || 4,
  maxOvertimeHoursWeekly: r.max_overtime_hours_weekly || 20,
});

export const AttendanceRules = () => {
  const { t, isRTL, language } = useLanguage();
  const [rules, setRules] = useState<AttendanceRule[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<ScheduleType>('fixed');
  const [loading, setLoading] = useState(true);
  
  const getDefaultRule = (): Partial<AttendanceRule> => ({
    name: '',
    nameAr: '',
    description: '',
    descriptionAr: '',
    scheduleType: 'fixed',
    isActive: true,
    weekendDays: [5, 6],
    workingDaysPerWeek: 5,
    maxOvertimeHoursDaily: 4,
    maxOvertimeHoursWeekly: 20,
    fixedSchedule: {
      startTime: '08:00',
      endTime: '18:00',
      gracePeriodMinutes: 15,
      earlyDepartureMinutes: 15,
    },
    flexibleSchedule: {
      arrivalWindowStart: '09:00',
      arrivalWindowEnd: '09:30',
      minimumWorkHours: 8,
      coreHoursStart: '10:00',
      coreHoursEnd: '16:00',
    },
    fullyFlexibleSchedule: {
      monthlyTargetHours: 192,
      allowAnyTime: true,
    },
  });

  const [newRule, setNewRule] = useState<Partial<AttendanceRule>>(getDefaultRule());

  const fetchRules = useCallback(async () => {
    const { data, error } = await supabase
      .from('attendance_rules')
      .select('*')
      .order('created_at', { ascending: true });
    if (data) {
      setRules(data.map(dbToRule));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const getScheduleIcon = (type: ScheduleType) => {
    switch (type) {
      case 'fixed': return <Building2 className="w-5 h-5" />;
      case 'flexible': return <Timer className="w-5 h-5" />;
      case 'shift': return <Plane className="w-5 h-5" />;
      case 'fully-flexible': return <Clock className="w-5 h-5" />;
    }
  };

  const getScheduleColor = (type: ScheduleType) => {
    switch (type) {
      case 'fixed': return 'bg-blue-500';
      case 'flexible': return 'bg-green-500';
      case 'shift': return 'bg-purple-500';
      case 'fully-flexible': return 'bg-amber-500';
    }
  };

  const handleSaveRule = async () => {
    if (!newRule.name || !newRule.nameAr) return;

    const payload = {
      name: newRule.name,
      name_ar: newRule.nameAr,
      description: newRule.description || '',
      description_ar: newRule.descriptionAr || '',
      schedule_type: selectedType,
      is_active: true,
      fixed_schedule: selectedType === 'fixed' ? newRule.fixedSchedule : null,
      flexible_schedule: selectedType === 'flexible' ? newRule.flexibleSchedule : null,
      fully_flexible_schedule: selectedType === 'fully-flexible' ? newRule.fullyFlexibleSchedule : null,
      shift_schedule: selectedType === 'shift' ? newRule.shiftSchedule : null,
      weekend_days: newRule.weekendDays || [5, 6],
      working_days_per_week: newRule.workingDaysPerWeek || 5,
      max_overtime_hours_daily: newRule.maxOvertimeHoursDaily || 4,
      max_overtime_hours_weekly: newRule.maxOvertimeHoursWeekly || 20,
    };

    if (editingRuleId) {
      const { error } = await supabase.from('attendance_rules').update(payload).eq('id', editingRuleId);
      if (error) {
        toast({ title: language === 'ar' ? 'خطأ في التحديث' : 'Update failed', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: language === 'ar' ? 'تم تحديث القاعدة بنجاح' : 'Rule updated successfully' });
    } else {
      const { error } = await supabase.from('attendance_rules').insert(payload);
      if (error) {
        toast({ title: language === 'ar' ? 'خطأ في الإضافة' : 'Insert failed', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: language === 'ar' ? 'تم إضافة القاعدة بنجاح' : 'Rule added successfully' });
    }

    setNewRule(getDefaultRule());
    setEditingRuleId(null);
    setIsAddDialogOpen(false);
    await fetchRules();
  };

  const handleEditRule = (rule: AttendanceRule) => {
    setNewRule(rule);
    setSelectedType(rule.scheduleType);
    setEditingRuleId(rule.id);
    setIsAddDialogOpen(true);
  };

  const handleDeleteRule = async (ruleId: string) => {
    const { error } = await supabase.from('attendance_rules').delete().eq('id', ruleId);
    if (error) {
      toast({ title: language === 'ar' ? 'خطأ في الحذف' : 'Delete failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: language === 'ar' ? 'تم حذف القاعدة' : 'Rule deleted' });
    await fetchRules();
  };

  const handleToggleActive = async (ruleId: string) => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;
    await supabase.from('attendance_rules').update({ is_active: !rule.isActive }).eq('id', ruleId);
    await fetchRules();
  };

  const resetForm = () => {
    setNewRule(getDefaultRule());
    setEditingRuleId(null);
    setSelectedType('fixed');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={cn("flex justify-between items-center", isRTL && "flex-row-reverse")}>
        <div>
          <h2 className="text-xl font-semibold">{t('attendance.rules.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('attendance.rules.subtitle')}</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className={cn("gap-2", isRTL && "flex-row-reverse")}>
              <Plus className="w-4 h-4" />
              {t('attendance.rules.addRule')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingRuleId ? t('attendance.rules.editRule') : t('attendance.rules.addRule')}
              </DialogTitle>
            </DialogHeader>
            <Tabs value={selectedType} onValueChange={(v) => setSelectedType(v as ScheduleType)}>
              <TabsList className="grid grid-cols-4 mb-4" dir="rtl">
                <TabsTrigger value="fixed" className="gap-2">
                  <Building2 className="w-4 h-4" />
                  {t('attendance.rules.fixed')}
                </TabsTrigger>
                <TabsTrigger value="flexible" className="gap-2">
                  <Timer className="w-4 h-4" />
                  {t('attendance.rules.flexible')}
                </TabsTrigger>
                <TabsTrigger value="fully-flexible" className="gap-2 text-xs">
                  <Clock className="w-4 h-4" />
                  {language === 'ar' ? 'مرن بالكامل' : 'Fully Flex'}
                </TabsTrigger>
                <TabsTrigger value="shift" className="gap-2">
                  <Plane className="w-4 h-4" />
                  {t('attendance.rules.shift')}
                </TabsTrigger>
              </TabsList>
              
              {/* Common Fields */}
              <div className="space-y-4 mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('attendance.rules.nameEn')}</Label>
                    <Input 
                      value={newRule.name}
                      onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                      placeholder="Rule Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('attendance.rules.nameAr')}</Label>
                    <Input 
                      value={newRule.nameAr}
                      onChange={(e) => setNewRule({ ...newRule, nameAr: e.target.value })}
                      placeholder="اسم القاعدة"
                      dir="rtl"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t('attendance.rules.description')}</Label>
                  <Input 
                    value={newRule.description}
                    onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                    placeholder="Brief description"
                  />
                </div>
              </div>
              
              <TabsContent value="fixed" className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{t('attendance.rules.fixedSettings')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t('attendance.rules.startTime')}</Label>
                        <Input 
                          type="time"
                          value={newRule.fixedSchedule?.startTime}
                          onChange={(e) => setNewRule({ 
                            ...newRule, 
                            fixedSchedule: { ...newRule.fixedSchedule!, startTime: e.target.value }
                          })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('attendance.rules.endTime')}</Label>
                        <Input 
                          type="time"
                          value={newRule.fixedSchedule?.endTime}
                          onChange={(e) => setNewRule({ 
                            ...newRule, 
                            fixedSchedule: { ...newRule.fixedSchedule!, endTime: e.target.value }
                          })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t('attendance.rules.gracePeriod')}</Label>
                        <div className="flex items-center gap-2">
                          <Input 
                            type="number"
                            value={newRule.fixedSchedule?.gracePeriodMinutes}
                            onChange={(e) => setNewRule({ 
                              ...newRule, 
                              fixedSchedule: { ...newRule.fixedSchedule!, gracePeriodMinutes: Number(e.target.value) }
                            })}
                            min={0}
                            max={60}
                          />
                          <span className="text-sm text-muted-foreground">{t('attendance.rules.minutes')}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>{t('attendance.rules.earlyLeave')}</Label>
                        <div className="flex items-center gap-2">
                          <Input 
                            type="number"
                            value={newRule.fixedSchedule?.earlyDepartureMinutes}
                            onChange={(e) => setNewRule({ 
                              ...newRule, 
                              fixedSchedule: { ...newRule.fixedSchedule!, earlyDepartureMinutes: Number(e.target.value) }
                            })}
                            min={0}
                            max={60}
                          />
                          <span className="text-sm text-muted-foreground">{t('attendance.rules.minutes')}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="flexible" className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{t('attendance.rules.flexibleSettings')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t('attendance.rules.arrivalStart')}</Label>
                        <Input 
                          type="time" 
                          value={newRule.flexibleSchedule?.arrivalWindowStart || '09:00'}
                          onChange={(e) => setNewRule({
                            ...newRule,
                            flexibleSchedule: { ...newRule.flexibleSchedule!, arrivalWindowStart: e.target.value }
                          })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('attendance.rules.arrivalEnd')}</Label>
                        <Input 
                          type="time" 
                          value={newRule.flexibleSchedule?.arrivalWindowEnd || '09:30'}
                          onChange={(e) => setNewRule({
                            ...newRule,
                            flexibleSchedule: { ...newRule.flexibleSchedule!, arrivalWindowEnd: e.target.value }
                          })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>{t('attendance.rules.minWorkHours')}</Label>
                      <Input 
                        type="number" 
                        value={newRule.flexibleSchedule?.minimumWorkHours || 8}
                        onChange={(e) => setNewRule({
                          ...newRule,
                          flexibleSchedule: { ...newRule.flexibleSchedule!, minimumWorkHours: Number(e.target.value) }
                        })}
                        min={4} max={12} 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t('attendance.rules.coreStart')}</Label>
                        <Input 
                          type="time" 
                          value={newRule.flexibleSchedule?.coreHoursStart || '10:00'}
                          onChange={(e) => setNewRule({
                            ...newRule,
                            flexibleSchedule: { ...newRule.flexibleSchedule!, coreHoursStart: e.target.value }
                          })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('attendance.rules.coreEnd')}</Label>
                        <Input 
                          type="time" 
                          value={newRule.flexibleSchedule?.coreHoursEnd || '16:00'}
                          onChange={(e) => setNewRule({
                            ...newRule,
                            flexibleSchedule: { ...newRule.flexibleSchedule!, coreHoursEnd: e.target.value }
                          })}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="fully-flexible" className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{language === 'ar' ? 'إعدادات الحضور المرن بالكامل' : 'Fully Flexible Settings'}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {language === 'ar' 
                        ? 'يمكن للموظف الحضور والانصراف في أي وقت - يتم احتساب الساعات على مدار الشهر'
                        : 'Employee can check in/out anytime - hours are tracked monthly'}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>{language === 'ar' ? 'إجمالي الساعات الشهرية المطلوبة' : 'Monthly Target Hours'}</Label>
                      <Input 
                        type="number" 
                        value={newRule.fullyFlexibleSchedule?.monthlyTargetHours || 192}
                        onChange={(e) => setNewRule({
                          ...newRule,
                          fullyFlexibleSchedule: {
                            monthlyTargetHours: Number(e.target.value),
                            allowAnyTime: true,
                          }
                        })}
                        min={100}
                        max={300}
                      />
                      <p className="text-xs text-muted-foreground">
                        {language === 'ar' ? '192 ساعة = 8 ساعات × 24 يوم عمل' : '192 hours = 8 hours × 24 working days'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="shift" className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{t('attendance.rules.shiftSettings')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>{t('attendance.rules.shiftTemplate')}</Label>
                      <Select defaultValue="template-3shift">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="template-3shift">
                            {t('attendance.rules.threeShift')}
                          </SelectItem>
                          <SelectItem value="template-4shift">
                            {t('attendance.rules.fourShift')}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>{t('attendance.rules.allowSwap')}</Label>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>{t('attendance.rules.nightAllowance')}</Label>
                      <Switch defaultChecked />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
            
            {/* Common Settings */}
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t('attendance.rules.commonSettings')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('attendance.rules.maxDailyOT')}</Label>
                    <Input 
                      type="number" 
                      value={newRule.maxOvertimeHoursDaily || 4}
                      onChange={(e) => setNewRule({ ...newRule, maxOvertimeHoursDaily: Number(e.target.value) })}
                      min={0} max={8} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('attendance.rules.maxWeeklyOT')}</Label>
                    <Input 
                      type="number" 
                      value={newRule.maxOvertimeHoursWeekly || 20}
                      onChange={(e) => setNewRule({ ...newRule, maxOvertimeHoursWeekly: Number(e.target.value) })}
                      min={0} max={40} 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Button className="w-full mt-4" onClick={handleSaveRule}>
              {t('attendance.rules.save')}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rules.filter(r => r.scheduleType === 'fixed').length}</p>
                <p className="text-sm text-muted-foreground">{t('attendance.rules.fixedRules')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Timer className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rules.filter(r => r.scheduleType === 'flexible').length}</p>
                <p className="text-sm text-muted-foreground">{t('attendance.rules.flexibleRules')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
              <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Plane className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rules.filter(r => r.scheduleType === 'shift').length}</p>
                <p className="text-sm text-muted-foreground">{t('attendance.rules.shiftRules')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
              <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Users className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rules.filter(r => r.scheduleType === 'fully-flexible').length}</p>
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'مرن بالكامل' : 'Fully Flexible'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
          </div>
        ) : rules.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Settings2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{language === 'ar' ? 'لا توجد قواعد حضور بعد. اضغط "إضافة قاعدة" للبدء.' : 'No attendance rules yet. Click "Add Rule" to get started.'}</p>
          </div>
        ) : rules.map((rule) => (
          <Card key={rule.id} className={cn("relative", !rule.isActive && "opacity-60")}>
            <div className={cn("absolute top-0 left-0 w-1 h-full rounded-l-lg", getScheduleColor(rule.scheduleType))} />
            <CardHeader>
              <div className={cn("flex justify-between items-start", isRTL && "flex-row-reverse")}>
                <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
                  <div className={cn("p-2 rounded-lg", 
                    rule.scheduleType === 'fixed' && "bg-blue-100 dark:bg-blue-900/30",
                    rule.scheduleType === 'flexible' && "bg-green-100 dark:bg-green-900/30",
                    rule.scheduleType === 'shift' && "bg-purple-100 dark:bg-purple-900/30",
                    rule.scheduleType === 'fully-flexible' && "bg-amber-100 dark:bg-amber-900/30"
                  )}>
                    {getScheduleIcon(rule.scheduleType)}
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      {language === 'ar' ? rule.nameAr : rule.name}
                    </CardTitle>
                    <CardDescription>
                      {language === 'ar' ? rule.descriptionAr : rule.description}
                    </CardDescription>
                  </div>
                </div>
                <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                  <Switch 
                    checked={rule.isActive}
                    onCheckedChange={() => handleToggleActive(rule.id)}
                  />
                  <Button variant="ghost" size="icon" onClick={() => handleEditRule(rule)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="text-destructive"
                    onClick={() => handleDeleteRule(rule.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible>
                <AccordionItem value="details" className="border-none">
                  <AccordionTrigger className="py-2">
                    <span className="text-sm">{t('attendance.rules.viewDetails')}</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                      {rule.scheduleType === 'fixed' && rule.fixedSchedule && (
                        <>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">{t('attendance.rules.workingHours')}</p>
                            <p className="font-medium">
                              {rule.fixedSchedule.startTime} - {rule.fixedSchedule.endTime}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">{t('attendance.rules.gracePeriod')}</p>
                            <p className="font-medium">{rule.fixedSchedule.gracePeriodMinutes} min</p>
                          </div>
                        </>
                      )}
                      {rule.scheduleType === 'flexible' && rule.flexibleSchedule && (
                        <>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">{t('attendance.rules.arrivalWindow')}</p>
                            <p className="font-medium">
                              {rule.flexibleSchedule.arrivalWindowStart} - {rule.flexibleSchedule.arrivalWindowEnd}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">{t('attendance.rules.minWorkHours')}</p>
                            <p className="font-medium">{rule.flexibleSchedule.minimumWorkHours}h</p>
                          </div>
                        </>
                      )}
                      {rule.scheduleType === 'fully-flexible' && rule.fullyFlexibleSchedule && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">{language === 'ar' ? 'ساعات شهرية' : 'Monthly Hours'}</p>
                          <p className="font-medium">{rule.fullyFlexibleSchedule.monthlyTargetHours}h</p>
                        </div>
                      )}
                      {rule.scheduleType === 'shift' && rule.shiftSchedule && (
                        <>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">{t('attendance.rules.shiftSwap')}</p>
                            <Badge variant={rule.shiftSchedule.allowShiftSwap ? "default" : "secondary"}>
                              {rule.shiftSchedule.allowShiftSwap ? t('attendance.rules.allowed') : t('attendance.rules.notAllowed')}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">{t('attendance.rules.nightAllowance')}</p>
                            <Badge variant={rule.shiftSchedule.nightShiftAllowance ? "default" : "secondary"}>
                              {rule.shiftSchedule.nightShiftAllowance ? t('attendance.rules.yes') : t('attendance.rules.no')}
                            </Badge>
                          </div>
                        </>
                      )}
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">{t('attendance.rules.maxDailyOT')}</p>
                        <p className="font-medium">{rule.maxOvertimeHoursDaily}h</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">{t('attendance.rules.workDays')}</p>
                        <p className="font-medium">{rule.workingDaysPerWeek} {t('attendance.rules.daysPerWeek')}</p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
