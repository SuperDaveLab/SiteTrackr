import { FastifyInstance } from 'fastify';
import { UserRole } from '@prisma/client';
import { requireRole } from '../../plugins/auth';
import { SiteFieldsController } from './siteFields.controller';

export async function siteFieldsRoutes(fastify: FastifyInstance) {
  const controller = new SiteFieldsController(fastify);

  fastify.get('/', controller.listSiteFieldDefinitions);
  fastify.post('/', {
    preHandler: requireRole([UserRole.ADMIN]),
    handler: controller.createSiteFieldDefinition,
  });
}
