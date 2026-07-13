import type { ApiSchoolClass, ApiSchoolStudent } from '~/features/posts/api/types';
import type {
  EntityItem,
  EntityScope,
  SearchResults,
} from '~/features/posts/components/EntitySelector';

// Builds EntitySelector scopes (Classes / Levels / CCAs / Students) from the
// school endpoints the create-post loader already fetches. Levels and CCAs
// are derived from student records; they get synthetic numeric ids well above
// the real class-id range so they still serialize as numeric group targets.

const LEVEL_ID_BASE = 9000;
const CCA_ID_BASE = 8000;

function maskUin(uin: string): string {
  return uin.length > 4 ? `•••${uin.slice(-4)}` : uin;
}

function stripYear(label: string): string {
  return label.replace(/ \(\d{4}\)$/, '');
}

export interface RecipientScopeData {
  scopes: EntityScope[];
  searchFn: (query: string) => SearchResults;
  overlapMap: Record<string, string[]>;
}

export function buildRecipientScopes(
  classes: ApiSchoolClass[],
  students: ApiSchoolStudent[],
): RecipientScopeData {
  const studentsByClass = new Map<string, ApiSchoolStudent[]>();
  for (const s of students) {
    const key = stripYear(s.className);
    const list = studentsByClass.get(key) ?? [];
    list.push(s);
    studentsByClass.set(key, list);
  }

  // Classes — real class ids from the school endpoint, rosters from students
  const classItems: EntityItem[] = classes.map((c) => {
    const label = stripYear(c.label);
    const roster = studentsByClass.get(label) ?? [];
    return {
      id: String(c.value),
      label,
      type: 'group',
      groupType: 'class',
      count: roster.length,
      memberNames: roster.map((s) => s.studentName),
      memberDetails: roster.map((s) => ({ name: s.studentName, badge: maskUin(s.uinFinNo) })),
    };
  });
  const classIdByLabel = new Map(classItems.map((c) => [c.label, c.id]));

  // Levels — derived from levelDescription, containing whole classes
  const levelLabels = [...new Set(students.map((s) => s.levelDescription))].sort();
  const levelItems: EntityItem[] = levelLabels.map((level, i) => {
    const members = students.filter((s) => s.levelDescription === level);
    const classLabels = [...new Set(members.map((s) => stripYear(s.className)))].sort();
    return {
      id: String(LEVEL_ID_BASE + i),
      label: level,
      sublabel: classLabels.join(', '),
      type: 'group',
      groupType: 'level',
      count: members.length,
      memberNames: members.map((s) => s.studentName),
      memberDetails: members.map((s) => ({
        name: s.studentName,
        sublabel: stripYear(s.className),
        badge: maskUin(s.uinFinNo),
      })),
    };
  });

  // CCAs — derived from student cca memberships
  const ccaLabels = [...new Set(students.flatMap((s) => s.cca))].sort();
  const ccaItems: EntityItem[] = ccaLabels.map((cca, i) => {
    const members = students.filter((s) => s.cca.includes(cca));
    return {
      id: String(CCA_ID_BASE + i),
      label: cca,
      type: 'group',
      groupType: 'cca',
      count: members.length,
      memberNames: members.map((s) => s.studentName),
      memberDetails: members.map((s) => ({
        name: s.studentName,
        sublabel: stripYear(s.className),
        badge: maskUin(s.uinFinNo),
      })),
    };
  });

  // Individual students
  const individualItems: EntityItem[] = students.map((s) => ({
    id: String(s.studentId),
    label: s.studentName,
    sublabel: stripYear(s.className),
    badge: maskUin(s.uinFinNo),
    type: 'individual',
    count: 1,
  }));

  const scopes: EntityScope[] = [
    { id: 'classes', label: 'Classes', items: classItems },
    { id: 'levels', label: 'Levels', items: levelItems },
    { id: 'ccas', label: 'CCAs', items: ccaItems },
    { id: 'students', label: 'Students', items: individualItems },
  ];

  const allGroups = [...classItems, ...levelItems, ...ccaItems];

  function searchFn(query: string): SearchResults {
    const q = query.toLowerCase();
    return {
      groups: allGroups.filter(
        (g) =>
          g.label.toLowerCase().includes(q) || (g.sublabel?.toLowerCase().includes(q) ?? false),
      ),
      individuals: individualItems
        .filter(
          (s) =>
            s.label.toLowerCase().includes(q) || (s.sublabel?.toLowerCase().includes(q) ?? false),
        )
        .slice(0, 8),
    };
  }

  // Overlap map: parent id → child ids that duplicate recipients when both
  // are selected (level ⊃ class, class ⊃ student, cca ⊃ student).
  const overlapMap: Record<string, string[]> = {};
  levelLabels.forEach((level, i) => {
    const members = students.filter((s) => s.levelDescription === level);
    const childClassIds = [...new Set(members.map((s) => stripYear(s.className)))]
      .map((label) => classIdByLabel.get(label))
      .filter((id): id is string => Boolean(id));
    const childStudentIds = members.map((s) => String(s.studentId));
    overlapMap[String(LEVEL_ID_BASE + i)] = [...childClassIds, ...childStudentIds];
  });
  for (const c of classItems) {
    const roster = studentsByClass.get(c.label) ?? [];
    overlapMap[c.id] = roster.map((s) => String(s.studentId));
  }
  ccaLabels.forEach((cca, i) => {
    const members = students.filter((s) => s.cca.includes(cca));
    overlapMap[String(CCA_ID_BASE + i)] = members.map((s) => String(s.studentId));
  });

  return { scopes, searchFn, overlapMap };
}
