import { z } from 'zod';
import { paginationQuerySchema } from '../shared/pagination.schemas';

export const listSitesQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name', 'code']).optional(),
  sortDir: z.enum(['asc', 'desc']).optional()
});

export type ListSitesQuery = z.infer<typeof listSitesQuerySchema>;

export const siteIdParamsSchema = z.object({
  id: z.string().uuid()
});

export type SiteIdParams = z.infer<typeof siteIdParamsSchema>;

export const updateSiteBodySchema = z.object({
  siteOwnerId: z.string().uuid().nullable().optional(),
  customFields: z.record(z.unknown()).optional(),
  name: z.string().trim().min(1).optional(),
  code: z.string().trim().nullable().optional(),
  marketName: z.string().trim().nullable().optional(),
  addressLine1: z.string().trim().nullable().optional(),
  addressLine2: z.string().trim().nullable().optional(),
  city: z.string().trim().nullable().optional(),
  state: z.string().trim().nullable().optional(),
  county: z.string().trim().nullable().optional(),
  postalCode: z.string().trim().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  equipmentType: z.string().trim().nullable().optional(),
  towerType: z.string().trim().nullable().optional(),
  notes: z.string().nullable().optional()
});

export type UpdateSiteBody = z.infer<typeof updateSiteBodySchema>;
