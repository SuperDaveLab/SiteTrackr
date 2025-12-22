import { FastifyInstance } from 'fastify';

const healthRoutes = async (fastify: FastifyInstance): Promise<void> => {
  fastify.get('/health', async () => ({
    status: 'ok',
    uptimeMs: Math.round(process.uptime() * 1000),
    timestamp: new Date().toISOString()
  }));
};

export default healthRoutes;
