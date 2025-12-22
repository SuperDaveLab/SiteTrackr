import { TicketStatus } from '@prisma/client';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { 
  ListSitesQuery, 
  listSitesQuerySchema, 
  SiteIdParams, 
  siteIdParamsSchema,
  UpdateSiteBody,
  updateSiteBodySchema
} from './sites.schemas';

type ListSitesRequest = FastifyRequest<{ Querystring: ListSitesQuery }>;
type SiteDetailRequest = FastifyRequest<{ Params: SiteIdParams }>;
type UpdateSiteRequest = FastifyRequest<{ Params: SiteIdParams; Body: UpdateSiteBody }>;

export class SitesController {
  constructor(private readonly fastify: FastifyInstance) {}

  listSites = async (request: ListSitesRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user;
    if (!user) {
      await reply.status(401).send({ message: 'Unauthorized' });
      return;
    }

    const { page, pageSize, search, sortBy = 'createdAt', sortDir = 'desc' } = listSitesQuerySchema.parse(request.query);
    
    // Check if user has site owner access restrictions (only for non-admin users)
    const ownerAccess = user.role !== 'ADMIN' 
      ? await this.fastify.prisma.userSiteOwnerAccess.findMany({
          where: { userId: user.id },
          select: { siteOwnerId: true },
        })
      : [];

    console.log('[DEBUG] User:', user.id, 'Role:', user.role);
    console.log('[DEBUG] Owner Access:', ownerAccess);

    const where = {
      companyId: user.companyId,
      // If user has specific site owner access, filter by those owners
      ...(ownerAccess.length > 0 
        ? { siteOwnerId: { in: ownerAccess.map(a => a.siteOwnerId) } }
        : {}
      ),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { code: { contains: search, mode: 'insensitive' as const } },
              { city: { contains: search, mode: 'insensitive' as const } },
              { state: { contains: search, mode: 'insensitive' as const } }
            ]
          }
        : {})
    };

    const orderBy = { [sortBy]: sortDir };

    console.log('[DEBUG] WHERE clause:', JSON.stringify(where, null, 2));
    console.log('[DEBUG] ORDER BY:', orderBy);

    const [data, total] = await this.fastify.prisma.$transaction([
      this.fastify.prisma.site.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy,
        select: {
          id: true,
          name: true,
          code: true,
          marketName: true,
          city: true,
          state: true,
          createdAt: true,
          updatedAt: true,
          owner: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }),
      this.fastify.prisma.site.count({ where })
    ]);

    console.log('[DEBUG] Found', total, 'total sites,', data.length, 'in current page');

    await reply.send({ data, meta: { page, pageSize, total } });
  };

  getSiteById = async (request: SiteDetailRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user;
    if (!user) {
      await reply.status(401).send({ message: 'Unauthorized' });
      return;
    }

    const params = siteIdParamsSchema.parse(request.params);

    const site = await this.fastify.prisma.site.findFirst({
      where: { id: params.id, companyId: user.companyId },
      select: {
        id: true,
        name: true,
        code: true,
        siteOwnerId: true,
        marketName: true,
        latitude: true,
        longitude: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        county: true,
        postalCode: true,
        equipmentType: true,
        towerType: true,
        notes: true,
        customFields: true,
        createdAt: true,
        updatedAt: true,
        owner: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        assets: {
          select: {
            id: true,
            type: true,
            tag: true,
            status: true
          }
        },
        tickets: {
          where: {
            status: { in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] }
          },
          select: {
            id: true,
            summary: true,
            status: true
          }
        }
      }
    });

    if (!site) {
      await reply.status(404).send({ message: 'Site not found' });
      return;
    }

    // Get effective field definitions for this site's owner
    let customFieldDefinitions: any[] = [];
    if (site.siteOwnerId) {
      const fieldDefs = await this.fastify.prisma.siteFieldDefinition.findMany({
        where: {
          companyId: user.companyId,
          OR: [
            { siteOwnerId: null }, // Global fields
            { siteOwnerId: site.siteOwnerId } // Owner-specific fields
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
        .filter(f => f.siteOwnerId === site.siteOwnerId)
        .forEach(f => fieldMap.set(f.key, f));

      customFieldDefinitions = Array.from(fieldMap.values()).sort(
        (a, b) => a.orderIndex - b.orderIndex
      );
    }

    await reply.send({ ...site, customFieldDefinitions });
  };

  updateSite = async (request: UpdateSiteRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user;
    if (!user) {
      await reply.status(401).send({ message: 'Unauthorized' });
      return;
    }

    const params = siteIdParamsSchema.parse(request.params);
    const body = updateSiteBodySchema.parse(request.body);

    const existing = await this.fastify.prisma.site.findFirst({
      where: { id: params.id, companyId: user.companyId }
    });

    if (!existing) {
      await reply.status(404).send({ message: 'Site not found' });
      return;
    }

    // If siteOwnerId is being updated, verify it exists and belongs to this company
    if (body.siteOwnerId !== undefined && body.siteOwnerId !== null) {
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
    }

    const updateData: any = {};
    if (body.siteOwnerId !== undefined) {
      updateData.siteOwnerId = body.siteOwnerId;
    }
    if (body.customFields !== undefined) {
      updateData.customFields = body.customFields;
    }

    const site = await this.fastify.prisma.site.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        code: true,
        customFields: true,
        updatedAt: true,
        owner: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    });

    await reply.send(site);
  };
}

