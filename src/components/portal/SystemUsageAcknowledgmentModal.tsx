import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!employeeId) return;
    try {
      const storageVal = localStorage.getItem(STORAGE_KEY);
      const parsed = storageVal ? JSON.parse(storageVal) : {};
      if (parsed[employeeId] === true) {
        onAcknowledged();
      } else {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, [employeeId, onAcknowledged]);

  const handleConfirm = () => {
    try {
      const storageVal = localStorage.getItem(STORAGE_KEY);
      const existing = storageVal ? JSON.parse(storageVal) : {};
      existing[employeeId] = true;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    } catch { /* ignore */ }
    setVisible(false);
    onAcknowledged();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-black/80 flex items-center justify-center p-4" style={{ direction: 'rtl' }}>
      <div className="bg-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-border overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-border text-center space-y-2 shrink-0">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-7 h-7 text-primary" />
          </div>
          <p className="text-base text-muted-foreground">
            مرحبًا بك: <strong className="text-foreground">{employeeName}</strong>
          </p>
          <h2 className="text-lg font-bold text-foreground">
            إقرار استخدام النظام الإلكتروني للموارد البشرية
          </h2>
        </div>

        {/* Body - scrollable */}
        <div className="flex-1 min-h-0 overflow-auto p-5">
          <div className="text-sm leading-8 text-foreground text-right space-y-4">
            <p>
              أقر أنا <strong className="text-primary">{employeeName}</strong> بأن جميع البيانات والمعلومات التي سأقوم بإدراجها داخل النظام صحيحة وكاملة وأتحمل المسؤولية الكاملة عنها.
            </p>
            <p>
              كما أقر بأن أي طلب أو إقرار أو عملية أو إجراء أقوم بها داخل النظام تعتبر بمثابة إقرار رسمي صادر مني وله ذات حجية التوقيع اليدوي.
            </p>
            <p>
              وأتعهد بالحفاظ على سرية بيانات الدخول الخاصة بي وعدم مشاركتها مع أي شخص آخر، وكذلك أتعهد بأن أحافظ على سرية بياناتي داخل النظام بجميع أقسامه وعدم مشاركتها مع أي شخص آخر أو أي جهة.
            </p>
            <p>
              وفي حالة مخالفة ذلك أتحمل المسؤولية القانونية والجنائية عن ذلك وأتعرض للمساءلة التأديبية والجنائية وفقاً للوائح الشركة والقوانين المعمول بها.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border space-y-3 shrink-0">
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
