import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage } from './features/auth/pages/LoginPage';
import { AdminRoute } from './features/auth/components/AdminRoute';
import { DashboardPage } from './features/dashboard/pages/DashboardPage';
import { SitesListPage } from './features/sites/pages/SitesListPage';
import { SiteDetailPage } from './features/sites/pages/SiteDetailPage';
import { SiteOwnersListPage } from './features/siteOwners/pages/SiteOwnersListPage';
import { SiteOwnerFieldsPage } from './features/siteOwners/pages/SiteOwnerFieldsPage';
import { AssetsListPage } from './features/assets/pages/AssetsListPage';
import { AssetDetailPage } from './features/assets/pages/AssetDetailPage';
import { TicketsListPage } from './features/tickets/pages/TicketsListPage';
import { TicketDetailPage } from './features/tickets/pages/TicketDetailPage';
import { TicketCreatePage } from './features/tickets/pages/TicketCreatePage';
import { TicketTemplatesListPage } from './features/templates/pages/TicketTemplatesListPage';
import { TicketTemplateBuilderPage } from './features/templates/pages/TicketTemplateBuilderPage';
import { UsersListPage } from './features/users/pages/UsersListPage';
import { UserDetailPage } from './features/users/pages/UserDetailPage';
import { UserCreatePage } from './features/users/pages/UserCreatePage';
import { VisitDetailPage } from './features/visits/pages/VisitDetailPage';
import { ProfilePage } from './features/profile/pages/ProfilePage';
import AdminImportExportPage from './features/admin/AdminImportExportPage';
import SyncQueuePage from './features/admin/SyncQueuePage';
import { AppLayout } from './components/layout/AppLayout';
import { useAuth } from './features/auth/hooks/useAuth';

const ProtectedRoute = () => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <AppLayout />;
};

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'sites', element: <SitesListPage /> },
      { path: 'sites/:siteId', element: <SiteDetailPage /> },
      { path: 'assets', element: <AssetsListPage /> },
      { path: 'assets/:assetId', element: <AssetDetailPage /> },
      { path: 'tickets', element: <TicketsListPage /> },
      { path: 'tickets/:ticketId', element: <TicketDetailPage /> },
      { path: 'tickets/new', element: <TicketCreatePage /> },
      { path: 'visits/:visitId', element: <VisitDetailPage /> },
      { path: 'profile', element: <ProfilePage /> },
      // Admin-only routes
      {
        path: 'admin',
        element: <AdminRoute />,
        children: [
          { path: 'templates', element: <TicketTemplatesListPage /> },
          { path: 'templates/:templateId', element: <TicketTemplateBuilderPage /> },
          { path: 'site-owners', element: <SiteOwnersListPage /> },
          { path: 'site-owners/:siteOwnerId/fields', element: <SiteOwnerFieldsPage /> },
          { path: 'users', element: <UsersListPage /> },
          { path: 'users/new', element: <UserCreatePage /> },
          { path: 'users/:userId', element: <UserDetailPage /> },
          { path: 'import-export', element: <AdminImportExportPage /> },
          { path: 'sync-queue', element: <SyncQueuePage /> }
        ]
      }
    ]
  },
  {
    path: '*',
    element: <Navigate to="/" replace />
  }
]);
