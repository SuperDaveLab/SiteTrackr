import type { FastifyInstance } from 'fastify';
import { UserRole } from '@prisma/client';
import { requireRole } from '../../plugins/auth';
import { importSiteOwners } from './importSiteOwners';
import { exportSiteOwners } from './exportSiteOwners';
import { importSites } from './importSites';
import { exportSites } from './exportSites';
import { importTicketTemplates } from './importTicketTemplates';
import { exportTicketTemplates } from './exportTicketTemplates';
import { importTickets } from './importTickets';
import { exportTickets } from './exportTickets';

export async function adminImportExportRoutes(app: FastifyInstance) {
  // Site Owners
  app.get('/admin/export/site-owners', {
    preHandler: requireRole([UserRole.ADMIN]),
  }, async (request, reply) => {
    const { companyId } = request.user as any;
    const { format = 'csv' } = request.query as { format?: 'csv' | 'xlsx' };
    
    const content = await exportSiteOwners(app, companyId, format);
    
    if (format === 'xlsx') {
      reply
        .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        .header('Content-Disposition', 'attachment; filename="site-owners.xlsx"')
        .send(content);
    } else {
      reply
        .header('Content-Type', 'text/csv')
        .header('Content-Disposition', 'attachment; filename="site-owners.csv"')
        .send(content);
    }
  });

  app.post('/admin/import/site-owners', {
    preHandler: requireRole([UserRole.ADMIN]),
  }, async (request, reply) => {
    const { companyId } = request.user as any;
    
    const data = await request.file();
    if (!data) {
      return reply.code(400).send({ error: 'No file uploaded' });
    }

    const buffer = await data.toBuffer();
    const result = await importSiteOwners(app, companyId, buffer, data.filename);
    
    return result;
  });

  // Sites
  app.get('/admin/export/sites', {
    preHandler: requireRole([UserRole.ADMIN]),
  }, async (request, reply) => {
    const { companyId } = request.user as any;
    const { format = 'csv' } = request.query as { format?: 'csv' | 'xlsx' };
    
    const content = await exportSites(app, companyId, format);
    
    if (format === 'xlsx') {
      reply
        .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        .header('Content-Disposition', 'attachment; filename="sites.xlsx"')
        .send(content);
    } else {
      reply
        .header('Content-Type', 'text/csv')
        .header('Content-Disposition', 'attachment; filename="sites.csv"')
        .send(content);
    }
  });

  app.post('/admin/import/sites', {
    preHandler: requireRole([UserRole.ADMIN]),
  }, async (request, reply) => {
    const { companyId } = request.user as any;
    
    const data = await request.file();
    if (!data) {
      return reply.code(400).send({ error: 'No file uploaded' });
    }

    const buffer = await data.toBuffer();
    const result = await importSites(app, companyId, buffer, data.filename);
    
    return result;
  });

  // Ticket Templates
  app.get('/admin/export/ticket-templates', {
    preHandler: requireRole([UserRole.ADMIN]),
  }, async (request, reply) => {
    const { companyId } = request.user as any;
    const { format = 'csv' } = request.query as { format?: 'csv' | 'xlsx' };
    
    const content = await exportTicketTemplates(app, companyId, format);
    
    if (format === 'xlsx') {
      reply
        .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        .header('Content-Disposition', 'attachment; filename="ticket-templates.xlsx"')
        .send(content);
    } else {
      reply
        .header('Content-Type', 'text/csv')
        .header('Content-Disposition', 'attachment; filename="ticket-templates.csv"')
        .send(content);
    }
  });

  app.post('/admin/import/ticket-templates', {
    preHandler: requireRole([UserRole.ADMIN]),
  }, async (request, reply) => {
    const { companyId } = request.user as any;
    
    const data = await request.file();
    if (!data) {
      return reply.code(400).send({ error: 'No file uploaded' });
    }

    const buffer = await data.toBuffer();
    const result = await importTicketTemplates(app, companyId, buffer, data.filename);
    
    return result;
  });

  // Tickets
  app.get('/admin/export/tickets', {
    preHandler: requireRole([UserRole.ADMIN]),
  }, async (request, reply) => {
    const { companyId } = request.user as any;
    const { format = 'csv' } = request.query as { format?: 'csv' | 'xlsx' };
    
    const content = await exportTickets(app, companyId, format);
    
    if (format === 'xlsx') {
      reply
        .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        .header('Content-Disposition', 'attachment; filename="tickets.xlsx"')
        .send(content);
    } else {
      reply
        .header('Content-Type', 'text/csv')
        .header('Content-Disposition', 'attachment; filename="tickets.csv"')
        .send(content);
    }
  });

  app.post('/admin/import/tickets', {
    preHandler: requireRole([UserRole.ADMIN]),
  }, async (request, reply) => {
    const { companyId } = request.user as any;
    
    const data = await request.file();
    if (!data) {
      return reply.code(400).send({ error: 'No file uploaded' });
    }

    const buffer = await data.toBuffer();
    const result = await importTickets(app, companyId, buffer, data.filename);
    
    return result;
  });
}
