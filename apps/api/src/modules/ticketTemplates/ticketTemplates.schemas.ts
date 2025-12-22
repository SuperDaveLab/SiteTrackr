import { TemplateFieldType } from '@prisma/client';
import { z } from 'zod';

export const createTemplateFieldSchema = z.object({
  key: z.string().trim().min(1),
  label: z.string().trim().min(1),
  type: z.nativeEnum(TemplateFieldType),
  required: z.boolean().default(false),
  orderIndex: z.number().int().min(0).default(0),
  config: z.record(z.any()).optional(),
  section: z.string().trim().min(1).optional(),
  sectionOrder: z.number().int().optional()
});

export const createTicketTemplateBodySchema = z.object({
  name: z.string().trim().min(1),
  code: z.string().trim().min(1).max(64),
  description: z.string().trim().optional(),
  fields: z.array(createTemplateFieldSchema).default([])
});

export const updateTicketTemplateBodySchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
  fields: z.array(createTemplateFieldSchema).optional()
});

export type CreateTicketTemplateBody = z.infer<typeof createTicketTemplateBodySchema>;
export type UpdateTicketTemplateBody = z.infer<typeof updateTicketTemplateBodySchema>;
