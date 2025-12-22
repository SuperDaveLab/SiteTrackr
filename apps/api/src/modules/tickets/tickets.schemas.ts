import { TicketPriority, TicketStatus } from '@prisma/client';
import { z } from 'zod';

export const createTicketBodySchema = z.object({
  templateId: z.string().uuid(),
  siteId: z.string().uuid(),
  assetId: z.string().uuid().nullable().optional(),
  summary: z.string().trim().min(1),
  description: z.string().trim().optional(),
  priority: z.nativeEnum(TicketPriority).default(TicketPriority.NORMAL),
  customFields: z.record(z.any()).default({})
});

export type CreateTicketBody = z.infer<typeof createTicketBodySchema>;

export const ticketIdParamsSchema = z.object({
  id: z.string().uuid()
});

export type TicketIdParams = z.infer<typeof ticketIdParamsSchema>;

export const listTicketsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.nativeEnum(TicketStatus).optional(),
  search: z.string().trim().min(1).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt']).optional(),
  sortDir: z.enum(['asc', 'desc']).optional()
});

export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>;

export const updateTicketBodySchema = z.object({
  summary: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
  status: z.nativeEnum(TicketStatus).optional(),
  priority: z.nativeEnum(TicketPriority).optional(),
  customFields: z.record(z.any()).optional()
});

export type UpdateTicketBody = z.infer<typeof updateTicketBodySchema>;
