import { z } from 'zod';
import { TemplateFieldType } from '@prisma/client';

export const listSiteFieldDefinitionsQuerySchema = z.object({
  siteOwnerId: z.string().uuid().optional()
});

export type ListSiteFieldDefinitionsQuery = z.infer<typeof listSiteFieldDefinitionsQuerySchema>;

export const createSiteFieldDefinitionBodySchema = z.object({
  siteOwnerId: z.string().uuid().nullable().optional(),
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.nativeEnum(TemplateFieldType),
  required: z.boolean().optional().default(false),
  orderIndex: z.number().int().optional().default(0),
  config: z.record(z.unknown()).optional()
});

export type CreateSiteFieldDefinitionBody = z.infer<typeof createSiteFieldDefinitionBodySchema>;
