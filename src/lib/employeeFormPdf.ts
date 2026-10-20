export const employeeFormPdfFilename = (formName: string, employeeName: string) => {
  const safe = (value: string) => value.replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim();
  return `${safe(formName)} - ${safe(employeeName)}.pdf`;
};

export async function downloadEmployeeFormPdf(source: HTMLIFrameElement, filename: string) {
  const insuranceForm = source.title === 'form-01' || source.title === 'form-06';
  const sourceDoc = source.contentDocument;
  if (!sourceDoc || !sourceDoc.querySelector('.sheet, .page')) throw new Error('Form not ready');
  await sourceDoc.fonts.ready;
  // Copy the rendered preview, including contract pagination and current form values.
  const root = sourceDoc.documentElement.cloneNode(true) as HTMLElement;
  root.querySelectorAll('script').forEach(script => script.remove());
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:absolute;left:-10000px;top:0;width:794px;height:1123px;border:0;pointer-events:none;';
  try {
    const loaded = new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error('Form load timeout')), 15000);
      frame.onload = () => { window.clearTimeout(timer); resolve(); };
    });
    frame.srcdoc = `<!DOCTYPE html>${root.outerHTML}`;
    document.body.appendChild(frame);
    await loaded;
    const doc = frame.contentDocument;
    if (!doc) throw new Error('PDF document unavailable');
    await doc.fonts.ready;
    await Promise.all(Array.from(doc.images).map(async image => {
      if (image.src) await image.decode();
    }));
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pages = Array.from(doc.querySelectorAll<HTMLElement>('.sheet, .page'));
    for (const [index, page] of pages.entries()) {
      page.style.margin = '0 auto';
      page.style.boxShadow = 'none';
      // Native browser text layout preserves RTL baselines and digit-box alignment
      // in the insurance forms; the canvas text renderer shifts these glyphs.
      const canvas = await html2canvas(page, { scale: 2, useCORS: true, logging: false, windowWidth: 794, scrollX: 0, scrollY: 0, foreignObjectRendering: insuranceForm });
      const widthMm = page.getBoundingClientRect().width * 25.4 / 96;
      const heightMm = canvas.height / canvas.width * widthMm;
      const scale = Math.min(1, 210 / widthMm, 297 / heightMm);
      const width = widthMm * scale;
      if (index > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', (210 - width) / 2, 0, width, heightMm * scale);
      canvas.width = 0;
      canvas.height = 0;
    }
    pdf.save(filename);
  } finally {
    frame.remove();
  }
}