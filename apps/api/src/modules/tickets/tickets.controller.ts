import { Prisma, TicketPriority, TicketStatus } from '@prisma/client';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import archiver from 'archiver';
import path from 'path';
import fs from 'fs';
import { isGlobalAdmin } from '../auth/permissions';
import { generateNextTicketNumber } from './ticketNumber.service';
import {
  CreateTicketBody,
  createTicketBodySchema,
  TicketIdParams,
  ticketIdParamsSchema,
  ListTicketsQuery,
  listTicketsQuerySchema,
  UpdateTicketBody,
  updateTicketBodySchema
} from './tickets.schemas';

type CreateTicketRequest = FastifyRequest<{ Body: CreateTicketBody }>;
type TicketDetailRequest = FastifyRequest<{ Params: TicketIdParams }>;
type ListTicketsRequest = FastifyRequest<{ Querystring: ListTicketsQuery }>;
type UpdateTicketRequest = FastifyRequest<{ Params: TicketIdParams; Body: UpdateTicketBody }>;

export class TicketsController {
  constructor(private readonly fastify: FastifyInstance) {}

  createTicket = async (request: CreateTicketRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user;
    if (!user) {
      await reply.status(401).send({ message: 'Unauthorized' });
      return;
    }

    const body = createTicketBodySchema.parse(request.body);

    const [template, site] = await Promise.all([
      this.fastify.prisma.ticketTemplate.findFirst({
        where: { id: body.templateId, companyId: user.companyId },
        include: { fields: true }
      }),
      this.fastify.prisma.site.findFirst({
        where: { id: body.siteId, companyId: user.companyId }
      })
    ]);

    if (!template) {
      await reply.status(404).send({ message: 'Template not found for company' });
      return;
    }

    if (!site) {
      await reply.status(404).send({ message: 'Site not found for company' });
      return;
    }

    let assetId: string | null = null;
    if (body.assetId) {
      const asset = await this.fastify.prisma.asset.findFirst({
        where: {
          id: body.assetId,
          companyId: user.companyId,
          siteId: body.siteId
        }
      });

      if (!asset) {
        await reply.status(400).send({ message: 'Asset does not belong to the specified site' });
        return;
      }

      assetId = asset.id;
    }

    const templateFieldKeys = new Set(template.fields.map((field) => field.key));
    const customFields = body.customFields ?? {};
    const invalidKeys = Object.keys(customFields).filter((key) => !templateFieldKeys.has(key));
    if (invalidKeys.length > 0) {
      await reply.status(400).send({
        message: 'Custom field keys must exist on the template',
        invalidKeys
      });
      return;
    }

    try {
      const ticketNumber = await generateNextTicketNumber(this.fastify);
      
      const ticket = await this.fastify.prisma.ticket.create({
        data: {
          companyId: user.companyId,
          templateId: template.id,
          siteId: site.id,
          assetId,
          createdByUserId: user.id,
          ticketNumber,
          summary: body.summary,
          description: body.description ?? null,
          priority: body.priority ?? TicketPriority.NORMAL,
          status: TicketStatus.OPEN,
          customFields
        },
        include: {
          site: {
            select: { id: true, name: true, code: true }
          },
          asset: {
            select: { id: true, type: true, tag: true }
          },
          template: {
            select: { id: true, name: true, code: true }
          }
        }
      });

      await reply.status(201).send(ticket);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        await reply.status(400).send({ message: error.message });
        return;
      }

      throw error;
    }
  };

  listTickets = async (request: ListTicketsRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user;
    if (!user) {
      await reply.status(401).send({ message: 'Unauthorized' });
      return;
    }

    const query = listTicketsQuerySchema.parse(request.query);
    const { page, pageSize, status, search, sortBy, sortDir } = query;

    const where: Prisma.TicketWhereInput = {
      companyId: user.companyId,
      ...(status && { status })
    };

    // Add search filter
    if (search) {
      where.OR = [
        { summary: { contains: search, mode: 'insensitive' } },
        {
          site: {
            OR: [
              { code: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } }
            ]
          }
        }
      ];
    }

    // Determine sort order
    const orderBy = sortBy
      ? { [sortBy]: sortDir ?? 'desc' }
      : { createdAt: 'desc' as const };

    // If not global admin, apply access restrictions
    if (!isGlobalAdmin(user)) {
      const [ownerAccess, templateAccess] = await this.fastify.prisma.$transaction([
        this.fastify.prisma.userSiteOwnerAccess.findMany({
          where: { userId: user.id },
          select: { siteOwnerId: true }
        }),
        this.fastify.prisma.userTicketTemplateAccess.findMany({
          where: { userId: user.id },
          select: { ticketTemplateId: true }
        })
      ]);

      const ownerIds = ownerAccess.map(a => a.siteOwnerId);
      const templateIds = templateAccess.map(a => a.ticketTemplateId);

      // Apply filters if user has explicit access mappings
      if (ownerIds.length > 0 || templateIds.length > 0) {
        const conditions: Prisma.TicketWhereInput[] = [];

        if (ownerIds.length > 0) {
          conditions.push({
            site: {
              siteOwnerId: { in: ownerIds }
            }
          });
        }

        if (templateIds.length > 0) {
          conditions.push({
            templateId: { in: templateIds }
          });
        }

        // Tickets must match at least one condition
        where.OR = conditions;
      }
    }

    const [tickets, total] = await Promise.all([
      this.fastify.prisma.ticket.findMany({
        where,
        select: {
          id: true,
          summary: true,
          status: true,
          priority: true,
          createdAt: true,
          updatedAt: true,
          template: {
            select: {
              id: true,
              code: true,
              name: true
            }
          },
          site: {
            select: {
              id: true,
              name: true,
              code: true,
              city: true,
              state: true
            }
          },
          asset: {
            select: {
              id: true,
              type: true,
              tag: true
            }
          }
        },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.fastify.prisma.ticket.count({ where })
    ]);

    await reply.send({
      data: tickets,
      meta: {
        page,
        pageSize,
        total
      }
    });
  };

  getTicketById = async (request: TicketDetailRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user;
    if (!user) {
      await reply.status(401).send({ message: 'Unauthorized' });
      return;
    }

    const params = ticketIdParamsSchema.parse(request.params);

    const ticket = await this.fastify.prisma.ticket.findFirst({
      where: { id: params.id, companyId: user.companyId },
      include: {
        site: {
          select: { 
            id: true, 
            name: true, 
            code: true, 
            city: true, 
            state: true,
            county: true,
            marketName: true,
            addressLine1: true,
            addressLine2: true,
            postalCode: true,
            latitude: true,
            longitude: true,
            equipmentType: true,
            towerType: true,
            siteOwnerId: true,
            customFields: true,
            owner: {
              select: {
                id: true,
                name: true,
                code: true
              }
            }
          }
        },
        asset: {
          select: { id: true, type: true, tag: true, status: true }
        },
        template: {
          select: { id: true, name: true, code: true }
        },
        visits: {
          orderBy: { startedAt: 'desc' },
          select: {
            id: true,
            startedAt: true,
            endedAt: true,
            notes: true,
            createdAt: true,
            technician: {
              select: {
                id: true,
                displayName: true
              }
            },
            attachments: {
              orderBy: { createdAt: 'asc' },
              select: {
                id: true,
                type: true,
                filename: true,
                displayName: true,
                mimeType: true,
                sizeBytes: true,
                storageKey: true,
                createdAt: true,
                uploadedBy: {
                  select: {
                    id: true,
                    displayName: true
                  }
                }
              }
            }
          }
        },
        attachments: {
          where: { visitId: null }, // Only ticket-level attachments (not visit attachments)
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            type: true,
            filename: true,
            displayName: true,
            mimeType: true,
            sizeBytes: true,
            storageKey: true,
            createdAt: true,
            uploadedBy: {
              select: {
                id: true,
                displayName: true
              }
            }
          }
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            action: true,
            fieldKey: true,
            fieldLabel: true,
            oldValue: true,
            newValue: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                displayName: true
              }
            }
          }
        }
      }
    });

    if (!ticket) {
      await reply.status(404).send({ message: 'Ticket not found' });
      return;
    }

    // Check access if not global admin
    if (!isGlobalAdmin(user)) {
      const [ownerAccess, templateAccess] = await this.fastify.prisma.$transaction([
        this.fastify.prisma.userSiteOwnerAccess.findMany({
          where: { userId: user.id },
          select: { siteOwnerId: true }
        }),
        this.fastify.prisma.userTicketTemplateAccess.findMany({
          where: { userId: user.id },
          select: { ticketTemplateId: true }
        })
      ]);

      const ownerIds = ownerAccess.map(a => a.siteOwnerId);
      const templateIds = templateAccess.map(a => a.ticketTemplateId);

      const hasOwnerScope = ownerIds.length === 0 || (ticket.site.siteOwnerId && ownerIds.includes(ticket.site.siteOwnerId));
      const hasTemplateScope = templateIds.length === 0 || templateIds.includes(ticket.template.id);

      if (!hasOwnerScope && !hasTemplateScope) {
        await reply.status(403).send({ message: 'Forbidden' });
        return;
      }
    }

    // Get effective field definitions for the site's owner
    let siteCustomFieldDefinitions: any[] = [];
    if (ticket.site.siteOwnerId) {
      const fieldDefs = await this.fastify.prisma.siteFieldDefinition.findMany({
        where: {
          companyId: user.companyId,
          OR: [
            { siteOwnerId: null }, // Global fields
            { siteOwnerId: ticket.site.siteOwnerId } // Owner-specific fields
          ]
        },
        select: {
          id: true,
          siteOwnerId: true,
          key: true,
          label: true,
          type: true,
          required: true,
          orderIndex: true,
          config: true
        },
        orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }]
      });

      // Merge with owner-specific overriding global
      const fieldMap = new Map();
      fieldDefs
        .filter(f => f.siteOwnerId === null)
        .forEach(f => fieldMap.set(f.key, f));
      fieldDefs
        .filter(f => f.siteOwnerId === ticket.site.siteOwnerId)
        .forEach(f => fieldMap.set(f.key, f));

      siteCustomFieldDefinitions = Array.from(fieldMap.values()).sort(
        (a, b) => a.orderIndex - b.orderIndex
      );
    }

    // Transform visits to include attachment URLs
    const urlBase = process.env.ATTACHMENTS_PUBLIC_BASE_URL || 'http://localhost:3001/uploads';
    const visits = ticket.visits.map(v => ({
      ...v,
      attachments: v.attachments.map(a => ({
        id: a.id,
        type: a.type,
        filename: a.filename,
        displayName: a.displayName,
        mimeType: a.mimeType,
        sizeBytes: a.sizeBytes,
        url: `${urlBase}/${a.storageKey}`,
        uploadedBy: a.uploadedBy,
        createdAt: a.createdAt.toISOString()
      }))
    }));

    // Transform ticket-level attachments to include URLs
    const ticketAttachments = ticket.attachments.map(a => ({
      id: a.id,
      type: a.type,
      filename: a.filename,
      displayName: a.displayName,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
      url: `${urlBase}/${a.storageKey}`,
      uploadedBy: a.uploadedBy,
      createdAt: a.createdAt.toISOString()
    }));

    await reply.send({ 
      ...ticket,
      attachments: ticketAttachments,
      visits,
      site: {
        ...ticket.site,
        customFieldDefinitions: siteCustomFieldDefinitions
      }
    });
  };

  updateTicket = async (request: UpdateTicketRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user;
    if (!user) {
      await reply.status(401).send({ message: 'Unauthorized' });
      return;
    }

    const params = ticketIdParamsSchema.parse(request.params);
    const body = updateTicketBodySchema.parse(request.body);

    const existing = await this.fastify.prisma.ticket.findFirst({
      where: { id: params.id, companyId: user.companyId },
      include: {
        template: {
          include: { fields: true }
        }
      }
    });

    if (!existing) {
      await reply.status(404).send({ message: 'Ticket not found' });
      return;
    }

    // Track custom field changes for activity log
    const activities: Prisma.TicketActivityCreateManyInput[] = [];
    
    if (body.customFields !== undefined) {
      const oldFields = (existing.customFields as Record<string, unknown>) || {};
      const newFields = body.customFields || {};
      
      // Create a map of field keys to labels
      const fieldLabelMap = new Map(
        existing.template.fields.map(f => [f.key, f.label])
      );

      // Find changed fields
      const allKeys = new Set([...Object.keys(oldFields), ...Object.keys(newFields)]);
      
      for (const key of allKeys) {
        const oldValue = oldFields[key];
        const newValue = newFields[key];
        
        // Check if value actually changed
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          activities.push({
            ticketId: params.id,
            userId: user.id,
            action: 'field_updated',
            fieldKey: key,
            fieldLabel: fieldLabelMap.get(key) || key,
            oldValue: oldValue !== undefined ? JSON.stringify(oldValue) : null,
            newValue: newValue !== undefined ? JSON.stringify(newValue) : null
          });
        }
      }
    }

    // Update ticket and create activities in a transaction
    const [ticket] = await this.fastify.prisma.$transaction([
      this.fastify.prisma.ticket.update({
        where: { id: params.id },
        data: {
          ...(body.summary && { summary: body.summary }),
          ...(body.description !== undefined && { description: body.description }),
          ...(body.status && { status: body.status }),
          ...(body.priority && { priority: body.priority }),
          ...(body.customFields !== undefined && { customFields: body.customFields })
        },
        select: {
          id: true,
          summary: true,
          description: true,
          status: true,
          priority: true,
          customFields: true,
          updatedAt: true
        }
      }),
      ...(activities.length > 0 
        ? [this.fastify.prisma.ticketActivity.createMany({ data: activities })]
        : []
      )
    ]);

    await reply.send(ticket);
  };

  downloadAllAttachments = async (request: TicketDetailRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user;
    if (!user) {
      await reply.status(401).send({ message: 'Unauthorized' });
      return;
    }

    const params = ticketIdParamsSchema.parse(request.params);

    // Get ticket with all attachments
    const ticket = await this.fastify.prisma.ticket.findFirst({
      where: { 
        id: params.id,
        companyId: user.companyId
      },
      select: {
        id: true,
        summary: true,
        visits: {
          select: {
            attachments: {
              select: {
                id: true,
                filename: true,
                displayName: true,
                storageKey: true
              }
            }
          }
        }
      }
    });

    if (!ticket) {
      await reply.status(404).send({ message: 'Ticket not found' });
      return;
    }

    // Collect all attachments from all visits
    const allAttachments = ticket.visits.flatMap(v => v.attachments);

    if (allAttachments.length === 0) {
      await reply.status(404).send({ message: 'No attachments found' });
      return;
    }

    // Create zip filename
    const zipFilename = `ticket-${ticket.id.slice(0, 8)}-attachments.zip`;

    // Set response headers
    reply.raw.setHeader('Content-Type', 'application/zip');
    reply.raw.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

    // Create archive
    const archive = archiver('zip', { zlib: { level: 9 } });

    // Pipe archive to response
    archive.pipe(reply.raw);

    // Handle archive errors
    archive.on('error', (err) => {
      request.log.error({ err }, 'Archive error');
      reply.raw.end();
    });

    // Add each attachment to the archive
    for (const attachment of allAttachments) {
      const fullPath = path.join(this.fastify.uploadsDir, attachment.storageKey);
      
      if (fs.existsSync(fullPath)) {
        // Use displayName for user-friendly filenames in the zip
        archive.file(fullPath, { name: attachment.displayName });
      } else {
        request.log.warn({ storageKey: attachment.storageKey }, 'Attachment file not found');
      }
    }

    // Finalize the archive
    await archive.finalize();
    
    // Return reply to prevent Fastify from processing it
    return reply;
  };
}
