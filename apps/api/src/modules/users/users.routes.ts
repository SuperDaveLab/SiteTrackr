import { FastifyInstance } from 'fastify';
import { UserRole } from '@prisma/client';
import { UsersController } from './users.controller';
import { requireRole } from '../../plugins/auth';

export const usersRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const usersController = new UsersController(fastify);

  // All user management routes require ADMIN role
  fastify.addHook('preHandler', requireRole([UserRole.ADMIN]));

  // POST /users - Create a new user
  fastify.post('/', usersController.createUser);

  // GET /users - List all users in company
  fastify.get('/', usersController.listUsers);

  // GET /users/:userId/access - Get user's access scopes
  fastify.get('/:userId/access', usersController.getUserAccess);

  // PATCH /users/:userId - Update user role
  fastify.patch('/:userId', usersController.updateUserRole);

  // PUT /users/:userId/site-owner-access - Set user's site owner access
  fastify.put('/:userId/site-owner-access', usersController.setUserSiteOwnerAccess);

  // PUT /users/:userId/template-access - Set user's template access
  fastify.put('/:userId/template-access', usersController.setUserTemplateAccess);
};
