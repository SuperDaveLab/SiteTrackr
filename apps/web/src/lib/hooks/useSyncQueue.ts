import { useCallback } from 'react';
import { offlineDb } from '../offline/db';

export const useSyncQueue = () => {
  const enqueue = useCallback(async (entity: string, payload: Record<string, unknown>) => {
    await offlineDb.syncQueue.add({
      entity,
      payload,
      createdAt: Date.now()
    });
  }, []);

  const clearQueue = useCallback(async () => {
    await offlineDb.syncQueue.clear();
  }, []);

  return { enqueue, clearQueue };
};
