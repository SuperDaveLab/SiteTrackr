import { z } from 'zod';

export const createSiteOwnerBodySchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  notes: z.string().optional()
});

export type CreateSiteOwnerBody = z.infer<typeof createSiteOwnerBodySchema>;
