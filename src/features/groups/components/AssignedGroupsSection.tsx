import { Link } from 'react-router';

import type { ApiGroupsAssigned } from '../api/types';

interface AssignedGroupsSectionProps {
  assigned: ApiGroupsAssigned;
}

export function AssignedGroupsSection({ assigned }: AssignedGroupsSectionProps) {
  const isEmpty = assigned.classes.length === 0 && assigned.ccaGroups.length === 0;

  if (isEmpty) {
    return (
      <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No assigned groups.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {assigned.classes.map((c) => (
        <Link
          key={`class-${c.classId}`}
          to={`/groups/classes/${c.classId}`}
          className="rounded-md border border-border bg-card p-4 transition-colors hover:bg-muted"
        >
          <h3 className="font-medium">{c.className}</h3>
          <p className="text-xs text-muted-foreground">
            {c.role} · {c.studentCount ?? 0} students
          </p>
        </Link>
      ))}
      {assigned.ccaGroups.map((g) => (
        <Link
          key={`cca-${g.ccaId}`}
          to={`/groups/cca/details/${g.ccaId}`}
          className="rounded-md border border-border bg-card p-4 transition-colors hover:bg-muted"
        >
          <h3 className="font-medium">{g.ccaDescription || 'Untitled CCA'}</h3>
          <p className="text-xs text-muted-foreground">CCA · {g.studentCount ?? 0} students</p>
        </Link>
      ))}
    </div>
  );
}
