# Export Status to Excel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the CSV export in RecipientReadTable with XLSX export using exceljs, add mobile detection to disable the button, and handle empty results with a placeholder row.

**Architecture:** A generic `downloadXlsx` helper (mirrors the deleted `exportCsv.ts` interface) generates a workbook client-side via exceljs. A `useIsMobile` hook disables the export button on narrow viewports. The existing data pipeline (filtered rows + visible columns) stays unchanged.

**Tech Stack:** exceljs (already installed v4.4.0), React hooks, vitest + @testing-library/react

## Global Constraints

- Package manager: pnpm
- Formatter: oxfmt (not prettier)
- Linter: oxlint
- Test runner: vitest
- Path alias: `~` → `src/`
- Pre-commit: lefthook runs lint + format + typecheck in parallel
- GPG signing unavailable — use `git -c commit.gpgsign=false commit`

---

### Task 1: Create `exportXlsx` Helper with Tests

**Files:**

- Create: `src/helpers/exportXlsx.ts`
- Create: `src/helpers/exportXlsx.test.ts`
- Delete: `src/helpers/exportCsv.ts`
- Delete: `src/helpers/exportCsv.test.ts`

**Interfaces:**

- Consumes: `exceljs` (Workbook, Worksheet) — already installed
- Produces: `downloadXlsx<Row>(filename: string, input: XlsxInput<Row>): Promise<void>`, `XlsxColumn<Row>`, `XlsxInput<Row>` — consumed by Task 3

- [ ] **Step 1: Write the test file**

```ts
// src/helpers/exportXlsx.test.ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- src/helpers/exportXlsx.test.ts`
Expected: FAIL — module `./exportXlsx` not found

- [ ] **Step 3: Write the implementation**

```ts
// src/helpers/exportXlsx.ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- src/helpers/exportXlsx.test.ts`
Expected: All 4 tests PASS

- [ ] **Step 5: Delete CSV helper and its tests**

```bash
rm src/helpers/exportCsv.ts src/helpers/exportCsv.test.ts
```

- [ ] **Step 6: Run typecheck to confirm no other file imports exportCsv**

