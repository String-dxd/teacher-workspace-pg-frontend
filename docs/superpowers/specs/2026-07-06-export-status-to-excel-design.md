# Export Status to Excel

**Issue:** [#41](https://github.com/String-dxd/teacher-workspace-pg-frontend/issues/41)
**Date:** 2026-07-06

## Summary

Replace the existing CSV export in `RecipientReadTable` with XLSX export using the already-installed `exceljs` library. Add mobile detection to disable the export button on small viewports.

## 1. Export Helper — `src/helpers/exportXlsx.ts`

Generic helper mirroring the existing `exportCsv.ts` interface:

```ts
interface XlsxColumn<Row> {
  key: keyof Row & string;
  header: string;
  format?: (value: Row[keyof Row]) => string;
}

interface XlsxInput<Row> {
  columns: XlsxColumn<Row>[];
  rows: Row[];
  sheetName?: string;
}

function downloadXlsx<Row>(filename: string, input: XlsxInput<Row>): Promise<void>;
```

Behavior:

- Creates a `Workbook` + `Worksheet` via exceljs
- Maps `columns` to worksheet columns (header + auto-fit width)
- Adds rows from data
- If `rows` is empty, inserts a single placeholder row: "No records match the current filters"
- Generates a Blob via `workbook.xlsx.writeBuffer()` and triggers browser download

The existing `src/helpers/exportCsv.ts` and `src/helpers/exportCsv.test.ts` are deleted.

## 2. Mobile Detection — `src/hooks/useIsMobile.ts`

Simple hook:

- Uses `window.matchMedia('(max-width: 767px)')`
- Returns `boolean` (`true` = mobile)
- Listens to `change` event for resize/orientation
- SSR-safe (defaults to `false`)

## 3. Integration — `RecipientReadTable.tsx`

Changes:

- Import `downloadXlsx` instead of `toCsv` / `downloadCsv`
- Import `useIsMobile`
- `handleExport` becomes async, calls `downloadXlsx()` with existing filtered data pipeline
- Rename `buildCsvColumns` / `rowToCsv` to `buildExportColumns` / `rowToExport`
- Export button: `disabled={isMobile}`, `title="Not supported on mobile"` when disabled
- Update `aria-label` from "Export CSV" to "Export to Excel"
- File extension: `.csv` → `.xlsx`

No changes to: `ReadTrackingCards.tsx`, `RecipientFilterPopover.tsx`, filtering/sorting logic.

## 4. Testing

### `src/helpers/exportXlsx.test.ts`

- Generates workbook with correct column headers
- Row data maps through `format` functions correctly
- Empty rows produce file with placeholder row
- Download triggered with `.xlsx` filename

### `RecipientReadTable.test.tsx`

- Update existing export assertions from CSV to XLSX
- Mobile: button disabled at narrow viewport
- Mobile: tooltip shows "Not supported on mobile"

### Deleted

- `src/helpers/exportCsv.test.ts`

## 5. Error Handling

- Empty result: placeholder row in the exported file (not a toast/error)
- Mobile: button disabled with tooltip — no modal/dialog
- exceljs write failure: let the promise reject naturally (unlikely in practice since it's client-side buffer generation)

## 6. Scope Exclusions

- No "Export to CSV" option — XLSX only
- No server-side export — fully client-side
- No styling/formatting in the Excel file (no colors, borders, etc.) — just data
