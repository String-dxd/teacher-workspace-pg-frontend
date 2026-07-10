import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { QueryError } from '~/components/QueryError';
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui';
import { formatDate } from '~/helpers/dateTime';
import { useQuery } from '~/hooks/useQuery';
import { notify } from '~/lib/notify';

import {
  deleteCustomGroup,
  fetchCustomGroupDetail,
  fetchSchoolStaff,
  removeAccessFromCustomGroup,
  shareCustomGroup,
} from '../api/client';
import { DeleteGroupDialog } from '../components/DeleteGroupDialog';
import { ShareGroupDialog } from '../components/ShareGroupDialog';
import { StudentsByClassList } from '../components/StudentsByClassList';

export function GroupDetailPage() {
  const { id } = useParams();
  const numericId = Number(id);
  const { data, isLoading, error, refetch } = useQuery(
    () =>
      Promise.all([fetchCustomGroupDetail(numericId), fetchSchoolStaff()]).then(
        ([detail, staff]) => ({ detail, staff }),
      ),
    [id],
  );
  const navigate = useNavigate();
  const [shareOpen, setShareOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (error) return <QueryError onRetry={refetch} />;
  if (isLoading || !data) return null;

  const { detail: groupData, staff } = data;

  async function handleDelete() {
    await deleteCustomGroup(groupData.customGroupId);
    notify.success('Custom group deleted.');
    navigate('..');
  }

  async function handleShare(staffIds: number[]) {
    await shareCustomGroup(groupData.customGroupId, staffIds);
    refetch();
  }

  async function handleRemoveAccess() {
    await removeAccessFromCustomGroup(groupData.customGroupId);
    notify.success('Access removed.');
    navigate('..');
  }

  return (
    <div className="flex justify-center px-6 py-6">
      <div className="w-full max-w-4xl">
        <header className="flex items-start gap-3">
          <Link
            to=".."
            aria-label="Back to Groups"
            className="mt-1 rounded-md p-2 text-muted-foreground hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-xs tracking-wide text-muted-foreground uppercase">Custom Group</p>
            <h1 className="mt-1 text-2xl font-semibold">{groupData.name}</h1>
          </div>
        </header>

        <Tabs defaultValue="students" className="mt-6">
          <TabsList>
            <TabsTrigger value="students">Students ({groupData.students.length})</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>
          <TabsContent value="students" className="mt-4">
            <StudentsByClassList students={groupData.students} />
          </TabsContent>
          <TabsContent value="details" className="mt-4 space-y-6">
            <p className="text-sm text-muted-foreground">
              Created on {formatDate(groupData.createdAt)} by {groupData.createdByName}.
            </p>
            {groupData.sharedWith.length > 0 ? (
              <div className="text-sm">
                <span className="font-medium">Group shared with:</span>{' '}
                {groupData.sharedWith.map((s) => s.staffName).join(', ')}
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-3">
              <article className="rounded-md border p-4">
                <h3 className="font-semibold">Edit this custom group</h3>
                <Link
                  to="edit"
                  className="mt-3 inline-flex items-center rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted"
                >
                  Edit Group
                </Link>
              </article>
              <article className="rounded-md border p-4">
                <h3 className="font-semibold">Share this custom group</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  You will be granting access to edit this group. Please be certain.
                </p>
                <Button variant="secondary" className="mt-3" onClick={() => setShareOpen(true)}>
                  Share Group
                </Button>
              </article>
              {groupData.sharedWith.length === 0 ? (
                <article className="rounded-md border p-4">
                  <h3 className="font-semibold">Delete this custom group</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Once you delete this custom group, you can never get it back again.
                  </p>
                  <Button variant="secondary" className="mt-3" onClick={() => setDeleteOpen(true)}>
                    Delete Forever
                  </Button>
                </article>
              ) : (
                <article className="rounded-md border p-4">
                  <h3 className="font-semibold">Remove access to this group</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    You will lose access to this shared group. Other staff will still retain access.
                  </p>
                  <Button variant="secondary" className="mt-3" onClick={handleRemoveAccess}>
                    Remove Access
                  </Button>
                </article>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DeleteGroupDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          groupName={groupData.name}
          onConfirm={handleDelete}
        />

        <ShareGroupDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          staff={staff}
          creatorStaffId={groupData.createdBy}
          alreadySharedStaffIds={groupData.sharedWith.map((s) => s.staffId)}
          onShare={handleShare}
        />
      </div>
    </div>
  );
}
