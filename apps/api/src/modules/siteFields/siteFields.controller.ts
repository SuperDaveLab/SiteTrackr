import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { canAdminSiteOwner } from '../auth/permissions';
import {
  CreateSiteFieldDefinitionBody,
  createSiteFieldDefinitionBodySchema,
  ListSiteFieldDefinitionsQuery,
  listSiteFieldDefinitionsQuerySchema
} from './siteFields.schemas';

type ListSiteFieldDefinitionsRequest = FastifyRequest<{ Querystring: ListSiteFieldDefinitionsQuery }>;
type CreateSiteFieldDefinitionRequest = FastifyRequest<{ Body: CreateSiteFieldDefinitionBody }>;

export class SiteFieldsController {
  constructor(private readonly fastify: FastifyInstance) {}

  listSiteFieldDefinitions = async (
    request: ListSiteFieldDefinitionsRequest,
    reply: FastifyReply
  ): Promise<void> => {
    const user = request.user;
    if (!user) {
      await reply.status(401).send({ message: 'Unauthorized' });
      return;
    }

    const query = listSiteFieldDefinitionsQuerySchema.parse(request.query);

    // If siteOwnerId is provided, return global + owner-specific fields
    // If not provided, return all field definitions for the company
    const where = query.siteOwnerId
      ? {
          companyId: user.companyId,
          OR: [
            { siteOwnerId: null }, // Global fields
            { siteOwnerId: query.siteOwnerId } // Owner-specific fields
          ]
        }
      : {
          companyId: user.companyId
        };

    const fieldDefinitions = await this.fastify.prisma.siteFieldDefinition.findMany({
      where,
      select: {
        id: true,
        siteOwnerId: true,
        key: true,
        label: true,
        type: true,
        required: true,
        orderIndex: true,
        config: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }]
    });

    // If siteOwnerId was provided, merge fields with owner-specific overriding global
    if (query.siteOwnerId) {
      const fieldMap = new Map();
      
      // First add global fields
      fieldDefinitions
        .filter(f => f.siteOwnerId === null)
        .forEach(f => fieldMap.set(f.key, f));
      
      // Then override with owner-specific fields
      fieldDefinitions
        .filter(f => f.siteOwnerId === query.siteOwnerId)
        .forEach(f => fieldMap.set(f.key, f));

      const mergedFields = Array.from(fieldMap.values()).sort(
        (a, b) => a.orderIndex - b.orderIndex || a.createdAt.getTime() - b.createdAt.getTime()
      );

      await reply.send(mergedFields);
    } else {
      await reply.send(fieldDefinitions);
    }
  };

  createSiteFieldDefinition = async (
    request: CreateSiteFieldDefinitionRequest,
    reply: FastifyReply
  ): Promise<void> => {
    const user = request.user;
    if (!user) {
      await reply.status(401).send({ message: 'Unauthorized' });
      return;
    }

    const body = createSiteFieldDefinitionBodySchema.parse(request.body);

    // Check for existing field with same key for this owner/company combo
    const siteOwnerIdValue = body.siteOwnerId === null ? null : body.siteOwnerId || null;
    
    const existing = await this.fastify.prisma.siteFieldDefinition.findFirst({
      where: {
        companyId: user.companyId,
        siteOwnerId: siteOwnerIdValue,
        key: body.key
      }
    });

    if (existing) {
      await reply.status(409).send({ 
        message: 'Field definition with this key already exists for this site owner' 
      });
      return;
    }

    // If siteOwnerId is provided, verify it exists and belongs to this company
    if (body.siteOwnerId) {
      const owner = await this.fastify.prisma.siteOwner.findFirst({
        where: {
          id: body.siteOwnerId,
          companyId: user.companyId
        }
      });

      if (!owner) {
        await reply.status(404).send({ message: 'Site owner not found' });
        return;
      }

      // Check if user has admin permission for this site owner
      const canAdmin = await canAdminSiteOwner(this.fastify, user, body.siteOwnerId);
      if (!canAdmin) {
        await reply.status(403).send({ message: 'Forbidden' });
        return;
      }
    }

    const fieldDefinition = await this.fastify.prisma.siteFieldDefinition.create({
      data: {
        companyId: user.companyId,
        siteOwnerId: siteOwnerIdValue,
        key: body.key,
        label: body.label,
        type: body.type,
        required: body.required ?? false,
        orderIndex: body.orderIndex ?? 0,
        config: body.config ? body.config as any : null
      },
      select: {
        id: true,
        siteOwnerId: true,
        key: true,
        label: true,
        type: true,
        required: true,
        orderIndex: true,
        config: true,
        createdAt: true,
        updatedAt: true
      }
    });

    await reply.status(201).send(fieldDefinition);
  };
}
