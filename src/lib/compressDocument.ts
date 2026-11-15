import { jsPDF } from 'jspdf';

export const MAX_DOC_BYTES = 400 * 1024;

const loadImage = (src: string) => new Promise<HTMLImageElement>((res, rej) => {
  const img = new Image(); img.onload = () => res(img); img.onerror = rej; img.src = src;
});

const canvasToJpeg = (c: HTMLCanvasElement, q: number) => c.toDataURL('image/jpeg', q);
const dataUrlBytes = (d: string) => Math.ceil((d.length - d.indexOf(',') - 1) * 3 / 4);

function drawScaled(src: CanvasImageSource, w: number, h: number, maxSide: number) {
  const s = Math.min(1, maxSide / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.round(w * s); c.height = Math.round(h * s);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

/** Compress images to JPEG and PDFs to an image-based PDF, both under MAX_DOC_BYTES. */
export async function compressDocument(file: File): Promise<{ blob: Blob; mime: string; ext: string }> {
  if (file.size <= MAX_DOC_BYTES && (file.type === 'application/pdf' || file.type.startsWith('image/'))) {
    return { blob: file, mime: file.type, ext: file.type === 'application/pdf' ? 'pdf' : (file.type.split('/')[1] || 'jpg') };
  }
  if (file.type.startsWith('image/')) {
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      for (const side of [2200, 1800, 1400, 1100, 900, 700]) {
        const c = drawScaled(img, img.naturalWidth, img.naturalHeight, side);
        for (const q of [0.85, 0.7, 0.55, 0.4]) {
          const d = canvasToJpeg(c, q);
          if (dataUrlBytes(d) <= MAX_DOC_BYTES) return { blob: await (await fetch(d)).blob(), mime: 'image/jpeg', ext: 'jpg' };
        }
      }
      throw new Error('too_large');
    } finally { URL.revokeObjectURL(url); }
  }
  if (file.type === 'application/pdf') {
    const pdfjs = await import('pdfjs-dist');
    const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    const pages: HTMLCanvasElement[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const vp = page.getViewport({ scale: 2 });
      const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
      await page.render({ canvas: c, canvasContext: c.getContext('2d')!, viewport: vp } as any).promise;
      pages.push(c);
    }
    for (const side of [1800, 1400, 1100, 900, 700, 550]) {
      for (const q of [0.75, 0.55, 0.4]) {
        const pdf = new jsPDF({ unit: 'px', compress: true });
        pages.forEach((p, i) => {
          const c = drawScaled(p, p.width, p.height, side);
          const fmt: [number, number] = [c.width, c.height];
          if (i === 0) { pdf.deletePage(1); }
          pdf.addPage(fmt, c.width > c.height ? 'l' : 'p');
          pdf.addImage(canvasToJpeg(c, q), 'JPEG', 0, 0, c.width, c.height);
        });
        const blob = pdf.output('blob');
        if (blob.size <= MAX_DOC_BYTES) return { blob, mime: 'application/pdf', ext: 'pdf' };
      }
    }
    throw new Error('too_large');
  }
  throw new Error('unsupported');
}
