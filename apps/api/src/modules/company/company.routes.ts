import { FastifyInstance } from 'fastify';
import { UserRole } from '@prisma/client';
import { requireRole } from '../../plugins/auth';
import { CompanyController } from './company.controller';
import { UpdateBrandingBody } from './company.schemas';

const companyRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const controller = new CompanyController(fastify);

  fastify.get('/company/branding', controller.getBranding);
  fastify.put<{ Body: UpdateBrandingBody }>(
    '/company/branding',
    { preHandler: requireRole([UserRole.ADMIN]) },
    controller.updateBranding
  );
};

export default companyRoutes;
