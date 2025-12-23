import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { AttachmentStatus, AttachmentType } from '@prisma/client';
import {
  AttachmentMetadataBody,
  AttachmentResponse,
  attachmentMetadataBodySchema,
  attachmentResponseSchema
} from './attachments.schemas';

type UploadAttachmentRequest = FastifyRequest<{ Params: { visitId: string } }>;
type UploadTicketAttachmentRequest = FastifyRequest<{ Params: { ticketId: string } }>;
type TicketMetadataRequest = FastifyRequest<{ Params: { ticketId: string }; Body: AttachmentMetadataBody }>;
type VisitMetadataRequest = FastifyRequest<{ Params: { visitId: string }; Body: AttachmentMetadataBody }>;
type UploadBytesRequest = FastifyRequest<{ Params: { id: string } }>; 

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

const MAX_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024;

class AttachmentScopeError extends Error {
  constructor() {
    super('ATTACHMENT_SCOPE_MISMATCH');
  }
}

class AttachmentNotFoundError extends Error {
  constructor() {
    super('ATTACHMENT_NOT_FOUND');
  }
}

const classifyAttachmentType = (mimeType: string): AttachmentType => {
  if (!mimeType) {
    return AttachmentType.OTHER;
  }

  if (mimeType.startsWith('image/')) {
    return AttachmentType.PHOTO;
  }

  if (mimeType === 'application/pdf' || mimeType.startsWith('application/')) {
    return AttachmentType.DOCUMENT;
  }

  return AttachmentType.OTHER;
};

const buildStorageKey = (companyId: string, filename: string): string => {
  const ext = path.extname(filename);
  return `${companyId}/${randomUUID()}${ext || ''}`;
};

export class AttachmentsController {
  constructor(private readonly fastify: FastifyInstance) {}

  createTicketAttachmentMetadata = async (request: TicketMetadataRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user;
    if (!user) {
      await reply.status(401).send({ message: 'Unauthorized' });
      return;
    }

    const { ticketId } = request.params;
    const body = attachmentMetadataBodySchema.parse(request.body);

    if (body.sizeBytes > MAX_ATTACHMENT_SIZE_BYTES) {
      await reply.status(413).send({ message: 'Attachment exceeds 25MB limit' });
      return;
    }

    const ticket = await this.fastify.prisma.ticket.findFirst({
      where: { id: ticketId, companyId: user.companyId },
      select: { id: true }
    });

    if (!ticket) {
      await reply.status(404).send({ message: 'Ticket not found' });
      return;
    }

    try {
      const { response, created } = await this.createMetadataRecord({
        user,
        ticketId: ticket.id,
        body
      });

      await reply.status(created ? 201 : 200).send(response);
    } catch (error) {
      if (error instanceof AttachmentScopeError) {
        await reply.status(409).send({ message: 'Attachment id already used for another record' });
        return;
      }
      throw error;
    }
  };

  createVisitAttachmentMetadata = async (request: VisitMetadataRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user;
    if (!user) {
      await reply.status(401).send({ message: 'Unauthorized' });
      return;
    }

    const { visitId } = request.params;
    const body = attachmentMetadataBodySchema.parse(request.body);

    if (body.sizeBytes > MAX_ATTACHMENT_SIZE_BYTES) {
      await reply.status(413).send({ message: 'Attachment exceeds 25MB limit' });
      return;
    }

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

    try {
      const { response, created } = await this.createMetadataRecord({
        user,
        ticketId: visit.ticketId,
        visitId: visit.id,
        body
      });

      await reply.status(created ? 201 : 200).send(response);
    } catch (error) {
      if (error instanceof AttachmentScopeError) {
        await reply.status(409).send({ message: 'Attachment id already used for another record' });
        return;
      }
      throw error;
    }
  };

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

    const fileBuffer = await data.toBuffer();
    if (fileBuffer.length > MAX_ATTACHMENT_SIZE_BYTES) {
      await reply.status(413).send({ message: 'Attachment exceeds 25MB limit' });
      return;
    }

    try {
      const { response: metadata } = await this.createMetadataRecord({
        user,
        ticketId: visit.ticketId,
        visitId: visit.id,
        body: {
          filename: data.filename,
          mimeType: data.mimetype,
          sizeBytes: fileBuffer.length
        }
      });

      const updated = await this.persistAttachmentContent({
        user,
        attachmentId: metadata.id,
        buffer: fileBuffer,
        mimeType: data.mimetype
      });

      await reply.status(201).send(updated);
    } catch (error) {
      if (error instanceof AttachmentScopeError) {
        await reply.status(409).send({ message: 'Attachment id already used for another record' });
        return;
      }
      if (error instanceof AttachmentNotFoundError) {
        await reply.status(404).send({ message: 'Attachment not found' });
        return;
      }
      throw error;
    }
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

    const fileBuffer = await data.toBuffer();
    if (fileBuffer.length > MAX_ATTACHMENT_SIZE_BYTES) {
      await reply.status(413).send({ message: 'Attachment exceeds 25MB limit' });
      return;
    }

