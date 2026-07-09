import type { ReactNode } from 'react';
import { BrowserRouter, Route, Routes, useInRouterContext } from 'react-router';
import { Toaster } from 'sonner';

import { AppErrorBoundary } from '~/components/AppErrorBoundary';
import {
  AddStudentsPage,
  CcaDetailPage,
  ClassDetailPage,
  CreateGroupPage,
  GroupDetailPage,
  GroupsListPage,
} from '~/features/groups';
import { CreatePostPage, PostDetailPage, PostsListPage } from '~/features/posts';
import TestPage from '~/pages/TestPage';

function AppRoutes() {
  return (
    <AppErrorBoundary>
      <Routes>
        <Route path="test" element={<TestPage />} />

        <Route path="groups" element={<GroupsListPage />} />
        <Route path="groups/new" element={<CreateGroupPage />} />
        <Route path="groups/new/add-students" element={<AddStudentsPage />} />
        <Route path="groups/classes/:classId" element={<ClassDetailPage />} />
        <Route path="groups/cca/details/:ccaId" element={<CcaDetailPage />} />
        <Route path="groups/:id" element={<GroupDetailPage />} />
        <Route path="groups/:id/edit" element={<CreateGroupPage />} />
        <Route path="groups/:id/edit/add-students" element={<AddStudentsPage />} />

        <Route path="posts" element={<PostsListPage />} />
        <Route
          path="posts/new"
          element={<CreatePostPage postKind="announcement" draft={false} />}
        />
        <Route
          path="posts/announcements/:id"
          element={<PostDetailPage postKind="announcement" />}
        />
        <Route
          path="posts/announcements/:id/edit"
          element={<CreatePostPage postKind="announcement" draft={false} />}
        />
        <Route
          path="posts/announcements/drafts/:id/edit"
          element={<CreatePostPage postKind="announcement" draft={true} />}
        />
        <Route path="posts/consent-forms/:id" element={<PostDetailPage postKind="form" />} />
        <Route
          path="posts/consent-forms/:id/edit"
          element={<CreatePostPage postKind="form" draft={false} />}
        />
        <Route
          path="posts/consent-forms/drafts/:id/edit"
          element={<CreatePostPage postKind="form" draft={true} />}
        />
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
      <AppRoutes />
    </RouterGuard>
  );
}
