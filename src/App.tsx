import { BrowserRouter, Route, Routes } from 'react-router';

import GroupsApp from '~/features/groups/App';
import PostsApp from '~/features/posts/App';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/posts/*" element={<PostsApp />} />
        <Route path="/groups/*" element={<GroupsApp />} />
      </Routes>
    </BrowserRouter>
  );
}
