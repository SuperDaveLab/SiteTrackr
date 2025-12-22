import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { AttachmentResponse, attachmentResponseSchema } from './attachments.schemas';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { AttachmentType } from '@prisma/client';

type UploadAttachmentRequest = FastifyRequest<{
  Params: { visitId: string };
}>;

type UploadTicketAttachmentRequest = FastifyRequest<{
  Params: { ticketId: string };
}>;

async function generateUniqueDisplayNameForTicket(
  fastify: FastifyInstance,
  ticketId: string,
  originalFilename: string
): Promise<string> {
  const ext = path.extname(originalFilename);
  const base = path.basename(originalFilename, ext);

  // Fetch existing display names for this ticket with same base
  const existing = await fastify.prisma.attachment.findMany({
    where: {
      ticketId,
      displayName: {
        startsWith: base
      }
    },
    select: { displayName: true }
  });

  if (existing.length === 0) {
    return originalFilename;
  }

  const existingNames = new Set(existing.map(e => e.displayName));

  // If the exact original name isn't taken, use it
  if (!existingNames.has(originalFilename)) {
    return originalFilename;
  }

  // Try "base (1).ext", "base (2).ext", etc.
  let counter = 1;
  while (counter < 1000) {
    const candidate = ext ? `${base} (${counter})${ext}` : `${base} (${counter})`;
    if (!existingNames.has(candidate)) {
      return candidate;
    }
    counter++;
  }

  // Fallback
  return `${base}-${Date.now()}${ext}`;
}

export class AttachmentsController {
  constructor(private readonly fastify: FastifyInstance) {}

  uploadForVisit = async (request: UploadAttachmentRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user;
    if (!user) {
      await reply.status(401).send({ message: 'Unauthorized' });
      return;
    }

    const { visitId } = request.params;

    // Verify visit and ticket belong to same company
    const visit = await this.fastify.prisma.visit.findFirst({
      where: {
        id: visitId,
        ticket: { companyId: user.companyId }
      },
      select: {
        id: true,
        ticketId: true
      }
    });

    if (!visit) {
      await reply.status(404).send({ message: 'Visit not found' });
      return;
    }

    const data = await request.file();
    if (!data) {
      await reply.status(400).send({ message: 'No file uploaded' });
      return;
    }

    const originalFilename = data.filename;
    const mimeType = data.mimetype;
    const ext = path.extname(originalFilename);
    const storageFileName = `${randomUUID()}${ext || ''}`;
    const storageDir = path.join(this.fastify.uploadsDir, user.companyId);
    const storagePath = path.join(storageDir, storageFileName);

    // Create company-specific directory if it doesn't exist
    await fs.promises.mkdir(storageDir, { recursive: true });

    // Write file to disk
    const fileBuffer = await data.toBuffer();
    await fs.promises.writeFile(storagePath, fileBuffer);

    const sizeBytes = fileBuffer.length;

    // Classify file type
    const type: AttachmentType =
      mimeType.startsWith('image/') ? AttachmentType.PHOTO
      : mimeType === 'application/pdf' ? AttachmentType.DOCUMENT
      : AttachmentType.OTHER;

    const storageKey = `${user.companyId}/${storageFileName}`;

    // Generate unique display name for this ticket
    const displayName = await generateUniqueDisplayNameForTicket(
      this.fastify,
      visit.ticketId,
      originalFilename
    );

    // Save to database
    const created = await this.fastify.prisma.attachment.create({
      data: {
        companyId: user.companyId,
        ticketId: visit.ticketId,
        visitId: visit.id,
        type,
        filename: originalFilename,
        displayName,
        mimeType,
        sizeBytes,
        storageKey,
        uploadedByUserId: user.id
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            displayName: true
          }
        }
      }
    });

    const urlBase = process.env.ATTACHMENTS_PUBLIC_BASE_URL || 'http://localhost:3001/uploads';
    const response: AttachmentResponse = {
      id: created.id,
      ticketId: created.ticketId,
      visitId: created.visitId,
      type: created.type,
      filename: created.filename,
      displayName: created.displayName,
      mimeType: created.mimeType,
      sizeBytes: created.sizeBytes,
      url: `${urlBase}/${created.storageKey}`,
      uploadedBy: created.uploadedBy,
      createdAt: created.createdAt.toISOString()
    };

    await reply.status(201).send(attachmentResponseSchema.parse(response));
  };

  uploadForTicket = async (request: UploadTicketAttachmentRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user;
    if (!user) {
      await reply.status(401).send({ message: 'Unauthorized' });
      return;
    }

    const { ticketId } = request.params;

    // Verify ticket belongs to this company
    const ticket = await this.fastify.prisma.ticket.findFirst({
      where: {
        id: ticketId,
        companyId: user.companyId
      },
      select: { id: true }
    });

    if (!ticket) {
      await reply.status(404).send({ message: 'Ticket not found' });
      return;
    }

    const data = await request.file();
    if (!data) {
      await reply.status(400).send({ message: 'No file uploaded' });
      return;
    }

    const originalFilename = data.filename;
    const mimeType = data.mimetype;
    const ext = path.extname(originalFilename);
    const storageFileName = `${randomUUID()}${ext || ''}`;
    const storageDir = path.join(this.fastify.uploadsDir, user.companyId);
    const storagePath = path.join(storageDir, storageFileName);

    // Create company-specific directory if it doesn't exist
    await fs.promises.mkdir(storageDir, { recursive: true });

    // Write file to disk
    const fileBuffer = await data.toBuffer();
    await fs.promises.writeFile(storagePath, fileBuffer);

    const sizeBytes = fileBuffer.length;

    // Classify file type
    const type: AttachmentType =
      mimeType.startsWith('image/') ? AttachmentType.PHOTO
      : mimeType === 'application/pdf' ? AttachmentType.DOCUMENT
      : AttachmentType.OTHER;

    const storageKey = `${user.companyId}/${storageFileName}`;

    // Generate unique display name for this ticket
    const displayName = await generateUniqueDisplayNameForTicket(
      this.fastify,
      ticketId,
      originalFilename
    );

    // Save to database (visitId is null for ticket-level attachments)
    const created = await this.fastify.prisma.attachment.create({
      data: {
        companyId: user.companyId,
        ticketId,
        visitId: null,
        type,
        filename: originalFilename,
        displayName,
        mimeType,
        sizeBytes,
        storageKey,
        uploadedByUserId: user.id
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            displayName: true
          }
        }
      }
    });

    const urlBase = process.env.ATTACHMENTS_PUBLIC_BASE_URL || 'http://localhost:3001/uploads';
    const response: AttachmentResponse = {
      id: created.id,
      ticketId: created.ticketId,
      visitId: created.visitId,
      type: created.type,
      filename: created.filename,
      displayName: created.displayName,
      mimeType: created.mimeType,
      sizeBytes: created.sizeBytes,
      url: `${urlBase}/${created.storageKey}`,
      uploadedBy: created.uploadedBy,
      createdAt: created.createdAt.toISOString()
    };

    await reply.status(201).send(attachmentResponseSchema.parse(response));
  };
}
