import { TicketStatus } from '@prisma/client';
import { z } from 'zod';

const splitCsv = (value: string): string[] =>
  value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

const csvListSchema = z.string().transform(splitCsv);
const csvUuidListSchema = csvListSchema.pipe(z.array(z.string().uuid('siteOwnerIds must be valid UUIDs')));
const csvStatusListSchema = z
  .string()
  .transform((value) => splitCsv(value).map((status) => status.toUpperCase()))
  .pipe(z.array(z.nativeEnum(TicketStatus)));

const bboxSchema = z
  .string()
  .transform((value) => splitCsv(value))
  .refine((parts) => parts.length === 4, { message: 'bbox must contain four comma-separated values' })
  .transform((parts) => parts.map((value) => Number(value)))
  .refine((parts) => parts.every((value) => Number.isFinite(value)), { message: 'bbox must contain valid numbers' })
  .transform(([minLng, minLat, maxLng, maxLat]) => ({ minLng, minLat, maxLng, maxLat }))
  .refine((bbox) => bbox.minLng <= bbox.maxLng && bbox.minLat <= bbox.maxLat, {
    message: 'bbox coordinates are invalid'
  });

export const mapMarkersQuerySchema = z.object({
  templateCodes: csvListSchema.optional(),
  siteOwnerIds: csvUuidListSchema.optional(),
  status: csvStatusListSchema.optional(),
  bbox: bboxSchema.optional(),
  limit: z.coerce.number().int().positive().max(10000).optional()
});

export type MapMarkersQuery = z.infer<typeof mapMarkersQuerySchema>;
export type BoundingBox = NonNullable<MapMarkersQuery['bbox']>;
