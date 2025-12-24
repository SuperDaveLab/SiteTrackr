import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Prisma, TicketStatus } from '@prisma/client';
import { isGlobalAdmin } from '../auth/permissions';
import { MapMarkersQuery, mapMarkersQuerySchema } from './map.schemas';

const DEFAULT_STATUSES: TicketStatus[] = [TicketStatus.OPEN, TicketStatus.IN_PROGRESS];

type MapMarkersRequest = FastifyRequest<{ Querystring: MapMarkersQuery }>;

export class MapController {
  constructor(private readonly fastify: FastifyInstance) {}

  getMarkers = async (request: MapMarkersRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user;
    if (!user) {
      await reply.status(401).send({ message: 'Unauthorized' });
      return;
    }

    const query = mapMarkersQuerySchema.parse(request.query);
    const limit = Math.min(query.limit ?? 5000, 10000);

    const statuses = (query.status && query.status.length > 0) ? query.status : DEFAULT_STATUSES;
    const requestedTemplateCodes = query.templateCodes ?? [];
    const requestedOwnerIds = query.siteOwnerIds ?? [];
    const bbox = query.bbox;

    let allowedOwnerIds: string[] | null = null;
    let allowedTemplateIds: string[] | null = null;

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

      allowedOwnerIds = ownerAccess.length > 0 ? ownerAccess.map((access) => access.siteOwnerId) : null;
      allowedTemplateIds = templateAccess.length > 0 ? templateAccess.map((access) => access.ticketTemplateId) : null;
    }

    let ownerFilterIds: string[] | null = null;
    if (requestedOwnerIds.length > 0) {
      ownerFilterIds = allowedOwnerIds
        ? requestedOwnerIds.filter((id) => allowedOwnerIds!.includes(id))
        : requestedOwnerIds;

      if (ownerFilterIds.length === 0) {
        await reply.send({ data: [] });
        return;
      }
    }

    const resolvedTemplateIds = requestedTemplateCodes.length > 0
      ? await this.fastify.prisma.ticketTemplate.findMany({
          where: {
            companyId: user.companyId,
            code: { in: requestedTemplateCodes }
          },
          select: { id: true }
        })
      : [];

    let templateFilterIds: string[] | null = null;
    if (requestedTemplateCodes.length > 0) {
      if (resolvedTemplateIds.length === 0) {
        await reply.send({ data: [] });
        return;
      }

      const requestedIds = resolvedTemplateIds.map((template) => template.id);
      templateFilterIds = allowedTemplateIds
        ? requestedIds.filter((id) => allowedTemplateIds!.includes(id))
        : requestedIds;

      if (!templateFilterIds || templateFilterIds.length === 0) {
        await reply.send({ data: [] });
        return;
      }
    }

    const hasLatRange = bbox ? Math.abs(bbox.maxLat - bbox.minLat) >= 0.0005 : false;
    const hasLngRange = bbox ? Math.abs(bbox.maxLng - bbox.minLng) >= 0.0005 : false;

    const siteFilter: Prisma.SiteWhereInput = {
      companyId: user.companyId,
      latitude: hasLatRange
        ? { gte: bbox!.minLat, lte: bbox!.maxLat }
        : { not: null },
      longitude: hasLngRange
        ? { gte: bbox!.minLng, lte: bbox!.maxLng }
        : { not: null }
    };

    if (ownerFilterIds && ownerFilterIds.length > 0) {
      siteFilter.siteOwnerId = { in: ownerFilterIds };
    }

    const ticketWhere: Prisma.TicketWhereInput = {
      companyId: user.companyId,
      status: { in: statuses },
      site: { is: siteFilter }
    };

    if (templateFilterIds && templateFilterIds.length > 0) {
      ticketWhere.templateId = { in: templateFilterIds };
    }

    if (!isGlobalAdmin(user)) {
      const permissionScopes: Prisma.TicketWhereInput[] = [];
      if (allowedOwnerIds && allowedOwnerIds.length > 0) {
        permissionScopes.push({
          site: {
            is: {
              siteOwnerId: { in: allowedOwnerIds }
            }
          }
        });
      }

      if (allowedTemplateIds && allowedTemplateIds.length > 0) {
        permissionScopes.push({ templateId: { in: allowedTemplateIds } });
      }

      if (permissionScopes.length > 0) {
        ticketWhere.OR = permissionScopes;
      }
    }

    const tickets = await this.fastify.prisma.ticket.findMany({
      where: ticketWhere,
      select: {
        template: {
          select: {
            code: true
          }
        },
        site: {
          select: {
            id: true,
            code: true,
            name: true,
            latitude: true,
            longitude: true,
            siteOwnerId: true,
            owner: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    const markerMap = new Map<string, {
      siteId: string;
      siteCode: string | null;
      siteName: string;
      lat: number;
      lng: number;
      siteOwnerId: string | null;
      siteOwnerName: string | null;
      openTicketCount: number;
      templates: Set<string>;
    }>();

    for (const ticket of tickets) {
      const site = ticket.site;
      if (!site || site.latitude == null || site.longitude == null) {
        continue;
      }

      let marker = markerMap.get(site.id);
      if (!marker) {
        marker = {
          siteId: site.id,
          siteCode: site.code,
          siteName: site.name,
          lat: site.latitude,
          lng: site.longitude,
          siteOwnerId: site.siteOwnerId,
          siteOwnerName: site.owner?.name ?? null,
          openTicketCount: 0,
          templates: new Set<string>()
        };
        markerMap.set(site.id, marker);
      }

      marker.openTicketCount += 1;
      if (ticket.template?.code) {
        marker.templates.add(ticket.template.code);
      }
    }

    const markers = Array.from(markerMap.values())
      .map((marker) => ({
        siteId: marker.siteId,
        siteCode: marker.siteCode,
        siteName: marker.siteName,
        lat: marker.lat,
        lng: marker.lng,
        siteOwnerId: marker.siteOwnerId,
        siteOwnerName: marker.siteOwnerName,
        openTicketCount: marker.openTicketCount,
        templates: Array.from(marker.templates).sort()
      }))
      .sort((a, b) => b.openTicketCount - a.openTicketCount)
      .slice(0, limit);

    await reply.send({ data: markers });
  };
}
