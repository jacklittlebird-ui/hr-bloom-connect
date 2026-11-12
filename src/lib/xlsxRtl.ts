import * as XLSX from 'xlsx';
import JSZip from 'jszip';

/**
 * SheetJS (community edition) does not write sheet-view settings, so the
 * right-to-left flag must be patched into the xlsx XML after generation.
 * Takes the raw workbook bytes and returns new bytes with rightToLeft="1"
 * on every worksheet view.
 */
export const applyRtlToXlsx = async (data: ArrayBuffer | Uint8Array): Promise<Uint8Array> => {
  const zip = await JSZip.loadAsync(data);
  const sheetFiles = Object.keys(zip.files).filter(p => /^xl\/worksheets\/[^/]+\.xml$/.test(p));
  await Promise.all(sheetFiles.map(async path => {
    const entry = zip.file(path);
    if (!entry) return;
    let xml = await entry.async('string');
    if (xml.includes('rightToLeft')) return;
    if (/<sheetView\b[^>]*\/>/.test(xml)) {
      xml = xml.replace(/<sheetView\b([^>]*)\/>/, '<sheetView rightToLeft="1"$1/>');
    } else if (/<sheetView\b/.test(xml)) {
      xml = xml.replace(/<sheetView\b/, '<sheetView rightToLeft="1"');
    } else if (xml.includes('<sheetViews/>')) {
      xml = xml.replace('<sheetViews/>', '<sheetViews><sheetView workbookViewId="0" rightToLeft="1"/></sheetViews>');
    } else if (xml.includes('<sheetViews>')) {
      xml = xml.replace('<sheetViews>', '<sheetViews><sheetView workbookViewId="0" rightToLeft="1"/></sheetViews>');
    } else {
      // No sheetViews element: insert one in schema order (before sheetFormatPr/cols/sheetData)
      const anchor = xml.match(/<(sheetFormatPr|cols|sheetData)\b/);
      if (anchor) {
        xml = xml.replace(anchor[0], `<sheetViews><sheetView workbookViewId="0" rightToLeft="1"/></sheetViews>${anchor[0]}`);
      }
    }
    zip.file(path, xml);
  }));
  return zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
};

/** Writes the workbook, forces every sheet to right-to-left, and downloads it. */
export const writeXlsxRtl = async (wb: XLSX.WorkBook, fileName: string) => {
  const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array', compression: true }) as ArrayBuffer;
  const patched = await applyRtlToXlsx(data);
  const blob = new Blob([patched.buffer as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
};
