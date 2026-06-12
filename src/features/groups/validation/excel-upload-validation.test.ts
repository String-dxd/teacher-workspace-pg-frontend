import { describe, expect, it } from 'vitest';

import {
  checkForDuplicateEntries,
  checkForDuplicateHeaders,
  checkForDuplicateStudentIds,
  checkForMissingHeaders,
  checkForMissingValues,
  checkIsBlank,
  isOverMaxCapacity,
  mapStudentDataHeaders,
  MAX_STUDENTS,
} from './excel-upload-validation';

describe('checkIsBlank', () => {
  it('returns true for empty array', () => {
    expect(checkIsBlank([])).toBe(true);
  });

  it('returns false for non-empty array', () => {
    expect(checkIsBlank([{ Name: 'Alice', Class: '3A' }])).toBe(false);
  });
});

describe('checkForMissingHeaders', () => {
  it('returns error when rows is empty', () => {
    expect(checkForMissingHeaders([])).toContain("'Name' and/or 'Class' are missing");
  });

  it('returns error when Name header is missing', () => {
    const rows = [{ Class: '3A', Other: 'stuff' }];
    expect(checkForMissingHeaders(rows)).toContain("'Name' and/or 'Class' are missing");
  });

  it('returns false when both headers exist', () => {
    const rows = [{ Name: 'Alice', Class: '3A' }];
    expect(checkForMissingHeaders(rows)).toBe(false);
  });

  it('is case-insensitive', () => {
    const rows = [{ name: 'Alice', class: '3A' }];
    expect(checkForMissingHeaders(rows)).toBe(false);
  });
});

describe('checkForDuplicateHeaders', () => {
  it('returns false for empty rows', () => {
    expect(checkForDuplicateHeaders([])).toBe(false);
  });

  it('returns false for unique headers', () => {
    const rows = [{ Name: 'Alice', Class: '3A' }];
    expect(checkForDuplicateHeaders(rows)).toBe(false);
  });
});

describe('mapStudentDataHeaders', () => {
  it('normalizes Name and Class keys', () => {
    const rows = [{ name: '  Alice  ', class: ' 3A ' }];
    const result = mapStudentDataHeaders(rows);
    expect(result[0]).toEqual({ Name: 'Alice', Class: '3A' });
  });
});

describe('checkForMissingValues', () => {
  it('detects rows with missing Name or Class', () => {
    const rows = [
      { Name: 'Alice', Class: '3A' },
      { Name: '', Class: '3B' },
    ];
    const { hasMissing, missingRows } = checkForMissingValues(rows);
    expect(hasMissing).toBe(true);
    expect(missingRows).toEqual([3]);
  });

  it('returns no missing for valid rows', () => {
    const rows = [{ Name: 'Alice', Class: '3A' }];
    const { hasMissing } = checkForMissingValues(rows);
    expect(hasMissing).toBe(false);
  });
});

describe('checkForDuplicateEntries', () => {
  it('returns false for unique entries', () => {
    const students = [
      { Name: 'Alice', Class: '3A' },
      { Name: 'Bob', Class: '3B' },
    ];
    expect(checkForDuplicateEntries(students)).toBe(false);
  });

  it('detects duplicates (case-insensitive)', () => {
    const students = [
      { Name: 'Alice', Class: '3A' },
      { Name: 'alice', Class: '3a' },
    ];
    const result = checkForDuplicateEntries(students);
    expect(result).toContain('duplicate entries');
  });
});

describe('checkForDuplicateStudentIds', () => {
  it('returns false for unique IDs', () => {
    const rows = [{ 'Student ID': 'S001' }, { 'Student ID': 'S002' }];
    expect(checkForDuplicateStudentIds(rows)).toBe(false);
  });

  it('detects duplicate IDs', () => {
    const rows = [{ 'Student ID': 'S001' }, { 'Student ID': 'S001' }];
    const result = checkForDuplicateStudentIds(rows);
    expect(result).toContain('duplicate Student ID');
  });
});

describe('isOverMaxCapacity', () => {
  it('returns false at max', () => {
    expect(isOverMaxCapacity(MAX_STUDENTS)).toBe(false);
  });

  it('returns true over max', () => {
    expect(isOverMaxCapacity(MAX_STUDENTS + 1)).toBe(true);
  });
});
