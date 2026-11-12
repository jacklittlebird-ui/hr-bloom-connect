import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { applyRtlToXlsx } from '@/lib/xlsxRtl';

const buildWorkbook = () => {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['أ', 'ب'], ['1', '2']]), 'S1');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ الاسم: 'اختبار' }]), 'S2');
  return XLSX.write(wb, { bookType: 'xlsx', type: 'array', compression: true }) as ArrayBuffer;
};

const sheetXmls = async (data: ArrayBuffer | Uint8Array) => {
  const zip = await JSZip.loadAsync(data);
  const paths = Object.keys(zip.files).filter(p => /^xl\/worksheets\/[^/]+\.xml$/.test(p)).sort();
  return Promise.all(paths.map(async p => ({ path: p, xml: await zip.file(p)!.async('string') })));
};

describe('applyRtlToXlsx', () => {
  it('sets rightToLeft on every worksheet view', async () => {
    const patched = await applyRtlToXlsx(buildWorkbook());
    const sheets = await sheetXmls(patched);
    expect(sheets.length).toBe(2);
    for (const { xml } of sheets) {
      expect(xml).toContain('rightToLeft="1"');
    }
  });

  it('keeps cell data intact', async () => {
    const patched = await applyRtlToXlsx(buildWorkbook());
    const wb = XLSX.read(patched, { type: 'array' });
    const rows = XLSX.utils.sheet_to_json<string[]>(wb.Sheets['S1'], { header: 1 });
    expect(rows[0]).toEqual(['أ', 'ب']);
    expect(rows[1]).toEqual(['1', '2']);
  });

  it('is idempotent', async () => {
    const once = await applyRtlToXlsx(buildWorkbook());
    const twice = await applyRtlToXlsx(once);
    const sheets = await sheetXmls(twice);
    for (const { xml } of sheets) {
      expect(xml.match(/rightToLeft/g)?.length).toBe(1);
    }
  });
});
