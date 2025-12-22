import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

const prismaPlugin = fp(async (fastify) => {
  const prisma = new PrismaClient();
  fastify.decorate('prisma', prisma);

  fastify.addHook('onReady', async () => {
    try {
      await prisma.$connect();
      fastify.log.info('Connected to PostgreSQL');
    } catch (error) {
      fastify.log.error({ err: error }, 'Failed to connect to PostgreSQL');
      fastify.log.warn('Continuing startup without database connection');
    }
  });

  fastify.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
});

export default prismaPlugin;
