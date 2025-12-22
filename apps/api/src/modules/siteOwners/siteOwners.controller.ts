import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { CreateSiteOwnerBody, createSiteOwnerBodySchema } from './siteOwners.schemas';

type CreateSiteOwnerRequest = FastifyRequest<{ Body: CreateSiteOwnerBody }>;

export class SiteOwnersController {
  constructor(private readonly fastify: FastifyInstance) {}

  listSiteOwners = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user;
    if (!user) {
      await reply.status(401).send({ message: 'Unauthorized' });
      return;
    }

    const owners = await this.fastify.prisma.siteOwner.findMany({
      where: { companyId: user.companyId },
      select: {
        id: true,
        name: true,
        code: true,
        notes: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { name: 'asc' }
    });

    await reply.send(owners);
  };

  createSiteOwner = async (request: CreateSiteOwnerRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user;
    if (!user) {
      await reply.status(401).send({ message: 'Unauthorized' });
      return;
    }

    const body = createSiteOwnerBodySchema.parse(request.body);

    // Check for existing code
    const existing = await this.fastify.prisma.siteOwner.findFirst({
      where: {
        companyId: user.companyId,
        code: body.code
      }
    });

    if (existing) {
      await reply.status(409).send({ message: 'Site owner with this code already exists' });
      return;
    }

    const owner = await this.fastify.prisma.siteOwner.create({
      data: {
        companyId: user.companyId,
        name: body.name,
        code: body.code,
        notes: body.notes || null
      },
      select: {
        id: true,
        name: true,
        code: true,
        notes: true,
        createdAt: true,
        updatedAt: true
      }
    });

    await reply.status(201).send(owner);
  };
}
