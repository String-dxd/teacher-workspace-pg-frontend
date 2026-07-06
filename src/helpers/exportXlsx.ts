import { Workbook } from 'exceljs';

export interface XlsxColumn<Row> {
  key: keyof Row & string;
  header: string;
  format?: (value: Row[keyof Row]) => string;
}

export interface XlsxInput<Row> {
  columns: XlsxColumn<Row>[];
  rows: Row[];
  sheetName?: string;
}

export async function downloadXlsx<Row>(filename: string, input: XlsxInput<Row>): Promise<void> {
  const { columns, rows, sheetName } = input;
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet(sheetName ?? 'Sheet1');

  sheet.columns = columns.map((col) => ({
    header: col.header,
    key: col.key,
    width: Math.max(col.header.length + 4, 12),
  }));

  if (rows.length === 0) {
    const placeholderRow: Record<string, string> = {};
    placeholderRow[columns[0].key] = 'No records match the current filters';
    sheet.addRow(placeholderRow);
  } else {
    for (const row of rows) {
      const mapped: Record<string, string> = {};
      for (const col of columns) {
        const raw = row[col.key];
        if (raw === null || raw === undefined) {
          mapped[col.key] = '';
        } else {
          mapped[col.key] = col.format ? col.format(raw) : String(raw);
        }
      }
      sheet.addRow(mapped);
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
