export type OutboxEntity = 'ticket' | 'visit' | 'attachment' | 'attachmentUpload';
export type OutboxOp = 'create' | 'update' | 'upload';

export interface OutboxItem {
  id: string;
  createdAt: number;
  status: 'pending' | 'sending' | 'failed';
  entity: OutboxEntity;
  entityId: string;
  op: OutboxOp;
  payload: TicketUpdatePayload | VisitCreatePayload | AttachmentCreatePayload | AttachmentUploadPayload;
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

export interface AttachmentCreatePayload {
  id: string;
  scope: 'ticket' | 'visit';
  ticketId: string;
  visitId?: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

export interface AttachmentUploadPayload {
  id: string;
  ticketId: string;
  visitId?: string;
}
