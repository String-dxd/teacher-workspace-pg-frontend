import { Download, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  Badge,
  Button,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui';
import type { ConsentFormRecipient, Recipient, ResponseType } from '~/data/posts-registry';
import { formatDate } from '~/helpers/dateTime';
import { downloadXlsx, type XlsxColumn } from '~/helpers/exportXlsx';
import { useIsMobile } from '~/hooks/useIsMobile';

import {
  countActiveFilters,
  DEFAULT_RECIPIENT_FILTER,
  isQuestionColumnVisible,
  RecipientColumnPopover,
  RecipientFilterPopover,
  type ColumnVisibility,
  type PgStatusFilter,
  type QuestionColumn,
  type RecipientFilterValue,
  type StatusFilter,
} from './RecipientFilterPopover';

type FilterControlProps =
  | { filter: RecipientFilterValue; onFilterChange: (next: RecipientFilterValue) => void }
  | { filter?: undefined; onFilterChange?: undefined };

type RecipientReadTableProps = FilterControlProps &
  (
    | {
        kind?: 'announcement';
        recipients: Recipient[];
        responseType: ResponseType;
        exportId?: string;
      }
    | {
        kind: 'form';
        recipients: ConsentFormRecipient[];
        responseType: 'acknowledge' | 'yes-no';
        exportId?: string;
        /** The form's custom questions, each rendered as a toggleable answer column. */
        questions?: QuestionColumn[];
      }
  );

// ─── Toolbar ──────────────────────────────────────────────────────────────────

function Toolbar({
  filter,
  onFilterChange,
  classOptions,
  responseType,
  showPgStatus,
  timestampLabel,
  showParentGuardian,
  questions,
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
  questions: QuestionColumn[];
  onExport: () => void;
  exportDisabled?: boolean;
}) {
  const active = countActiveFilters(filter);

  const chips: { key: 'classId' | 'status' | 'pg'; label: string }[] = [];
  if (filter.classId !== 'all') chips.push({ key: 'classId', label: `Class: ${filter.classId}` });
  if (filter.status !== 'all') {
    const statusLabels: Record<StatusFilter, string> = {
      all: 'All',
      read: 'Read',
      unread: 'Unread',
      acknowledged: 'Acknowledged',
      pending: 'Pending',
      yes: 'Yes',
      no: 'No',
      'no-response': 'No Response',
    };
    chips.push({ key: 'status', label: `Status: ${statusLabels[filter.status]}` });
  }
  if (filter.pg !== 'all') {
    const pgLabels: Record<PgStatusFilter, string> = {
      all: 'All',
      onboarded: 'Onboarded',
      'not-onboarded': 'Not Onboarded',
    };
    chips.push({ key: 'pg', label: `PG: ${pgLabels[filter.pg]}` });
  }

  function clearChip(key: 'classId' | 'status' | 'pg') {
    const defaults: Pick<RecipientFilterValue, 'classId' | 'status' | 'pg'> = {
      classId: 'all',
      status: 'all',
      pg: 'all',
    };
    onFilterChange({ ...filter, [key]: defaults[key] });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-9 pl-9 text-sm"
            placeholder="Search students…"
            value={filter.search}
            onChange={(e) => onFilterChange({ ...filter, search: e.target.value })}
          />
        </div>

        <RecipientFilterPopover
          value={filter}
          onChange={onFilterChange}
          classOptions={classOptions}
          responseType={responseType}
          showPgStatus={showPgStatus}
        />

        <RecipientColumnPopover
          value={filter.columns}
          onChange={(columns) => onFilterChange({ ...filter, columns })}
          timestampLabel={timestampLabel}
          showParentGuardian={showParentGuardian}
          questions={questions}
        />

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
      </div>

      {active > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 rounded-full border border-twblue-6 bg-twblue-3 px-2.5 py-0.5 text-xs font-medium text-twblue-11"
            >
              {chip.label}
              <button
                className="ml-0.5 cursor-pointer rounded-full hover:bg-twblue-4"
                onClick={() => clearChip(chip.key)}
                aria-label={`Remove ${chip.label} filter`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Status cell renderer ─────────────────────────────────────────────────────

function StatusCell({
  responseType,
  recipient,
}: {
  responseType: ResponseType | 'acknowledge' | 'yes-no';
  recipient: Recipient | ConsentFormRecipient;
}) {
  if (responseType === 'view-only') {
    const r = recipient as Recipient;
    return r.readStatus === 'read' ? (
      <Badge variant="success">Read</Badge>
    ) : (
      <span className="text-sm text-muted-foreground">Unread</span>
    );
  }

  if (responseType === 'acknowledge') {
    const isForm = 'response' in recipient;
    if (isForm) {
      const r = recipient as ConsentFormRecipient;
      return r.response === 'YES' ? (
        <Badge variant="success">Acknowledged</Badge>
      ) : (
        <span className="text-sm text-muted-foreground">Pending</span>
      );
    } else {
      const r = recipient as Recipient;
      return r.acknowledgedAt ? (
        <Badge variant="success">Acknowledged</Badge>
      ) : (
        <span className="text-sm text-muted-foreground">Pending</span>
      );
    }
  }

  // yes-no
  const isForm = 'response' in recipient;
  if (isForm) {
    const r = recipient as ConsentFormRecipient;
    return r.response === 'YES' ? (
      <Badge variant="success">Yes</Badge>
    ) : r.response === 'NO' ? (
      <Badge variant="destructive">No</Badge>
    ) : (
      <span className="text-sm text-muted-foreground">No Response</span>
    );
  } else {
    const r = recipient as Recipient;
    return r.formResponse === 'yes' ? (
      <Badge variant="success">Yes</Badge>
    ) : r.formResponse === 'no' ? (
      <Badge variant="destructive">No</Badge>
    ) : (
      <span className="text-sm text-muted-foreground">No Response</span>
    );
  }
}

// ─── Derived "status" for filtering ──────────────────────────────────────────

function deriveStatus(
  responseType: ResponseType | 'acknowledge' | 'yes-no',
  recipient: Recipient | ConsentFormRecipient,
): StatusFilter {
  if (responseType === 'view-only') {
    return (recipient as Recipient).readStatus === 'read' ? 'read' : 'unread';
  }
  if (responseType === 'acknowledge') {
    const isForm = 'response' in recipient;
    if (isForm) {
      const r = recipient as ConsentFormRecipient;
      return r.response === 'YES' ? 'acknowledged' : 'pending';
    } else {
      const r = recipient as Recipient;
      return r.acknowledgedAt ? 'acknowledged' : 'pending';
    }
  }
  // yes-no
  const isForm = 'response' in recipient;
  if (isForm) {
    const r = recipient as ConsentFormRecipient;
    return r.response === 'YES' ? 'yes' : r.response === 'NO' ? 'no' : 'no-response';
  } else {
    const r = recipient as Recipient;
    return r.formResponse === 'yes' ? 'yes' : r.formResponse === 'no' ? 'no' : 'no-response';
  }
}

// ─── Sort helpers ─────────────────────────────────────────────────────────────

function sortRecipients(
  rows: (Recipient | ConsentFormRecipient)[],
  responseType: ResponseType | 'acknowledge' | 'yes-no',
): (Recipient | ConsentFormRecipient)[] {
  return [...rows].sort((a, b) => {
    const aStatus = deriveStatus(responseType, a);
    const bStatus = deriveStatus(responseType, b);
    const aPending = aStatus === 'unread' || aStatus === 'pending' || aStatus === 'no-response';
    const bPending = bStatus === 'unread' || bStatus === 'pending' || bStatus === 'no-response';
    if (aPending !== bPending) return aPending ? -1 : 1;
    return a.studentName.localeCompare(b.studentName);
  });
}

// ─── Timestamp resolver ───────────────────────────────────────────────────────

function resolveTimestamp(
  responseType: ResponseType | 'acknowledge' | 'yes-no',
  recipient: Recipient | ConsentFormRecipient,
): string | null | undefined {
  if (responseType === 'view-only') {
    const r = recipient as Recipient;
    return r.readStatus === 'read' ? r.respondedAt : undefined;
  }
  if (responseType === 'acknowledge') {
    const isForm = 'response' in recipient;
    if (isForm) {
      return (recipient as ConsentFormRecipient).respondedAt;
    } else {
      return (recipient as Recipient).acknowledgedAt;
    }
  }
  // yes-no
  const isForm = 'response' in recipient;
  return isForm
    ? (recipient as ConsentFormRecipient).respondedAt
    : (recipient as Recipient).respondedAt;
}

// ─── Timestamp column label ───────────────────────────────────────────────────

function timestampLabel(responseType: ResponseType | 'acknowledge' | 'yes-no'): string {
  if (responseType === 'view-only') return 'Read At';
  if (responseType === 'acknowledge') return 'Acknowledged At';
  return 'Responded At';
}

// ─── Unified table ────────────────────────────────────────────────────────────

function UnifiedTable({
  recipients,
  responseType,
  columns,
  isForm,
  questions,
}: {
  recipients: (Recipient | ConsentFormRecipient)[];
  responseType: ResponseType | 'acknowledge' | 'yes-no';
  columns: ColumnVisibility;
  isForm: boolean;
  questions: QuestionColumn[];
}) {
  const tsLabel = timestampLabel(responseType);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Student</TableHead>
          {columns.indexNumber && <TableHead>Index No.</TableHead>}
          <TableHead>Class</TableHead>
          <TableHead>Status</TableHead>
          {questions.map((q) => (
            <TableHead key={q.id}>{q.text}</TableHead>
          ))}
          {columns.timestamp && <TableHead>{tsLabel}</TableHead>}
          {columns.parentGuardian && <TableHead>Parent / Guardian</TableHead>}
          {columns.pgStatus && isForm && <TableHead>Status</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {recipients.map((recipient) => {
          const ts = resolveTimestamp(responseType, recipient);
          const indexNo =
            'indexNumber' in recipient
              ? (recipient as ConsentFormRecipient).indexNumber
              : undefined;
          const replyByParent = (recipient as Recipient | ConsentFormRecipient).replyByParent;
          const parentType =
            'parentType' in recipient ? (recipient as ConsentFormRecipient).parentType : undefined;
          const contactNumber =
            'contactNumber' in recipient
              ? (recipient as ConsentFormRecipient).contactNumber
              : undefined;
          const pgStatus =
            'pgStatus' in recipient ? (recipient as ConsentFormRecipient).pgStatus : undefined;

          return (
            <TableRow key={recipient.studentId}>
              <TableCell className="font-medium">{recipient.studentName}</TableCell>
              {columns.indexNumber && (
                <TableCell className="text-muted-foreground tabular-nums">
                  {indexNo ?? '—'}
                </TableCell>
              )}
              <TableCell>
                <Badge variant="secondary">{recipient.classLabel}</Badge>
              </TableCell>
              <TableCell>
                <StatusCell responseType={responseType} recipient={recipient} />
              </TableCell>
              {questions.map((q) => {
                const answer = isForm
                  ? (recipient as ConsentFormRecipient).questionAnswers?.[q.id]
                  : undefined;
                return (
                  <TableCell key={q.id} className="text-muted-foreground">
                    {answer ?? '—'}
                  </TableCell>
                );
              })}
              {columns.timestamp && (
                <TableCell className="text-muted-foreground tabular-nums">
                  {ts ? (formatDate(ts) ?? '—') : '—'}
                </TableCell>
              )}
              {columns.parentGuardian && (
                <TableCell className="text-muted-foreground">
                  {replyByParent ? (
                    <div className="flex flex-col gap-0.5">
                      <span>{replyByParent}</span>
                      {(parentType || contactNumber) && (
                        <span className="text-xs text-muted-foreground/70">
                          {[parentType, contactNumber].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </div>
                  ) : (
                    '—'
                  )}
                </TableCell>
              )}
              {columns.pgStatus && isForm && (
                <TableCell>
                  {pgStatus === 'onboarded' ? (
                    <span className="inline-flex items-center rounded-full bg-twblue-3 px-2 py-0.5 text-xs font-medium text-twblue-11 ring-1 ring-twblue-6 ring-inset">
                      Onboarded
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-slate-3 px-2 py-0.5 text-xs font-medium text-slate-11 ring-1 ring-slate-6 ring-inset">
                      Not Onboarded
                    </span>
                  )}
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// ─── Export helpers ──────────────────────────────────────────────────────────

function rowToExport(
  recipient: Recipient | ConsentFormRecipient,
  responseType: ResponseType | 'acknowledge' | 'yes-no',
  isForm: boolean,
  questions: QuestionColumn[],
): Record<string, string> {
  const status = deriveStatus(responseType, recipient);
  const statusLabels: Record<StatusFilter, string> = {
    all: '',
    read: 'Read',
    unread: 'Unread',
    acknowledged: 'Acknowledged',
    pending: 'Pending',
    yes: 'Yes',
    no: 'No',
    'no-response': 'No Response',
  };
  const ts = resolveTimestamp(responseType, recipient);
  const indexNo =
    'indexNumber' in recipient ? ((recipient as ConsentFormRecipient).indexNumber ?? '') : '';
  const replyByParent = (recipient as Recipient | ConsentFormRecipient).replyByParent ?? '';
  const parentType =
    'parentType' in recipient ? ((recipient as ConsentFormRecipient).parentType ?? '') : '';
  const contactNumber =
    'contactNumber' in recipient ? ((recipient as ConsentFormRecipient).contactNumber ?? '') : '';
  const pgStatus = isForm
    ? (recipient as ConsentFormRecipient).pgStatus === 'onboarded'
      ? 'Onboarded'
      : 'Not Onboarded'
    : '';
  const row: Record<string, string> = {
    studentName: recipient.studentName,
    indexNumber: indexNo,
    classLabel: recipient.classLabel,
    status: statusLabels[status],
    timestamp: ts ? (formatDate(ts) ?? '') : '',
    parentGuardian: replyByParent,
    parentType,
    contactNumber,
    pgStatus,
  };
  for (const q of questions) {
    row[`question_${q.id}`] = isForm
      ? ((recipient as ConsentFormRecipient).questionAnswers?.[q.id] ?? '')
      : '';
  }
  return row;
}

function buildExportColumns(
  columns: ColumnVisibility,
  isForm: boolean,
  tsLabel: string,
  questions: QuestionColumn[],
): XlsxColumn<Record<string, string>>[] {
  const out: XlsxColumn<Record<string, string>>[] = [{ key: 'studentName', header: 'Student' }];
  if (columns.indexNumber) out.push({ key: 'indexNumber', header: 'Index No.' });
  out.push({ key: 'classLabel', header: 'Class' });
  out.push({ key: 'status', header: 'Status' });
  for (const q of questions) out.push({ key: `question_${q.id}`, header: q.text });
  if (columns.timestamp) out.push({ key: 'timestamp', header: tsLabel });
  if (columns.parentGuardian) {
    out.push({ key: 'parentGuardian', header: 'Parent / Guardian' });
    if (isForm) {
      out.push({ key: 'parentType', header: 'Relationship' });
      out.push({ key: 'contactNumber', header: 'Contact No.' });
    }
  }
  if (columns.pgStatus && isForm) out.push({ key: 'pgStatus', header: 'Status' });
  return out;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function RecipientReadTable(props: RecipientReadTableProps) {
  const isForm = props.kind === 'form';
  const isMobile = useIsMobile();
  const controlled = props.filter !== undefined;

  const [uncontrolledFilter, setUncontrolledFilter] =
    useState<RecipientFilterValue>(DEFAULT_RECIPIENT_FILTER);
  const filter = controlled ? props.filter! : uncontrolledFilter;
  const onFilterChange = controlled ? props.onFilterChange! : setUncontrolledFilter;

  const classOptions = useMemo(
    () => Array.from(new Set(props.recipients.map((r) => r.classLabel))).sort(),
    [props.recipients],
  );

  const responseType = props.responseType as ResponseType | 'acknowledge' | 'yes-no';

  const questions = props.kind === 'form' ? (props.questions ?? []) : [];
  const visibleQuestions = questions.filter((q) => isQuestionColumnVisible(filter.columns, q.id));

  const filteredRecipients = useMemo(() => {
    const rows = props.recipients as (Recipient | ConsentFormRecipient)[];
    const filtered = rows.filter((r) => {
      if (filter.search) {
        const q = filter.search.toLowerCase();
        const nameMatch = r.studentName.toLowerCase().includes(q);
        const classMatch = r.classLabel.toLowerCase().includes(q);
        if (!nameMatch && !classMatch) return false;
      }
      if (filter.classId !== 'all' && r.classLabel !== filter.classId) return false;
      if (filter.status !== 'all' && deriveStatus(responseType, r) !== filter.status) return false;
      if (filter.pg !== 'all') {
        const pgS = 'pgStatus' in r ? (r as ConsentFormRecipient).pgStatus : undefined;
        if (pgS !== filter.pg) return false;
      }
      return true;
    });
    return sortRecipients(filtered, responseType);
  }, [props.recipients, filter, responseType]);

  const tsLabel = timestampLabel(responseType);

  const handleExport = async () => {
    const exportCols = buildExportColumns(filter.columns, isForm, tsLabel, visibleQuestions);
    const rows = filteredRecipients.map((r) =>
      rowToExport(r, responseType, isForm, visibleQuestions),
    );
    const today = new Date().toISOString().slice(0, 10);
    const stem = props.exportId ? `recipients-${props.exportId}-${today}` : `recipients-${today}`;
    await downloadXlsx(`${stem}.xlsx`, { columns: exportCols, rows });
  };

  return (
    <div className="space-y-4">
      <Toolbar
        filter={filter}
        onFilterChange={onFilterChange}
        classOptions={classOptions}
        responseType={responseType}
        showPgStatus={isForm}
        timestampLabel={tsLabel}
        showParentGuardian={true}
        questions={questions}
        onExport={handleExport}
        exportDisabled={isMobile}
      />

      <div className="overflow-x-auto rounded-xl border">
        {filteredRecipients.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-muted-foreground">
            No recipients match these filters.
          </p>
        ) : (
          <UnifiedTable
            recipients={filteredRecipients}
            responseType={responseType}
            columns={filter.columns}
            isForm={isForm}
            questions={visibleQuestions}
          />
        )}
      </div>
    </div>
  );
}
