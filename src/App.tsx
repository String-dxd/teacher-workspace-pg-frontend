import { createBrowserRouter, RouterProvider } from 'react-router';
import { Toaster } from 'sonner';

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
