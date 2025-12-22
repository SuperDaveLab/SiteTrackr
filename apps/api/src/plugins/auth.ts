import fp from 'fastify-plugin';
import { FastifyRequest, FastifyReply } from 'fastify';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { env } from '../env';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email?: string;
      role: UserRole;
      companyId: string;
    };
  }
}

const DEMO_COMPANY_ID = '11111111-1111-1111-1111-111111111111';
const DEMO_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'demo@site-trackr.local',
  role: UserRole.ADMIN,
  companyId: DEMO_COMPANY_ID
};

const parseUserFromToken = (token: string): FastifyRequest['user'] | undefined => {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload | string;
    if (typeof payload === 'string') {
      return { id: payload, role: UserRole.TECH, companyId: DEMO_COMPANY_ID };
    }

    const id = payload.sub ?? (typeof payload.id === 'string' ? payload.id : undefined);
    if (!id) {
      return undefined;
    }

    const role = typeof payload.role === 'string' && payload.role in UserRole 
      ? (payload.role as UserRole)
      : UserRole.TECH;

    return {
      id,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      role,
      companyId: typeof payload.companyId === 'string' ? payload.companyId : DEMO_COMPANY_ID
    };
  } catch (error) {
    return undefined;
  }
};

const authPlugin = fp(async (fastify) => {
  fastify.addHook('preHandler', async (request) => {
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice('Bearer '.length).trim();
      const user = parseUserFromToken(token);
      if (user) {
        request.user = user;
        return;
      }
    }

    request.user = DEMO_USER;
  });
});

export default authPlugin;

/**
 * Helper function to require specific user roles for a route
 * Usage: preHandler: requireRole([UserRole.ADMIN])
 */
export function requireRole(requiredRoles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({ message: 'Unauthorized' });
    }
    if (!requiredRoles.includes(user.role)) {
      return reply.status(403).send({ message: 'Forbidden' });
    }
  };
}
