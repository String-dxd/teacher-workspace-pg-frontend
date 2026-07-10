import type { ReactNode } from 'react';
import { BrowserRouter, Route, Routes, useInRouterContext } from 'react-router';
import { Toaster } from 'sonner';

import '~/index.css';

import { AppErrorBoundary } from '~/components/AppErrorBoundary';

import { AddStudentsPage } from './pages/AddStudentsPage';
import { CcaDetailPage } from './pages/CcaDetailPage';
import { ClassDetailPage } from './pages/ClassDetailPage';
import { CreateGroupPage } from './pages/CreateGroupPage';
import { GroupDetailPage } from './pages/GroupDetailPage';
import { GroupsListPage } from './pages/GroupsListPage';

function GroupRoutes() {
  return (
    <AppErrorBoundary>
      <Routes>
        <Route index element={<GroupsListPage />} />
        <Route path="new" element={<CreateGroupPage />} />
        <Route path="new/add-students" element={<AddStudentsPage />} />
        <Route path="classes/:classId" element={<ClassDetailPage />} />
        <Route path="cca/details/:ccaId" element={<CcaDetailPage />} />
        <Route path=":id" element={<GroupDetailPage />} />
        <Route path=":id/edit" element={<CreateGroupPage />} />
        <Route path=":id/edit/add-students" element={<AddStudentsPage />} />
      </Routes>
      <Toaster />
    </AppErrorBoundary>
  );
}

function RouterGuard({ children }: { children: ReactNode }) {
  const hasRouter = useInRouterContext();
  if (hasRouter) return children;
  return <BrowserRouter>{children}</BrowserRouter>;
}

export default function App() {
  return (
    <RouterGuard>
      <GroupRoutes />
    </RouterGuard>
  );
}
