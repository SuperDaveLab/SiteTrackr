import { FastifyInstance } from 'fastify';
import { MapController } from './map.controller';

const mapRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const controller = new MapController(fastify);

  fastify.get('/map/markers', controller.getMarkers);
};

export default mapRoutes;
