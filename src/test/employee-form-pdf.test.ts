import { describe, expect, it } from 'vitest';
import { employeeFormPdfFilename } from '@/lib/employeeFormPdf';

describe('Employee form PDF filename', () => {
  it('includes the form name followed by the employee name', () => {
    expect(employeeFormPdfFilename('استقالة', 'أحمد محمد')).toBe('استقالة - أحمد محمد.pdf');
  });
  it('supports English names and removes unsafe filename characters', () => {
    expect(employeeFormPdfFilename('Form 1', 'Jack/Isaac')).toBe('Form 1 - Jack Isaac.pdf');
  });
});