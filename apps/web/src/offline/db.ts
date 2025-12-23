import Dexie, { Table } from 'dexie';
import type { TicketListItem, TicketDetail, TicketVisit } from '../features/tickets/api/ticketsApi';
import type { SiteSummary, SiteDetail } from '../features/sites/api/sitesApi';
import type { TicketTemplate } from '../features/templates/api/templatesApi';
import type { SiteOwner, SiteFieldDefinition } from '../features/siteOwners/api/siteOwnersApi';
import type { OutboxItem } from './outboxTypes';

export interface SyncStateRecord {
  key: string;
  value: string;
}

export interface TicketTemplateSummary {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  updatedAt: string;
}

export interface AttachmentBlobRecord {
  id: string;
  blob: Blob;
  mimeType: string;
  sizeBytes: number;
  createdAt: number;
}

export interface VisitRecord extends TicketVisit {
  ticketId: string;
  location?: Record<string, unknown> | null;
  readings?: Record<string, unknown> | null;
}

class SiteTrackrOfflineDB extends Dexie {
  syncState!: Table<SyncStateRecord, string>;
  outbox!: Table<OutboxItem, string>;
  sites!: Table<SiteSummary, string>;
  siteDetails!: Table<SiteDetail, string>;
  siteOwners!: Table<SiteOwner, string>;
  siteFieldDefinitions!: Table<SiteFieldDefinition, string>;
  ticketTemplates!: Table<TicketTemplateSummary, string>;
  ticketTemplateDetails!: Table<TicketTemplate, string>;
  tickets!: Table<TicketListItem, string>;
  ticketDetails!: Table<TicketDetail, string>;
  visits!: Table<VisitRecord, string>;
  attachmentBlobs!: Table<AttachmentBlobRecord, string>;

  constructor() {
    super('SiteTrackrOfflineDB');
    this.version(1).stores({
      syncState: '&key',
      outbox: '&id, status, entity, entityId',
      sites: '&id, updatedAt',
      siteDetails: '&id',
      siteOwners: '&id, updatedAt',
      siteFieldDefinitions: '&id, siteOwnerId',
      ticketTemplates: '&id, updatedAt',
      ticketTemplateDetails: '&id',
      tickets: '&id, updatedAt',
      ticketDetails: '&id',
      visits: '&id, ticketId, startedAt'
    });

    // v2 adds createdAt index so the admin sync queue can order entries chronologically
    this.version(2).stores({
      outbox: '&id, status, entity, entityId, createdAt'
    });

    // v3 introduces attachment blob storage for offline uploads
    this.version(3).stores({
      attachmentBlobs: '&id, createdAt'
    });
  }
}

export const db = new SiteTrackrOfflineDB();

const CLIENT_ID_KEY = 'clientId';
const SYNC_CURSOR_KEY = 'lastSyncCursor';
const BOOTSTRAP_KEY = 'lastBootstrapAt';

const randomId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.round(Math.random() * 10_000)}`;
};

export const getClientId = async (): Promise<string> => {
  const existing = await db.syncState.get(CLIENT_ID_KEY);
  if (existing?.value) {
    return existing.value;
  }

  const id = randomId();
  await db.syncState.put({ key: CLIENT_ID_KEY, value: id });
  return id;
};

export const getSyncCursor = async (): Promise<string | null> => {
  const record = await db.syncState.get(SYNC_CURSOR_KEY);
  return record?.value ?? null;
};

export const setSyncCursor = async (cursor: string | null): Promise<void> => {
  if (!cursor) {
    await db.syncState.delete(SYNC_CURSOR_KEY);
    return;
  }
  await db.syncState.put({ key: SYNC_CURSOR_KEY, value: cursor });
};

export const getLastBootstrapAt = async (): Promise<string | null> => {
  const record = await db.syncState.get(BOOTSTRAP_KEY);
  return record?.value ?? null;
};

export const setLastBootstrapAt = async (value: string): Promise<void> => {
  await db.syncState.put({ key: BOOTSTRAP_KEY, value });
};

export const getLocalAttachmentBlob = async (attachmentId: string): Promise<AttachmentBlobRecord | undefined> => {
  return db.attachmentBlobs.get(attachmentId);
};
