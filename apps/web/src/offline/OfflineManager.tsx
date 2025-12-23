import { useEffect, useRef } from 'react';
import { useAuth } from '../features/auth/hooks/useAuth';
import { useOnlineStatus } from './useOnlineStatus';
import { bootstrapCache, runSyncOnce, startSyncLoop } from './syncRunner';

export const OfflineManager = () => {
  const { isAuthenticated } = useAuth();
  const { online } = useOnlineStatus();
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      cleanupRef.current?.();
      cleanupRef.current = null;
      return;
    }

    void bootstrapCache().then(() => runSyncOnce());
    cleanupRef.current = startSyncLoop();

    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && online) {
      void runSyncOnce();
    }
  }, [isAuthenticated, online]);

  return null;
};
