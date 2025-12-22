import { ACCESS_TOKEN_KEY } from './storageKeys';

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api/v1';

export interface ImportResult {
  summary: {
    totalRows: number;
    created: number;
    updated: number;
    rejected: number;
  };
  errors: Array<{
    row: number;
    entity: string;
    message: string;
  }>;
}

/**
 * Download a CSV export for the specified entity type
 */
export async function downloadExport(entityType: 'site-owners' | 'sites' | 'ticket-templates' | 'tickets'): Promise<void> {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  
  const response = await fetch(`${baseUrl}/admin/export/${entityType}?format=csv`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody?.message ?? 'Export failed');
  }

  // Get the filename from the Content-Disposition header
  const contentDisposition = response.headers.get('Content-Disposition');
  const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
  const filename = filenameMatch ? filenameMatch[1] : `${entityType}.csv`;

  // Download the file
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Upload a CSV file for import
 */
export async function uploadImport(
  entityType: 'site-owners' | 'sites' | 'ticket-templates' | 'tickets',
  file: File
): Promise<ImportResult> {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${baseUrl}/admin/import/${entityType}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody?.message ?? 'Import failed');
  }

  return response.json();
}

export const adminImportExportApi = {
  downloadExport,
  uploadImport,
};
