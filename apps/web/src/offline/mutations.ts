import type { TicketPriority, TicketStatus, TicketDetail, TicketAttachment, AttachmentStatus } from '../features/tickets/api/ticketsApi';
import type { AttachmentCreatePayload, AttachmentUploadPayload, VisitCreatePayload } from './outboxTypes';
import { db, type VisitRecord, getLocalAttachmentBlob } from './db';
import { enqueueOutbox, resetOutboxItem } from './outbox';
import { queryClient } from '../lib/queryClient';

interface UpdateTicketOfflineArgs {
  ticketId: string;
  patch: Partial<Pick<TicketDetail, 'summary' | 'description' | 'status' | 'priority' | 'customFields'>> & {
    status?: TicketStatus;
    priority?: TicketPriority;
  };
  baseUpdatedAt?: string;
}

interface CreateVisitOfflineArgs {
  ticketId: string;
  visitDraft: Omit<VisitCreatePayload, 'ticketId'>;
  technician: {
    id: string;
    displayName: string;
  };
}

interface AddAttachmentOfflineArgs {
  ticketId: string;
  visitId?: string;
  file: File;
  user: {
    id: string;
    displayName: string;
  };
}

const nowIso = () => new Date().toISOString();
const MAX_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024;

const randomId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.round(Math.random() * 10_000)}`;
};

const classifyFileType = (mimeType: string): TicketAttachment['type'] => {
  if (mimeType.startsWith('image/')) {
    return 'PHOTO';
  }
  if (mimeType === 'application/pdf' || mimeType.startsWith('application/')) {
    return 'DOCUMENT';
  }
  return 'OTHER';
};

export const mutateTicketDetailRecord = async (
  ticketId: string,
  mutate: (detail: TicketDetail) => TicketDetail | null
): Promise<TicketDetail | undefined> => {
  let nextDetail: TicketDetail | undefined;
  await db.transaction('rw', db.ticketDetails, db.visits, async () => {
    const detail = await db.ticketDetails.get(ticketId);
    if (!detail) {
      return;
    }
    const updated = mutate(detail);
    if (!updated) {
      return;
    }
    nextDetail = updated;
    await db.ticketDetails.put(updated);
    if (updated.visits?.length) {
      await db.visits.bulkPut(
        updated.visits.map((visit) => ({
          ...visit,
          ticketId
        }))
      );
    }
  });

  if (nextDetail) {
    queryClient.setQueryData(['ticket', ticketId], nextDetail);
  }

  return nextDetail;
};

export const updateTicketOffline = async ({ ticketId, patch, baseUpdatedAt }: UpdateTicketOfflineArgs): Promise<void> => {
  const updatedAt = nowIso();

  await db.transaction('rw', db.ticketDetails, db.tickets, async () => {
    const detail = await db.ticketDetails.get(ticketId);
    if (detail) {
      const nextDetail: TicketDetail = {
        ...detail,
        ...patch,
        customFields: patch.customFields ?? detail.customFields,
        updatedAt
      };
      await db.ticketDetails.put(nextDetail);
      queryClient.setQueryData(['ticket', ticketId], nextDetail);
    }

    const summary = await db.tickets.get(ticketId);
    if (summary) {
      const nextSummary = {
        ...summary,
        ...patch,
        updatedAt
      };
      await db.tickets.put(nextSummary);
    }
  });

  await enqueueOutbox({
    entity: 'ticket',
    entityId: ticketId,
    op: 'update',
    payload: { patch },
    baseUpdatedAt
  });
};

export const createVisitOffline = async ({ ticketId, visitDraft, technician }: CreateVisitOfflineArgs): Promise<VisitRecord> => {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.round(Math.random() * 1000)}`;
  const startedAt = visitDraft.startedAt ?? nowIso();
  const createdAt = nowIso();

  const visit: VisitRecord = {
    id,
    ticketId,
    startedAt,
    endedAt: visitDraft.endedAt ?? null,
    notes: visitDraft.notes,
    location: visitDraft.location,
    readings: visitDraft.readings,
    createdAt,
    technician,
    attachments: []
  };

  await db.transaction('rw', db.visits, db.ticketDetails, async () => {
    await db.visits.put(visit);
    const detail = await db.ticketDetails.get(ticketId);
    if (detail) {
      const nextDetail: TicketDetail = {
        ...detail,
        visits: [visit, ...detail.visits],
        updatedAt: createdAt
      };
      await db.ticketDetails.put(nextDetail);
      queryClient.setQueryData(['ticket', ticketId], nextDetail);
    }
  });

  await enqueueOutbox({
    entity: 'visit',
    entityId: id,
    op: 'create',
    payload: {
      ticketId,
      ...visitDraft,
      startedAt,
      endedAt: visitDraft.endedAt ?? null
    }
  });

  return visit;
};

