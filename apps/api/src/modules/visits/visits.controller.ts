import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  CreateVisitBody,
  createVisitBodySchema,
  VisitTicketParams,
  visitTicketParamsSchema
} from './visits.schemas';

type CreateVisitRequest = FastifyRequest<{ Params: VisitTicketParams; Body: CreateVisitBody }>;

export class VisitsController {
  constructor(private readonly fastify: FastifyInstance) {}

  createVisit = async (request: CreateVisitRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user;
    if (!user) {
      await reply.status(401).send({ message: 'Unauthorized' });
      return;
    }

    const params = visitTicketParamsSchema.parse(request.params);
    const body = createVisitBodySchema.parse(request.body);

    const startedAt = body.startedAt ?? new Date();
    
    if (body.endedAt && body.endedAt < startedAt) {
      await reply.status(400).send({ message: 'endedAt cannot be before startedAt' });
      return;
    }

    const ticket = await this.fastify.prisma.ticket.findFirst({
      where: { id: params.id, companyId: user.companyId },
      select: { id: true }
    });

    if (!ticket) {
      await reply.status(404).send({ message: 'Ticket not found' });
      return;
    }

    const visit = await this.fastify.prisma.visit.create({
      data: {
        ticketId: ticket.id,
        technicianUserId: user.id,
        startedAt,
        endedAt: body.endedAt ?? null,
        notes: body.notes ?? null,
        location: body.location ?? undefined,
        readings: body.readings ?? undefined
      },
      include: {
        technician: {
          select: {
            id: true,
            displayName: true
          }
        }
      }
    });

    await reply.status(201).send(visit);
  };
}
