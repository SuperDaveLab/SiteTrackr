import { z } from 'zod';
import { ticketIdParamsSchema } from '../tickets/tickets.schemas';

export const createVisitBodySchema = z.object({
  startedAt: z.coerce.date().optional(),
  endedAt: z.coerce.date().optional().nullable(),
  notes: z.string().trim().optional(),
  location: z.record(z.any()).optional(),
  readings: z.record(z.any()).optional()
});

export type CreateVisitBody = z.infer<typeof createVisitBodySchema>;

export const visitTicketParamsSchema = ticketIdParamsSchema;
export type VisitTicketParams = z.infer<typeof visitTicketParamsSchema>;
