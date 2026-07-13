import { useMemo } from 'react';

import type { ApiSchoolClass, ApiSchoolStudent } from '~/features/posts/api/types';
import {
  detectOverlaps,
  EntitySelector,
  type SelectedEntity,
} from '~/features/posts/components/EntitySelector';
import { buildRecipientScopes } from '~/features/posts/components/recipient-scopes';

interface StudentRecipientSelectorProps {
  classes: ApiSchoolClass[];
  students: ApiSchoolStudent[];
  value: SelectedEntity[];
  onChange: (recipients: SelectedEntity[]) => void;
}

export function StudentRecipientSelector({
  classes,
  students,
  value,
  onChange,
}: StudentRecipientSelectorProps) {
  const { scopes, searchFn, overlapMap } = useMemo(
    () => buildRecipientScopes(classes, students),
    [classes, students],
  );
  const overlaps = detectOverlaps(value, overlapMap);

  return (
    <>
      <EntitySelector
        value={value}
        onChange={onChange}
        scopes={scopes}
        searchFn={searchFn}
        placeholder="Search students, classes, CCAs…"
        noResultsText="No students or groups found"
        emptyTabText="No items in this category"
        chipsBelow
        maxVisibleTokens={3}
      />
      {overlaps.map((w, i) => (
        <p key={i} className="mt-1.5 text-xs text-amber-11">
          {w.childLabel} is already included in {w.parentLabel}. Some students may receive
          duplicates.
        </p>
      ))}
    </>
  );
}
