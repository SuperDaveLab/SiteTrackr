import { FastifyInstance } from 'fastify';
import { UserRole } from '@prisma/client';
import { requireRole } from '../../plugins/auth';
import { SiteOwnersController } from './siteOwners.controller';

export async function siteOwnersRoutes(fastify: FastifyInstance) {
  const controller = new SiteOwnersController(fastify);

  fastify.get('/', controller.listSiteOwners);
  fastify.post('/', {
    preHandler: requireRole([UserRole.ADMIN]),
    handler: controller.createSiteOwner,
  });
}
