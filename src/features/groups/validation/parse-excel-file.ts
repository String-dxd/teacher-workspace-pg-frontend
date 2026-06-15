import { Workbook } from 'exceljs';

export async function parseExcelFile<T = Record<string, unknown>>(file: File): Promise<T[]> {
  const buffer = await file.arrayBuffer();
  const workbook = new Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount === 0) return [];

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell((cell, colNumber) => {
    headers[colNumber] = String(cell.value ?? '');
  });

  const rows: T[] = [];
  for (let i = 2; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i);
    const obj: Record<string, unknown> = {};
    let hasValue = false;

    row.eachCell((cell, colNumber) => {
      const header = headers[colNumber];
      if (header) {
        obj[header] = cell.value ?? '';
        hasValue = true;
      }
    });

    if (hasValue) {
      for (const header of headers) {
        if (header && !(header in obj)) {
          obj[header] = '';
        }
      }
      rows.push(obj as T);
    }
  }

  return rows;
}
