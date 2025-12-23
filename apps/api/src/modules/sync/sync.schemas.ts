import { z } from 'zod';
import { TicketPriority, TicketStatus } from '@prisma/client';

export const syncChangesQuerySchema = z.object({
  since: z.string().datetime().optional()
});

export type SyncChangesQuery = z.infer<typeof syncChangesQuerySchema>;

const ticketUpdatePayloadSchema = z.object({
  patch: z.object({
    summary: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    status: z.nativeEnum(TicketStatus).optional(),
    priority: z.nativeEnum(TicketPriority).optional(),
    customFields: z.record(z.any()).nullable().optional()
  })
});

const visitCreatePayloadSchema = z.object({
  ticketId: z.string().uuid(),
  notes: z.string().optional(),
  startedAt: z.string().datetime().optional(),
  endedAt: z.string().datetime().optional(),
  location: z.record(z.any()).optional(),
  readings: z.record(z.any()).optional()
});

const ticketUpdateOpSchema = z.object({
  id: z.string().uuid(),
  entity: z.literal('ticket'),
  entityId: z.string().uuid(),
  op: z.literal('update'),
  baseUpdatedAt: z.string().datetime().optional(),
  payload: ticketUpdatePayloadSchema
});

const visitCreateOpSchema = z.object({
  id: z.string().uuid(),
  entity: z.literal('visit'),
  entityId: z.string().uuid(),
  op: z.literal('create'),
  payload: visitCreatePayloadSchema
});

export const syncApplyBodySchema = z.object({
  clientId: z.string(),
  ops: z.array(z.union([ticketUpdateOpSchema, visitCreateOpSchema])).max(100)
});

export type SyncApplyBody = z.infer<typeof syncApplyBodySchema>;
export type SyncApplyOperation = SyncApplyBody['ops'][number];
export type TicketUpdateOp = z.infer<typeof ticketUpdateOpSchema>;
export type VisitCreateOp = z.infer<typeof visitCreateOpSchema>;
