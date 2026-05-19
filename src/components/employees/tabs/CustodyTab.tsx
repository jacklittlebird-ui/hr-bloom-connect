import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Employee } from '@/types/employee';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, CheckCircle, Laptop, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface AssignedAsset {
  id: string;
  assetCode: string;
  nameEn: string;
  nameAr: string;
  brand: string;
  model: string;
  condition: string;
  status: string;
  category: string;
  purchasePrice: number | null;
}

interface TrainingDebt {
  id: string;
  courseNameAr: string;
  courseNameEn: string;
  status: string;
  startDate: string;
  endDate: string;
  totalCost: number;
  provider: string;
}

interface CustodyTabProps { employee: Employee }

export const CustodyTab = ({ employee }: CustodyTabProps) => {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const [assets, setAssets] = useState<AssignedAsset[]>([]);
  const [trainingDebts, setTrainingDebts] = useState<TrainingDebt[]>([]);
  const [ackDates, setAckDates] = useState<Record<string, string>>({});
  const [assetAckDates, setAssetAckDates] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!employee?.id) return;
    let cancelled = false;

    (async () => {
      const { data: aData } = await supabase.from('assets').select('*').eq('assigned_to', employee.id);
      if (!cancelled && aData) {
        setAssets(aData.map((a: any) => ({
          id: a.id, assetCode: a.asset_code, nameEn: a.name_en, nameAr: a.name_ar,
          brand: a.brand || '', model: a.model || '', condition: a.condition || 'good',
          status: a.status, category: a.category || 'other', purchasePrice: a.purchase_price,
        })));
      }

      const { data: tData } = await supabase
        .from('training_records')
        .select('id, status, start_date, end_date, planned_date, total_cost, provider, training_courses(name_ar, name_en)')
        .eq('employee_id', employee.id)
        .order('start_date', { ascending: false });
      if (!cancelled && tData) {
        setTrainingDebts(tData.map((t: any) => ({
          id: t.id,
          courseNameAr: t.training_courses?.name_ar || '',
          courseNameEn: t.training_courses?.name_en || '',
          status: t.status,
          startDate: t.start_date || t.planned_date || '',
          endDate: t.end_date || '',
          totalCost: Number(t.total_cost) || 0,
          provider: t.provider || '',
        })));
      }

      const { data: ackA } = await supabase
        .from('asset_acknowledgments')
        .select('asset_id, acknowledged_at')
        .eq('employee_id', employee.id);
      if (!cancelled && ackA) {
        const m: Record<string, string> = {};
        ackA.forEach((a: any) => { m[a.asset_id] = a.acknowledged_at; });
        setAssetAckDates(m);
      }

      const { data: ackT } = await supabase
        .from('training_acknowledgments')
        .select('training_record_id, acknowledged_at')
        .eq('employee_id', employee.id);
      if (!cancelled && ackT) {
        const m: Record<string, string> = {};
        ackT.forEach((a: any) => { m[a.training_record_id] = a.acknowledged_at; });
        setAckDates(m);
      }
    })();

    return () => { cancelled = true; };
  }, [employee?.id]);

  const assigned = assets.filter(a => a.status === 'assigned').length;
  const conditionMap: Record<string, string> = { good: 'جيدة', fair: 'مقبولة', poor: 'سيئة', new: 'جديدة' };
  const assetStatusMap: Record<string, { ar: string; cls: string }> = {
    assigned: { ar: 'بحوزته', cls: 'bg-primary/10 text-primary border-primary' },
    maintenance: { ar: 'بالصيانة', cls: 'bg-amber-100 text-amber-700 border-amber-400' },
  };
  const statusMap: Record<string, { ar: string; cls: string }> = {
    enrolled: { ar: 'قيد التدريب', cls: 'bg-warning/10 text-warning border-warning' },
    failed: { ar: 'لم يجتاز', cls: 'bg-destructive/10 text-destructive border-destructive' },
    completed: { ar: 'مكتمل', cls: 'bg-primary/10 text-primary border-primary' },
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
        {[
          { icon: CheckCircle, label: ar ? 'العهد المسلمة' : 'Assigned', value: assigned, gradient: 'from-blue-500 to-cyan-500', bg: 'bg-blue-50 dark:bg-blue-950/40' },
          { icon: Package, label: ar ? 'إجمالي الأصول' : 'Total Assets', value: assets.length, gradient: 'from-slate-500 to-gray-500', bg: 'bg-slate-50 dark:bg-slate-950/40' },
          { icon: GraduationCap, label: ar ? 'مستحقات تدريب' : 'Training Dues', value: trainingDebts.length, gradient: 'from-amber-500 to-orange-500', bg: 'bg-amber-50 dark:bg-amber-950/40' },
        ].map((s, i) => (
          <Card key={i} className={cn('border-0 shadow-sm', s.bg)}>
            <CardContent className="p-4 text-center">
              <div className={cn('w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center bg-gradient-to-br', s.gradient)}>
                <s.icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="assets" dir="rtl">
        <TabsList>
          <TabsTrigger value="assets">{ar ? 'العهد المسلمة' : 'Assigned Assets'}</TabsTrigger>
          <TabsTrigger value="training">{ar ? 'مستحقات التدريب' : 'Training Dues'}</TabsTrigger>
        </TabsList>

        <TabsContent value="assets">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Laptop className="w-5 h-5 text-primary" />{ar ? 'الأصول المعيّنة' : 'Assigned Assets'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {assets.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">{ar ? 'لا توجد أصول معيّنة' : 'No assets assigned'}</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="min-w-[600px]">
                    <TableHeader><TableRow>
                      <TableHead>{ar ? 'الكود' : 'Code'}</TableHead>
                      <TableHead>{ar ? 'الاسم' : 'Name'}</TableHead>
                      <TableHead>{ar ? 'الماركة' : 'Brand'}</TableHead>
                      <TableHead>{ar ? 'الموديل' : 'Model'}</TableHead>
                      <TableHead>{ar ? 'القيمة' : 'Price'}</TableHead>
                      <TableHead>{ar ? 'الحالة الفنية' : 'Condition'}</TableHead>
                      <TableHead>{ar ? 'الحالة' : 'Status'}</TableHead>
                      <TableHead>{ar ? 'تاريخ الإقرار' : 'Acknowledged'}</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {assets.map(a => {
                        const aStatus = assetStatusMap[a.status] || { ar: a.status, cls: '' };
                        const ack = assetAckDates[a.id];
                        return (
                          <TableRow key={a.id}>
                            <TableCell className="font-mono">{a.assetCode}</TableCell>
                            <TableCell className="font-medium">{ar ? a.nameAr : a.nameEn}</TableCell>
                            <TableCell>{a.brand}</TableCell>
                            <TableCell>{a.model}</TableCell>
                            <TableCell>{a.purchasePrice != null ? a.purchasePrice.toLocaleString() : '—'}</TableCell>
                            <TableCell><Badge variant="outline">{ar ? (conditionMap[a.condition] || a.condition) : a.condition}</Badge></TableCell>
                            <TableCell><Badge variant="outline" className={aStatus.cls}>{ar ? aStatus.ar : a.status}</Badge></TableCell>
                            <TableCell className="text-xs">
                              {ack
                                ? new Date(ack).toLocaleDateString(ar ? 'ar-EG' : 'en-GB')
                                : <span className="text-destructive">{ar ? 'لم يتم' : 'Pending'}</span>}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="training">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-warning" />{ar ? 'مستحقات التدريب' : 'Training Dues'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trainingDebts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">{ar ? 'لا توجد مستحقات تدريب' : 'No training dues'}</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="min-w-[600px]">
                    <TableHeader><TableRow>
                      <TableHead>{ar ? 'الدورة' : 'Course'}</TableHead>
                      <TableHead>{ar ? 'مقدم الخدمة' : 'Provider'}</TableHead>
                      <TableHead>{ar ? 'من' : 'Start'}</TableHead>
                      <TableHead>{ar ? 'إلى' : 'End'}</TableHead>
                      <TableHead>{ar ? 'التكلفة' : 'Cost'}</TableHead>
                      <TableHead>{ar ? 'الحالة' : 'Status'}</TableHead>
                      <TableHead>{ar ? 'تاريخ الإقرار' : 'Acknowledged'}</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {trainingDebts.map(t => {
                        const s = statusMap[t.status] || { ar: t.status, cls: '' };
                        const ack = ackDates[t.id];
                        return (
                          <TableRow key={t.id}>
                            <TableCell className="font-medium">{ar ? t.courseNameAr : t.courseNameEn}</TableCell>
                            <TableCell>{t.provider || '—'}</TableCell>
                            <TableCell>{t.startDate || '—'}</TableCell>
                            <TableCell>{t.endDate || '—'}</TableCell>
                            <TableCell className="font-semibold">{t.totalCost ? t.totalCost.toLocaleString() : '—'}</TableCell>
                            <TableCell><Badge variant="outline" className={s.cls}>{ar ? s.ar : t.status}</Badge></TableCell>
                            <TableCell className="text-xs">
                              {ack
                                ? new Date(ack).toLocaleDateString(ar ? 'ar-EG' : 'en-GB')
                                : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
