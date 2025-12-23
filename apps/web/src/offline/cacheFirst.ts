import type { QueryKey } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';

interface CacheFirstOptions<T> {
  queryKey: QueryKey;
  fetchRemote: () => Promise<T>;
  readLocal: () => Promise<T | undefined>;
  writeLocal: (value: T) => Promise<void>;
  online?: boolean;
}

export const cacheFirstQuery = async <T>(options: CacheFirstOptions<T>): Promise<T> => {
  const { queryKey, fetchRemote, readLocal, writeLocal } = options;
  const online = options.online ?? (typeof navigator === 'undefined' ? true : navigator.onLine);

  const cached = await readLocal();
  if (cached) {
    if (online) {
      fetchRemote()
        .then(async (fresh) => {
          await writeLocal(fresh);
          queryClient.setQueryData(queryKey, fresh);
        })
        .catch((error) => {
          console.warn('Failed to refresh cache for', queryKey, error);
        });
    }
    return cached;
  }

  if (!online) {
    throw new Error('Offline and no cached data available');
  }

  const remote = await fetchRemote();
  await writeLocal(remote);
  return remote;
};
