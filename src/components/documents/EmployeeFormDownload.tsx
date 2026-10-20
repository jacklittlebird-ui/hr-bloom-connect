import { ReactNode, useRef, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { downloadEmployeeFormPdf, employeeFormPdfFilename } from '@/lib/employeeFormPdf';
import { toast } from 'sonner';

interface EmployeeFormDownloadProps {
  formName: string;
  employeeName: string;
  children: ReactNode;
}

export function EmployeeFormDownload({ formName, employeeName, children }: EmployeeFormDownloadProps) {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const preview = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const download = async () => {
    if (busy) return;
    const iframe = preview.current?.querySelector<HTMLIFrameElement>('iframe[srcdoc]');
    if (!iframe) {
      toast.error(ar ? 'انتظر حتى يكتمل تحميل النموذج' : 'Please wait for the form to load');
      return;
    }
    setBusy(true);
    try {
      await downloadEmployeeFormPdf(iframe, employeeFormPdfFilename(formName, employeeName));
    } catch {
      toast.error(ar ? 'تعذر تحميل PDF، يرجى المحاولة مرة أخرى' : 'Could not download PDF. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" onClick={download} disabled={busy} className="gap-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {busy ? (ar ? 'جاري تحميل PDF...' : 'Downloading PDF...') : (ar ? 'تحميل PDF' : 'Download PDF')}
        </Button>
      </div>
      <div ref={preview}>{children}</div>
    </div>
  );
}