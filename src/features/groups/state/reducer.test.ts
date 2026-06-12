import { describe, expect, it } from 'vitest';

import type { GroupFormAction } from './actions';
import { INITIAL_STATE } from './initial-state';
import { groupFormReducer } from './reducer';

describe('groupFormReducer', () => {
  it('SET_NAME updates the name', () => {
    const action: GroupFormAction = { type: 'SET_NAME', payload: 'Science Team' };
    const result = groupFormReducer(INITIAL_STATE, action);
    expect(result.name).toBe('Science Team');
  });

  it('SET_NAME truncates at 120 characters', () => {
    const longName = 'a'.repeat(150);
    const action: GroupFormAction = { type: 'SET_NAME', payload: longName };
    const result = groupFormReducer(INITIAL_STATE, action);
    expect(result.name).toHaveLength(120);
  });

  it('ADD_STUDENTS adds new students', () => {
    const action: GroupFormAction = {
      type: 'ADD_STUDENTS',
      payload: [
        { studentId: 1, studentName: 'Alice', className: '3A' },
        { studentId: 2, studentName: 'Bob', className: '3B' },
      ],
    };
    const result = groupFormReducer(INITIAL_STATE, action);
    expect(result.students).toHaveLength(2);
  });

  it('ADD_STUDENTS deduplicates by studentId', () => {
    const state = {
      ...INITIAL_STATE,
      students: [{ studentId: 1, studentName: 'Alice', className: '3A' }],
    };
    const action: GroupFormAction = {
      type: 'ADD_STUDENTS',
      payload: [
        { studentId: 1, studentName: 'Alice', className: '3A' },
        { studentId: 2, studentName: 'Bob', className: '3B' },
      ],
    };
    const result = groupFormReducer(state, action);
    expect(result.students).toHaveLength(2);
    expect(result.students[1].studentId).toBe(2);
  });

  it('REMOVE_STUDENT removes by studentId', () => {
    const state = {
      ...INITIAL_STATE,
      students: [
        { studentId: 1, studentName: 'Alice', className: '3A' },
        { studentId: 2, studentName: 'Bob', className: '3B' },
      ],
    };
    const action: GroupFormAction = { type: 'REMOVE_STUDENT', studentId: 1 };
    const result = groupFormReducer(state, action);
    expect(result.students).toHaveLength(1);
    expect(result.students[0].studentId).toBe(2);
  });

  it('SET_STUDENTS replaces the entire list', () => {
    const state = {
      ...INITIAL_STATE,
      students: [{ studentId: 1, studentName: 'Alice', className: '3A' }],
    };
    const action: GroupFormAction = {
      type: 'SET_STUDENTS',
      payload: [{ studentId: 99, studentName: 'Zara', className: '5A' }],
    };
    const result = groupFormReducer(state, action);
    expect(result.students).toHaveLength(1);
    expect(result.students[0].studentId).toBe(99);
  });

  it('CLEAR_STUDENTS empties the list', () => {
    const state = {
      ...INITIAL_STATE,
      students: [{ studentId: 1, studentName: 'Alice', className: '3A' }],
    };
    const action: GroupFormAction = { type: 'CLEAR_STUDENTS' };
    const result = groupFormReducer(state, action);
    expect(result.students).toHaveLength(0);
  });

  it('HYDRATE sets both name and students', () => {
    const action: GroupFormAction = {
      type: 'HYDRATE',
      payload: {
        name: 'Maths Olympiad',
        students: [{ studentId: 5, studentName: 'Eve', className: '4A' }],
      },
    };
    const result = groupFormReducer(INITIAL_STATE, action);
    expect(result.name).toBe('Maths Olympiad');
    expect(result.students).toHaveLength(1);
  });
});
