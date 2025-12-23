import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Prisma, TicketStatus, TicketPriority } from '@prisma/client';
import { syncApplyBodySchema, syncChangesQuerySchema, type SyncApplyBody, type SyncChangesQuery, type TicketUpdateOp, type VisitCreateOp } from './sync.schemas';

type SyncChangesRequest = FastifyRequest<{ Querystring: SyncChangesQuery }>;
type SyncApplyRequest = FastifyRequest<{ Body: SyncApplyBody }>;

type SyncResult = {
  opId: string;
  ok: boolean;
  entity: string;
  entityId: string;
  serverUpdatedAt?: string;
  error?: string;
};

export class SyncController {
  constructor(private readonly fastify: FastifyInstance) {}

  getChanges = async (request: SyncChangesRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user;
    if (!user) {
      await reply.status(401).send({ message: 'Unauthorized' });
      return;
    }

    const query = syncChangesQuerySchema.parse(request.query);
    const since = query.since ? new Date(query.since) : null;
    const updatedFilter = since ? { updatedAt: { gt: since } } : {};

    const [tickets, sites, templates] = await Promise.all([
      this.fastify.prisma.ticket.findMany({
        where: {
          companyId: user.companyId,
          ...updatedFilter
        },
        select: {
          id: true,
          summary: true,
          status: true,
          priority: true,
          createdAt: true,
          updatedAt: true,
          template: {
            select: { id: true, code: true, name: true }
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
        orderBy: { updatedAt: 'desc' },
        take: 250
      }),
      this.fastify.prisma.site.findMany({
        where: {
          companyId: user.companyId,
          ...updatedFilter
        },
        select: {
          id: true,
          name: true,
          code: true,
          marketName: true,
          customFields: true,
          city: true,
          state: true,
          county: true,
          createdAt: true,
          updatedAt: true,
          equipmentType: true,
          towerType: true,
          owner: {
            select: { id: true, name: true }
          }
        },
        orderBy: { updatedAt: 'desc' },
        take: 250
      }),
      this.fastify.prisma.ticketTemplate.findMany({
        where: {
          companyId: user.companyId,
          ...updatedFilter
        },
        select: {
          id: true,
          name: true,
          code: true,
          isActive: true,
          updatedAt: true
        },
        orderBy: { updatedAt: 'desc' },
        take: 250
      })
    ]);

    await reply.send({
      cursor: new Date().toISOString(),
      changes: {
        tickets,
        sites,
        templates
      }
    });
  };

  applyOperations = async (request: SyncApplyRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user;
    if (!user) {
      await reply.status(401).send({ message: 'Unauthorized' });
      return;
    }

    const body = syncApplyBodySchema.parse(request.body);
    const results: SyncResult[] = [];

    for (const op of body.ops) {
      try {
        if (op.entity === 'ticket') {
          results.push(await this.applyTicketUpdate(user, op));
          continue;
        }

        if (op.entity === 'visit') {
          results.push(await this.applyVisitCreate(user, op));
          continue;
        }
      } catch (error) {
        request.log.error({ err: error, opId: op.id }, 'Sync operation failed');
        results.push({
          opId: op.id,
          ok: false,
          entity: op.entity,
          entityId: op.entityId,
          error: 'INTERNAL_ERROR'
        });
      }
    }

    await reply.send({ results });
  };

  private applyTicketUpdate = async (
    user: { id: string; companyId: string },
    op: TicketUpdateOp
  ): Promise<SyncResult> => {
    const existing = await this.fastify.prisma.ticket.findFirst({
      where: { id: op.entityId, companyId: user.companyId },
      include: {
        template: { include: { fields: true } }
      }
    });

    if (!existing) {
      return {
        opId: op.id,
        ok: false,
        entity: op.entity,
        entityId: op.entityId,
        error: 'NOT_FOUND'
      };
    }

    if (op.baseUpdatedAt) {
      const base = new Date(op.baseUpdatedAt).getTime();
      if (existing.updatedAt.getTime() > base) {
        return {
          opId: op.id,
          ok: false,
          entity: op.entity,
          entityId: op.entityId,
          error: 'CONFLICT'
        };
      }
    }

    const patch = op.payload.patch;
    const data: Prisma.TicketUpdateInput = {};
    if (patch.summary !== undefined) {
      data.summary = patch.summary;
    }
    if (patch.description !== undefined) {
      data.description = patch.description;
    }
    if (patch.status !== undefined) {
      data.status = patch.status as TicketStatus;
    }
    if (patch.priority !== undefined) {
      data.priority = patch.priority as TicketPriority;
    }
    if (patch.customFields !== undefined) {
      data.customFields = patch.customFields as Prisma.InputJsonValue;
    }

    const activities: Prisma.TicketActivityCreateManyInput[] = [];
    if (patch.customFields !== undefined) {
      const oldFields = (existing.customFields as Record<string, unknown>) || {};
      const newFields = patch.customFields || {};
      const fieldLabelMap = new Map(existing.template.fields.map((field) => [field.key, field.label]));
      const keys = new Set([...Object.keys(oldFields), ...Object.keys(newFields)]);

      keys.forEach((key) => {
        const beforeValue = oldFields[key];
        const afterValue = newFields[key];
        if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
          activities.push({
            ticketId: existing.id,
            userId: user.id,
            action: 'field_updated',
            fieldKey: key,
            fieldLabel: fieldLabelMap.get(key) ?? key,
            oldValue: beforeValue !== undefined ? JSON.stringify(beforeValue) : null,
            newValue: afterValue !== undefined ? JSON.stringify(afterValue) : null
          });
        }
      });
    }

    if (!Object.keys(data).length) {
      return {
        opId: op.id,
        ok: true,
        entity: op.entity,
        entityId: op.entityId,
        serverUpdatedAt: existing.updatedAt.toISOString()
      };
    }

    const [updated] = await this.fastify.prisma.$transaction([
      this.fastify.prisma.ticket.update({
        where: { id: existing.id },
        data,
        select: { id: true, updatedAt: true }
      }),
      ...(activities.length
        ? [this.fastify.prisma.ticketActivity.createMany({ data: activities })]
        : [])
    ]);

    return {
      opId: op.id,
      ok: true,
      entity: op.entity,
      entityId: op.entityId,
      serverUpdatedAt: updated.updatedAt.toISOString()
    };
  };

  private applyVisitCreate = async (
    user: { id: string; companyId: string },
    op: VisitCreateOp
  ): Promise<SyncResult> => {
    const payload = op.payload;

    if (payload.ticketId === undefined) {
      return {
        opId: op.id,
        ok: false,
        entity: op.entity,
        entityId: op.entityId,
        error: 'INVALID_PAYLOAD'
      };
    }

    const ticket = await this.fastify.prisma.ticket.findFirst({
      where: { id: payload.ticketId, companyId: user.companyId },
      select: { id: true }
    });

    if (!ticket) {
      return {
        opId: op.id,
        ok: false,
        entity: op.entity,
        entityId: op.entityId,
        error: 'TICKET_NOT_FOUND'
      };
    }

    const existingVisit = await this.fastify.prisma.visit.findUnique({ where: { id: op.entityId } });
    if (existingVisit) {
      return {
        opId: op.id,
        ok: true,
        entity: op.entity,
        entityId: op.entityId,
        serverUpdatedAt: existingVisit.updatedAt.toISOString()
      };
    }

    const startedAt = payload.startedAt ? new Date(payload.startedAt) : new Date();
    const endedAt = payload.endedAt ? new Date(payload.endedAt) : undefined;

    if (endedAt && endedAt < startedAt) {
      return {
        opId: op.id,
        ok: false,
        entity: op.entity,
        entityId: op.entityId,
        error: 'INVALID_TIME_RANGE'
      };
    }

    const visit = await this.fastify.prisma.visit.create({
      data: {
        id: op.entityId,
        ticketId: ticket.id,
        technicianUserId: user.id,
        startedAt,
        endedAt: endedAt ?? null,
        notes: payload.notes ?? null,
        location: payload.location,
        readings: payload.readings
      },
      select: { id: true, updatedAt: true }
    });

    return {
      opId: op.id,
      ok: true,
      entity: op.entity,
      entityId: op.entityId,
      serverUpdatedAt: visit.updatedAt.toISOString()
    };
  };
}
