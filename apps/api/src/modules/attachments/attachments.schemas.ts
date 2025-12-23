import { AttachmentStatus } from '@prisma/client';
import { z } from 'zod';

export const attachmentResponseSchema = z.object({
  id: z.string().uuid(),
  ticketId: z.string().uuid(),
  visitId: z.string().uuid().nullable(),
  type: z.string(),
  filename: z.string(),
  displayName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  url: z.string(),
  uploadedBy: z.object({
    id: z.string().uuid(),
    displayName: z.string()
  }),
  status: z.nativeEnum(AttachmentStatus),
  createdAt: z.string()
});

export type AttachmentResponse = z.infer<typeof attachmentResponseSchema>;

export const attachmentMetadataBodySchema = z.object({
  id: z.string().uuid().optional(),
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive()
});

export type AttachmentMetadataBody = z.infer<typeof attachmentMetadataBodySchema>;
