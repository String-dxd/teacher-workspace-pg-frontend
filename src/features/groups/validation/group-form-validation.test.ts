import { describe, expect, it } from 'vitest';

import { INITIAL_STATE } from '../state/initial-state';
import { computeGroupErrors, isGroupFormValid } from './group-form-validation';

describe('group-form-validation', () => {
  it('invalid when name is empty', () => {
    expect(isGroupFormValid(INITIAL_STATE)).toBe(false);
    const errors = computeGroupErrors(INITIAL_STATE);
    expect(errors.name).toBeDefined();
  });

  it('invalid when students is empty', () => {
    const state = { ...INITIAL_STATE, name: 'Test Group' };
    expect(isGroupFormValid(state)).toBe(false);
    const errors = computeGroupErrors(state);
    expect(errors.students).toBeDefined();
  });

  it('valid when name and students are present', () => {
    const state = {
      name: 'Science Team',
      students: [{ studentId: 1, studentName: 'Alice', className: '3A' }],
    };
    expect(isGroupFormValid(state)).toBe(true);
    const errors = computeGroupErrors(state);
    expect(errors.name).toBeUndefined();
    expect(errors.students).toBeUndefined();
  });

  it('invalid when name is whitespace only', () => {
    const state = {
      name: '   ',
      students: [{ studentId: 1, studentName: 'Alice', className: '3A' }],
    };
    expect(isGroupFormValid(state)).toBe(false);
  });
});
