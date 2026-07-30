import { Outlet, Route, Routes } from 'react-router';
import { Toaster } from 'sonner';

import '~/index.css';

import { AppErrorBoundary } from '~/components/AppErrorBoundary';

import { ReportsListPage } from './pages/ReportsListPage';

function ReportsLayout() {
  return (
    <AppErrorBoundary>
      <Outlet />
      <Toaster />
    </AppErrorBoundary>
  );
}

function ReportRoutes() {
  return (
    <Routes>
      <Route element={<ReportsLayout />}>
        <Route index element={<ReportsListPage />} />
      </Route>
    </Routes>
  );
}

export { ReportRoutes };

export default function App() {
  return <ReportRoutes />;
}
