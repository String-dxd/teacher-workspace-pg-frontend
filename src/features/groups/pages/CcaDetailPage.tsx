import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router';

import { useQuery } from '~/hooks/useQuery';

import { fetchCcaDetail } from '../api/client';

export function CcaDetailPage() {
  const { ccaId } = useParams();
  const { data, isLoading } = useQuery(() => fetchCcaDetail(Number(ccaId)), [ccaId]);

  if (isLoading || !data) return null;

  return (
    <div className="flex justify-center px-6 py-6">
      <div className="w-full max-w-4xl">
        <header className="flex items-start gap-3">
          <Link
            to="/"
            aria-label="Back to Groups"
            className="mt-1 rounded-md p-2 text-muted-foreground hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-xs tracking-wide text-muted-foreground uppercase">CCA Group</p>
            <h1 className="mt-1 text-2xl font-semibold">{data.ccaDescription}</h1>
            <p className="text-sm text-muted-foreground">{data.students.length} students</p>
          </div>
        </header>

        <div className="mt-6 rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Class</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.students.map((s) => (
                <tr key={s.studentId}>
                  <td className="px-4 py-3 font-medium">{s.studentName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.className}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
