import { Workbook } from 'exceljs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { downloadXlsx } from './exportXlsx';

function mockCreateObjectURL() {
  const urls: string[] = [];
  const original = URL.createObjectURL;
  URL.createObjectURL = vi.fn((blob: Blob) => {
    const url = `blob:mock-${urls.length}`;
    urls.push(url);
    return url;
  });
  URL.revokeObjectURL = vi.fn();
  return {
    urls,
    restore: () => {
      URL.createObjectURL = original;
    },
  };
}

describe('downloadXlsx', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('generates a workbook with correct column headers and row data', async () => {
    const mock = mockCreateObjectURL();
    const clickSpy = vi.fn();
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        return {
          click: clickSpy,
          href: '',
          download: '',
          style: {},
        } as unknown as HTMLAnchorElement;
      }
      return document.createElement(tag);
    });
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
    vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);

    await downloadXlsx('test.xlsx', {
      columns: [
        { key: 'name', header: 'Name' },
        { key: 'score', header: 'Score' },
      ],
      rows: [
        { name: 'Alice', score: '95' },
        { name: 'Bob', score: '87' },
      ],
    });

    expect(clickSpy).toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));

    // Parse the generated blob to verify content
    const blob = (URL.createObjectURL as ReturnType<typeof vi.fn>).mock.calls[0][0] as Blob;
    const buffer = await blob.arrayBuffer();
    const wb = new Workbook();
    await wb.xlsx.load(buffer);
    const sheet = wb.worksheets[0];

    expect(sheet.getRow(1).getCell(1).value).toBe('Name');
    expect(sheet.getRow(1).getCell(2).value).toBe('Score');
    expect(sheet.getRow(2).getCell(1).value).toBe('Alice');
    expect(sheet.getRow(2).getCell(2).value).toBe('95');
    expect(sheet.getRow(3).getCell(1).value).toBe('Bob');
    expect(sheet.getRow(3).getCell(2).value).toBe('87');

    mock.restore();
  });

  it('applies format functions to cell values', async () => {
    const mock = mockCreateObjectURL();
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        return {
          click: vi.fn(),
          href: '',
          download: '',
          style: {},
        } as unknown as HTMLAnchorElement;
      }
      return document.createElement(tag);
    });
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
    vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);

    await downloadXlsx('test.xlsx', {
      columns: [{ key: 'status', header: 'Status', format: (v) => (v as string).toUpperCase() }],
      rows: [{ status: 'read' }],
    });

    const blob = (URL.createObjectURL as ReturnType<typeof vi.fn>).mock.calls[0][0] as Blob;
    const buffer = await blob.arrayBuffer();
    const wb = new Workbook();
    await wb.xlsx.load(buffer);
    const sheet = wb.worksheets[0];

    expect(sheet.getRow(2).getCell(1).value).toBe('READ');
    mock.restore();
  });

  it('produces a file with a placeholder row when rows are empty', async () => {
    const mock = mockCreateObjectURL();
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        return {
          click: vi.fn(),
          href: '',
          download: '',
          style: {},
        } as unknown as HTMLAnchorElement;
      }
      return document.createElement(tag);
    });
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
    vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);

    await downloadXlsx('empty.xlsx', {
      columns: [
        { key: 'name', header: 'Name' },
        { key: 'class', header: 'Class' },
      ],
      rows: [],
    });

    const blob = (URL.createObjectURL as ReturnType<typeof vi.fn>).mock.calls[0][0] as Blob;
    const buffer = await blob.arrayBuffer();
    const wb = new Workbook();
    await wb.xlsx.load(buffer);
    const sheet = wb.worksheets[0];

    expect(sheet.getRow(2).getCell(1).value).toBe('No records match the current filters');
    mock.restore();
  });

  it('uses custom sheet name when provided', async () => {
    const mock = mockCreateObjectURL();
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        return {
          click: vi.fn(),
          href: '',
          download: '',
          style: {},
        } as unknown as HTMLAnchorElement;
      }
      return document.createElement(tag);
    });
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
    vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);

    await downloadXlsx('test.xlsx', {
      columns: [{ key: 'a', header: 'A' }],
      rows: [{ a: '1' }],
      sheetName: 'Read Status',
    });

    const blob = (URL.createObjectURL as ReturnType<typeof vi.fn>).mock.calls[0][0] as Blob;
    const buffer = await blob.arrayBuffer();
    const wb = new Workbook();
    await wb.xlsx.load(buffer);

    expect(wb.worksheets[0].name).toBe('Read Status');
    mock.restore();
  });
});
