import { FastifyInstance } from 'fastify';
import { AccessLevel, UserRole } from '@prisma/client';

export function isGlobalAdmin(user: { role: UserRole }) {
  return user.role === UserRole.ADMIN;
}

export async function canAdminTemplate(
  fastify: FastifyInstance,
  user: { id: string; role: UserRole },
  templateId: string
): Promise<boolean> {
  if (isGlobalAdmin(user)) return true;

  const access = await fastify.prisma.userTicketTemplateAccess.findFirst({
    where: {
      userId: user.id,
      ticketTemplateId: templateId,
      accessLevel: AccessLevel.ADMIN
    }
  });

  return !!access;
}

export async function canAdminSiteOwner(
  fastify: FastifyInstance,
  user: { id: string; role: UserRole },
  siteOwnerId: string
): Promise<boolean> {
  if (isGlobalAdmin(user)) return true;

  const access = await fastify.prisma.userSiteOwnerAccess.findFirst({
    where: {
      userId: user.id,
      siteOwnerId,
      accessLevel: AccessLevel.ADMIN
    }
  });

  return !!access;
}
