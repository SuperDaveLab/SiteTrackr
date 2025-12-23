import { listTickets, type PaginatedTicketsResponse } from '../features/tickets/api/ticketsApi';
import { fetchSites, type PaginatedResponse, type SiteSummary } from '../features/sites/api/sitesApi';
import { fetchTemplates, type TicketTemplate } from '../features/templates/api/templatesApi';
import { listSiteOwners, listSiteFieldDefinitions, type SiteOwner, type SiteFieldDefinition } from '../features/siteOwners/api/siteOwnersApi';
import { apiClient } from '../lib/apiClient';
import { db, getClientId, getLastBootstrapAt, getSyncCursor, setLastBootstrapAt, setSyncCursor, type TicketTemplateSummary } from './db';
import { listPendingOutbox, markFailed, markSending, removeOutbox, resetOutboxItem } from './outbox';
import type { OutboxItem } from './outboxTypes';

interface SyncChangesResponse {
  cursor: string;
  changes: {
    tickets: PaginatedTicketsResponse['data'];
    sites: PaginatedResponse<SiteSummary>['data'];
    templates: TicketTemplateSummary[];
  };
}

interface SyncApplyResponse {
  results: Array<{
    opId: string;
    ok: boolean;
    entity: string;
    entityId: string;
    serverUpdatedAt?: string;
    error?: string;
  }>;
}

type SyncStatus = 'idle' | 'syncing' | 'error';

const SYNC_INTERVAL_MS = 30_000;
const BOOTSTRAP_PAGE_SIZE = 50;
const BOOTSTRAP_PAGES = 2;
const BOOTSTRAP_TTL_MS = 5 * 60 * 1000;

let currentStatus: SyncStatus = 'idle';
let intervalHandle: ReturnType<typeof setInterval> | null = null;
let running = false;
const listeners = new Set<(status: SyncStatus) => void>();

const notifyStatus = (status: SyncStatus) => {
  currentStatus = status;
  listeners.forEach((listener) => listener(status));
};

const storeTicketSummaries = async (tickets: PaginatedTicketsResponse['data']): Promise<void> => {
  if (!tickets.length) return;
  await db.tickets.bulkPut(tickets);
};

const storeSiteSummaries = async (sites: SiteSummary[]): Promise<void> => {
  if (!sites.length) return;
  await db.sites.bulkPut(sites);
};

const storeTemplateData = async (templates: TicketTemplate[]): Promise<void> => {
  if (!templates.length) return;
  const summaries: TicketTemplateSummary[] = templates.map((template) => ({
    id: template.id,
    name: template.name,
    code: template.code,
    isActive: template.isActive,
    updatedAt: template.updatedAt
  }));

  await db.transaction('rw', db.ticketTemplateDetails, db.ticketTemplates, async () => {
    await db.ticketTemplateDetails.bulkPut(templates);
    await db.ticketTemplates.bulkPut(summaries);
  });
};

const storeSiteOwnerData = async (owners: SiteOwner[], fieldDefs: SiteFieldDefinition[]): Promise<void> => {
  await db.siteOwners.bulkPut(owners);
  await db.siteFieldDefinitions.bulkPut(fieldDefs);
};

const bootstrapPageFetch = async <T>(fetcher: (page: number) => Promise<PaginatedResponse<T>>): Promise<T[]> => {
  const pages = Array.from({ length: BOOTSTRAP_PAGES }, (_, index) => fetcher(index + 1));
  const responses = await Promise.allSettled(pages);
  const data: T[] = [];
  responses.forEach((result) => {
    if (result.status === 'fulfilled') {
      data.push(...result.value.data);
    }
  });
  return data;
};

export const bootstrapCache = async (): Promise<void> => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return;
  }

  const lastBootstrap = await getLastBootstrapAt();
  if (lastBootstrap && Date.now() - new Date(lastBootstrap).getTime() < BOOTSTRAP_TTL_MS) {
    return;
  }

  try {
    const [templates, owners, fieldDefs, bootstrapTickets, bootstrapSites] = await Promise.all([
      fetchTemplates(),
      listSiteOwners(),
      listSiteFieldDefinitions(),
      bootstrapPageFetch((page) => listTickets({ page, pageSize: BOOTSTRAP_PAGE_SIZE, sortBy: 'updatedAt', sortDir: 'desc' })),
      bootstrapPageFetch((page) => fetchSites({ page, pageSize: BOOTSTRAP_PAGE_SIZE, sortBy: 'updatedAt', sortDir: 'desc' }))
    ]);

    await storeTemplateData(templates);
    await storeSiteOwnerData(owners, fieldDefs);
    await storeTicketSummaries(bootstrapTickets);
    await storeSiteSummaries(bootstrapSites);
    await setLastBootstrapAt(new Date().toISOString());
  } catch (error) {
    console.warn('Bootstrap cache failed', error);
  }
};

const pushOutbox = async (): Promise<void> => {
  const pending = await listPendingOutbox();
  if (pending.length === 0) {
    return;
  }

  const clientId = await getClientId();
  const ids = pending.map((item) => item.id);
  await Promise.all(ids.map((id) => markSending(id)));

  try {
    const response = await apiClient.post<SyncApplyResponse>('/sync/apply', {
      clientId,
      ops: pending.map((item) => ({
        id: item.id,
        entity: item.entity,
        entityId: item.entityId,
        op: item.op,
        baseUpdatedAt: item.baseUpdatedAt,
        payload: item.payload
      }))
    });

    const failures = new Set<string>();
    for (const result of response.results) {
      if (result.ok) {
        await removeOutbox(result.opId);
      } else {
        failures.add(result.opId);
        await markFailed(result.opId, result.error ?? 'UNKNOWN_ERROR');
      }
    }

    for (const id of ids) {
      if (!response.results.find((result) => result.opId === id)) {
        failures.add(id);
        await markFailed(id, 'NO_RESPONSE');
      }
    }

    if (failures.size > 0) {
      notifyStatus('error');
    }
  } catch (error) {
    await Promise.all(ids.map((id) => resetOutboxItem(id)));
    throw error;
  }
};

const pullChanges = async (): Promise<void> => {
  const cursor = await getSyncCursor();
  const params = cursor ? { params: { since: cursor } } : {};
  const response = await apiClient.get<SyncChangesResponse>('/sync/changes', params);

  await db.transaction('rw', db.tickets, db.sites, db.ticketTemplates, async () => {
    await storeTicketSummaries(response.changes.tickets);
    await storeSiteSummaries(response.changes.sites);
    if (response.changes.templates.length) {
      await db.ticketTemplates.bulkPut(response.changes.templates);
    }
  });

  await setSyncCursor(response.cursor);
};

export const runSyncOnce = async (): Promise<void> => {
  if (running) {
    return;
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return;
  }

  running = true;
  notifyStatus('syncing');
  try {
    await pushOutbox();
    await pullChanges();
    notifyStatus('idle');
  } catch (error) {
    console.error('Sync failed', error);
    notifyStatus('error');
  } finally {
    running = false;
  }
};

export const startSyncLoop = (): (() => void) => {
  if (intervalHandle) {
    return () => {
      if (intervalHandle) {
        clearInterval(intervalHandle);
        intervalHandle = null;
      }
    };
  }

  intervalHandle = setInterval(() => {
    void runSyncOnce();
  }, SYNC_INTERVAL_MS);

  return () => {
    if (intervalHandle) {
      clearInterval(intervalHandle);
      intervalHandle = null;
    }
  };
};

export const subscribeToSyncStatus = (listener: (status: SyncStatus) => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getSyncStatus = (): SyncStatus => currentStatus;