Run: `pnpm typecheck`
Expected: Error in `RecipientReadTable.tsx` (the import we'll fix in Task 3). No other files should reference exportCsv.

- [ ] **Step 7: Commit**

```bash
git add src/helpers/exportXlsx.ts src/helpers/exportXlsx.test.ts
git -c commit.gpgsign=false commit -m "feat(export): add downloadXlsx helper with tests (#41)"
```

---

### Task 2: Create `useIsMobile` Hook with Tests

**Files:**

- Create: `src/hooks/useIsMobile.ts`
- Create: `src/hooks/useIsMobile.test.ts`

**Interfaces:**

- Consumes: nothing
- Produces: `useIsMobile(): boolean` — consumed by Task 3

- [ ] **Step 1: Write the test file**

```ts
// src/hooks/useIsMobile.test.ts
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useIsMobile } from './useIsMobile';

describe('useIsMobile', () => {
  let listeners: Array<(e: { matches: boolean }) => void>;
  let matchesMock: boolean;

  beforeEach(() => {
    listeners = [];
    matchesMock = false;
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: matchesMock,
        media: query,
        addEventListener: (_event: string, cb: (e: { matches: boolean }) => void) => {
          listeners.push(cb);
        },
        removeEventListener: (_event: string, cb: (e: { matches: boolean }) => void) => {
          listeners = listeners.filter((l) => l !== cb);
        },
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns false on desktop viewport', () => {
    matchesMock = false;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('returns true on mobile viewport', () => {
    matchesMock = true;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('reacts to viewport changes', () => {
    matchesMock = false;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    act(() => {
      for (const cb of listeners) cb({ matches: true });
    });
    expect(result.current).toBe(true);
  });

  it('cleans up listener on unmount', () => {
    matchesMock = false;
    const { unmount } = renderHook(() => useIsMobile());
    expect(listeners.length).toBe(1);
    unmount();
    expect(listeners.length).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- src/hooks/useIsMobile.test.ts`
Expected: FAIL — module `./useIsMobile` not found

- [ ] **Step 3: Write the implementation**

```ts
// src/hooks/useIsMobile.ts
import { useEffect, useState } from 'react';

const MOBILE_QUERY = '(max-width: 767px)';

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(MOBILE_QUERY).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const handler = (e: MediaQueryListEvent | { matches: boolean }) => {
      setIsMobile(e.matches);
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return isMobile;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- src/hooks/useIsMobile.test.ts`
Expected: All 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useIsMobile.ts src/hooks/useIsMobile.test.ts
git -c commit.gpgsign=false commit -m "feat(hooks): add useIsMobile hook with tests (#41)"
```

---

### Task 3: Integrate XLSX Export + Mobile Disabled State into RecipientReadTable

**Files:**

- Modify: `src/features/posts/components/RecipientReadTable.tsx`

**Interfaces:**

- Consumes: `downloadXlsx` from `~/helpers/exportXlsx`, `useIsMobile` from `~/hooks/useIsMobile`
- Produces: Updated `RecipientReadTable` component (no external interface change)

- [ ] **Step 1: Update imports**

Replace line 17:

```ts
import { downloadCsv, toCsv, type CsvColumn } from '~/helpers/exportCsv';
```

with:

```ts
import { downloadXlsx, type XlsxColumn } from '~/helpers/exportXlsx';
import { useIsMobile } from '~/hooks/useIsMobile';
```

- [ ] **Step 2: Rename `buildCsvColumns` to `buildExportColumns`**

At line 447, rename the function and change its return type:

```ts
function buildExportColumns(
  columns: ColumnVisibility,
  isForm: boolean,
  tsLabel: string,
): XlsxColumn<Record<string, string>>[] {
  const out: XlsxColumn<Record<string, string>>[] = [{ key: 'studentName', header: 'Student' }];
  if (columns.indexNumber) out.push({ key: 'indexNumber', header: 'Index No.' });
  out.push({ key: 'classLabel', header: 'Class' });
  out.push({ key: 'status', header: 'Status' });
  if (columns.timestamp) out.push({ key: 'timestamp', header: tsLabel });
  if (columns.parentGuardian) {
    out.push({ key: 'parentGuardian', header: 'Parent / Guardian' });
    if (isForm) {
      out.push({ key: 'parentType', header: 'Relationship' });
      out.push({ key: 'contactNumber', header: 'Contact No.' });
    }
  }
  if (columns.pgStatus && isForm) out.push({ key: 'pgStatus', header: 'PG Status' });
  return out;
}
```

- [ ] **Step 3: Rename `rowToCsv` to `rowToExport`**

At line 405, rename the function (body stays the same):

```ts
function rowToExport(
  recipient: Recipient | ConsentFormRecipient,
  responseType: ResponseType | 'acknowledge' | 'yes-no',
  isForm: boolean,
): Record<string, string> {
```

- [ ] **Step 4: Update `handleExport` to use XLSX**

Replace lines 508-514:

```ts
const handleExport = async () => {
  const exportCols = buildExportColumns(filter.columns, isForm, tsLabel);
  const rows = filteredRecipients.map((r) => rowToExport(r, responseType, isForm));
  const today = new Date().toISOString().slice(0, 10);
  const stem = props.exportId ? `recipients-${props.exportId}-${today}` : `recipients-${today}`;
  await downloadXlsx(`${stem}.xlsx`, { columns: exportCols, rows });
};
```

- [ ] **Step 5: Add `useIsMobile` to the component and update Toolbar props**

Inside `RecipientReadTable` function body (after `const isForm = ...`):

```ts
const isMobile = useIsMobile();
```

Update the `Toolbar` component's props type to accept `disabled`:

```ts
function Toolbar({
  filter,
  onFilterChange,
  classOptions,
  responseType,
  showPgStatus,
  timestampLabel,
  showParentGuardian,
  onExport,
  exportDisabled,
}: {
  filter: RecipientFilterValue;
  onFilterChange: (next: RecipientFilterValue) => void;
  classOptions: string[];
  responseType: ResponseType | 'acknowledge' | 'yes-no';
  showPgStatus: boolean;
  timestampLabel: string;
  showParentGuardian: boolean;
  onExport: () => void;
  exportDisabled?: boolean;
}) {
```

- [ ] **Step 6: Update the Export button in Toolbar**

Replace line 134-137:

```tsx
<Button
  variant="ghost"
  size="sm"
  onClick={onExport}
  disabled={exportDisabled}
  title={exportDisabled ? 'Not supported on mobile' : undefined}
  aria-label="Export to Excel"
>
  <Download className="h-4 w-4" />
  Export
</Button>
```

- [ ] **Step 7: Pass `exportDisabled` from RecipientReadTable to Toolbar**

Update the `<Toolbar>` JSX (around line 518):

```tsx
<Toolbar
  filter={filter}
  onFilterChange={onFilterChange}
  classOptions={classOptions}
  responseType={responseType}
  showPgStatus={isForm}
  timestampLabel={tsLabel}
  showParentGuardian={true}
  onExport={handleExport}
  exportDisabled={isMobile}
/>
```

- [ ] **Step 8: Update section comment**

Replace `// ─── CSV export ───` comment (line 403) with:

```ts
// ─── Export helpers ──────────────────────────────────────────────────────────
```

- [ ] **Step 9: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS (no type errors)

- [ ] **Step 10: Run full test suite**

Run: `pnpm test`
Expected: All tests PASS (no other file imported exportCsv)

- [ ] **Step 11: Commit**

```bash
git add src/features/posts/components/RecipientReadTable.tsx
git rm src/helpers/exportCsv.ts src/helpers/exportCsv.test.ts
git -c commit.gpgsign=false commit -m "feat(export): replace CSV with XLSX export, add mobile disabled state (#41)"
```
