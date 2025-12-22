import { apiClient } from '../../../lib/apiClient';

export type UserRole = 'ADMIN' | 'DISPATCHER' | 'TECH';
export type AccessLevel = 'VIEW' | 'ADMIN';

export interface UserSummary {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
}

export interface UserSiteOwnerAccessItem {
  siteOwnerId: string;
  accessLevel: AccessLevel;
}

export interface UserTicketTemplateAccessItem {
  ticketTemplateId: string;
  accessLevel: AccessLevel;
}

export interface UserAccess {
  siteOwnerAccess: UserSiteOwnerAccessItem[];
  templateAccess: UserTicketTemplateAccessItem[];
}

export interface UpdateUserRoleRequest {
  role: UserRole;
}

export interface SetUserSiteOwnerAccessRequest {
  access: UserSiteOwnerAccessItem[];
}

export interface SetUserTemplateAccessRequest {
  access: UserTicketTemplateAccessItem[];
}

export interface CreateUserInput {
  email: string;
  displayName: string;
  role: UserRole;
  password: string;
}

export const usersApi = {
  createUser: (input: CreateUserInput): Promise<UserSummary> => {
    return apiClient.post<UserSummary>('/users', input);
  },

  listUsers: async (): Promise<UserSummary[]> => {
    return apiClient.get<UserSummary[]>('/users');
  },

  getUserAccess: async (userId: string): Promise<UserAccess> => {
    return apiClient.get<UserAccess>(`/users/${userId}/access`);
  },

  updateUserRole: async (userId: string, data: UpdateUserRoleRequest): Promise<UserSummary> => {
    return apiClient.patch<UserSummary>(`/users/${userId}`, data);
  },

  setUserSiteOwnerAccess: async (userId: string, data: SetUserSiteOwnerAccessRequest): Promise<void> => {
    await apiClient.put(`/users/${userId}/site-owner-access`, data);
  },

  setUserTemplateAccess: async (userId: string, data: SetUserTemplateAccessRequest): Promise<void> => {
    await apiClient.put(`/users/${userId}/template-access`, data);
  }
};
