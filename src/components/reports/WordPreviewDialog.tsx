import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Eye, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  html: string | null;
  loading?: boolean;
  title: string;
  onConfirm: () => void;
}

export const WordPreviewDialog = ({ open, onOpenChange, html, loading, title, onConfirm }: Props) => {
  const { isRTL } = useLanguage();
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!html) {
      setIframeUrl(null);
      return;
    }
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    setIframeUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [html]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0 flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader className="px-6 pt-5 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            {isRTL ? 'معاينة تنسيق Word' : 'Word Format Preview'}
            <span className="text-sm font-normal text-muted-foreground">— {title}</span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {isRTL
              ? 'هذه معاينة تقريبية تُحاكي ترويسة الشعار، الجدول، والتذييل والهوامش قبل التصدير الفعلي إلى Word.'
              : 'This is an approximate preview of the header, logo, table, footer and margins before exporting to Word.'}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-hidden bg-muted/30 p-3">
          {loading || !iframeUrl ? (
            <div className="h-full flex items-center justify-center text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              {isRTL ? 'جاري تجهيز المعاينة…' : 'Preparing preview…'}
            </div>
          ) : (
            <iframe
              src={iframeUrl}
              title="word-preview"
              className="w-full h-full bg-white rounded-md shadow-sm border"
            />
          )}
        </div>

        <DialogFooter className="px-6 py-3 border-t flex-row gap-2 sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isRTL ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button onClick={onConfirm} disabled={!html || loading} className="gap-2">
            <Download className="h-4 w-4" />
            {isRTL ? 'تأكيد وتنزيل Word' : 'Confirm & Download Word'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
