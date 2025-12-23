export type OutboxEntity = 'ticket' | 'visit';
export type OutboxOp = 'create' | 'update';

export interface OutboxItem {
  id: string;
  createdAt: number;
  status: 'pending' | 'sending' | 'failed';
  entity: OutboxEntity;
  entityId: string;
  op: OutboxOp;
  payload: unknown;
  baseUpdatedAt?: string;
  error?: string;
}

export interface TicketUpdatePayload {
  patch: {
    summary?: string;
    description?: string | null;
    status?: string;
    priority?: string;
    customFields?: Record<string, unknown> | null;
  };
}

export interface VisitCreatePayload {
  ticketId: string;
  notes?: string;
  startedAt?: string;
  endedAt?: string | null;
  location?: Record<string, unknown>;
  readings?: Record<string, unknown>;
}
