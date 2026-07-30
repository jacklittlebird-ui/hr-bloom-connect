import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart3, CalendarDays, Stethoscope, Coffee, Clock, Edit, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmployeeLeaveBalance } from '@/types/leaves';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LeaveBalanceOverviewProps {
  balances: EmployeeLeaveBalance[];
  onRefresh?: () => void;
}

export const LeaveBalanceOverview = ({ balances, onRefresh }: LeaveBalanceOverviewProps) => {
  const { t, isRTL, language } = useLanguage();
  const { toast } = useToast();
  const isAr = language === 'ar';

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingBalance, setEditingBalance] = useState<EmployeeLeaveBalance | null>(null);
  const [form, setForm] = useState({ annualTotal: 0, sickTotal: 0, casualTotal: 0, permissionsTotal: 0 });
  const [saving, setSaving] = useState(false);

  const openEdit = (balance: EmployeeLeaveBalance) => {
    setEditingBalance(balance);
    setForm({
      annualTotal: balance.annualTotal,
      sickTotal: balance.sickTotal,
      casualTotal: balance.casualTotal,
      permissionsTotal: balance.permissionsTotal,
    });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingBalance) return;
    setSaving(true);
    const currentYear = new Date().getFullYear();

    const payload = {
      employee_id: editingBalance.employeeId,
      year: currentYear,
      annual_total: form.annualTotal,
      annual_used: editingBalance.annualUsed,
      sick_total: form.sickTotal,
      sick_used: editingBalance.sickUsed,
      casual_total: form.casualTotal,
      casual_used: editingBalance.casualUsed,
      permissions_total: form.permissionsTotal,
      permissions_used: editingBalance.permissionsUsed,
    };

    // Try update first, then insert
    const { data: existing } = await supabase
      .from('leave_balances')
      .select('id')
      .eq('employee_id', editingBalance.employeeId)
      .eq('year', currentYear)
      .maybeSingle();

    let error;
    if (existing) {
      ({ error } = await supabase
        .from('leave_balances')
        .update(payload)
        .eq('employee_id', editingBalance.employeeId)
        .eq('year', currentYear));
    } else {
      ({ error } = await supabase
        .from('leave_balances')
        .insert(payload));
    }

    if (error) {
      toast({ title: isAr ? 'خطأ' : 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: isAr ? 'تم الحفظ' : 'Saved', description: isAr ? 'تم تحديث الرصيد بنجاح' : 'Balance updated successfully' });
      setEditDialogOpen(false);
      onRefresh?.();
    }
    setSaving(false);
  };

  const totalAnnualUsed = balances.reduce((sum, b) => sum + b.annualUsed, 0);
  const totalAnnualTotal = balances.reduce((sum, b) => sum + b.annualTotal, 0);
  const totalSickUsed = balances.reduce((sum, b) => sum + b.sickUsed, 0);
  const totalSickTotal = balances.reduce((sum, b) => sum + b.sickTotal, 0);
  const totalCasualUsed = balances.reduce((sum, b) => sum + b.casualUsed, 0);
  const totalCasualTotal = balances.reduce((sum, b) => sum + b.casualTotal, 0);
  const totalPermissionsUsed = balances.reduce((sum, b) => sum + b.permissionsUsed, 0);
  const totalPermissionsTotal = balances.reduce((sum, b) => sum + b.permissionsTotal, 0);

  const summaryCards = [
    {
      title: t('leaves.balance.annualLeave'),
      used: totalAnnualUsed, total: totalAnnualTotal,
      icon: CalendarDays, color: 'text-stat-blue', bgColor: 'bg-stat-blue-bg', iconBg: 'bg-stat-blue',
      unit: isAr ? 'يوم' : 'days',
    },
    {
      title: t('leaves.balance.sickLeave'),
      used: totalSickUsed, total: totalSickTotal,
      icon: Stethoscope, color: 'text-stat-coral', bgColor: 'bg-stat-coral-bg', iconBg: 'bg-stat-coral',
      unit: isAr ? 'يوم' : 'days',
    },
    {
      title: t('leaves.balance.casualLeave'),
      used: totalCasualUsed, total: totalCasualTotal,
      icon: Coffee, color: 'text-stat-green', bgColor: 'bg-stat-green-bg', iconBg: 'bg-stat-green',
      unit: isAr ? 'يوم' : 'days',
    },
    {
      title: t('leaves.balance.permissions'),
      used: totalPermissionsUsed, total: totalPermissionsTotal,
      icon: Clock, color: 'text-stat-purple', bgColor: 'bg-stat-purple-bg', iconBg: 'bg-stat-purple',
      unit: isAr ? 'ساعة' : 'hrs',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, index) => {
          const Icon = card.icon;
          const percentage = card.total > 0 ? (card.used / card.total) * 100 : 0;
          return (
            <div key={index} className={cn("rounded-xl p-5 shadow-sm border border-border/30", card.bgColor)}>
              <div className={cn("flex items-center gap-4", isRTL && "flex-row-reverse")}>
                <div className={cn("p-3 rounded-xl", card.iconBg)}>
                  <Icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  <p className="text-2xl font-bold text-foreground">
                    {card.used} / {card.total} <span className="text-sm font-normal text-muted-foreground">{card.unit}</span>
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <div className={cn("flex justify-between text-xs text-muted-foreground mb-1", isRTL && "flex-row-reverse")}>
                  <span>{t('leaves.balance.used')}</span>
                  <span>{percentage.toFixed(0)}%</span>
                </div>
                <Progress value={percentage} className="h-2" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            {t('leaves.balance.detailedBalance')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={cn(isRTL && "text-right")}>{isAr ? 'كود الموظف' : 'Employee ID'}</TableHead>
                  <TableHead className={cn(isRTL && "text-right")}>{t('leaves.balance.employee')}</TableHead>
                  <TableHead className={cn(isRTL && "text-right")}>{t('leaves.balance.department')}</TableHead>
                  <TableHead className={cn(isRTL && "text-right")}>{isAr ? 'المكان' : 'Station'}</TableHead>
                  <TableHead className={cn(isRTL && "text-right")}>{isAr ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead className={cn(isRTL && "text-right")}>{isAr ? 'تاريخ التعيين' : 'Hire Date'}</TableHead>
                  <TableHead className={cn("text-center", isRTL && "text-right")}>{t('leaves.balance.annualLeave')}</TableHead>
                  <TableHead className={cn("text-center", isRTL && "text-right")}>{t('leaves.balance.sickLeave')}</TableHead>
                  <TableHead className={cn("text-center", isRTL && "text-right")}>{t('leaves.balance.casualLeave')}</TableHead>
                  <TableHead className={cn("text-center", isRTL && "text-right")}>{t('leaves.balance.permissions')}</TableHead>
                  <TableHead className="text-center">{isAr ? 'تعديل' : 'Edit'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {balances.map((balance) => (
                  <TableRow key={balance.employeeId}>
                    <TableCell className="font-medium">{balance.employeeCode || '—'}</TableCell>
                    <TableCell className="font-medium">
                      {isAr ? balance.employeeNameAr : balance.employeeName}
                    </TableCell>
                    <TableCell>{t(`dept.${balance.department.toLowerCase()}`)}</TableCell>
                    <TableCell>{balance.station}</TableCell>
                    <TableCell className={cn("text-xs", balance.status && balance.status !== 'active' && "text-destructive font-medium")}>
                      {balance.status ? (isAr ? (STATUS_AR[balance.status] || balance.status) : balance.status) : '—'}
                    </TableCell>
                    <TableCell>{balance.hireDate ? balance.hireDate.split('-').reverse().join('/') : '—'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-medium text-stat-blue">
                          {balance.annualRemaining} / {balance.annualTotal}
                        </span>
                        {balance.overtimeDays > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            (+{balance.overtimeDays} {isAr ? 'إضافي' : 'OT'})
                          </span>
                        )}
                        <Progress 
                          value={balance.annualTotal > 0 ? (balance.annualUsed / balance.annualTotal) * 100 : 0} 
                          className="h-1.5 w-16 mt-1"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-medium text-stat-coral">
                          {balance.sickRemaining} / {balance.sickTotal}
                        </span>
                        <Progress 
                          value={balance.sickTotal > 0 ? (balance.sickUsed / balance.sickTotal) * 100 : 0} 
                          className="h-1.5 w-16 mt-1"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-medium text-stat-green">
                          {balance.casualRemaining} / {balance.casualTotal}
                        </span>
                        <Progress 
                          value={balance.casualTotal > 0 ? (balance.casualUsed / balance.casualTotal) * 100 : 0} 
                          className="h-1.5 w-16 mt-1"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-medium text-stat-purple">
                          {balance.permissionsRemaining} / {balance.permissionsTotal}
                        </span>
                        <Progress 
                          value={balance.permissionsTotal > 0 ? (balance.permissionsUsed / balance.permissionsTotal) * 100 : 0} 
                          className="h-1.5 w-16 mt-1"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(balance)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Balance Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isAr ? 'تعديل رصيد الإجازات' : 'Edit Leave Balance'}</DialogTitle>
          </DialogHeader>
          {editingBalance && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground mb-2">
                {isAr ? editingBalance.employeeNameAr : editingBalance.employeeName} — {editingBalance.employeeCode}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{isAr ? 'الإجازة السنوية (إجمالي)' : 'Annual Leave (Total)'}</Label>
                  <Input type="number" min={0} value={form.annualTotal} onChange={e => setForm(f => ({ ...f, annualTotal: Number(e.target.value) }))} />
                  <p className="text-xs text-muted-foreground mt-1">{isAr ? 'مستخدم:' : 'Used:'} {editingBalance.annualUsed}</p>
                </div>
                <div>
                  <Label>{isAr ? 'الإجازة المرضية (إجمالي)' : 'Sick Leave (Total)'}</Label>
                  <Input type="number" min={0} value={form.sickTotal} onChange={e => setForm(f => ({ ...f, sickTotal: Number(e.target.value) }))} />
                  <p className="text-xs text-muted-foreground mt-1">{isAr ? 'مستخدم:' : 'Used:'} {editingBalance.sickUsed}</p>
                </div>
                <div>
                  <Label>{isAr ? 'الإجازة العارضة (إجمالي)' : 'Casual Leave (Total)'}</Label>
                  <Input type="number" min={0} value={form.casualTotal} onChange={e => setForm(f => ({ ...f, casualTotal: Number(e.target.value) }))} />
                  <p className="text-xs text-muted-foreground mt-1">{isAr ? 'مستخدم:' : 'Used:'} {editingBalance.casualUsed}</p>
                </div>
                <div>
                  <Label>{isAr ? 'الأذونات (إجمالي ساعات)' : 'Permissions (Total hrs)'}</Label>
                  <Input type="number" min={0} value={form.permissionsTotal} onChange={e => setForm(f => ({ ...f, permissionsTotal: Number(e.target.value) }))} />
                  <p className="text-xs text-muted-foreground mt-1">{isAr ? 'مستخدم:' : 'Used:'} {editingBalance.permissionsUsed}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="w-4 h-4" />
              {saving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ' : 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
