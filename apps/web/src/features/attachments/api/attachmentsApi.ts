import { apiClient, API_BASE_URL } from '../../../lib/apiClient';
import { ACCESS_TOKEN_KEY } from '../../../lib/storageKeys';
import type { AttachmentStatus } from '../../tickets/api/ticketsApi';

export interface AttachmentMetadataRequest {
  id?: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

export interface AttachmentRecord {
  id: string;
  ticketId: string;
  visitId: string | null;
  type: 'PHOTO' | 'DOCUMENT' | 'OTHER';
  filename: string;
  displayName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  status: AttachmentStatus;
  uploadedBy: {
    id: string;
    displayName: string;
  };
  createdAt: string;
}

export const createTicketAttachmentMetadata = (ticketId: string, body: AttachmentMetadataRequest) =>
  apiClient.post<AttachmentRecord>(`/tickets/${ticketId}/attachments/metadata`, body);

export const createVisitAttachmentMetadata = (visitId: string, body: AttachmentMetadataRequest) =>
  apiClient.post<AttachmentRecord>(`/visits/${visitId}/attachments/metadata`, body);

export const uploadAttachmentContent = async (
  attachmentId: string,
  blob: Blob,
  mimeType: string
): Promise<AttachmentRecord> => {
  const formData = new FormData();
  formData.append('file', blob, `attachment-${attachmentId}`);

  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  const response = await fetch(`${API_BASE_URL}/attachments/${attachmentId}/content`, {
    method: 'PUT',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: formData
  });

  if (!response.ok) {
    const message = await response.text().catch(() => 'Failed to upload attachment');
    throw new Error(message || 'Failed to upload attachment');
  }

  return response.json();
};
