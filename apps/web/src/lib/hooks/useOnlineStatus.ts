import { useOnlineStatus as useOfflineModuleOnlineStatus } from '../../offline/useOnlineStatus';

export const useOnlineStatus = (): boolean => useOfflineModuleOnlineStatus().online;
