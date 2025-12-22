import { UserRole, AccessLevel } from '@prisma/client';
import { z } from 'zod';

export const createUserBodySchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1),
  role: z.nativeEnum(UserRole),
  password: z.string().min(8)
});

export const updateUserRoleSchema = z.object({
  role: z.nativeEnum(UserRole)
});

export const userSiteOwnerAccessItemSchema = z.object({
  siteOwnerId: z.string().uuid(),
  accessLevel: z.nativeEnum(AccessLevel)
});

export const userTemplateAccessItemSchema = z.object({
  ticketTemplateId: z.string().uuid(),
  accessLevel: z.nativeEnum(AccessLevel)
});

export const setUserSiteOwnerAccessSchema = z.object({
  access: z.array(userSiteOwnerAccessItemSchema)
});

export const setUserTemplateAccessSchema = z.object({
  access: z.array(userTemplateAccessItemSchema)
});

export const userIdParamsSchema = z.object({
  userId: z.string().uuid()
});

export type CreateUserBody = z.infer<typeof createUserBodySchema>;
export type UpdateUserRole = z.infer<typeof updateUserRoleSchema>;
export type SetUserSiteOwnerAccess = z.infer<typeof setUserSiteOwnerAccessSchema>;
export type SetUserTemplateAccess = z.infer<typeof setUserTemplateAccessSchema>;
export type UserIdParams = z.infer<typeof userIdParamsSchema>;
