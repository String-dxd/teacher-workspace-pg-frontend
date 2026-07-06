import { deleteApi, fetchApi, mutateApi } from './http';
import type {
  ApiCcaDetail,
  ApiClassDetail,
  ApiCreateCustomGroupResponse,
  ApiCustomGroupDetail,
  ApiCustomGroupsList,
  ApiCustomGroupSummary,
  ApiGroupsAssigned,
  ApiSchoolClass,
  ApiSchoolStaff,
  ApiSchoolStudent,
  ApiStaffGroups,
} from './types';

export function fetchSchoolStaff(): Promise<ApiSchoolStaff[]> {
  return fetchApi('/school/staff');
}

export async function fetchSchoolClasses(): Promise<ApiSchoolClass[]> {
  const res = await fetchApi<{ data: { class: ApiSchoolClass[] } }>('/school/groups');
  return res.data.class;
}

export function fetchSchoolStudents(): Promise<ApiSchoolStudent[]> {
  return fetchApi('/school/students');
}

export function fetchSchoolStaffGroups(): Promise<ApiStaffGroups> {
  return fetchApi('/school/staffGroups');
}

export function fetchGroupsAssigned(): Promise<ApiGroupsAssigned> {
  return fetchApi('/groups/assigned');
}

// ─── Custom Groups ────────────────────────────────────────────────────────────
// Real PGW returns `body` as a bare array of groups in a different field
// vocabulary than our internal types. The BFF mock fixture mirrors this raw
// shape so both proxy and mock modes flow through the same mapper.

interface PgwRawCustomGroup {
  id: number;
  groupName: string;
  createdBy: string;
  createdAt: string;
  owners?: { staffId: number; staffName: string }[];
  studentsList?: unknown[];
}

interface PgwRawCustomGroupDetail {
  id: number;
  groupName: string;
  createdBy: string;
  createdAt: string;
  owners?: { staffId: number; staffName: string }[];
  studentsList?: {
    studentId: number;
    studentName: string;
    className: string;
    indexNumber?: number;
    uinFinNo?: string;
    ccas?: string[];
  }[];
}

function mapPgwCustomGroup(raw: PgwRawCustomGroup): ApiCustomGroupSummary {
  return {
    customGroupId: raw.id,
    name: raw.groupName,
    studentCount: raw.studentsList?.length ?? 0,
    // Real PGW returns only the creator's display name in this list payload —
    // no numeric staffId. Surface 0 as a sentinel so callers can detect
    // "unknown" if they need ownership checks.
    createdBy: raw.owners?.[0]?.staffId ?? 0,
    createdByName: raw.createdBy,
    isShared: (raw.owners?.length ?? 0) > 1,
    createdAt: raw.createdAt,
  };
}

function mapPgwCustomGroupDetail(raw: PgwRawCustomGroupDetail): ApiCustomGroupDetail {
  const owners = raw.owners ?? [];
  const creator = owners[0];
  return {
    customGroupId: raw.id,
    name: raw.groupName,
    createdBy: creator?.staffId ?? 0,
    createdByName: raw.createdBy,
    isShared: owners.length > 1,
    sharedWith: owners.slice(1),
    students: (raw.studentsList ?? []).map((s) => ({
      studentId: s.studentId,
      studentName: s.studentName,
      className: s.className,
      indexNumber: s.indexNumber,
      uinFinNo: s.uinFinNo,
      ccas: s.ccas,
    })),
    createdAt: raw.createdAt,
  };
}

export async function fetchCustomGroups(): Promise<ApiCustomGroupsList> {
  const raw = await fetchApi<PgwRawCustomGroup[]>('/groups/custom');
  // Guard: real PGW returns a bare array; be defensive in case the shape differs.
  const list = Array.isArray(raw) ? raw : [];
  return { customGroups: list.map(mapPgwCustomGroup) };
}

export async function fetchCustomGroupDetail(id: number): Promise<ApiCustomGroupDetail> {
  // Real PGW returns `body` as a single-element array even for detail endpoints.
  const raw = await fetchApi<PgwRawCustomGroupDetail | PgwRawCustomGroupDetail[]>(
    `/groups/custom/${id}`,
  );
  const item = Array.isArray(raw) ? raw[0] : raw;
  if (!item) {
    throw new Response('Group not found', { status: 404 });
  }
  if (Array.isArray(raw) && raw.length > 1) {
    // eslint-disable-next-line no-console -- diagnostic for unexpected PGW shape
    console.warn('fetchCustomGroupDetail: expected 1 element, got %d', raw.length);
  }
  return mapPgwCustomGroupDetail(item);
}

export async function createCustomGroup(payload: {
  name: string;
  studentIds: number[];
}): Promise<ApiCreateCustomGroupResponse> {
  // Real PGW field names diverge from the contract doc:
  //   - request: `groupName` (not `name`), `selectedSchoolStudents` (not `studentIds`)
  //   - response: `id` (not `customGroupId`)
  const raw = await mutateApi<{ id: number; customGroupId?: number }>(
    'POST',
    '/groups/custom',
    {
      groupName: payload.name,
      selectedSchoolStudents: payload.studentIds,
    },
    undefined,
  );
  return { customGroupId: raw.customGroupId ?? raw.id };
}

export async function updateCustomGroup(
  id: number,
  payload: { name: string; studentIds: number[] },
): Promise<void> {
  await mutateApi<void>(
    'PUT',
    `/groups/custom/${id}`,
    {
      groupName: payload.name,
      selectedSchoolStudents: payload.studentIds,
    },
    undefined,
  );
}

export async function shareCustomGroup(id: number, staffIds: number[]): Promise<void> {
  await mutateApi<void>(
    'PUT',
    `/groups/custom/${id}/share`,
    { selectedStaff: staffIds },
    undefined,
  );
}

export async function removeAccessFromCustomGroup(id: number): Promise<void> {
  await mutateApi<void>('PUT', `/groups/custom/${id}/removeAccess`, {}, undefined);
}

export function deleteCustomGroup(id: number): Promise<void> {
  return deleteApi(`/groups/custom/${id}`);
}

export function fetchClassDetail(classId: number): Promise<ApiClassDetail> {
  return fetchApi(`/groups/classes/${classId}`);
}

export function fetchCcaDetail(ccaId: number): Promise<ApiCcaDetail> {
  return fetchApi(`/groups/ccas/${ccaId}`);
}
