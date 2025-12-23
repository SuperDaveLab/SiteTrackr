import { apiClient } from '../../../lib/apiClient';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TicketPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface TicketListItem {
  id: string;
  summary: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  updatedAt: string;
  site: {
    id: string;
    name: string;
    code?: string | null;
    city?: string | null;
    state?: string | null;
  };
  asset?: {
    id: string;
    type: string;
    tag?: string | null;
  } | null;
  template?: {
    id: string;
    name: string;
  } | null;
}

export interface PaginatedTicketsResponse {
  data: TicketListItem[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export interface TicketSummary {
  id: string;
  summary: string;
  status: TicketStatus;
  priority: TicketPriority;
}

export interface VisitAttachment {
  id: string;
  type: 'PHOTO' | 'DOCUMENT' | 'OTHER';
  filename: string;
  displayName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  uploadedBy: {
    id: string;
    displayName: string;
  };
  createdAt: string;
}

export interface TicketVisit {
  id: string;
  startedAt: string;
  endedAt?: string | null;
  notes?: string | null;
  createdAt: string;
  technician: {
    id: string;
    displayName: string;
  };
  attachments: VisitAttachment[];
}

export interface TicketAttachment {
  id: string;
  type: 'PHOTO' | 'DOCUMENT' | 'OTHER';
  filename: string;
  displayName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  uploadedBy: {
    id: string;
    displayName: string;
  };
  createdAt: string;
}

export interface TicketActivity {
  id: string;
  action: string;
  fieldKey?: string | null;
  fieldLabel?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  createdAt: string;
  user: {
    id: string;
    displayName: string;
  };
}

export interface TicketDetail {
  id: string;
  summary: string;
  description?: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  updatedAt: string;
  scheduledStartAt?: string | null;
  scheduledEndAt?: string | null;
  site: {
    id: string;
    name: string;
    code?: string | null;
    city?: string | null;
    state?: string | null;
    county?: string | null;
    marketName?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    postalCode?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    equipmentType?: string | null;
    towerType?: string | null;
    customFields?: Record<string, unknown> | null;
    customFieldDefinitions?: Array<{
      id: string;
      siteOwnerId: string | null;
      key: string;
      label: string;
      type: string;
      required: boolean;
      orderIndex: number;
      config?: Record<string, unknown> | null;
    }>;
    owner?: {
      id: string;
      name: string;
      code?: string | null;
    } | null;
  };
  asset?: {
    id: string;
    type: string;
    tag?: string | null;
    status: string;
  } | null;
  template: {
    id: string;
    name: string;
    code: string;
  };
  customFields?: Record<string, unknown> | null;
  visits: TicketVisit[];
  attachments: TicketAttachment[];
  activities: TicketActivity[];
}

export interface CreateTicketInput {
  templateId: string;
  siteId: string;
  assetId?: string | null;
  summary: string;
  description?: string;
  priority?: TicketPriority;
  customFields: Record<string, unknown>;
}

export interface CreateVisitInput {
  startedAt?: string;
  endedAt?: string | null;
  notes?: string;
  location?: Record<string, unknown>;
  readings?: Record<string, unknown>;
}

export interface UpdateTicketInput {
  summary?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  customFields?: Record<string, unknown>;
}

export interface ListTicketsParams {
  page?: number;
  pageSize?: number;
  status?: TicketStatus;
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt';
  sortDir?: 'asc' | 'desc';
}

export const listTickets = (params: ListTicketsParams = {}) =>
  apiClient.get<PaginatedTicketsResponse>('/tickets', { params: params as any });

export const fetchTicketById = (ticketId: string) => 
  apiClient.get<TicketDetail>(`/tickets/${ticketId}`);

export const createTicket = (input: CreateTicketInput) =>
  apiClient.post<TicketDetail>('/tickets', input);

export const updateTicket = (ticketId: string, input: UpdateTicketInput) =>
  apiClient.patch<TicketDetail>(`/tickets/${ticketId}`, input);

export const createVisitForTicket = (ticketId: string, input: CreateVisitInput) =>
  apiClient.post<TicketVisit>(`/tickets/${ticketId}/visits`, input);

export const uploadVisitAttachment = async (visitId: string, file: File): Promise<VisitAttachment> => {
  const formData = new FormData();
  formData.append('file', file);

  const accessToken = localStorage.getItem('accessToken');
  const response = await fetch(`http://localhost:3001/api/v1/visits/${visitId}/attachments`, {
    method: 'POST',
    headers: {
      ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error('Failed to upload attachment');
  }

  return response.json();
};

export const uploadTicketAttachment = async (ticketId: string, file: File): Promise<TicketAttachment> => {
  const formData = new FormData();
  formData.append('file', file);

  const accessToken = localStorage.getItem('accessToken');
  const response = await fetch(`http://localhost:3001/api/v1/tickets/${ticketId}/attachments`, {
    method: 'POST',
    headers: {
      ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error('Failed to upload attachment');
  }

  return response.json();
};
