import { Workbook } from 'exceljs';
import { describe, expect, it } from 'vitest';

import { parseExcelFile } from './parse-excel-file';

async function createXlsxFile(
  rows: Record<string, unknown>[],
  options?: { multipleSheets?: Record<string, unknown>[] },
): Promise<File> {
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet('Sheet1');

  if (rows.length > 0) {
    const headers = Object.keys(rows[0]);
    sheet.addRow(headers);
    for (const row of rows) {
      sheet.addRow(headers.map((h) => row[h]));
    }
  }

  if (options?.multipleSheets) {
    const sheet2 = workbook.addWorksheet('Sheet2');
    const headers2 = Object.keys(options.multipleSheets[0]);
    sheet2.addRow(headers2);
    for (const row of options.multipleSheets) {
      sheet2.addRow(headers2.map((h) => row[h]));
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new File([buffer], 'test.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

describe('parseExcelFile', () => {
  it('parses a valid .xlsx file with Name and Class columns', async () => {
    const file = await createXlsxFile([
      { Name: 'Alice', Class: '3A' },
      { Name: 'Bob', Class: '3B' },
    ]);

    const result = await parseExcelFile<{ Name: string; Class: string }>(file);

    expect(result).toEqual([
      { Name: 'Alice', Class: '3A' },
      { Name: 'Bob', Class: '3B' },
    ]);
  });

  it('returns empty array for empty file', async () => {
    const workbook = new Workbook();
    workbook.addWorksheet('Sheet1');
    const buffer = await workbook.xlsx.writeBuffer();
    const file = new File([buffer], 'empty.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const result = await parseExcelFile(file);

    expect(result).toEqual([]);
  });

  it('rejects a corrupted file', async () => {
    const file = new File([new Uint8Array([0, 1, 2, 3])], 'bad.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    await expect(parseExcelFile(file)).rejects.toThrow();
  });

  it('only reads the first sheet', async () => {
    const file = await createXlsxFile([{ Name: 'Alice', Class: '3A' }], {
      multipleSheets: [{ Name: 'ShouldNotAppear', Class: '9Z' }],
    });

    const result = await parseExcelFile<{ Name: string; Class: string }>(file);

    expect(result).toEqual([{ Name: 'Alice', Class: '3A' }]);
  });

  it('handles a large file with 5000 rows', async () => {
    const rows = Array.from({ length: 5000 }, (_, i) => ({
      Name: `Student ${i + 1}`,
      Class: `${(i % 10) + 1}A`,
    }));
    const file = await createXlsxFile(rows);

    const result = await parseExcelFile<{ Name: string; Class: string }>(file);

    expect(result).toHaveLength(5000);
    expect(result[0]).toEqual({ Name: 'Student 1', Class: '1A' });
    expect(result[4999]).toEqual({ Name: 'Student 5000', Class: '10A' });
  });

  it('fills missing cells with empty string', async () => {
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet('Sheet1');
    sheet.addRow(['Name', 'Class']);
    sheet.addRow(['Alice', '3A']);
    sheet.addRow(['Bob']);

    const buffer = await workbook.xlsx.writeBuffer();
    const file = new File([buffer], 'sparse.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const result = await parseExcelFile<{ Name: string; Class: string }>(file);

    expect(result).toEqual([
      { Name: 'Alice', Class: '3A' },
      { Name: 'Bob', Class: '' },
    ]);
  });
});
