import { FastifyInstance } from 'fastify';
import { AttachmentsController } from './attachments.controller';

export const attachmentsRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const controller = new AttachmentsController(fastify);

  // POST /tickets/:ticketId/attachments - Upload file to ticket
  fastify.post('/tickets/:ticketId/attachments', controller.uploadForTicket);
  
  // POST /visits/:visitId/attachments - Upload file to visit
  fastify.post('/visits/:visitId/attachments', controller.uploadForVisit);
};
