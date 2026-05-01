import { useState, useCallback } from 'react';
import { useReportExport } from '@/hooks/useReportExport';

/**
 * Wraps useReportExport to provide preview-then-download flow for PDF.
 * Consumers render <PdfPreviewDialog> with the returned state.
 */
export const usePdfPreview = () => {
  const exportApi = useReportExport();
  const [open, setOpen] = useState(false);
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingExport, setPendingExport] = useState<(() => Promise<void>) | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');

  const openPdfPreview = useCallback(async (
    opts: Parameters<typeof exportApi.exportToPDF>[0]
  ) => {
    setPreviewTitle(opts.title);
    setOpen(true);
    setLoading(true);
    setHtml(null);
    const generated = await exportApi.previewPDF(opts);
    if (!generated) {
      setOpen(false);
      setLoading(false);
      return;
    }
    setHtml(generated);
    setLoading(false);
    setPendingExport(() => () => exportApi.exportToPDF(opts));
  }, [exportApi]);

  const openBilingualPdfPreview = useCallback(async (
    opts: Parameters<typeof exportApi.exportBilingualPDF>[0]
  ) => {
    setPreviewTitle(`${opts.titleAr} — ${opts.titleEn}`);
    setOpen(true);
    setLoading(true);
    setHtml(null);
    const generated = await exportApi.previewBilingualPDF(opts);
    if (!generated) {
      setOpen(false);
      setLoading(false);
      return;
    }
    setHtml(generated);
    setLoading(false);
    setPendingExport(() => () => exportApi.exportBilingualPDF(opts));
  }, [exportApi]);

  const confirm = useCallback(async () => {
    if (!pendingExport) return;
    setOpen(false);
    await pendingExport();
    setPendingExport(null);
    setHtml(null);
  }, [pendingExport]);

  return {
    ...exportApi,
    pdfPreview: {
      open,
      setOpen,
      html,
      loading,
      title: previewTitle,
      confirm,
    },
    openPdfPreview,
    openBilingualPdfPreview,
  };
};
