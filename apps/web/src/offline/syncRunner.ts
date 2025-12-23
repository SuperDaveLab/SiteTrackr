import { listTickets, type PaginatedTicketsResponse, type TicketAttachment, type VisitAttachment, type AttachmentStatus } from '../features/tickets/api/ticketsApi';
import { fetchSites, type PaginatedResponse, type SiteSummary } from '../features/sites/api/sitesApi';
import { fetchTemplates, type TicketTemplate } from '../features/templates/api/templatesApi';
import { listSiteOwners, listSiteFieldDefinitions, type SiteOwner, type SiteFieldDefinition } from '../features/siteOwners/api/siteOwnersApi';
import { createTicketAttachmentMetadata, createVisitAttachmentMetadata, uploadAttachmentContent, type AttachmentRecord } from '../features/attachments/api/attachmentsApi';
import { apiClient } from '../lib/apiClient';
import { db, getClientId, getLastBootstrapAt, getSyncCursor, setLastBootstrapAt, setSyncCursor, type TicketTemplateSummary, getLocalAttachmentBlob } from './db';
import { listPendingOutbox, listPendingByEntity, markFailed, markSending, removeOutbox, resetOutboxItem } from './outbox';
import type { AttachmentCreatePayload, AttachmentUploadPayload } from './outboxTypes';
import { mutateTicketDetailRecord } from './mutations';

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

const upsertAttachment = <T extends { id: string }>(list: T[] | undefined, next: T): T[] => {
  if (!list || list.length === 0) {
    return [next];
  }
  const idx = list.findIndex((item) => item.id === next.id);
  if (idx === -1) {
    return [next, ...list];
  }
  const copy = [...list];
  copy[idx] = { ...copy[idx], ...next };
  return copy;
};

const mapRecordToAttachment = (record: AttachmentRecord): TicketAttachment => ({
  id: record.id,
  type: record.type,
  filename: record.filename,
  displayName: record.displayName,
  mimeType: record.mimeType,
  sizeBytes: record.sizeBytes,
  url: record.url,
  status: record.status,
  uploadedBy: record.uploadedBy,
  createdAt: record.createdAt
});

const applyAttachmentRecordToCache = async (record: AttachmentRecord): Promise<void> => {
  await mutateTicketDetailRecord(record.ticketId, (detail) => {
    const mapped = mapRecordToAttachment(record);
    if (record.visitId) {
      const visits = detail.visits.map((visit) =>
        visit.id === record.visitId
          ? {
            ...visit,
            attachments: upsertAttachment<VisitAttachment>(visit.attachments, mapped as VisitAttachment)
          }
          : visit
      );
      return { ...detail, visits };
    }

    return {
      ...detail,
      attachments: upsertAttachment<TicketAttachment>(detail.attachments, mapped)
    };
  });
};

const setLocalAttachmentStatus = async (
  ticketId: string,
  visitId: string | null | undefined,
  attachmentId: string,
  status: AttachmentStatus
): Promise<void> => {
  await mutateTicketDetailRecord(ticketId, (detail) => {
    const applyStatus = <T extends TicketAttachment | VisitAttachment>(list: T[] | undefined): T[] | undefined => {
      if (!list || list.length === 0) {
        return list;
      }
      let updated = false;
      const next = list.map((attachment) => {
        if (attachment.id !== attachmentId) {
          return attachment;
        }
        updated = true;
        return { ...attachment, status };
      });
      return updated ? next : list;
    };

    if (visitId) {
      const visits = detail.visits.map((visit) =>
        visit.id === visitId
          ? { ...visit, attachments: applyStatus(visit.attachments) ?? visit.attachments }
          : visit
      );
      return { ...detail, visits };
    }

    return {
      ...detail,
      attachments: applyStatus(detail.attachments) ?? detail.attachments
    };
  });
};

const markSiblingUploadsFailed = async (attachmentId: string, error: string): Promise<void> => {
  const uploads = await db.outbox
    .where('entityId')
    .equals(attachmentId)
    .and((item) => item.entity === 'attachmentUpload')
    .toArray();

  await Promise.all(uploads.map((upload) => markFailed(upload.id, error)));
};

const processAttachmentCreates = async (): Promise<void> => {
  const pendingCreates = await listPendingByEntity('attachment');
  if (pendingCreates.length === 0) {
    return;
  }

  for (const item of pendingCreates) {
    const payload = item.payload as AttachmentCreatePayload | undefined;
    if (!payload) {
      continue;
    }

    await markSending(item.id);

    try {
      if (payload.scope === 'visit' && !payload.visitId) {
        throw new Error('MISSING_VISIT_ID');
      }

      const body = {
        id: payload.id,
        filename: payload.filename,
        mimeType: payload.mimeType,
        sizeBytes: payload.sizeBytes
      };

      const response = payload.scope === 'visit'
        ? await createVisitAttachmentMetadata(payload.visitId!, body)
        : await createTicketAttachmentMetadata(payload.ticketId, body);

      await applyAttachmentRecordToCache(response);
      await removeOutbox(item.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
      await markFailed(item.id, message);
      await markSiblingUploadsFailed(payload.id, message);
      await setLocalAttachmentStatus(payload.ticketId, payload.visitId, payload.id, 'FAILED');
      notifyStatus('error');
    }
  }
};

const processAttachmentUploads = async (): Promise<void> => {
  const pendingUploads = await listPendingByEntity('attachmentUpload');
  if (pendingUploads.length === 0) {
    return;
  }

  for (const item of pendingUploads) {
    const payload = item.payload as AttachmentUploadPayload | undefined;
    if (!payload) {
      continue;
    }

    // Skip uploads until metadata step has completed successfully
    const metadataOpsRemain = await db.outbox
      .where('entityId')
      .equals(payload.id)
      .and((op) => op.entity === 'attachment')
      .count();

    if (metadataOpsRemain > 0) {
      continue;
    }

    await markSending(item.id);
    const blobRecord = await getLocalAttachmentBlob(payload.id);
    if (!blobRecord) {
      const message = 'Attachment data unavailable locally';
      await markFailed(item.id, message);
      await setLocalAttachmentStatus(payload.ticketId, payload.visitId, payload.id, 'FAILED');
      notifyStatus('error');
      continue;
    }

    try {
      const response = await uploadAttachmentContent(payload.id, blobRecord.blob, blobRecord.mimeType);
      await applyAttachmentRecordToCache(response);
      await db.attachmentBlobs.delete(payload.id);
      await removeOutbox(item.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
      await markFailed(item.id, message);
      await setLocalAttachmentStatus(payload.ticketId, payload.visitId, payload.id, 'FAILED');
      notifyStatus('error');
    }
  }
};

const pushOutbox = async (): Promise<void> => {
  const pending = (await listPendingOutbox()).filter((item) => item.entity === 'ticket' || item.entity === 'visit');
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
    await processAttachmentCreates();
    await processAttachmentUploads();
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
