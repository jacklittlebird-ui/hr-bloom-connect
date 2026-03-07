import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, CheckCircle, Clock, AlertCircle, Calendar, Banknote } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Installment {
  id: string;
  loanId: string;
  employeeId: string;
  employeeName: string;
  department: string;
  installmentNumber: number;
  totalInstallments: number;
  amount: number;
  dueDate: string;
  paidDate: string | null;
  status: 'paid' | 'pending' | 'overdue';
}

export const InstallmentsList = () => {
  const { t, isRTL, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [installments, setInstallments] = useState<Installment[]>([]);

  const fetchInstallments = async () => {
    const { data } = await supabase.from('loan_installments').select('*, loans(amount, installments_count)').order('due_date', { ascending: true });
    const { data: employees } = await supabase.from('employees').select('id, name_ar, name_en, department_id');
    const { data: departments } = await supabase.from('departments').select('id, name_ar, name_en');
    const empMap = new Map(employees?.map(e => [e.id, e]) || []);
    const deptMap = new Map(departments?.map(d => [d.id, d]) || []);

    setInstallments((data || []).map(i => {
      const emp = empMap.get(i.employee_id);
      const dept = emp?.department_id ? deptMap.get(emp.department_id) : null;
      const today = new Date().toISOString().split('T')[0];
      let status: 'paid' | 'pending' | 'overdue' = i.status as any;
      if (status !== 'paid' && i.due_date < today) status = 'overdue';
      return {
        id: i.id, loanId: i.loan_id, employeeId: i.employee_id,
        employeeName: emp ? (language === 'ar' ? emp.name_ar : emp.name_en) : '',
        department: dept ? (language === 'ar' ? dept.name_ar : dept.name_en) : '',
        installmentNumber: i.installment_number,
        totalInstallments: (i.loans as any)?.installments_count || 0,
        amount: i.amount, dueDate: i.due_date,
        paidDate: i.paid_at ? i.paid_at.split('T')[0] : null, status,
      };
    }));
  };

  useEffect(() => { fetchInstallments(); }, [language]);

  const statusLabels: Record<string, { en: string; ar: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    paid: { en: 'Paid', ar: 'مدفوع', variant: 'default' },
    pending: { en: 'Pending', ar: 'قيد الانتظار', variant: 'outline' },
    overdue: { en: 'Overdue', ar: 'متأخر', variant: 'destructive' },
  };

  const filteredInstallments = installments.filter(i => {
    const matchesSearch = i.employeeName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || i.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handlePayInstallment = async (installmentId: string) => {
    await supabase.from('loan_installments').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', installmentId);
    toast({ title: t('common.success'), description: t('loans.installments.paid') });
    fetchInstallments();
  };

  const stats = {
    totalInstallments: installments.length,
    paidInstallments: installments.filter(i => i.status === 'paid').length,
    pendingInstallments: installments.filter(i => i.status === 'pending').length,
    overdueInstallments: installments.filter(i => i.status === 'overdue').length,
    totalPaidAmount: installments.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0),
    totalPendingAmount: installments.filter(i => i.status !== 'paid').reduce((sum, i) => sum + i.amount, 0),
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">{t('loans.installments.total')}</p><p className="text-2xl font-bold">{stats.totalInstallments}</p></div><Calendar className="h-8 w-8 text-primary" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">{t('loans.installments.paidCount')}</p><p className="text-2xl font-bold">{stats.paidInstallments}</p></div><CheckCircle className="h-8 w-8 text-green-500" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">{t('loans.installments.pendingCount')}</p><p className="text-2xl font-bold">{stats.pendingInstallments}</p></div><Clock className="h-8 w-8 text-yellow-500" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">{t('loans.installments.overdueCount')}</p><p className="text-2xl font-bold">{stats.overdueInstallments}</p></div><AlertCircle className="h-8 w-8 text-red-500" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">{t('loans.installments.paidAmount')}</p><p className="text-2xl font-bold">{stats.totalPaidAmount.toLocaleString()}</p></div><Banknote className="h-8 w-8 text-green-500" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">{t('loans.installments.pendingAmount')}</p><p className="text-2xl font-bold">{stats.totalPendingAmount.toLocaleString()}</p></div><Banknote className="h-8 w-8 text-yellow-500" /></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>{t('loans.installments.title')}</CardTitle>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative">
                <Search className={`absolute top-3 h-4 w-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
                <Input placeholder={t('loans.search')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={`w-full md:w-64 ${isRTL ? 'pr-9' : 'pl-9'}`} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-40"><SelectValue placeholder={t('loans.filterStatus')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  {Object.entries(statusLabels).map(([key, label]) => (<SelectItem key={key} value={key}>{isRTL ? label.ar : label.en}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>{t('loans.employee')}</TableHead>
              <TableHead>{t('loans.installments.number')}</TableHead>
              <TableHead>{t('loans.amount')}</TableHead>
              <TableHead>{t('loans.installments.dueDate')}</TableHead>
              <TableHead>{t('loans.installments.paidDate')}</TableHead>
              <TableHead>{t('loans.status')}</TableHead>
              <TableHead>{t('common.actions')}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filteredInstallments.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{language === 'ar' ? 'لا توجد أقساط' : 'No installments'}</TableCell></TableRow>
              ) : filteredInstallments.map((inst) => (
                <TableRow key={inst.id}>
                  <TableCell><div><p className="font-medium">{inst.employeeName}</p><p className="text-sm text-muted-foreground">{inst.department}</p></div></TableCell>
                  <TableCell>{inst.installmentNumber}/{inst.totalInstallments}</TableCell>
                  <TableCell>{inst.amount.toLocaleString()}</TableCell>
                  <TableCell>{inst.dueDate}</TableCell>
                  <TableCell>{inst.paidDate || '-'}</TableCell>
                  <TableCell><Badge variant={statusLabels[inst.status].variant}>{isRTL ? statusLabels[inst.status].ar : statusLabels[inst.status].en}</Badge></TableCell>
                  <TableCell>{inst.status !== 'paid' && (<Button variant="outline" size="sm" onClick={() => handlePayInstallment(inst.id)}><CheckCircle className="h-4 w-4 mr-2" />{t('loans.installments.markPaid')}</Button>)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
