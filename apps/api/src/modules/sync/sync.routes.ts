import { FastifyInstance } from 'fastify';
import { SyncController } from './sync.controller';

const syncRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const controller = new SyncController(fastify);

  fastify.get('/sync/changes', controller.getChanges);
  fastify.post('/sync/apply', controller.applyOperations);
};

export default syncRoutes;
