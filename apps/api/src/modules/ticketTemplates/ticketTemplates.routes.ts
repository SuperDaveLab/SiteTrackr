import { FastifyInstance } from 'fastify';
import { UserRole } from '@prisma/client';
import { requireRole } from '../../plugins/auth';
import { TicketTemplatesController } from './ticketTemplates.controller';

const ticketTemplatesRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const controller = new TicketTemplatesController(fastify);

  fastify.get('/ticket-templates', controller.listTemplates);
  fastify.get('/ticket-templates/:id', controller.getTemplate);
  fastify.post('/ticket-templates', {
    preHandler: requireRole([UserRole.ADMIN]),
    handler: controller.createTemplate,
  });
  fastify.patch('/ticket-templates/:id', {
    preHandler: requireRole([UserRole.ADMIN]),
    handler: controller.updateTemplate,
  });
};

export default ticketTemplatesRoutes;
