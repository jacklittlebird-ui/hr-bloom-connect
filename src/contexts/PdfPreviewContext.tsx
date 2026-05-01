import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { PdfPreviewDialog } from '@/components/reports/PdfPreviewDialog';

interface PreviewRequest {
  html: string;
  title: string;
  onConfirm: () => Promise<void> | void;
}

interface Ctx {
  showPreview: (req: PreviewRequest) => void;
  isAvailable: true;
}

const PdfPreviewContext = createContext<Ctx | null>(null);

export const PdfPreviewProvider = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [html, setHtml] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [pending, setPending] = useState<(() => Promise<void> | void) | null>(null);

  const showPreview = useCallback((req: PreviewRequest) => {
    setHtml(req.html);
    setTitle(req.title);
    setPending(() => req.onConfirm);
    setOpen(true);
  }, []);

  const handleConfirm = useCallback(async () => {
    setOpen(false);
    if (pending) {
      try { await pending(); } catch (e) { console.error(e); }
    }
    setPending(null);
    setHtml(null);
  }, [pending]);

  const handleOpenChange = useCallback((v: boolean) => {
    setOpen(v);
    if (!v) {
      setPending(null);
      setHtml(null);
    }
  }, []);

  return (
    <PdfPreviewContext.Provider value={{ showPreview, isAvailable: true }}>
      {children}
      <PdfPreviewDialog
        open={open}
        onOpenChange={handleOpenChange}
        html={html}
        title={title}
        onConfirm={handleConfirm}
      />
    </PdfPreviewContext.Provider>
  );
};

export const usePdfPreviewContext = () => useContext(PdfPreviewContext);
