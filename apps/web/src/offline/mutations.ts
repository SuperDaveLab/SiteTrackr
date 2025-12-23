import type { TicketPriority, TicketStatus, TicketDetail } from '../features/tickets/api/ticketsApi';
import type { VisitCreatePayload } from './outboxTypes';
import { db, type VisitRecord } from './db';
import { enqueueOutbox } from './outbox';
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

const nowIso = () => new Date().toISOString();

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
