import { Plus } from 'lucide-react';
import { Link } from 'react-router';

import { buttonVariants } from '~/components/ui';
import { useQuery } from '~/hooks/useQuery';

import { fetchCustomGroups, fetchGroupsAssigned } from '../api/client';
import { AssignedGroupsSection } from '../components/AssignedGroupsSection';
import { CustomGroupsTable } from '../components/CustomGroupsTable';

export function GroupsListPage() {
  const { data, isLoading } = useQuery(
    () =>
      Promise.all([fetchCustomGroups(), fetchGroupsAssigned()]).then(([customList, assigned]) => ({
        customGroups: customList.customGroups,
        assigned,
      })),
    [],
  );

  if (isLoading || !data) return null;

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Groups</h1>
        <Link to="new" className={buttonVariants()}>
          <Plus className="size-4" aria-hidden />
          Create custom group
        </Link>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-medium">Assigned groups</h2>
        <AssignedGroupsSection assigned={data.assigned} />
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-medium">Custom groups</h2>
        <CustomGroupsTable groups={data.customGroups} />
      </section>
    </div>
  );
}
