import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface AuditLog {
  id: string;
  user_id: string;
  action_type: string;
  affected_table: string;
  record_id: string | null;
  created_at: string;
}

interface AuditLogsProps {
  /** Restrict logs to a specific actor user_id */
  userIdFilter?: string;
  /** Restrict to a fixed list of tables (also limits the filter dropdown) */
  tablesScope?: string[];
  /** Hide the page header */
  hideHeader?: boolean;
  /** Default selected table filter */
  defaultTable?: string;
}

const SECURITY_TABLES = ['user_roles', 'permission_profiles', 'user_module_permissions', 'profiles'];

const AuditLogs = ({ userIdFilter, tablesScope, hideHeader, defaultTable }: AuditLogsProps = {}) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const t = (ar: string, en: string) => language === 'ar' ? ar : en;
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableFilter, setTableFilter] = useState(defaultTable || 'all');
  const [actionFilter, setActionFilter] = useState('all');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, tableFilter, actionFilter, userIdFilter, tablesScope?.join(',')]);

  const fetchLogs = async () => {
    setLoading(true);
    let query = supabase
      .from('audit_logs')
      .select('id, user_id, action_type, affected_table, record_id, created_at')
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (tableFilter !== 'all') query = query.eq('affected_table', tableFilter);
    else if (tablesScope && tablesScope.length) query = query.in('affected_table', tablesScope);
    if (actionFilter !== 'all') query = query.eq('action_type', actionFilter);
    if (userIdFilter) query = query.eq('user_id', userIdFilter);

    const { data } = await query;
    setLogs(data || []);
    setLoading(false);
  };

  const actionBadge = (action: string) => {
    switch (action) {
      case 'INSERT': return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">{t('إضافة', 'Insert')}</Badge>;
      case 'UPDATE': return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">{t('تعديل', 'Update')}</Badge>;
      case 'DELETE': return <Badge variant="destructive">{t('حذف', 'Delete')}</Badge>;
      default: return <Badge variant="outline">{action}</Badge>;
    }
  };

  const tableLabel = (table: string) => {
    const labels: Record<string, string> = {
      employees: t('الموظفين', 'Employees'),
      payroll_entries: t('الرواتب', 'Payroll'),
      user_roles: t('الأدوار', 'Roles'),
      profiles: t('الملفات', 'Profiles'),
      loans: t('القروض', 'Loans'),
      advances: t('السلف', 'Advances'),
      bonus_records: t('المكافآت', 'Bonuses'),
      eid_bonuses: t('العيديات', 'Eid Bonuses'),
      leave_requests: t('الإجازات', 'Leaves'),
      assets: t('العهد', 'Assets'),
      performance_reviews: t('التقييمات', 'Reviews'),
    };
    return labels[table] || table;
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t('غير مصرح بالوصول', 'Access denied')}</p>
      </div>
    );
  }

  const allTableOptions: { value: string; label: string }[] = [
    { value: 'employees', label: t('الموظفين', 'Employees') },
    { value: 'payroll_entries', label: t('الرواتب', 'Payroll') },
    { value: 'user_roles', label: t('الأدوار', 'Roles') },
    { value: 'permission_profiles', label: t('ملفات الصلاحيات', 'Permission Profiles') },
    { value: 'user_module_permissions', label: t('صلاحيات المستخدم', 'User Module Perms') },
    { value: 'profiles', label: t('الملفات الشخصية', 'Profiles') },
    { value: 'loans', label: t('القروض', 'Loans') },
    { value: 'bonus_records', label: t('المكافآت', 'Bonuses') },
    { value: 'eid_bonuses', label: t('العيديات', 'Eid Bonuses') },
    { value: 'assets', label: t('العهد', 'Assets') },
  ];
  const tableOptions = tablesScope?.length
    ? allTableOptions.filter(o => tablesScope.includes(o.value))
    : allTableOptions;

  return (
    <div className="space-y-4">
      {!hideHeader && (
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-bold">{t('سجل التدقيق الأمني', 'Security Audit Log')}</h2>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap gap-3">
            <Select value={tableFilter} onValueChange={v => { setTableFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[200px]" aria-label={t('الجدول', 'Table')}>
                <SelectValue placeholder={t('الجدول', 'Table')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tablesScope?.length ? t('كل الجداول الأمنية', 'All Security Tables') : t('كل الجداول', 'All Tables')}</SelectItem>
                {tableOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={v => { setActionFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={t('العملية', 'Action')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('كل العمليات', 'All Actions')}</SelectItem>
                <SelectItem value="INSERT">{t('إضافة', 'Insert')}</SelectItem>
                <SelectItem value="UPDATE">{t('تعديل', 'Update')}</SelectItem>
                <SelectItem value="DELETE">{t('حذف', 'Delete')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">{t('التاريخ', 'Date')}</TableHead>
                  <TableHead className="text-right">{t('العملية', 'Action')}</TableHead>
                  <TableHead className="text-right">{t('الجدول', 'Table')}</TableHead>
                  <TableHead className="text-right">{t('معرف السجل', 'Record ID')}</TableHead>
                  <TableHead className="text-right">{t('المستخدم', 'User')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t('جاري التحميل...', 'Loading...')}</TableCell></TableRow>
                ) : logs.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t('لا توجد سجلات', 'No records')}</TableCell></TableRow>
                ) : logs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs">{new Date(log.created_at).toLocaleString('ar-EG')}</TableCell>
                    <TableCell>{actionBadge(log.action_type)}</TableCell>
                    <TableCell><Badge variant="outline">{tableLabel(log.affected_table)}</Badge></TableCell>
                    <TableCell className="text-xs font-mono max-w-[120px] truncate">{log.record_id?.slice(0, 8)}...</TableCell>
                    <TableCell className="text-xs font-mono max-w-[120px] truncate">{log.user_id.slice(0, 8)}...</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between mt-4">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronRight className="h-4 w-4 me-1" />{t('السابق', 'Previous')}
            </Button>
            <span className="text-sm text-muted-foreground">{t('صفحة', 'Page')} {page + 1}</span>
            <Button variant="outline" size="sm" disabled={logs.length < PAGE_SIZE} onClick={() => setPage(p => p + 1)}>
              {t('التالي', 'Next')}<ChevronLeft className="h-4 w-4 ms-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogs;