const addAttachmentOffline = async ({ ticketId, visitId, file, user }: AddAttachmentOfflineArgs): Promise<TicketAttachment> => {
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    throw new Error('Attachments are limited to 25MB');
  }

  const attachmentId = randomId();
  await db.attachmentBlobs.put({
    id: attachmentId,
    blob: file,
    mimeType: file.type,
    sizeBytes: file.size,
    createdAt: Date.now()
  });

  const createdAt = nowIso();
  const attachment: TicketAttachment = {
    id: attachmentId,
    type: classifyFileType(file.type),
    filename: file.name,
    displayName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    url: '',
    status: 'PENDING',
    uploadedBy: {
      id: user.id,
      displayName: user.displayName || 'You'
    },
    createdAt
  };

  await mutateTicketDetailRecord(ticketId, (detail) => {
    if (visitId) {
      const nextVisits = detail.visits.map((visit) => {
        if (visit.id !== visitId) {
          return visit;
        }
        return {
          ...visit,
          attachments: [attachment, ...(visit.attachments ?? [])]
        };
      });
      return {
        ...detail,
        visits: nextVisits
      };
    }

    return {
      ...detail,
      attachments: [attachment, ...(detail.attachments ?? [])]
    };
  });

  await enqueueOutbox({
    entity: 'attachment',
    entityId: attachmentId,
    op: 'create',
    payload: {
      id: attachmentId,
      scope: visitId ? 'visit' : 'ticket',
      ticketId,
      visitId,
      filename: file.name,
      mimeType: file.type,
      sizeBytes: file.size
    }
  });

  await enqueueOutbox({
    entity: 'attachmentUpload',
    entityId: attachmentId,
    op: 'upload',
    payload: {
      id: attachmentId,
      ticketId,
      visitId
    }
  });

  return attachment;
};

export const addTicketAttachmentOffline = async (args: Omit<AddAttachmentOfflineArgs, 'visitId'>): Promise<void> => {
  await addAttachmentOffline(args);
};

export const addVisitAttachmentOffline = async (args: AddAttachmentOfflineArgs): Promise<void> => {
  if (!args.visitId) {
    throw new Error('visitId is required for visit attachments');
  }
  await addAttachmentOffline(args);
};

export const retryAttachmentUpload = async ({
  attachmentId
}: {
  attachmentId: string;
}): Promise<void> => {
  const blob = await getLocalAttachmentBlob(attachmentId);
  if (!blob) {
    throw new Error('Attachment data is no longer available offline');
  }

  const relatedOps = await db.outbox.where('entityId').equals(attachmentId).toArray();
  let ticketId: string | undefined;
  let visitId: string | undefined;

  for (const op of relatedOps) {
    if (op.entity === 'attachment') {
      const payload = op.payload as AttachmentCreatePayload;
      ticketId = payload.ticketId;
      visitId = payload.visitId;
    } else if (op.entity === 'attachmentUpload') {
      const payload = op.payload as AttachmentUploadPayload;
      ticketId = payload.ticketId;
      visitId = payload.visitId;
    }

    if (op.status === 'failed') {
      await resetOutboxItem(op.id);
    }
  }

  if (!relatedOps.some((op) => op.entity === 'attachmentUpload')) {
    if (ticketId) {
      await enqueueOutbox({
        entity: 'attachmentUpload',
        entityId: attachmentId,
        op: 'upload',
        payload: {
          id: attachmentId,
          ticketId,
          visitId
        }
      });
    }
  }

  if (ticketId) {
    await mutateTicketDetailRecord(ticketId, (detail) => {
      const updateList = (list: TicketAttachment[]) =>
        list.map((attachment) =>
          attachment.id === attachmentId
            ? { ...attachment, status: 'PENDING' as AttachmentStatus }
            : attachment
        );

      if (visitId) {
        const visits = detail.visits.map((visit) =>
          visit.id === visitId
            ? { ...visit, attachments: updateList(visit.attachments) }
            : visit
        );
        return { ...detail, visits };
      }

      return {
        ...detail,
        attachments: updateList(detail.attachments ?? [])
      };
    });
  }
};
