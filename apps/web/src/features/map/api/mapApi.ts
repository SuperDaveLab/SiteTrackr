import { apiClient } from '../../../lib/apiClient';

export interface MapMarker {
  siteId: string;
  siteCode: string | null;
  siteName: string;
  lat: number;
  lng: number;
  siteOwnerId: string | null;
  siteOwnerName: string | null;
  openTicketCount: number;
  templates: string[];
}

export interface FetchMapMarkersParams {
  bbox?: [number, number, number, number];
  templateCodes?: string[];
  siteOwnerIds?: string[];
  status?: string[];
  limit?: number;
}

const toCsv = (values?: string[]): string | undefined =>
  values && values.length > 0 ? values.join(',') : undefined;

export const fetchMapMarkers = async (params: FetchMapMarkersParams) => {
  const queryParams: Record<string, string> = {};

  if (params.bbox) {
    queryParams.bbox = params.bbox.join(',');
  }

  const templateCsv = toCsv(params.templateCodes);
  if (templateCsv) {
    queryParams.templateCodes = templateCsv;
  }

  const ownerCsv = toCsv(params.siteOwnerIds);
  if (ownerCsv) {
    queryParams.siteOwnerIds = ownerCsv;
  }

  const statusCsv = toCsv(params.status ?? ['OPEN', 'IN_PROGRESS']);
  if (statusCsv) {
    queryParams.status = statusCsv;
  }

  if (params.limit) {
    queryParams.limit = String(params.limit);
  }

  const response = await apiClient.get<{ data: MapMarker[] }>('/map/markers', {
    params: queryParams
  });

  return response.data;
};
