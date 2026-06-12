import { createBrowserRouter, RouterProvider } from 'react-router';
import { Toaster } from 'sonner';

import {
  AddStudentsPage,
  addStudentsLoader,
  CcaDetailPage,
  ccaDetailLoader,
  ClassDetailPage,
  classDetailLoader,
  CreateGroupPage,
  createGroupLoader,
  GroupDetailPage,
  groupDetailLoader,
  GroupsListPage,
  groupsListLoader,
} from '~/features/groups';
import {
  PostsListPage,
  postsListLoader,
  PostDetailPage,
  postDetailLoader,
  CreatePostPage,
  createPostLoader,
} from '~/features/posts';

const router = createBrowserRouter([
  {
    path: '/groups',
    element: <GroupsListPage />,
    loader: groupsListLoader,
  },
  {
    path: '/groups/new',
    element: <CreateGroupPage />,
    loader: createGroupLoader,
  },
  {
    path: '/groups/new/add-students',
    element: <AddStudentsPage />,
    loader: addStudentsLoader,
  },
  {
    path: '/groups/classes/:classId',
    element: <ClassDetailPage />,
    loader: classDetailLoader,
  },
  {
    path: '/groups/cca/details/:ccaId',
    element: <CcaDetailPage />,
    loader: ccaDetailLoader,
  },
  {
    path: '/groups/:id',
    element: <GroupDetailPage />,
    loader: groupDetailLoader,
  },
  {
    path: '/groups/:id/edit',
    element: <CreateGroupPage />,
    loader: createGroupLoader,
  },
  {
    path: '/groups/:id/edit/add-students',
    element: <AddStudentsPage />,
    loader: addStudentsLoader,
  },
  {
    path: '/posts',
    element: <PostsListPage />,
    loader: postsListLoader,
  },
  {
    path: '/posts/new',
    element: <CreatePostPage />,
    loader: createPostLoader,
  },
  {
    path: '/posts/:id',
    element: <PostDetailPage />,
    loader: postDetailLoader,
  },
  {
    path: '/posts/:id/edit',
    element: <CreatePostPage />,
    loader: createPostLoader,
  },
]);

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}
