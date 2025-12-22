import { FastifyInstance } from 'fastify';
import { VisitsController } from './visits.controller';

const visitsRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const controller = new VisitsController(fastify);

  fastify.post('/tickets/:id/visits', controller.createVisit);
};

export default visitsRoutes;
