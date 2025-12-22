import { z } from 'zod';
import { paginationQuerySchema } from '../shared/pagination.schemas';

export const listAssetsQuerySchema = paginationQuerySchema.extend({
  siteId: z.string().uuid().optional()
});

export type ListAssetsQuery = z.infer<typeof listAssetsQuerySchema>;

export const assetIdParamsSchema = z.object({
  id: z.string().uuid()
});

export type AssetIdParams = z.infer<typeof assetIdParamsSchema>;
