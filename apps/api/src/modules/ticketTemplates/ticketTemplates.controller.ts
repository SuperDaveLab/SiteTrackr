import { Prisma } from '@prisma/client';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { canAdminTemplate } from '../auth/permissions';
import {
  CreateTicketTemplateBody,
  UpdateTicketTemplateBody,
  createTicketTemplateBodySchema,
  updateTicketTemplateBodySchema
} from './ticketTemplates.schemas';

type CreateTemplateRequest = FastifyRequest<{ Body: CreateTicketTemplateBody }>;

type UpdateTemplateRequest = FastifyRequest<{ Params: { id: string }; Body: UpdateTicketTemplateBody }>;

type ListTemplatesRequest = FastifyRequest;

type GetTemplateRequest = FastifyRequest<{ Params: { id: string } }>;

export class TicketTemplatesController {
  constructor(private readonly fastify: FastifyInstance) {}

  listTemplates = async (request: ListTemplatesRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user;
    if (!user) {
      await reply.status(401).send({ message: 'Unauthorized' });
      return;
    }

    // Check if user has template access restrictions
    const templateAccess = await this.fastify.prisma.userTicketTemplateAccess.findMany({
      where: { userId: user.id },
      select: { ticketTemplateId: true },
    });

    const templates = await this.fastify.prisma.ticketTemplate.findMany({
      where: {
        companyId: user.companyId,
        isActive: true,
        // If user has specific template access, filter by those templates
        ...(templateAccess.length > 0 
          ? { id: { in: templateAccess.map(a => a.ticketTemplateId) } }
          : {}
        ),
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        fields: {
          orderBy: { orderIndex: 'asc' }
        }
      }
    });

    await reply.send({ data: templates });
  };

  getTemplate = async (request: GetTemplateRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user;
    if (!user) {
      await reply.status(401).send({ message: 'Unauthorized' });
      return;
    }

    const template = await this.fastify.prisma.ticketTemplate.findFirst({
      where: {
        id: request.params.id,
        companyId: user.companyId
      },
      include: {
        fields: {
          orderBy: { orderIndex: 'asc' }
        }
      }
    });

    if (!template) {
      await reply.status(404).send({ message: 'Template not found' });
      return;
    }

    await reply.send(template);
  };

  createTemplate = async (request: CreateTemplateRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user;
    if (!user) {
      await reply.status(401).send({ message: 'Unauthorized' });
      return;
    }

    const body = createTicketTemplateBodySchema.parse(request.body);

    try {
      const template = await this.fastify.prisma.ticketTemplate.create({
        data: {
          companyId: user.companyId,
          name: body.name,
          code: body.code,
          description: body.description,
          fields: {
            create: body.fields.map((field) => ({
              key: field.key,
              label: field.label,
              type: field.type,
              required: field.required,
              orderIndex: field.orderIndex,
              config: field.config ?? undefined,
              section: field.section ?? null,
              sectionOrder: field.sectionOrder ?? 0
            }))
          }
        },
        include: {
          fields: {
            orderBy: { orderIndex: 'asc' }
          }
        }
      });

      await reply.status(201).send(template);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        await reply.status(409).send({ message: 'Template code already exists for this company' });
        return;
      }

      throw error;
    }
  };

  updateTemplate = async (request: UpdateTemplateRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user;
    if (!user) {
      await reply.status(401).send({ message: 'Unauthorized' });
      return;
    }

    const body = updateTicketTemplateBodySchema.parse(request.body);

    // First, verify the template exists and belongs to the user's company
    const existing = await this.fastify.prisma.ticketTemplate.findFirst({
      where: {
        id: request.params.id,
        companyId: user.companyId
      }
    });

    if (!existing) {
      await reply.status(404).send({ message: 'Template not found' });
      return;
    }

    // Check if user has admin permission for this template
    const canAdmin = await canAdminTemplate(this.fastify, user, request.params.id);
    if (!canAdmin) {
      await reply.status(403).send({ message: 'Forbidden' });
      return;
    }

    try {
      // If fields are being updated, delete existing fields and recreate
      const updateData: Prisma.TicketTemplateUpdateInput = {};
      
      if (body.name !== undefined) {
        updateData.name = body.name;
      }
      if (body.description !== undefined) {
        updateData.description = body.description;
      }
      if (body.fields !== undefined) {
        updateData.fields = {
          deleteMany: {},
          create: body.fields.map((field) => ({
            key: field.key,
            label: field.label,
            type: field.type,
            required: field.required,
            orderIndex: field.orderIndex,
            config: field.config ?? undefined,
            section: field.section ?? null,
            sectionOrder: field.sectionOrder ?? 0
          }))
        };
      }

      const template = await this.fastify.prisma.ticketTemplate.update({
        where: { id: request.params.id },
        data: updateData,
        include: {
          fields: {
            orderBy: { orderIndex: 'asc' }
          }
        }
      });

      await reply.send(template);
    } catch (error) {
      throw error;
    }
  };
}
