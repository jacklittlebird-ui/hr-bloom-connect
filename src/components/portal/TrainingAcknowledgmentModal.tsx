import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { usePortalEmployee } from '@/hooks/usePortalEmployee';
import { useToast } from '@/hooks/use-toast';

interface PendingAck {
  id: string;
  courseNameAr: string;
  courseNameEn: string;
  totalCost: number;
  startDate: string;
  endDate: string;
  provider: string;
  validityYears: number;
}

export const TrainingAcknowledgmentModal = ({ onAllAcknowledged }: { onAllAcknowledged: () => void }) => {
  const employeeId = usePortalEmployee();
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';
  const { toast } = useToast();
  const [pending, setPending] = useState<PendingAck[]>([]);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!employeeId) return;
    const fetch = async () => {
      setLoading(true);
      // Get training records with cost > 0
      const { data: records } = await supabase
        .from('training_records')
        .select('*, training_courses(name_ar, name_en, validity_years)')
        .eq('employee_id', employeeId)
        .gt('total_cost', 0);

      if (!records || records.length === 0) {
        setPending([]);
        setLoading(false);
        onAllAcknowledged();
        return;
      }

      // Filter by expiry (planned_date + 1 month)
      const now = new Date();
      const activeRecords = records.filter((r: any) => {
        if (!r.planned_date) return true;
        const expiry = new Date(r.planned_date);
        expiry.setMonth(expiry.getMonth() + 1);
        return now <= expiry;
      });

      if (activeRecords.length === 0) {
        setPending([]);
        setLoading(false);
        onAllAcknowledged();
        return;
      }

      // Get existing acknowledgments
      const recordIds = activeRecords.map((r: any) => r.id);
      const { data: acks } = await supabase
        .from('training_acknowledgments')
        .select('training_record_id')
        .eq('employee_id', employeeId)
        .in('training_record_id', recordIds);

      const ackedIds = new Set((acks || []).map((a: any) => a.training_record_id));
      const unacked = activeRecords.filter((r: any) => !ackedIds.has(r.id));

      if (unacked.length === 0) {
        setPending([]);
        setLoading(false);
        onAllAcknowledged();
        return;
      }

      setPending(unacked.map((r: any) => ({
        id: r.id,
        courseNameAr: (r.training_courses as any)?.name_ar || '',
        courseNameEn: (r.training_courses as any)?.name_en || '',
        totalCost: r.total_cost || 0,
        startDate: r.start_date || '',
        endDate: r.end_date || '',
        provider: r.provider || '',
        validityYears: (r.training_courses as any)?.validity_years || 1,
      })));
      setLoading(false);
    };
    fetch();
  }, [employeeId]);

  const handleAcknowledge = async () => {
    if (!checked || !employeeId || pending.length === 0) return;
    setSubmitting(true);
    const inserts = pending.map(p => ({
      training_record_id: p.id,
      employee_id: employeeId,
    }));
    await supabase.from('training_acknowledgments').insert(inserts as any);
    toast({ title: ar ? 'تم الإقرار بنجاح' : 'Acknowledged successfully' });
    setPending([]);
    setSubmitting(false);
    onAllAcknowledged();
  };

  if (loading || pending.length === 0) return null;

  // Show first pending acknowledgment
  const current = pending[0];
  const courseName = ar ? current.courseNameAr : current.courseNameEn;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center p-4" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
      <div className="bg-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-border">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground text-center">
            {ar ? 'إيصال استلام نقدية' : 'Cash Receipt Acknowledgment'}
          </h2>
          <p className="text-sm text-muted-foreground text-center mt-1">
            {ar ? `(${pending.length} إقرار متبقي)` : `(${pending.length} pending)`}
          </p>
        </div>

        <ScrollArea className="flex-1 p-6">
          <div className={cn("text-sm leading-7 text-foreground whitespace-pre-wrap", isRTL && "text-right")}>
            {ar ? (
              <>
                أتعهد أنا الموقع أدناه أنني استلمت مبلغ <strong className="text-primary">{current.totalCost.toLocaleString()}</strong> جنيه وذلك لرغبتي في الحصول على دورة تدريبية <strong className="text-primary">{courseName}</strong> والمقامة في الفترة من <strong>{current.startDate}</strong> وحتى <strong>{current.endDate}</strong> والمقامة في <strong>{current.provider}</strong> وهذا المبلغ يمثل قيمة مصروفات الدورة المذكورة، وأقر بأنني قد تسلمت المبلغ المذكور من شركة لينك أيرو تريدنج إجنسي على سبيل الأمانة، ومستعد لرده فوراً حين طلب الشركة له وذلك في حالة تركي للعمل بالشركة قبل انقضاء <strong className="text-primary">{current.validityYears} {current.validityYears === 1 ? 'سنة' : current.validityYears <= 10 ? 'سنوات' : 'سنة'}</strong> من تاريخ انتهاء الدورة. وهذا إقرار مني باستلام المبلغ. مع كامل علمي بأحكام القوانين المنظمة لخيانة الأمانة وهذا إقرار مني بذلك.
              </>
            ) : (
              <>
                I, the undersigned, acknowledge that I have received the amount of <strong className="text-primary">{current.totalCost.toLocaleString()}</strong> EGP for the purpose of attending the training course <strong className="text-primary">{courseName}</strong> held from <strong>{current.startDate}</strong> to <strong>{current.endDate}</strong> at <strong>{current.provider}</strong>. This amount represents the expenses of the aforementioned course. I acknowledge that I have received the said amount from Link Aero Trading Agency in trust, and I am ready to return it immediately upon the company's request, in the event of my leaving the company before the expiration of <strong className="text-primary">{current.validityYears} year(s)</strong> from the end date of the course. This is my acknowledgment of receiving the amount, with full knowledge of the laws governing breach of trust.
              </>
            )}
          </div>
        </ScrollArea>

        <div className="p-6 border-t border-border space-y-4">
          <label className={cn("flex items-center gap-3 cursor-pointer", isRTL && "flex-row-reverse")}>
            <Checkbox checked={checked} onCheckedChange={(v) => setChecked(!!v)} />
            <span className="text-sm font-medium text-foreground">
              {ar ? 'أقر بذلك' : 'I acknowledge this'}
            </span>
          </label>
          <Button
            className="w-full"
            size="lg"
            disabled={!checked || submitting}
            onClick={handleAcknowledge}
          >
            {submitting ? (ar ? 'جاري الإرسال...' : 'Submitting...') : (ar ? 'موافق' : 'Confirm')}
          </Button>
        </div>
      </div>
    </div>
  );
};
