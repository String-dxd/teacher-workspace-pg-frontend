import { ArrowLeft } from 'lucide-react';
import type { LoaderFunctionArgs } from 'react-router';
import { Link, useLoaderData } from 'react-router';

import { fetchClassDetail } from '../api/client';
import type { ApiClassDetail } from '../api/types';

export async function loader({ params }: LoaderFunctionArgs): Promise<ApiClassDetail> {
  return fetchClassDetail(Number(params.classId));
}

export function ClassDetailPage() {
  const data = useLoaderData() as ApiClassDetail;

  return (
    <div className="flex justify-center px-6 py-6">
      <div className="w-full max-w-4xl">
        <header className="flex items-start gap-3">
          <Link
            to="/groups"
            aria-label="Back to Groups"
            className="mt-1 rounded-md p-2 text-muted-foreground hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-xs tracking-wide text-muted-foreground uppercase">Assigned Class</p>
            <h1 className="mt-1 text-2xl font-semibold">{data.className}</h1>
            <p className="text-sm text-muted-foreground">
              {data.level} · {data.year} · {data.students.length} students
            </p>
          </div>
        </header>

        <div className="mt-6 rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Admission No.</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.students.map((s) => (
                <tr key={s.studentId}>
                  <td className="px-4 py-3 font-medium">{s.studentName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.admissionNumber}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
