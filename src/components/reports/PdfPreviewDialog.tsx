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

/**
 * Generic PDF preview dialog — renders the same HTML used by the PDF
 * exporter inside an iframe so the user can inspect header, logo,
 * table layout and margins before downloading.
 */
export const PdfPreviewDialog = ({ open, onOpenChange, html, loading, title, onConfirm }: Props) => {
  const { isRTL } = useLanguage();
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!html) {
      setIframeUrl(null);
      return;
    }
    // Wrap the report HTML in a minimal page so fonts & direction render correctly
    const wrapped = `<!DOCTYPE html>
<html dir="${isRTL ? 'rtl' : 'ltr'}">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Baloo+Bhaijaan+2:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    html, body { margin: 0; padding: 0; background: #f1f5f9; }
    body { font-family: 'Baloo Bhaijaan 2', 'Cairo', Arial, sans-serif; }
    .a4 { background: #ffffff; margin: 16px auto; box-shadow: 0 2px 8px rgba(0,0,0,0.08); width: 1100px; max-width: 100%; }
  </style>
</head>
<body>
  <div class="a4">${html}</div>
</body>
</html>`;
    const blob = new Blob([wrapped], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    setIframeUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [html, isRTL, title]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0 flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader className="px-6 pt-5 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            {isRTL ? 'معاينة PDF' : 'PDF Preview'}
            <span className="text-sm font-normal text-muted-foreground">— {title}</span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {isRTL
              ? 'معاينة قبل الحفظ تُحاكي الترويسة والشعار والجدول والهوامش.'
              : 'Pre-save preview showing the header, logo, table and margins.'}
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
              title="pdf-preview"
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
            {isRTL ? 'تأكيد وحفظ PDF' : 'Confirm & Save PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
