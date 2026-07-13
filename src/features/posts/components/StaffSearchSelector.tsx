import { useMemo } from 'react';

import type { ApiSchoolStaff } from '~/features/posts/api/types';
import {
  EntitySelector,
  type EntityItem,
  type SearchResults,
  type SelectedEntity,
} from '~/features/posts/components/EntitySelector';
import { stripSalutation } from '~/lib/utils';

// Search-based staff-in-charge picker. Individuals only — the school
// endpoints don't expose staff groups, so there are no browse tabs.

interface StaffSearchSelectorProps {
  staff: ApiSchoolStaff[];
  value: SelectedEntity[];
  onChange: (staff: SelectedEntity[]) => void;
}

export function StaffSearchSelector({ staff, value, onChange }: StaffSearchSelectorProps) {
  const items: EntityItem[] = useMemo(
    () =>
      staff.map((s) => ({
        id: String(s.staffId),
        label: stripSalutation(s.name),
        sublabel: [s.className, s.email].filter(Boolean).join(' · '),
        type: 'individual' as const,
        count: 1,
      })),
    [staff],
  );

  function searchFn(query: string): SearchResults {
    const q = query.toLowerCase();
    return {
      groups: [],
      individuals: items.filter(
        (i) =>
          i.label.toLowerCase().includes(q) || (i.sublabel?.toLowerCase().includes(q) ?? false),
      ),
    };
  }

  return (
    <EntitySelector
      value={value}
      onChange={onChange}
      searchFn={searchFn}
      placeholder="Search staff by name or email…"
      noResultsText="No staff found"
      chipsBelow
    />
  );
}
