import Fastify, { FastifyInstance } from 'fastify';
import fastifyMultipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'path';
import fs from 'fs';
import { env } from './env';
import prismaPlugin from './plugins/prisma';
import authPlugin from './plugins/auth';
import securityPlugin from './plugins/security';
import healthRoutes from './modules/health/health.routes';
import authRoutes from './modules/auth/auth.routes';
import sitesRoutes from './modules/sites/sites.routes';
import { siteOwnersRoutes } from './modules/siteOwners/siteOwners.routes';
import { siteFieldsRoutes } from './modules/siteFields/siteFields.routes';
import assetsRoutes from './modules/assets/assets.routes';
import ticketTemplatesRoutes from './modules/ticketTemplates/ticketTemplates.routes';
import ticketsRoutes from './modules/tickets/tickets.routes';
import visitsRoutes from './modules/visits/visits.routes';
import { usersRoutes } from './modules/users/users.routes';
import { attachmentsRoutes } from './modules/attachments/attachments.routes';
import { adminImportExportRoutes } from './modules/adminImportExport/adminImportExport.routes';
import syncRoutes from './modules/sync/sync.routes';
import companyRoutes from './modules/company/company.routes';

export const buildApp = (): FastifyInstance => {
  const app = Fastify({
    logger: {
      transport: env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined
    }
  });

  app.register(securityPlugin);
  app.register(prismaPlugin);
  app.register(authPlugin);

  // Register multipart for file uploads
  app.register(fastifyMultipart, {
    limits: {
      fileSize: 10 * 1024 * 1024 // 10 MB per file
    }
  });

  // Set up static file serving for uploads
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  app.register(fastifyStatic, {
    root: uploadsDir,
    prefix: '/uploads/',
    decorateReply: false
  });

  // Add CORS headers to static file responses
  app.addHook('onSend', async (request, reply) => {
    if (request.url.startsWith('/uploads/')) {
      reply.header('Access-Control-Allow-Origin', '*');
      reply.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
      reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
  });

  // Make uploadsDir available to routes
  app.decorate('uploadsDir', uploadsDir);

  app.register(async (instance) => {
    instance.register(healthRoutes);
    instance.register(authRoutes, { prefix: '/auth' });
    instance.register(sitesRoutes);
    instance.register(siteOwnersRoutes, { prefix: '/site-owners' });
    instance.register(siteFieldsRoutes, { prefix: '/site-field-definitions' });
    instance.register(assetsRoutes);
    instance.register(ticketTemplatesRoutes);
    instance.register(ticketsRoutes);
    instance.register(visitsRoutes);
    instance.register(usersRoutes, { prefix: '/users' });
    instance.register(attachmentsRoutes);
    instance.register(adminImportExportRoutes);
    instance.register(syncRoutes);
    instance.register(companyRoutes);
  }, { prefix: '/api/v1' });

  app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error }, 'Unhandled error');
    reply.status(error.statusCode ?? 500).send({
      statusCode: error.statusCode ?? 500,
      message: env.NODE_ENV === 'production' ? 'Internal Server Error' : error.message
    });
  });

  return app;
};
