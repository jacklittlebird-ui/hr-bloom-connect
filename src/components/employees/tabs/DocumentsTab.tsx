import { Suspense, lazy } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Employee } from '@/types/employee';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Form01 = lazy(() => import('@/components/documents/Form01').then(m => ({ default: m.Form01 })));
const Form06 = lazy(() => import('@/components/documents/Form06').then(m => ({ default: m.Form06 })));
const EmploymentContract = lazy(() => import('@/components/documents/EmploymentContract').then(m => ({ default: m.EmploymentContract })));
const ClearanceCertificate = lazy(() => import('@/components/documents/ClearanceCertificate').then(m => ({ default: m.ClearanceCertificate })));
const ExperienceCertificate = lazy(() => import('@/components/documents/ExperienceCertificate').then(m => ({ default: m.ExperienceCertificate })));
const MutualTermination = lazy(() => import('@/components/documents/MutualTermination').then(m => ({ default: m.MutualTermination })));
const FinalSettlement = lazy(() => import('@/components/documents/FinalSettlement').then(m => ({ default: m.FinalSettlement })));
const EmployeeDataForm = lazy(() => import('@/components/documents/EmployeeDataForm').then(m => ({ default: m.EmployeeDataForm })));

const DOC_TABS = [
  { key: 'form01', ar: 'استمارة 1', en: 'Form 1', Comp: Form01 },
  { key: 'form06', ar: 'استمارة 6', en: 'Form 6', Comp: Form06 },
  { key: 'contract', ar: 'عقد عمل', en: 'Employment Contract', Comp: EmploymentContract },
  { key: 'clearance', ar: 'إخلاء طرف', en: 'Clearance', Comp: ClearanceCertificate },
  { key: 'experience', ar: 'شهادة خبرة', en: 'Experience Certificate', Comp: ExperienceCertificate },
  { key: 'mutual', ar: 'إنهاء علاقة عمل بالتراضي', en: 'Mutual Termination', Comp: MutualTermination },
  { key: 'settlement', ar: 'مخالصة نهائية', en: 'Final Settlement', Comp: FinalSettlement },
  { key: 'dataForm', ar: 'نموذج بيانات موظف', en: 'Employee Data Form', Comp: EmployeeDataForm },
] as const;

interface DocumentsTabProps {
  employee: Employee;
}

export const DocumentsTab = ({ employee }: DocumentsTabProps) => {
  const { language } = useLanguage();
  const ar = language === 'ar';

  return (
    <div className="p-4 md:p-6 space-y-4">
      <Tabs defaultValue={DOC_TABS[0].key} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          {DOC_TABS.map(t => (
            <TabsTrigger key={t.key} value={t.key}>{ar ? t.ar : t.en}</TabsTrigger>
          ))}
        </TabsList>
        {DOC_TABS.map(({ key, Comp }) => (
          <TabsContent key={key} value={key}>
            <Suspense fallback={<div className="p-8 text-center text-muted-foreground">{ar ? 'جاري التحميل...' : 'Loading...'}</div>}>
              <Comp employee={employee} />
            </Suspense>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
