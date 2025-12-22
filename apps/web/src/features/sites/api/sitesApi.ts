import { apiClient } from '../../../lib/apiClient';

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface SiteSummary {
  id: string;
  name: string;
  code?: string;
  marketName?: string;
  city?: string;
  state?: string;
  createdAt: string;
  updatedAt: string;
  owner?: {
    id: string;
    name: string;
  } | null;
}

export interface SiteAssetSummary {
  id: string;
  name: string;
  code?: string;
}

export interface SiteTicketSummary {
  id: string;
  title: string;
  status: string;
}

export interface SiteDetail {
  id: string;
  name: string;
  code?: string | null;
  marketName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  county?: string | null;
  postalCode?: string | null;
  equipmentType?: string | null;
  towerType?: string | null;
  notes?: string | null;
  customFields?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  owner?: {
    id: string;
    name: string;
    code?: string | null;
  } | null;
  customFieldDefinitions?: Array<{
    id: string;
    siteOwnerId?: string | null;
    key: string;
    label: string;
    type: string;
    required: boolean;
    orderIndex: number;
    config?: Record<string, unknown> | null;
  }>;
  assets: Array<{
    id: string;
    type: string;
    tag?: string | null;
    status: string;
  }>;
  tickets: Array<{
    id: string;
    summary: string;
    status: string;
  }>;
}

export interface FetchSitesParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'name' | 'code';
  sortDir?: 'asc' | 'desc';
}

export const fetchSites = (params: FetchSitesParams = {}) =>
  apiClient.get<PaginatedResponse<SiteSummary>>('/sites', { params: params as any });

export const fetchSiteById = (siteId: string) =>
  apiClient.get<SiteDetail>(`/sites/${siteId}`);

export interface UpdateSiteInput {
  siteOwnerId?: string | null;
  customFields?: Record<string, unknown>;
}

export const updateSite = (siteId: string, input: UpdateSiteInput) =>
  apiClient.patch<SiteDetail>(`/sites/${siteId}`, input);
