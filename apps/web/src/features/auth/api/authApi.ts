import { apiClient } from '../../../lib/apiClient';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: 'ADMIN' | 'DISPATCHER' | 'TECH';
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export const loginRequest = (payload: LoginPayload) =>
  apiClient.post<LoginResponse>('/auth/login', payload);
