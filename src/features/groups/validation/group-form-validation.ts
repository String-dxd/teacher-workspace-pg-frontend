import type { GroupFormState } from '../state/initial-state';

export interface GroupFormErrors {
  name?: string;
  students?: string;
}

export function computeGroupErrors(state: GroupFormState): GroupFormErrors {
  const errors: GroupFormErrors = {};
  if (state.name.trim().length === 0) {
    errors.name = 'Group name is required.';
  }
  if (state.students.length === 0) {
    errors.students = 'Add at least one student.';
  }
  return errors;
}

export function isGroupFormValid(state: GroupFormState): boolean {
  return state.name.trim().length > 0 && state.students.length > 0;
}
