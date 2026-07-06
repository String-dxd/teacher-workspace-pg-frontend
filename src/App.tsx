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
  makePostDetailLoader,
  CreatePostPage,
  makeCreatePostLoader,
} from '~/features/posts';

export interface PostRouteHandle {
  postKind: 'announcement' | 'form';
  draft: boolean;
}

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
    loader: makeCreatePostLoader(),
    handle: { postKind: 'announcement', draft: false } satisfies PostRouteHandle,
  },
  {
    path: '/posts/announcements/:id',
    element: <PostDetailPage />,
    loader: makePostDetailLoader('announcement'),
    handle: { postKind: 'announcement', draft: false } satisfies PostRouteHandle,
  },
  {
    path: '/posts/announcements/:id/edit',
    element: <CreatePostPage />,
    loader: makeCreatePostLoader('announcement', false),
    handle: { postKind: 'announcement', draft: false } satisfies PostRouteHandle,
  },
  {
    path: '/posts/announcements/drafts/:id/edit',
    element: <CreatePostPage />,
    loader: makeCreatePostLoader('announcement', true),
    handle: { postKind: 'announcement', draft: true } satisfies PostRouteHandle,
  },
  {
    path: '/posts/consent-forms/:id',
    element: <PostDetailPage />,
    loader: makePostDetailLoader('form'),
    handle: { postKind: 'form', draft: false } satisfies PostRouteHandle,
  },
  {
    path: '/posts/consent-forms/:id/edit',
    element: <CreatePostPage />,
    loader: makeCreatePostLoader('form', false),
    handle: { postKind: 'form', draft: false } satisfies PostRouteHandle,
  },
  {
    path: '/posts/consent-forms/drafts/:id/edit',
    element: <CreatePostPage />,
    loader: makeCreatePostLoader('form', true),
    handle: { postKind: 'form', draft: true } satisfies PostRouteHandle,
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
