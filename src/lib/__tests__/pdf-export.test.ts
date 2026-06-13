import { describe, it, expect, vi } from 'vitest';
import { PDFExportService } from '@/lib/reports/pdf-export';
import type { Report } from '@/lib/reports/types';

// Throwing factories: if either heavy library is loaded, the test fails loudly.
// The sync, lib-free paths must never trigger these dynamic imports.
vi.mock('jspdf', () => {
  throw new Error('jspdf must not be loaded for lib-free operations');
});
vi.mock('html2canvas', () => {
  throw new Error('html2canvas must not be loaded for lib-free operations');
});

const report = {
  type: 'marketing',
  createdAt: '2026-01-15T00:00:00.000Z',
  metadata: { websiteUrl: 'https://www.example.com' },
} as unknown as Report;

describe('PDFExportService — lazy loading (CON-99)', () => {
  it('generateFilename works without loading jsPDF or html2canvas', () => {
    const service = new PDFExportService();

    // Would throw if the heavy libs were imported at module load or in this path
    const filename = service.generateFilename(report);

    expect(filename).toBe('ConvertIQ_Marketing_Report_example.com_2026-01-15.pdf');
  });

  it('constructing the service does not load the heavy libraries', () => {
    expect(() => new PDFExportService()).not.toThrow();
  });
});
