import { FastifyInstance } from 'fastify';
import { UserRole } from '@prisma/client';
import { requireRole } from '../../plugins/auth';
import { SitesController } from './sites.controller';

const sitesRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const controller = new SitesController(fastify);

  fastify.get('/sites', controller.listSites);
  fastify.get('/sites/:id', controller.getSiteById);
  fastify.patch('/sites/:id', {
    preHandler: requireRole([UserRole.ADMIN]),
    handler: controller.updateSite,
  });
};

export default sitesRoutes;
