import type { GroupFormAction } from './actions';
import type { GroupFormState } from './initial-state';

const MAX_NAME_LENGTH = 120;

export function groupFormReducer(state: GroupFormState, action: GroupFormAction): GroupFormState {
  switch (action.type) {
    case 'SET_NAME':
      return { ...state, name: action.payload.slice(0, MAX_NAME_LENGTH) };
    case 'SET_STUDENTS':
      return { ...state, students: action.payload };
    case 'ADD_STUDENTS': {
      const existingIds = new Set(state.students.map((s) => s.studentId));
      const newStudents = action.payload.filter((s) => !existingIds.has(s.studentId));
      return { ...state, students: [...state.students, ...newStudents] };
    }
    case 'REMOVE_STUDENT':
      return { ...state, students: state.students.filter((s) => s.studentId !== action.studentId) };
    case 'CLEAR_STUDENTS':
      return { ...state, students: [] };
    case 'HYDRATE':
      return { name: action.payload.name, students: action.payload.students };
  }
}
