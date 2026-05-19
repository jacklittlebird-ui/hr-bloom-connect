import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Employee } from '@/types/employee';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, CheckCircle, Laptop, GraduationCap, FileText } from 'lucide-react';
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
  validityYears: number;
}

interface CustodyTabProps { employee: Employee }

export const CustodyTab = ({ employee }: CustodyTabProps) => {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const [assets, setAssets] = useState<AssignedAsset[]>([]);
  const [trainingDebts, setTrainingDebts] = useState<TrainingDebt[]>([]);
  const [ackDates, setAckDates] = useState<Record<string, string>>({});
  const [assetAckDates, setAssetAckDates] = useState<Record<string, string>>({});

  const employeeName = ar ? (employee.nameAr || employee.nameEn) : (employee.nameEn || employee.nameAr);

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
        .select('id, status, start_date, end_date, planned_date, total_cost, provider, training_courses(name_ar, name_en, validity_years)')
        .eq('employee_id', employee.id)
        .gt('total_cost', 0)
        .order('start_date', { ascending: false });
      if (!cancelled && tData) {
        const now = new Date();
        const filtered = tData.filter((t: any) => {
          if (!t.planned_date) return true;
          const expiryDate = new Date(t.planned_date);
          expiryDate.setMonth(expiryDate.getMonth() + 1);
          return now <= expiryDate;
        });
        setTrainingDebts(filtered.map((t: any) => ({
          id: t.id,
          courseNameAr: t.training_courses?.name_ar || '',
          courseNameEn: t.training_courses?.name_en || '',
          status: t.status,
          startDate: t.start_date || t.planned_date || '',
          endDate: t.end_date || '',
          totalCost: Number(t.total_cost) || 0,
          provider: t.provider || '',
          validityYears: t.training_courses?.validity_years || 1,
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
    planned: { ar: 'مخطط', cls: 'bg-blue-100 text-blue-700 border-blue-300' },
    in_progress: { ar: 'جاري', cls: 'bg-warning/10 text-warning border-warning' },
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
                <>
                  <div className="overflow-x-auto">
                    <Table className="min-w-[500px]">
                      <TableHeader><TableRow>
                        <TableHead>{ar ? 'الكود' : 'Code'}</TableHead>
                        <TableHead>{ar ? 'الاسم' : 'Name'}</TableHead>
                        <TableHead>{ar ? 'الماركة' : 'Brand'}</TableHead>
                        <TableHead>{ar ? 'الموديل' : 'Model'}</TableHead>
                        <TableHead>{ar ? 'الحالة الفنية' : 'Condition'}</TableHead>
                        <TableHead>{ar ? 'الحالة' : 'Status'}</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {assets.map(a => {
                          const aStatus = assetStatusMap[a.status] || { ar: a.status, cls: '' };
                          return (
                            <TableRow key={a.id}>
                              <TableCell className="font-mono">{a.assetCode}</TableCell>
                              <TableCell className="font-medium">{ar ? a.nameAr : a.nameEn}</TableCell>
                              <TableCell>{a.brand}</TableCell>
                              <TableCell>{a.model}</TableCell>
                              <TableCell><Badge variant="outline">{ar ? (conditionMap[a.condition] || a.condition) : a.condition}</Badge></TableCell>
                              <TableCell><Badge variant="outline" className={aStatus.cls}>{ar ? aStatus.ar : a.status}</Badge></TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="space-y-4 mt-6">
                    {assets.map(a => {
                      const assetName = ar ? a.nameAr : a.nameEn;
                      const categoryMap: Record<string, { ar: string; en: string }> = {
                        laptop: { ar: 'لابتوب', en: 'Laptop' },
                        desktop: { ar: 'كمبيوتر مكتبي', en: 'Desktop' },
                        phone: { ar: 'هاتف', en: 'Phone' },
                        printer: { ar: 'طابعة', en: 'Printer' },
                        furniture: { ar: 'أثاث', en: 'Furniture' },
                        vehicle: { ar: 'مركبة', en: 'Vehicle' },
                        other: { ar: 'أخرى', en: 'Other' },
                      };
                      const catLabel = categoryMap[a.category] ? (ar ? categoryMap[a.category].ar : categoryMap[a.category].en) : a.category;

                      return (
                        <div key={a.id} className="bg-muted/50 border border-border rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <FileText className="w-4 h-4 text-primary" />
                            <h4 className="font-bold text-sm text-foreground">{ar ? 'إيصال استلام' : 'Receipt of Custody'}</h4>
                            <Badge variant="outline" className="text-xs">{a.assetCode}</Badge>
                          </div>
                          <p className="text-sm leading-7 text-muted-foreground whitespace-pre-wrap">
                            {ar ? (
                              <>
                                أقر أنا الموقع أدناه <strong className="text-foreground">{employeeName}</strong> أنني تسلمت <strong className="text-primary">{assetName}</strong> فئة <strong className="text-primary">{catLabel}</strong> العلامة التجارية <strong className="text-primary">{a.brand || '—'}</strong> بمبلغ <strong className="text-primary">{a.purchasePrice != null ? a.purchasePrice.toLocaleString() : '—'}</strong> جنيه وذلك كعهدة شخصية من الشركة على سبيل الأمانة، وأتعهد بالمحافظة عليها وتسليمها للشركة متى طُلب مني ذلك.{"\n\n"}وهذا إقرار مني بالاستلام مع كامل علمي بأحكام القوانين المنظمة لخيانة الأمانة وهذا إقرار مني بذلك.
                              </>
                            ) : (
                              <>
                                I, the undersigned <strong className="text-foreground">{employeeName}</strong>, acknowledge that I have received <strong className="text-primary">{assetName}</strong> category <strong className="text-primary">{catLabel}</strong> brand <strong className="text-primary">{a.brand || '—'}</strong> valued at <strong className="text-primary">{a.purchasePrice != null ? a.purchasePrice.toLocaleString() : '—'}</strong> EGP as a personal custody from the company in trust, and I pledge to maintain it and return it to the company whenever requested.{"\n\n"}This is my acknowledgment of receipt, with full knowledge of the laws governing breach of trust.
                              </>
                            )}
                          </p>
                          <div className="mt-4 pt-3 border-t border-border/50 flex flex-col gap-1">
                            <p className="text-sm font-semibold text-foreground">
                              {ar ? 'المقر بما فيه:' : 'Acknowledged by:'} <span className="text-primary">{employeeName}</span>
                            </p>
                            {assetAckDates[a.id] ? (
                              <p className="text-xs text-muted-foreground">
                                {ar ? 'تاريخ الإقرار:' : 'Acknowledgment date:'} {new Date(assetAckDates[a.id]).toLocaleDateString(ar ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                              </p>
                            ) : (
                              <p className="text-xs text-destructive">
                                {ar ? 'لم يتم الإقرار بعد' : 'Not acknowledged yet'}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
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
                <div className="space-y-6">
                  {trainingDebts.map(t => {
                    const s = statusMap[t.status] || { ar: t.status, cls: '' };
                    const courseName = ar ? t.courseNameAr : t.courseNameEn;
                    const yearsLabel = ar
                      ? `${t.validityYears} ${t.validityYears === 1 ? 'سنة' : t.validityYears <= 10 ? 'سنوات' : 'سنة'}`
                      : `${t.validityYears} year(s)`;

                    return (
                      <Card key={t.id} className="border border-border/50">
                        <CardContent className="p-4 space-y-4">
                          <div className="overflow-x-auto">
                            <Table className="min-w-[450px]">
                              <TableHeader><TableRow>
                                <TableHead>{ar ? 'الدورة' : 'Course'}</TableHead>
                                <TableHead>{ar ? 'تاريخ البداية' : 'Start'}</TableHead>
                                <TableHead>{ar ? 'تاريخ النهاية' : 'End'}</TableHead>
                                <TableHead>{ar ? 'تكاليف التدريب' : 'Training Costs'}</TableHead>
                                <TableHead>{ar ? 'الحالة' : 'Status'}</TableHead>
                              </TableRow></TableHeader>
                              <TableBody>
                                <TableRow>
                                  <TableCell className="font-medium">{courseName}</TableCell>
                                  <TableCell>{t.startDate || '—'}</TableCell>
                                  <TableCell>{t.endDate || '—'}</TableCell>
                                  <TableCell className="font-semibold">{t.totalCost ? t.totalCost.toLocaleString() : '—'}</TableCell>
                                  <TableCell><Badge variant="outline" className={s.cls}>{ar ? s.ar : t.status}</Badge></TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>

                          <div className="bg-muted/50 border border-border rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <FileText className="w-4 h-4 text-primary" />
                              <h4 className="font-bold text-sm text-foreground">{ar ? 'إيصال استلام نقدية' : 'Cash Receipt Acknowledgment'}</h4>
                            </div>
                            <p className="text-sm leading-7 text-muted-foreground whitespace-pre-wrap">
                              {ar ? (
                                <>
                                  قد أقريت وتعهدت أنا <strong className="text-foreground">{employeeName}</strong> أنني استلمت مبلغ <strong className="text-primary">{t.totalCost.toLocaleString()}</strong> جنيه وذلك لرغبتي في الحصول على دورة تدريبية <strong className="text-primary">{courseName}</strong> والمقامة في الفترة من <strong>{t.startDate}</strong> وحتى <strong>{t.endDate}</strong> والمقامة في <strong>{t.provider}</strong>{"\n\n"}وهذا المبلغ يمثل قيمة مصروفات الدورة المذكورة، وأقر بأنني قد تسلمت المبلغ المذكور من شركة لينك أيرو تريدنج إجنسي على سبيل الأمانة، ومستعد لرده فوراً حين طلب الشركة له وذلك في حالة تركي للعمل بالشركة قبل انقضاء <strong className="text-primary">{yearsLabel}</strong> من تاريخ انتهاء الدورة. وهذا إقرار مني باستلام المبلغ. مع كامل علمي بأحكام القوانين المنظمة لخيانة الأمانة وهذا إقرار مني بذلك.
                                </>
                              ) : (
                                <>
                                  I, <strong className="text-foreground">{employeeName}</strong>, acknowledge that I have received the amount of <strong className="text-primary">{t.totalCost.toLocaleString()}</strong> EGP for the purpose of attending the training course <strong className="text-primary">{courseName}</strong> held from <strong>{t.startDate}</strong> to <strong>{t.endDate}</strong> at <strong>{t.provider}</strong>.{"\n\n"}This amount represents the expenses of the aforementioned course. I acknowledge that I have received the said amount from Link Aero Trading Agency in trust, and I am ready to return it immediately upon the company's request, in the event of my leaving the company before the expiration of <strong className="text-primary">{yearsLabel}</strong> from the end date of the course. This is my acknowledgment of receiving the amount, with full knowledge of the laws governing breach of trust.
                                </>
                              )}
                            </p>
                            <div className="mt-4 pt-3 border-t border-border/50 flex flex-col gap-1">
                              <p className="text-sm font-semibold text-foreground">
                                {ar ? 'المقر بما فيه:' : 'Acknowledged by:'} <span className="text-primary">{employeeName}</span>
                              </p>
                              {ackDates[t.id] ? (
                                <p className="text-xs text-muted-foreground">
                                  {ar ? 'تاريخ الإقرار:' : 'Acknowledgment date:'} {new Date(ackDates[t.id]).toLocaleDateString(ar ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                              ) : (
                                <p className="text-xs text-destructive">
                                  {ar ? 'لم يتم الإقرار بعد' : 'Not acknowledged yet'}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
