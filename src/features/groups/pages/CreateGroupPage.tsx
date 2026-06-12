import { Plus } from 'lucide-react';
import { useCallback, useReducer, useState } from 'react';
import type { LoaderFunctionArgs } from 'react-router';
import { Link, useLoaderData, useLocation, useNavigate } from 'react-router';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
} from '~/components/ui';
import { notify } from '~/lib/notify';

import { createCustomGroup, fetchCustomGroupDetail, updateCustomGroup } from '../api/client';
import type { ApiCustomGroupDetail, ApiSchoolStudent } from '../api/types';
import type { ValidateResult } from '../api/validate-upload-students';
import { ExcelUploadPanel } from '../components/ExcelUploadPanel';
import { groupFormReducer } from '../state/reducer';
import { isGroupFormValid } from '../validation/group-form-validation';

type ViewMode = 'list' | 'excel-upload' | 'excel-results';

const TITLE_MAX = 120;

interface CreateGroupLoaderData {
  detail: ApiCustomGroupDetail | null;
}

export async function loader({ params }: LoaderFunctionArgs): Promise<CreateGroupLoaderData> {
  if (params.id) {
    const detail = await fetchCustomGroupDetail(Number(params.id));
    return { detail };
  }
  return { detail: null };
}

interface IncomingNavState {
  addedStudents?: ApiSchoolStudent[];
  groupName?: string;
}

export function CreateGroupPage() {
  const { detail } = useLoaderData() as CreateGroupLoaderData;
  const location = useLocation();
  const navigate = useNavigate();
  const navState = (location.state as IncomingNavState | null) ?? {};
  const isEdit = detail !== null;

  const initialStudents = navState.addedStudents
    ? navState.addedStudents.map((s) => ({
        studentId: s.studentId,
        studentName: s.studentName,
        className: s.className,
      }))
    : detail
      ? detail.students.map((s) => ({
          studentId: s.studentId,
          studentName: s.studentName,
          className: s.className,
        }))
      : [];

  const [state, dispatch] = useReducer(groupFormReducer, {
    name: navState.groupName ?? detail?.name ?? '',
    students: initialStudents,
  });

  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [uploadResult, setUploadResult] = useState<ValidateResult | null>(null);
  const canSave = isGroupFormValid(state);

  const handleUploadResult = useCallback((result: ValidateResult) => {
    setUploadResult(result);
    setViewMode('excel-results');
  }, []);

  function confirmUploadResults() {
    if (!uploadResult) return;
    const mapped = uploadResult.validStudents.map((s) => ({
      studentId: s.pgStudentId,
      studentName: s.studentName,
      className: s.className,
    }));
    dispatch({ type: 'ADD_STUDENTS', payload: mapped });
    setUploadResult(null);
    setViewMode('list');
  }

  async function handleSave() {
    if (!canSave) return;
    setSubmitting(true);
    try {
      if (isEdit) {
        await updateCustomGroup(detail.customGroupId, {
          name: state.name.trim(),
          studentIds: state.students.map((s) => s.studentId),
        });
        navigate(`/groups/${detail.customGroupId}`);
      } else {
        const { customGroupId } = await createCustomGroup({
          name: state.name.trim(),
          studentIds: state.students.map((s) => s.studentId),
        });
        navigate(`/groups/${customGroupId}`);
      }
    } catch {
      setSubmitting(false);
      notify.error(isEdit ? 'Could not update the group.' : 'Could not create the group.');
    }
  }

  const addStudentsPath = isEdit
    ? `/groups/${detail.customGroupId}/edit/add-students`
    : '/groups/new/add-students';

  return (
    <div className="flex justify-center px-6 py-6">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-semibold">
          {isEdit ? 'Edit group' : 'Create new custom group'}
        </h1>
        <div className="mt-6">
          <label htmlFor="group-title" className="text-sm font-medium">
            Title<span className="text-destructive">*</span>
          </label>
          <Input
            id="group-title"
            value={state.name}
            maxLength={TITLE_MAX}
            onChange={(e) => dispatch({ type: 'SET_NAME', payload: e.target.value })}
            placeholder="What would you like to call your group?"
            className="mt-1"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {TITLE_MAX - state.name.length} characters left
          </p>

          <div className="mt-6">
            {viewMode === 'list' && (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    {state.students.length} student{state.students.length === 1 ? '' : 's'} added.
                  </p>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button variant="secondary">
                          <Plus className="size-4" aria-hidden />
                          Add Students
                        </Button>
                      }
                    />
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        render={
                          <Link
                            to={addStudentsPath}
                            state={{
                              alreadyAdded: state.students.map((s) => s.studentId),
                              groupName: state.name,
                            }}
                          />
                        }
                      >
                        Add manually
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={state.students.length > 0}
                        onClick={() => setViewMode('excel-upload')}
                      >
                        Upload via Excel
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {state.students.length === 0 ? (
                  <div className="mt-2 rounded-md bg-muted p-6 text-center text-sm text-muted-foreground">
                    No students added yet.
                  </div>
                ) : (
                  <ul className="mt-2 divide-y rounded-md border">
                    {state.students.map((s) => (
                      <li
                        key={s.studentId}
                        className="flex items-center justify-between p-3 text-sm"
                      >
                        <span>{s.studentName}</span>
                        <span className="text-xs text-muted-foreground">{s.className}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {viewMode === 'excel-upload' && (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-medium">Upload via Excel</h2>
                  <Button variant="ghost" size="sm" onClick={() => setViewMode('list')}>
                    Cancel
                  </Button>
                </div>
                <ExcelUploadPanel isIhl={false} onResult={handleUploadResult} />
              </div>
            )}

            {viewMode === 'excel-results' && uploadResult && (
              <div>
                <h2 className="text-lg font-medium">Upload results</h2>
                <div className="mt-4 space-y-3">
                  {uploadResult.validStudents.length > 0 && (
                    <p className="text-sm text-green-700">
                      {uploadResult.validStudents.length} valid student
                      {uploadResult.validStudents.length === 1 ? '' : 's'}
                    </p>
                  )}
                  {uploadResult.invalidStudents.length > 0 && (
                    <div>
                      <p className="text-sm text-destructive">
                        {uploadResult.invalidStudents.length} invalid student
                        {uploadResult.invalidStudents.length === 1 ? '' : 's'}
                      </p>
                      <ul className="mt-2 divide-y rounded-md border border-destructive/20">
                        {uploadResult.invalidStudents.map((s, i) => (
                          <li key={i} className="px-3 py-2 text-sm">
                            <span className="font-medium">Row {s.row}:</span>{' '}
                            {s.name || s.studentId || '—'} — {s.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex gap-3">
                  <Button onClick={confirmUploadResults}>
                    Add {uploadResult.validStudents.length} student
                    {uploadResult.validStudents.length === 1 ? '' : 's'}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setUploadResult(null);
                      setViewMode('excel-upload');
                    }}
                  >
                    Upload another file
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 flex items-center justify-end gap-3">
            <Link
              to="/groups"
              className="text-sm font-medium text-muted-foreground hover:underline"
            >
              Cancel
            </Link>
            <Button
              disabled={!canSave || submitting}
              title={canSave ? undefined : 'Add at least one student to create the group'}
              onClick={handleSave}
            >
              {submitting ? (isEdit ? 'Saving…' : 'Creating…') : isEdit ? 'Save' : 'Create Now'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
