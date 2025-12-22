import { TicketStatus } from '@prisma/client';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  AssetIdParams,
  assetIdParamsSchema,
  ListAssetsQuery,
  listAssetsQuerySchema
} from './assets.schemas';

type ListAssetsRequest = FastifyRequest<{ Querystring: ListAssetsQuery }>;
type AssetDetailRequest = FastifyRequest<{ Params: AssetIdParams }>;

export class AssetsController {
  constructor(private readonly fastify: FastifyInstance) {}

  listAssets = async (request: ListAssetsRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user;
    if (!user) {
      await reply.status(401).send({ message: 'Unauthorized' });
      return;
    }

    const { page, pageSize, siteId } = listAssetsQuerySchema.parse(request.query);
    const where = {
      companyId: user.companyId,
      ...(siteId ? { siteId } : {})
    };

    const [data, total] = await this.fastify.prisma.$transaction([
      this.fastify.prisma.asset.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          tag: true,
          status: true,
          siteId: true,
          site: {
            select: {
              id: true,
              name: true,
              code: true
            }
          }
        }
      }),
      this.fastify.prisma.asset.count({ where })
    ]);

    await reply.send({ data, meta: { page, pageSize, total } });
  };

  getAssetById = async (request: AssetDetailRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user;
    if (!user) {
      await reply.status(401).send({ message: 'Unauthorized' });
      return;
    }

    const params = assetIdParamsSchema.parse(request.params);

    const asset = await this.fastify.prisma.asset.findFirst({
      where: { id: params.id, companyId: user.companyId },
      select: {
        id: true,
        type: true,
        tag: true,
        model: true,
        serial: true,
        status: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
        site: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        tickets: {
          where: {
            status: { in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] }
          },
          select: {
            id: true,
            summary: true,
            status: true,
            priority: true
          }
        }
      }
    });

    if (!asset) {
      await reply.status(404).send({ message: 'Asset not found' });
      return;
    }

    await reply.send(asset);
  };
}
