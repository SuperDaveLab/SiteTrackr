import { FastifyInstance } from 'fastify';
import { AttachmentsController } from './attachments.controller';

export const attachmentsRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const controller = new AttachmentsController(fastify);

  // POST /tickets/:ticketId/attachments - Upload file to ticket
  fastify.post('/tickets/:ticketId/attachments', controller.uploadForTicket);

  // POST /tickets/:ticketId/attachments/metadata - Create attachment metadata record
  fastify.post('/tickets/:ticketId/attachments/metadata', controller.createTicketAttachmentMetadata);
  
  // POST /visits/:visitId/attachments - Upload file to visit
  fastify.post('/visits/:visitId/attachments', controller.uploadForVisit);

  // POST /visits/:visitId/attachments/metadata - Create visit attachment metadata
  fastify.post('/visits/:visitId/attachments/metadata', controller.createVisitAttachmentMetadata);

  // PUT /attachments/:id/content - Upload attachment bytes
  fastify.put('/attachments/:id/content', controller.uploadAttachmentContent);
};