    try {
      const { response: metadata } = await this.createMetadataRecord({
        user,
        ticketId,
        body: {
          filename: data.filename,
          mimeType: data.mimetype,
          sizeBytes: fileBuffer.length
        }
      });

      const updated = await this.persistAttachmentContent({
        user,
        attachmentId: metadata.id,
        buffer: fileBuffer,
        mimeType: data.mimetype
      });

      await reply.status(201).send(updated);
    } catch (error) {
      if (error instanceof AttachmentScopeError) {
        await reply.status(409).send({ message: 'Attachment id already used for another record' });
        return;
      }
      if (error instanceof AttachmentNotFoundError) {
        await reply.status(404).send({ message: 'Attachment not found' });
        return;
      }
      throw error;
    }
  };

  uploadAttachmentContent = async (request: UploadBytesRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user;
    if (!user) {
      await reply.status(401).send({ message: 'Unauthorized' });
      return;
    }

    const data = await request.file();
    if (!data) {
      await reply.status(400).send({ message: 'No file uploaded' });
      return;
    }

    const buffer = await data.toBuffer();
    if (buffer.length > MAX_ATTACHMENT_SIZE_BYTES) {
      await reply.status(413).send({ message: 'Attachment exceeds 25MB limit' });
      return;
    }

    try {
      const response = await this.persistAttachmentContent({
        user,
        attachmentId: request.params.id,
        buffer,
        mimeType: data.mimetype
      });

      await reply.send(response);
    } catch (error) {
      if (error instanceof AttachmentNotFoundError) {
        await reply.status(404).send({ message: 'Attachment not found' });
        return;
      }
      throw error;
    }
  };

  private createMetadataRecord = async ({
    user,
    ticketId,
    visitId,
    body
  }: {
    user: { id: string; companyId: string };
    ticketId: string;
    visitId?: string;
    body: AttachmentMetadataBody;
  }): Promise<{ response: AttachmentResponse; created: boolean }> => {
    if (body.id) {
      const existing = await this.fastify.prisma.attachment.findFirst({
        where: {
          id: body.id,
          companyId: user.companyId
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

      if (existing) {
        if (existing.ticketId !== ticketId || existing.visitId !== (visitId ?? null)) {
          throw new AttachmentScopeError();
        }
        return {
          response: this.buildAttachmentResponse(existing),
          created: false
        };
      }
    }

    const type = classifyAttachmentType(body.mimeType);
    const storageKey = buildStorageKey(user.companyId, body.filename);
    const displayName = await generateUniqueDisplayNameForTicket(
      this.fastify,
      ticketId,
      body.filename
    );

    const created = await this.fastify.prisma.attachment.create({
      data: {
        ...(body.id ? { id: body.id } : {}),
        companyId: user.companyId,
        ticketId,
        visitId: visitId ?? null,
        type,
        filename: body.filename,
        displayName,
        mimeType: body.mimeType,
        sizeBytes: body.sizeBytes,
        storageKey,
        status: AttachmentStatus.PENDING,
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

    return {
      response: this.buildAttachmentResponse(created),
      created: true
    };
  };

  private persistAttachmentContent = async ({
    user,
    attachmentId,
    buffer,
    mimeType
  }: {
    user: { id: string; companyId: string };
    attachmentId: string;
    buffer: Buffer;
    mimeType: string;
  }): Promise<AttachmentResponse> => {
    const attachment = await this.fastify.prisma.attachment.findFirst({
      where: {
        id: attachmentId,
        companyId: user.companyId
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

    if (!attachment) {
      throw new AttachmentNotFoundError();
    }

    const storagePath = path.join(this.fastify.uploadsDir, attachment.storageKey);
    await fs.promises.mkdir(path.dirname(storagePath), { recursive: true });

    try {
      await fs.promises.writeFile(storagePath, buffer);
    } catch (error) {
      await this.fastify.prisma.attachment.update({
        where: { id: attachment.id },
        data: { status: AttachmentStatus.FAILED }
      });
      throw error;
    }

    const updated = await this.fastify.prisma.attachment.update({
      where: { id: attachment.id },
      data: {
        sizeBytes: buffer.length,
        mimeType,
        type: classifyAttachmentType(mimeType),
        status: AttachmentStatus.READY
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

    return this.buildAttachmentResponse(updated);
  };

  private buildAttachmentResponse = (attachment: {
    id: string;
    ticketId: string;
    visitId: string | null;
    type: AttachmentType;
    filename: string;
    displayName: string;
    mimeType: string;
    sizeBytes: number;
    storageKey: string;
    status: AttachmentStatus;
    uploadedBy: { id: string; displayName: string };
    createdAt: Date;
  }): AttachmentResponse => {
    const urlBase = process.env.ATTACHMENTS_PUBLIC_BASE_URL || 'http://localhost:3001/uploads';
    return attachmentResponseSchema.parse({
      id: attachment.id,
      ticketId: attachment.ticketId,
      visitId: attachment.visitId,
      type: attachment.type,
      filename: attachment.filename,
      displayName: attachment.displayName,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      url: `${urlBase}/${attachment.storageKey}`,
      uploadedBy: attachment.uploadedBy,
      status: attachment.status,
      createdAt: attachment.createdAt.toISOString()
    });
  };
}
