import { Suspense, lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';

const PostsApp = lazy(() => import('~/features/posts/App'));
const GroupsApp = lazy(() => import('~/features/groups/App'));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/posts/*" element={<PostsApp />} />
          <Route path="/groups/*" element={<GroupsApp />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
