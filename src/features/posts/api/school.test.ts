import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./http', () => ({
  fetchApi: vi.fn(),
  mutateApi: vi.fn(),
  deleteApi: vi.fn(),
}));

import { deleteApi, fetchApi, mutateApi } from './http';
import {
  createCustomGroup,
  deleteCustomGroup,
  fetchCcaDetail,
  fetchClassDetail,
  fetchCustomGroupDetail,
  fetchCustomGroups,
  fetchGroupsAssigned,
  fetchSchoolClasses,
  fetchSchoolStaff,
  fetchSchoolStaffGroups,
  fetchSchoolStudents,
  removeAccessFromCustomGroup,
  shareCustomGroup,
  updateCustomGroup,
} from './school';

describe('api/school', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetchSchoolStaff calls GET /school/staff', async () => {
    vi.mocked(fetchApi).mockResolvedValue([]);
    await fetchSchoolStaff();
    expect(fetchApi).toHaveBeenCalledWith('/school/staff');
  });

  it('fetchSchoolClasses extracts data.class from response', async () => {
    vi.mocked(fetchApi).mockResolvedValue({ data: { class: [{ id: 1 }] } });
    const result = await fetchSchoolClasses();
    expect(fetchApi).toHaveBeenCalledWith('/school/groups');
    expect(result).toEqual([{ id: 1 }]);
  });

  it('fetchSchoolStudents calls GET /school/students', async () => {
    vi.mocked(fetchApi).mockResolvedValue([]);
    await fetchSchoolStudents();
    expect(fetchApi).toHaveBeenCalledWith('/school/students');
  });

  it('fetchSchoolStaffGroups calls GET /school/staffGroups', async () => {
    vi.mocked(fetchApi).mockResolvedValue({ groups: [] });
    await fetchSchoolStaffGroups();
    expect(fetchApi).toHaveBeenCalledWith('/school/staffGroups');
  });

  it('fetchGroupsAssigned calls GET /groups/assigned', async () => {
    vi.mocked(fetchApi).mockResolvedValue({});
    await fetchGroupsAssigned();
    expect(fetchApi).toHaveBeenCalledWith('/groups/assigned');
  });

  it('fetchCustomGroups calls GET /groups/custom and maps raw fields', async () => {
    const rawGroup = {
      id: 1,
      groupName: 'Test Group',
      createdBy: 'John Doe',
      createdAt: '2024-01-01',
      owners: [{ staffId: 42, staffName: 'John Doe' }],
      studentsList: [{ studentId: 10 }, { studentId: 11 }],
    };
    vi.mocked(fetchApi).mockResolvedValue([rawGroup]);
    const result = await fetchCustomGroups();
    expect(fetchApi).toHaveBeenCalledWith('/groups/custom');
    expect(result).toEqual({
      customGroups: [
        {
          customGroupId: 1,
          name: 'Test Group',
          studentCount: 2,
          createdBy: 42,
          createdByName: 'John Doe',
          isShared: false,
          createdAt: '2024-01-01',
        },
      ],
    });
  });

  it('fetchCustomGroupDetail calls GET /groups/custom/:id and unwraps array', async () => {
    const rawDetail = {
      id: 7,
      groupName: 'Detail Group',
      createdBy: 'Jane Smith',
      createdAt: '2024-02-01',
      owners: [{ staffId: 5, staffName: 'Jane Smith' }],
      studentsList: [],
    };
    vi.mocked(fetchApi).mockResolvedValue([rawDetail]);
    const result = await fetchCustomGroupDetail(7);
    expect(fetchApi).toHaveBeenCalledWith('/groups/custom/7');
    expect(result.customGroupId).toBe(7);
    expect(result.name).toBe('Detail Group');
  });

  it('fetchCustomGroupDetail handles object (non-array) response', async () => {
    const rawDetail = {
      id: 8,
      groupName: 'Object Group',
      createdBy: 'Bob',
      createdAt: '2024-03-01',
      owners: [{ staffId: 3, staffName: 'Bob' }],
      studentsList: [],
    };
    vi.mocked(fetchApi).mockResolvedValue(rawDetail);
    const result = await fetchCustomGroupDetail(8);
    expect(result.customGroupId).toBe(8);
  });

  it('createCustomGroup POSTs with mapped field names', async () => {
    vi.mocked(mutateApi).mockResolvedValue({ id: 10 });
    await createCustomGroup({ name: 'Group A', studentIds: [1, 2] });
    expect(mutateApi).toHaveBeenCalledWith(
      'POST',
      '/groups/custom',
      { groupName: 'Group A', selectedSchoolStudents: [1, 2] },
      undefined,
    );
  });

  it('updateCustomGroup PUTs with mapped field names', async () => {
    vi.mocked(mutateApi).mockResolvedValue(undefined);
    await updateCustomGroup(3, { name: 'Updated', studentIds: [5, 6] });
    expect(mutateApi).toHaveBeenCalledWith(
      'PUT',
      '/groups/custom/3',
      { groupName: 'Updated', selectedSchoolStudents: [5, 6] },
      undefined,
    );
  });

  it('shareCustomGroup PUTs with selectedStaff', async () => {
    vi.mocked(mutateApi).mockResolvedValue(undefined);
    await shareCustomGroup(4, [10, 11]);
    expect(mutateApi).toHaveBeenCalledWith(
      'PUT',
      '/groups/custom/4/share',
      { selectedStaff: [10, 11] },
      undefined,
    );
  });

  it('removeAccessFromCustomGroup PUTs empty body', async () => {
    vi.mocked(mutateApi).mockResolvedValue(undefined);
    await removeAccessFromCustomGroup(5);
    expect(mutateApi).toHaveBeenCalledWith('PUT', '/groups/custom/5/removeAccess', {}, undefined);
  });

  it('deleteCustomGroup calls DELETE /groups/custom/:id', async () => {
    vi.mocked(deleteApi).mockResolvedValue(undefined);
    await deleteCustomGroup(5);
    expect(deleteApi).toHaveBeenCalledWith('/groups/custom/5');
  });

  it('fetchClassDetail calls GET /groups/classes/:id', async () => {
    vi.mocked(fetchApi).mockResolvedValue({ id: 3 });
    await fetchClassDetail(3);
    expect(fetchApi).toHaveBeenCalledWith('/groups/classes/3');
  });

  it('fetchCcaDetail calls GET /groups/ccas/:id', async () => {
    vi.mocked(fetchApi).mockResolvedValue({ id: 4 });
    await fetchCcaDetail(4);
    expect(fetchApi).toHaveBeenCalledWith('/groups/ccas/4');
  });
});
