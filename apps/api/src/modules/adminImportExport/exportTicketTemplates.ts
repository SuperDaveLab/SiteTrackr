import type { FastifyInstance } from 'fastify';
import {
  generateCSV,
  createFieldDefinitionColumns,
} from './csv';

/**
 * Export ticket templates to CSV format
 */
export async function exportTicketTemplates(
  fastify: FastifyInstance,
  companyId: string
): Promise<string> {
  // Fetch all ticket templates with their field definitions
  const templates = await fastify.prisma.ticketTemplate.findMany({
    where: {
      companyId,
    },
    include: {
      fields: {
        orderBy: {
          orderIndex: 'asc',
        },
      },
    },
    orderBy: {
      code: 'asc',
    },
  });

  // Convert to CSV rows
  const rows = templates.map((template) => {
    // Base columns
    const row: Record<string, any> = {
      id: template.id,
      name: template.name,
      code: template.code,
      description: template.description || '',
      isActive: template.isActive ? 'true' : 'false',
    };

    // Field definition columns
    if (template.fields.length > 0) {
      const fieldDefColumns = createFieldDefinitionColumns(
        template.fields.map((field) => ({
          key: field.key,
          label: field.label,
          type: field.type,
          required: field.required,
          config: field.config,
          orderIndex: field.orderIndex,
          section: field.section || undefined,
          sectionOrder: field.sectionOrder,
        }))
      );
      Object.assign(row, fieldDefColumns);
    }

    return row;
  });

  return generateCSV(rows);
}
