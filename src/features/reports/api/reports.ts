import { AppError } from '~/features/posts/api/errors';
import { fetchSchoolClasses, fetchSchoolStaff } from '~/features/posts/api/school';
import { fetchSession } from '~/features/posts/api/session';

export { fetchSchoolClasses, fetchSchoolStaff, fetchSession };

const BASE = '/api/web/2/staff';

export interface ReportFile {
  blob: Blob;
  filename: string;
}

export type DeclarationStatus = 'not_declared' | 'declared';

export interface TravelDeclarationParams {
  status: DeclarationStatus;
  startDate: string;
  endDate: string;
}

/** School reports cover every class at once — there's nothing to pick. */
export type ReportTarget = { kind: 'class'; classId: number } | { kind: 'school'; schoolId: number };

function targetQuery(target: ReportTarget): string {
  return target.kind === 'class' ? `classId=${target.classId}` : `schoolId=${target.schoolId}`;
}

/**
 * Report endpoints return a raw downloadable file (CSV), not the pgw JSON
 * envelope every other endpoint in this app uses — so this bypasses
 * `fetchApi` and reads the response directly.
 */
async function fetchReportFile(path: string): Promise<ReportFile> {
  const res = await fetch(`${BASE}${path}`, { credentials: 'include' });
  if (!res.ok) {
    let message = `The report could not be generated (${res.status}).`;
    try {
      const body = (await res.json()) as { message?: string; error?: { errorReason?: string } };
      message = body.error?.errorReason ?? body.message ?? message;
    } catch {
      // Non-JSON error body — fall back to the generic message above.
    }
    throw new AppError(message, res.status, res.status);
  }
  const blob = await res.blob();
  const disposition = res.headers.get('content-disposition') ?? '';
  const filenameMatch = /filename="?([^"]+)"?/.exec(disposition);
  return { blob, filename: filenameMatch?.[1] ?? 'report.csv' };
}

export function fetchOnboardingReport(target: ReportTarget): Promise<ReportFile> {
  return fetchReportFile(`/reports/onboarding?${targetQuery(target)}`);
}

export function fetchTravelDeclarationReport(
  target: ReportTarget,
  params: TravelDeclarationParams,
): Promise<ReportFile> {
  const query = new URLSearchParams({ ...params });
  return fetchReportFile(`/reports/travel-declaration?${targetQuery(target)}&${query}`);
}
