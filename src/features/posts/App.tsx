import { Outlet, Route, Routes } from 'react-router';
import { Toaster } from 'sonner';

import '~/index.css';

import { MaintenancePage } from './components/MaintenancePage';
import { PgOnboardingModal } from './components/PgOnboardingModal';
import { PostsErrorBoundary } from './components/PostsErrorBoundary';
import { UnauthorisedPage } from './components/UnauthorisedPage';
import { CreatePostPage } from './pages/CreatePostPage';
import { PostDetailPage } from './pages/PostDetailPage';
import { PostsListPage } from './pages/PostsListPage';

function PostsLayout() {
  return (
    <PostsErrorBoundary>
      <Outlet />
      <Toaster />
      {/* Sits at the layout, not the list page, so a teacher who deep-links
          straight into a post or the create flow still gets the orientation. */}
      <PgOnboardingModal />
    </PostsErrorBoundary>
  );
}

function PostRoutes() {
  return (
    <Routes>
      <Route element={<PostsLayout />}>
        <Route index element={<PostsListPage />} />
        <Route path="maintenance" element={<MaintenancePage />} />
        <Route path="unauthorised" element={<UnauthorisedPage />} />
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
