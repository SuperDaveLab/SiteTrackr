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
  customFields: z.record(z.unknown()).optional()
});

export type UpdateSiteBody = z.infer<typeof updateSiteBodySchema>;
