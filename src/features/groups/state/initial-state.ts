export interface GroupStudent {
  studentId: number;
  studentName: string;
  className: string;
}

export interface GroupFormState {
  name: string;
  students: GroupStudent[];
}

export const INITIAL_STATE: GroupFormState = {
  name: '',
  students: [],
};
