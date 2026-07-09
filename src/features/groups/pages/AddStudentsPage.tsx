import { X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';

import { Button } from '~/components/ui';
import { useQuery } from '~/hooks/useQuery';

import { fetchSchoolClasses, fetchSchoolStudents } from '../api/client';
import type { ApiSchoolStudent } from '../api/types';
import { StudentFilterBar } from '../components/StudentFilterBar';
import { StudentResultsTable } from '../components/StudentResultsTable';

interface IncomingNavState {
  alreadyAdded?: number[];
  groupName?: string;
}

interface OutgoingNavState {
  addedStudents: ApiSchoolStudent[];
  groupName?: string;
}

const PAGE_CAP = 200;

export function AddStudentsPage() {
  const { data, isLoading } = useQuery(
    () =>
      Promise.all([fetchSchoolStudents(), fetchSchoolClasses()]).then(([students, classes]) => ({
        students,
        classes,
      })),
    [],
  );
  const navigate = useNavigate();
  const location = useLocation();
  const incoming = (location.state as IncomingNavState | null) ?? {};
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set(incoming.alreadyAdded ?? []));
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('');
  const [classId, setClassId] = useState('');

  const levelOptions = useMemo(() => {
    if (!data) return [];
    const set = new Set(data.students.map((s) => s.levelDescription));
    return Array.from(set).sort();
  }, [data]);

  const classOptions = useMemo(
    () => (data ? data.classes.map((c) => ({ label: c.label, value: c.value })) : []),
    [data],
  );

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.toLowerCase();
    const selectedClass = data.classes.find((c) => c.value.toString() === classId);
    return data.students.filter((s) => {
      if (level && s.levelDescription !== level) return false;
      if (selectedClass && s.className !== selectedClass.label) return false;
      if (q) {
        const hay = `${s.studentName} ${s.className}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, level, classId, query]);

  const visibleRows = filtered.slice(0, PAGE_CAP);

  function toggle(studentId: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  }

  function toggleAll(rowIds: number[]) {
    setSelectedIds((prev) => {
      const allSelected = rowIds.every((id) => prev.has(id));
      const next = new Set(prev);
      for (const id of rowIds) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  const parentPath = location.pathname.replace(/\/add-students$/, '');

  function submit() {
    if (!data) return;
    const addedStudents = data.students.filter((s) => selectedIds.has(s.studentId));
    const state: OutgoingNavState = { addedStudents, groupName: incoming.groupName };
    navigate(parentPath, { state });
  }

  if (isLoading || !data) return null;

  return (
    <div className="flex h-[calc(100svh-3rem)] justify-center px-6 py-6">
      <div className="flex min-h-0 w-full max-w-4xl flex-col gap-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Add students</h1>
          <Link
            to={parentPath}
            aria-label="Close"
            className="rounded-md p-2 text-muted-foreground hover:bg-muted"
          >
            <X className="size-5" aria-hidden />
          </Link>
        </header>

        <StudentFilterBar
          query={query}
          onQueryChange={setQuery}
          levelOptions={levelOptions}
          level={level}
          onLevelChange={setLevel}
          classOptions={classOptions}
          classId={classId}
          onClassChange={setClassId}
        />

        <p className="text-sm text-muted-foreground">
          Showing {visibleRows.length} of {filtered.length} matching students.
        </p>

        <div className="min-h-0 flex-1">
          <StudentResultsTable
            rows={visibleRows}
            selectedIds={selectedIds}
            onToggle={toggle}
            onToggleAll={toggleAll}
          />
        </div>

        <footer className="flex items-center justify-end gap-3 pb-2">
          <Link
            to={parentPath}
            className="text-sm font-medium text-muted-foreground hover:underline"
          >
            Cancel
          </Link>
          <Button disabled={selectedIds.size === 0} onClick={submit}>
            Add {selectedIds.size} selected
          </Button>
        </footer>
      </div>
    </div>
  );
}
