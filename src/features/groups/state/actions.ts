import type { GroupStudent } from './initial-state';

export type GroupFormAction =
  | { type: 'SET_NAME'; payload: string }
  | { type: 'SET_STUDENTS'; payload: GroupStudent[] }
  | { type: 'ADD_STUDENTS'; payload: GroupStudent[] }
  | { type: 'REMOVE_STUDENT'; studentId: number }
  | { type: 'CLEAR_STUDENTS' }
  | { type: 'HYDRATE'; payload: { name: string; students: GroupStudent[] } };
