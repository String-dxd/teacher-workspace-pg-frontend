import { Plus } from 'lucide-react';
import { Link, useLoaderData } from 'react-router';

import { buttonVariants } from '~/components/ui';

import { fetchCustomGroups, fetchGroupsAssigned } from '../api/client';
import type { ApiCustomGroupSummary, ApiGroupsAssigned } from '../api/types';
import { AssignedGroupsSection } from '../components/AssignedGroupsSection';
import { CustomGroupsTable } from '../components/CustomGroupsTable';

interface GroupsListLoaderData {
  customGroups: ApiCustomGroupSummary[];
  assigned: ApiGroupsAssigned;
}

export async function loader(): Promise<GroupsListLoaderData> {
  const [customList, assigned] = await Promise.all([fetchCustomGroups(), fetchGroupsAssigned()]);
  return { customGroups: customList.customGroups, assigned };
}

export function GroupsListPage() {
  const { customGroups, assigned } = useLoaderData() as GroupsListLoaderData;

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Groups</h1>
        <Link to="/groups/new" className={buttonVariants()}>
          <Plus className="size-4" aria-hidden />
          Create custom group
        </Link>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-medium">Assigned groups</h2>
        <AssignedGroupsSection assigned={assigned} />
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-medium">Custom groups</h2>
        <CustomGroupsTable groups={customGroups} />
      </section>
    </div>
  );
}
