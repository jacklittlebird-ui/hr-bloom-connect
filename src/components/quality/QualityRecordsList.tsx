import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Award, AlertTriangle } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export interface QualityRecord {
  id: string;
  employee_id: string;
  station_id: string | null;
  record_type: 'deduction' | 'gratitude' | 'warning';
  warning_level?: number | null;
  deduction_days: number | null;
  reason: string;
  record_date: string;
}

/** Read-only list of quality deductions / gratitude for one employee. */
export const QualityRecordsList = ({ employeeId, title = 'ملاحظات الجودة' }: { employeeId?: string; title?: string }) => {
  const [rows, setRows] = useState<QualityRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employeeId) { setRows([]); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    supabase.from('quality_records' as any).select('*').eq('employee_id', employeeId)
      .order('record_date', { ascending: false })
      .then(({ data }) => { if (!cancelled) { setRows((data as any) || []); setLoading(false); } });
    return () => { cancelled = true; };
  }, [employeeId]);

  const deductions = rows.filter(r => r.record_type === 'deduction');
  const totalDays = deductions.reduce((s, r) => s + Number(r.deduction_days || 0), 0);
  const gratitudes = rows.filter(r => r.record_type === 'gratitude').length;
  const warnings = rows.filter(r => r.record_type === 'warning').length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex flex-wrap items-center gap-2">
          {title}
          <Badge variant="secondary">شكر: {gratitudes}</Badge>
          <Badge variant="outline">إنذارات: {warnings}</Badge>
          <Badge variant="destructive">خصومات: {deductions.length} ({totalDays} يوم)</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? <p className="text-sm text-muted-foreground">جاري التحميل...</p>
          : rows.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد ملاحظات جودة</p>
          : rows.map(r => (
            <div key={r.id} className="flex items-start gap-2 border rounded-md p-2">
              {r.record_type === 'gratitude'
                ? <Award className="h-4 w-4 text-primary mt-1 shrink-0" />
                : <AlertTriangle className="h-4 w-4 text-destructive mt-1 shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap gap-2 items-center text-sm font-medium">
                  {r.record_type === 'gratitude' ? 'شهادة شكر' : r.record_type === 'warning' ? (r.warning_level === 2 ? 'إنذار ثاني' : 'إنذار أول') : `خصم ${r.deduction_days ?? 0} يوم`}
                  <span className="text-xs text-muted-foreground">{formatDate(r.record_date)}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap break-words">{r.reason}</p>
              </div>
            </div>
          ))}
      </CardContent>
    </Card>
  );
};
