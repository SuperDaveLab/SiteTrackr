import Dexie, { Table } from 'dexie';

export interface SyncQueueItem {
  id?: number;
  entity: string;
  payload: Record<string, unknown>;
  createdAt: number;
}

export class SiteTrackrDB extends Dexie {
  syncQueue!: Table<SyncQueueItem, number>;

  constructor() {
    super('SiteTrackrDB');
    this.version(1).stores({
      syncQueue: '++id, entity, createdAt'
    });
  }
}

export const offlineDb = new SiteTrackrDB();
