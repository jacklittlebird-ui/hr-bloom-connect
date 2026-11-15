import { useCallback, useEffect, useRef, useState } from 'react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { Upload, Eye, Printer, Trash2, Loader2, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Employee } from '@/types/employee';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { compressDocument } from '@/lib/compressDocument';
import { formatDate } from '@/lib/utils';

const DOC_TYPES = [
  { key: 'national_id', label: 'الرقم القومي' },
  { key: 'birth_certificate', label: 'شهادة الميلاد' },
  { key: 'qualification', label: 'المؤهل الدراسي' },
  { key: 'driving_license', label: 'رخصة القيادة' },
  { key: 'other', label: 'أخرى' },
] as const;

interface DocRow { id: string; type: string; name: string; size_bytes: number | null; uploaded_at: string | null; mime_type: string | null }

async function invoke(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('employee-docs', { body });
  if (error) {
    const d = error instanceof FunctionsHttpError ? await error.context.text() : error.message;
    throw new Error(d);
  }
  return data;
}

const blobToBase64 = (b: Blob) => new Promise<string>((res, rej) => {
  const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(b);
});

export const EmployeeAttachmentsTab = ({ employee }: { employee: Employee }) => {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; mime: string; title: string } | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    const { data } = await supabase.from('employee_documents').select('id,type,name,size_bytes,uploaded_at,mime_type').eq('employee_id', employee.id);
    setDocs((data as DocRow[]) || []);
  }, [employee.id]);
  useEffect(() => { load(); }, [load]);

  const upload = async (type: string, label: string, file: File) => {
    setBusy(type);
    try {
      const { blob, mime, ext } = await compressDocument(file);
      await invoke({ action: 'upload', employee_id: employee.id, type, mime, file_name: `${label} - ${employee.nameAr}.${ext}`, data: await blobToBase64(blob) });
      toast.success(`تم رفع ${label} (${Math.round(blob.size / 1024)} كيلو)`);
      await load();
    } catch (e) {
      const m = (e as Error).message;
      toast.error(m === 'too_large' ? 'تعذر ضغط الملف لأقل من 400 كيلو' : m === 'unsupported' ? 'يُقبل PDF أو صور فقط' : 'فشل الرفع: ' + m);
    } finally { setBusy(null); }
  };

  const open = async (doc: DocRow, title: string, print = false) => {
    setBusy(doc.type);
    try {
      const r = await invoke({ action: 'view', id: doc.id });
      const bytes = Uint8Array.from(atob(r.data), c => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: r.mime }));
      if (print) {
        const w = window.open(url, '_blank');
        if (w) w.addEventListener('load', () => w.print());
      } else setPreview({ url, mime: r.mime, title });
    } catch (e) { toast.error('تعذر فتح الملف: ' + (e as Error).message); }
    finally { setBusy(null); }
  };

  const remove = async (doc: DocRow) => {
    if (!confirm('حذف هذا المستند؟')) return;
    setBusy(doc.type);
    try { await invoke({ action: 'delete', id: doc.id }); toast.success('تم الحذف'); await load(); }
    catch (e) { toast.error('فشل الحذف: ' + (e as Error).message); }
    finally { setBusy(null); }
  };

  return (
    <div className="p-4 md:p-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {DOC_TYPES.map(t => {
        const doc = docs.find(d => d.type === t.key);
        const loading = busy === t.key;
        return (
          <Card key={t.key}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <h3 className="font-bold">{t.label}</h3>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                {doc ? `مرفوع ${doc.uploaded_at ? formatDate(doc.uploaded_at) : ''} — ${Math.round((doc.size_bytes || 0) / 1024)} كيلو` : 'لم يُرفع بعد'}
              </p>
              <input type="file" accept="application/pdf,image/*" className="hidden" ref={el => { inputs.current[t.key] = el; }}
                onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) upload(t.key, t.label, f); }} />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" disabled={loading} onClick={() => inputs.current[t.key]?.click()}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {doc ? 'استبدال' : 'رفع'}
                </Button>
                {doc && <>
                  <Button size="sm" variant="outline" disabled={loading} onClick={() => open(doc, t.label)}><Eye className="w-4 h-4" />عرض</Button>
                  <Button size="sm" variant="outline" disabled={loading} onClick={() => open(doc, t.label, true)}><Printer className="w-4 h-4" />طباعة</Button>
                  <Button size="sm" variant="ghost" disabled={loading} onClick={() => remove(doc)} aria-label="حذف"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </>}
              </div>
            </CardContent>
          </Card>
        );
      })}
      <Dialog open={!!preview} onOpenChange={o => { if (!o && preview) { URL.revokeObjectURL(preview.url); setPreview(null); } }}>
        <DialogContent className="max-w-4xl h-[85dvh] flex flex-col">
          <DialogHeader><DialogTitle>{preview?.title}</DialogTitle></DialogHeader>
          {preview && (preview.mime === 'application/pdf'
            ? <iframe src={preview.url} title={preview.title} className="flex-1 w-full rounded border" />
            : <div className="flex-1 overflow-auto"><img src={preview.url} alt={preview.title} className="mx-auto max-w-full" /></div>)}
        </DialogContent>
      </Dialog>
    </div>
  );
};
