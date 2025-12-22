import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';

const securityPlugin = fp(async (fastify) => {
  await fastify.register(cors, {
    origin: true,
    credentials: true
  });

  await fastify.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
  });
});

export default securityPlugin;
