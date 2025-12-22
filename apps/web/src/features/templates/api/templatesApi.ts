import { apiClient } from '../../../lib/apiClient';

export type TemplateFieldType = 
  | 'TEXT' 
  | 'TEXTAREA' 
  | 'NUMBER' 
  | 'BOOLEAN' 
  | 'SELECT' 
  | 'MULTI_SELECT' 
  | 'DATE' 
  | 'TIME' 
  | 'DATETIME' 
  | 'PHOTO_REF' 
  | 'READING';

export interface TemplateField {
  id: string;
  key: string;
  label: string;
  type: TemplateFieldType;
  required: boolean;
  orderIndex: number;
  config?: Record<string, unknown> | null;
  section?: string | null;
  sectionOrder: number;
}

export interface TicketTemplate {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  isActive: boolean;
  fields: TemplateField[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateFieldInput {
  key: string;
  label: string;
  type: TemplateFieldType;
  required?: boolean;
  orderIndex?: number;
  config?: Record<string, unknown>;
  section?: string;
  sectionOrder?: number;
}

export interface CreateTicketTemplateInput {
  name: string;
  code: string;
  description?: string;
  fields: CreateTemplateFieldInput[];
}

export interface UpdateTicketTemplateInput {
  name?: string;
  description?: string;
  fields?: CreateTemplateFieldInput[];
}

export const fetchTemplates = async () => {
  const response = await apiClient.get<{ data: TicketTemplate[] }>('/ticket-templates');
  return response.data;
};

export const fetchTemplateById = (templateId: string) =>
  apiClient.get<TicketTemplate>(`/ticket-templates/${templateId}`);

export const createTemplate = (input: CreateTicketTemplateInput) =>
  apiClient.post<TicketTemplate>('/ticket-templates', input);

export const updateTemplate = (templateId: string, input: UpdateTicketTemplateInput) =>
  apiClient.patch<TicketTemplate>(`/ticket-templates/${templateId}`, input);
