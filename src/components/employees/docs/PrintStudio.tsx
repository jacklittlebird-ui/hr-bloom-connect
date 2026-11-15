import { useEffect, useState } from 'react';
import { Printer, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';

export type SizePreset = 'card' | 'card15' | 'a5' | 'fit' | 'custom';
const PRESETS: { key: SizePreset; label: string; hint: string }[] = [
  { key: 'card', label: 'حجم البطاقة الطبيعي', hint: '8.56 × 5.4 سم' },
  { key: 'card15', label: 'بطاقة مكبّرة 1.5×', hint: '12.8 × 8.1 سم' },
  { key: 'a5', label: 'نصف صفحة', hint: 'عرض 14.8 سم' },
  { key: 'fit', label: 'ملء الصفحة', hint: 'مع الحفاظ على النسبة' },
  { key: 'custom', label: 'مقاس مخصص', hint: 'نسبة من الصفحة' },
];
const PAPERS = { A4: { w: 210, h: 297 }, A5: { w: 148, h: 210 } } as const;
type Paper = keyof typeof PAPERS;

/** Target box (mm) for the document on the printable area. */
export function targetBox(preset: SizePreset, paper: { w: number; h: number }, customPct: number, margin = 12) {
  const aw = paper.w - margin * 2, ah = paper.h - margin * 2;
  switch (preset) {
    case 'card': return { w: 85.6, h: 54 };
    case 'card15': return { w: 128.4, h: 81 };
    case 'a5': return { w: Math.min(148, aw), h: ah / 2 };
    case 'fit': return { w: aw, h: ah };
    case 'custom': return { w: aw * customPct / 100, h: ah * customPct / 100 };
  }
}

interface Props {
  open: boolean; onOpenChange: (o: boolean) => void;
  url: string; mime: string; title: string; employeeName: string; employeeCode?: string;
}

export const PrintStudio = ({ open, onOpenChange, url, mime, title, employeeName, employeeCode }: Props) => {
  const isPdf = mime === 'application/pdf';
  const [preset, setPreset] = useState<SizePreset>('card15');
  const [paper, setPaper] = useState<Paper>('A4');
  const [pos, setPos] = useState<'top' | 'center'>('top');
  const [custom, setCustom] = useState(60);
  const [rotate, setRotate] = useState(0);
  const [outline, setOutline] = useState(true);
  const [header, setHeader] = useState(true);
  const [ratio, setRatio] = useState(1.585);

  useEffect(() => {
    if (isPdf || !url) return;
    const img = new Image(); img.onload = () => setRatio(img.naturalWidth / img.naturalHeight || 1.585); img.src = url;
  }, [url, isPdf]);

  const p = PAPERS[paper];
  const box = targetBox(preset, p, custom);
  const r = rotate % 180 ? 1 / ratio : ratio;
  let w = box.w, h = w / r;
  if (h > box.h) { h = box.h; w = h * r; }
  const imgW = rotate % 180 ? h : w, imgH = rotate % 180 ? w : h;
  const today = new Date().toLocaleDateString('en-GB');

  const print = () => {
    if (isPdf) { const f = window.open(url, '_blank'); f?.addEventListener('load', () => f.print()); return; }
    const html = `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>${title} - ${employeeName}</title>
<style>@page{size:${paper} portrait;margin:12mm}html,body{margin:0;font-family:Arial,sans-serif}
.page{height:${p.h - 24}mm;display:flex;flex-direction:column;align-items:center;justify-content:${pos === 'top' ? 'flex-start' : 'center'}}
.hdr{width:100%;font-size:10pt;border-bottom:1px solid #999;padding-bottom:2mm;margin-bottom:5mm;display:flex;justify-content:space-between}
.box{width:${w}mm;height:${h}mm;display:flex;align-items:center;justify-content:center;${outline ? 'outline:0.3mm dashed #777;outline-offset:1.5mm;' : ''}}
img{width:${imgW}mm;height:${imgH}mm;transform:rotate(${rotate}deg)}</style></head><body><div class="page">
${header ? `<div class="hdr"><span>${title} — ${employeeName}${employeeCode ? ' (' + employeeCode + ')' : ''}</span><span>${today}</span></div>` : ''}
<div class="box"><img src="${url}"></div></div></body></html>`;
    const fr = document.createElement('iframe');
    fr.style.cssText = 'position:fixed;width:0;height:0;border:0;left:-9999px';
    document.body.appendChild(fr);
    const d = fr.contentDocument!; d.open(); d.write(html); d.close();
    const im = d.querySelector('img')!;
    const go = () => { fr.contentWindow?.focus(); fr.contentWindow?.print(); setTimeout(() => fr.remove(), 1500); };
    im.complete ? go() : (im.onload = go);
  };

  const scale = 220 / p.w; // preview px per mm
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90dvh] overflow-auto">
        <DialogHeader><DialogTitle>طباعة: {title}</DialogTitle></DialogHeader>
        {isPdf ? (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">ملف PDF يُطبع بإعدادات الطابعة (اختر المقاس ونسبة التكبير من نافذة الطباعة).</p>
        ) : (
          <div className="grid md:grid-cols-[1fr_auto] gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>مقاس الطباعة</Label>
                <div className="grid grid-cols-2 gap-2">
                  {PRESETS.map(o => (
                    <Button key={o.key} type="button" variant={preset === o.key ? 'default' : 'outline'} className="h-auto flex-col py-2" onClick={() => setPreset(o.key)}>
                      <span>{o.label}</span><span className="text-xs opacity-75">{o.hint}</span>
                    </Button>
                  ))}
                </div>
                {preset === 'custom' && <div className="pt-2"><Label>الحجم: {custom}%</Label><Slider min={20} max={100} step={5} value={[custom]} onValueChange={v => setCustom(v[0])} /></div>}
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <Label className="w-full">الورق والموضع</Label>
                {(['A4', 'A5'] as Paper[]).map(k => <Button key={k} size="sm" variant={paper === k ? 'default' : 'outline'} onClick={() => setPaper(k)}>{k}</Button>)}
                <Button size="sm" variant={pos === 'top' ? 'default' : 'outline'} onClick={() => setPos('top')}>أعلى الصفحة</Button>
                <Button size="sm" variant={pos === 'center' ? 'default' : 'outline'} onClick={() => setPos('center')}>المنتصف</Button>
                <Button size="sm" variant="outline" onClick={() => setRotate(x => (x + 90) % 360)}><RotateCw className="w-4 h-4" />تدوير</Button>
              </div>
              <div className="flex items-center justify-between"><Label>خط قص منقط حول المستند</Label><Switch checked={outline} onCheckedChange={setOutline} /></div>
              <div className="flex items-center justify-between"><Label>ترويسة (الاسم والكود والتاريخ)</Label><Switch checked={header} onCheckedChange={setHeader} /></div>
              <p className="text-xs text-muted-foreground">للمقاس الطبيعي اختر في نافذة الطابعة «الحجم الفعلي 100%».</p>
            </div>
            <div className="mx-auto border bg-background shadow-sm p-0" style={{ width: p.w * scale, height: p.h * scale }}>
              <div className="flex flex-col items-center h-full" style={{ padding: 12 * scale, justifyContent: pos === 'top' ? 'flex-start' : 'center' }}>
                {header && <div className="w-full border-b mb-2 text-[8px] text-muted-foreground truncate">{title} — {employeeName}</div>}
                <div className="flex items-center justify-center" style={{ width: w * scale, height: h * scale, outline: outline ? '1px dashed hsl(var(--muted-foreground))' : undefined }}>
                  <img src={url} alt="" style={{ width: imgW * scale, height: imgH * scale, transform: `rotate(${rotate}deg)` }} />
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="flex justify-end"><Button onClick={print}><Printer className="w-4 h-4" />طباعة</Button></div>
      </DialogContent>
    </Dialog>
  );
};
