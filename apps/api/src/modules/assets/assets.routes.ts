import { FastifyInstance } from 'fastify';
import { AssetsController } from './assets.controller';

const assetsRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const controller = new AssetsController(fastify);

  fastify.get('/assets', controller.listAssets);
  fastify.get('/assets/:id', controller.getAssetById);
};

export default assetsRoutes;
