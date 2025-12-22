import { apiClient } from '../../../lib/apiClient';

export interface VisitDetail {
  id: string;
  technician: string;
  startedAt: string;
  notes?: string;
}

export const fetchVisitById = (visitId: string) => apiClient.get<VisitDetail>(`/visits/${visitId}`);
