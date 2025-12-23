import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './lib/queryClient';
import { router } from './router';
import { AuthProvider } from './features/auth/hooks/useAuth';
import { OfflineManager } from './offline/OfflineManager';

export const App = () => (
  <AuthProvider>
    <QueryClientProvider client={queryClient}>
      <OfflineManager />
      <RouterProvider router={router} />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </AuthProvider>
);
