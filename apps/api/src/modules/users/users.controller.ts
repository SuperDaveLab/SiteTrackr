import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import bcrypt from 'bcryptjs';
import {
  CreateUserBody,
  createUserBodySchema,
  UpdateUserRole,
  updateUserRoleSchema,
  SetUserSiteOwnerAccess,
  setUserSiteOwnerAccessSchema,
  SetUserTemplateAccess,
  setUserTemplateAccessSchema,
  UserIdParams,
  userIdParamsSchema
} from './users.schemas';

type CreateUserRequest = FastifyRequest<{ Body: CreateUserBody }>;
type UserIdRequest = FastifyRequest<{ Params: UserIdParams }>;
type UpdateUserRoleRequest = FastifyRequest<{ Params: UserIdParams; Body: UpdateUserRole }>;
type SetUserSiteOwnerAccessRequest = FastifyRequest<{ Params: UserIdParams; Body: SetUserSiteOwnerAccess }>;
type SetUserTemplateAccessRequest = FastifyRequest<{ Params: UserIdParams; Body: SetUserTemplateAccess }>;

export class UsersController {
  constructor(private readonly fastify: FastifyInstance) {}

  createUser = async (request: CreateUserRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user;
    if (!user) {
      await reply.status(401).send({ message: 'Unauthorized' });
      return;
    }

    const body = createUserBodySchema.parse(request.body);

    // Check if user with this email already exists in the company
    const existing = await this.fastify.prisma.user.findFirst({
      where: {
        companyId: user.companyId,
        email: body.email
      }
    });

    if (existing) {
      await reply.status(409).send({ message: 'User with this email already exists' });
      return;
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(body.password, 10);

    // Create the user
    const created = await this.fastify.prisma.user.create({
      data: {
        companyId: user.companyId,
        email: body.email,
        displayName: body.displayName,
        role: body.role,
        passwordHash,
        isActive: true
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    await reply.status(201).send(created);
  };

  listUsers = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user;
    if (!user) {
      await reply.status(401).send({ message: 'Unauthorized' });
      return;
    }

    const users = await this.fastify.prisma.user.findMany({
      where: {
        companyId: user.companyId
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        isActive: true
      },
      orderBy: { email: 'asc' }
    });

    await reply.send(users);
  };

  getUserAccess = async (request: UserIdRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user;
    if (!user) {
      await reply.status(401).send({ message: 'Unauthorized' });
      return;
    }

    const params = userIdParamsSchema.parse(request.params);

    // Verify target user is in same company
    const targetUser = await this.fastify.prisma.user.findFirst({
      where: {
        id: params.userId,
        companyId: user.companyId
      }
    });

    if (!targetUser) {
      await reply.status(404).send({ message: 'User not found' });
      return;
    }

    const [siteOwnerAccess, templateAccess] = await this.fastify.prisma.$transaction([
      this.fastify.prisma.userSiteOwnerAccess.findMany({
        where: { userId: params.userId }
      }),
      this.fastify.prisma.userTicketTemplateAccess.findMany({
        where: { userId: params.userId }
      })
    ]);

    await reply.send({
      siteOwnerAccess: siteOwnerAccess.map(a => ({
        siteOwnerId: a.siteOwnerId,
        accessLevel: a.accessLevel
      })),
      templateAccess: templateAccess.map(a => ({
        ticketTemplateId: a.ticketTemplateId,
        accessLevel: a.accessLevel
      }))
    });
  };

  updateUserRole = async (request: UpdateUserRoleRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user;
    if (!user) {
      await reply.status(401).send({ message: 'Unauthorized' });
      return;
    }

    const params = userIdParamsSchema.parse(request.params);
    const body = updateUserRoleSchema.parse(request.body);

    // Verify target user is in same company
    const targetUser = await this.fastify.prisma.user.findFirst({
      where: {
        id: params.userId,
        companyId: user.companyId
      }
    });

    if (!targetUser) {
      await reply.status(404).send({ message: 'User not found' });
      return;
    }

    const updatedUser = await this.fastify.prisma.user.update({
      where: { id: params.userId },
      data: { role: body.role },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true
      }
    });

    await reply.send(updatedUser);
  };

  setUserSiteOwnerAccess = async (request: SetUserSiteOwnerAccessRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user;
    if (!user) {
      await reply.status(401).send({ message: 'Unauthorized' });
      return;
    }

    const params = userIdParamsSchema.parse(request.params);
    const body = setUserSiteOwnerAccessSchema.parse(request.body);

    // Verify target user is in same company
    const targetUser = await this.fastify.prisma.user.findFirst({
      where: {
        id: params.userId,
        companyId: user.companyId
      }
    });

    if (!targetUser) {
      await reply.status(404).send({ message: 'User not found' });
      return;
    }

    // Delete existing access and create new ones
    await this.fastify.prisma.$transaction([
      this.fastify.prisma.userSiteOwnerAccess.deleteMany({
        where: { userId: params.userId }
      }),
      ...body.access.map(item =>
        this.fastify.prisma.userSiteOwnerAccess.create({
          data: {
            userId: params.userId,
            siteOwnerId: item.siteOwnerId,
            accessLevel: item.accessLevel
          }
        })
      )
    ]);

    await reply.send({ message: 'Site owner access updated' });
  };

  setUserTemplateAccess = async (request: SetUserTemplateAccessRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user;
    if (!user) {
      await reply.status(401).send({ message: 'Unauthorized' });
      return;
    }

    const params = userIdParamsSchema.parse(request.params);
    const body = setUserTemplateAccessSchema.parse(request.body);

    // Verify target user is in same company
    const targetUser = await this.fastify.prisma.user.findFirst({
      where: {
        id: params.userId,
        companyId: user.companyId
      }
    });

    if (!targetUser) {
      await reply.status(404).send({ message: 'User not found' });
      return;
    }

    // Delete existing access and create new ones
    await this.fastify.prisma.$transaction([
      this.fastify.prisma.userTicketTemplateAccess.deleteMany({
        where: { userId: params.userId }
      }),
      ...body.access.map(item =>
        this.fastify.prisma.userTicketTemplateAccess.create({
          data: {
            userId: params.userId,
            ticketTemplateId: item.ticketTemplateId,
            accessLevel: item.accessLevel
          }
        })
      )
    ]);

    await reply.send({ message: 'Template access updated' });
  };
}
