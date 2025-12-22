import { FastifyInstance } from 'fastify';
import { TicketsController } from './tickets.controller';

const ticketsRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const controller = new TicketsController(fastify);

  fastify.get('/tickets', controller.listTickets);
  fastify.post('/tickets', controller.createTicket);
  fastify.get('/tickets/:id', controller.getTicketById);
  fastify.patch('/tickets/:id', controller.updateTicket);
  fastify.get('/tickets/:id/attachments/download', controller.downloadAllAttachments);
};

export default ticketsRoutes;
