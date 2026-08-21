import { Outlet, Route, Routes } from 'react-router';
import { Toaster } from 'sonner';

import '~/index.css';

import { AppErrorBoundary } from '~/components/AppErrorBoundary';

import { CreatePostPage } from './pages/CreatePostPage';
import { PostDetailPage } from './pages/PostDetailPage';
import { PostsListPage } from './pages/PostsListPage';

function PostsLayout() {
  return (
    <AppErrorBoundary>
      <Outlet />
      <Toaster />
    </AppErrorBoundary>
  );
}

function PostRoutes() {
  return (
    <Routes>
      <Route element={<PostsLayout />}>
        <Route index element={<PostsListPage />} />
        <Route path="new" element={<CreatePostPage postKind="announcement" draft={false} />} />
        <Route path="announcements/:id" element={<PostDetailPage postKind="announcement" />} />
        <Route
          path="announcements/:id/edit"
          element={<CreatePostPage postKind="announcement" draft={false} />}
        />
        <Route
          path="announcements/drafts/:id/edit"
          element={<CreatePostPage postKind="announcement" draft={true} />}
        />
        <Route path="consent-forms/:id" element={<PostDetailPage postKind="form" />} />
        <Route
          path="consent-forms/:id/edit"
          element={<CreatePostPage postKind="form" draft={false} />}
        />
        <Route
          path="consent-forms/drafts/:id/edit"
          element={<CreatePostPage postKind="form" draft={true} />}
        />
      </Route>
    </Routes>
  );
}

export { PostRoutes };

export default function App() {
  return <PostRoutes />;
}
