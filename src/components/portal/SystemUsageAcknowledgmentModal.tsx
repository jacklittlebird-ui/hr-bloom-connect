import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { usePortalEmployee } from '@/hooks/usePortalEmployee';
import { useEmployeeData } from '@/contexts/EmployeeDataContext';
import { ShieldCheck } from 'lucide-react';

const STORAGE_KEY = 'system_usage_ack';

export const SystemUsageAcknowledgmentModal = ({ onAcknowledged }: { onAcknowledged: () => void }) => {
  const employeeId = usePortalEmployee();
  const { getEmployee } = useEmployeeData();
  const employee = getEmployee(employeeId);
  const employeeName = employee?.nameAr || employee?.nameEn || '';

  const [checked, setChecked] = useState(false);

  // Check if already acknowledged
  const storageVal = localStorage.getItem(STORAGE_KEY);
  const alreadyAcked = storageVal ? JSON.parse(storageVal)?.[employeeId] === true : false;

  if (!employeeId || alreadyAcked) {
    // Auto-dismiss
    if (alreadyAcked) onAcknowledged();
    return null;
  }

  const handleConfirm = () => {
    const existing = storageVal ? JSON.parse(storageVal) : {};
    existing[employeeId] = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    onAcknowledged();
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-black/80 flex items-center justify-center p-4" style={{ direction: 'rtl' }}>
      <div className="bg-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-border">
        {/* Header */}
        <div className="p-6 border-b border-border text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <p className="text-lg text-muted-foreground">
            مرحبًا بك: <strong className="text-foreground">{employeeName}</strong>
          </p>
          <h2 className="text-xl font-bold text-foreground">
            إقرار استخدام النظام الإلكتروني للموارد البشرية
          </h2>
        </div>

        {/* Body */}
        <ScrollArea className="flex-1 p-6">
          <div className="text-sm leading-8 text-foreground whitespace-pre-wrap text-right">
            أقر أنا <strong className="text-primary">{employeeName}</strong> بأن جميع البيانات والمعلومات التي سأقوم بإدراجها داخل النظام صحيحة وكاملة وأتحمل المسؤولية الكاملة عنها.
            {'\n\n'}
            كما أقر بأن أي طلب أو إقرار أو عملية أو إجراء أقوم بها داخل النظام تعتبر بمثابة إقرار رسمي صادر مني وله ذات حجية التوقيع اليدوي.
            {'\n\n'}
            وأتعهد بالحفاظ على سرية بيانات الدخول الخاصة بي وعدم مشاركتها مع أي شخص آخر، وكذلك أتعهد بأن أحافظ على سرية بياناتي داخل النظام بجميع أقسامه وعدم مشاركتها مع أي شخص آخر أو أي جهة.
            {'\n\n'}
            وفي حالة مخالفة ذلك أتحمل المسؤولية القانونية والجنائية عن ذلك وأتعرض للمساءلة التأديبية والجنائية وفقاً للوائح الشركة والقوانين المعمول بها.
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-6 border-t border-border space-y-4">
          <label className="flex items-center gap-3 cursor-pointer flex-row-reverse">
            <Checkbox checked={checked} onCheckedChange={(v) => setChecked(!!v)} />
            <span className="text-sm font-medium text-foreground">
              أقر بأنني قرأت وفهمت جميع الشروط المذكورة أعلاه وأوافق عليها
            </span>
          </label>
          <Button
            className="w-full"
            size="lg"
            disabled={!checked}
            onClick={handleConfirm}
          >
            موافق
          </Button>
        </div>
      </div>
    </div>
  );
};
