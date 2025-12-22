import { apiClient } from '../../../lib/apiClient';

export interface SiteOwner {
  id: string;
  name: string;
  code: string;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SiteFieldDefinition {
  id: string;
  siteOwnerId?: string | null;
  key: string;
  label: string;
  type: string;
  required: boolean;
  orderIndex: number;
  config?: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSiteOwnerInput {
  name: string;
  code: string;
  notes?: string;
}

export interface CreateSiteFieldDefinitionInput {
  siteOwnerId?: string | null;
  key: string;
  label: string;
  type: string;
  required?: boolean;
  orderIndex?: number;
  config?: Record<string, unknown>;
}

export const listSiteOwners = () =>
  apiClient.get<SiteOwner[]>('/site-owners');

export const createSiteOwner = (input: CreateSiteOwnerInput) =>
  apiClient.post<SiteOwner>('/site-owners', input);

export const listSiteFieldDefinitions = (siteOwnerId?: string) =>
  apiClient.get<SiteFieldDefinition[]>('/site-field-definitions', {
    params: siteOwnerId ? { siteOwnerId } : undefined,
  });

export const createSiteFieldDefinition = (input: CreateSiteFieldDefinitionInput) =>
  apiClient.post<SiteFieldDefinition>('/site-field-definitions', input);
