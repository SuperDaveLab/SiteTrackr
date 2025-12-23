import type { FastifyInstance } from 'fastify';
import {
  generateCSV,
  createFieldDefinitionColumns,
} from './csv';

/**
 * Export site owners to CSV or Excel format
 */
export async function exportSiteOwners(
  fastify: FastifyInstance,
  companyId: string,
  format: 'csv' | 'xlsx' = 'csv'
): Promise<string | Buffer> {
  // Fetch all site owners with their field definitions
  const siteOwners = await fastify.prisma.siteOwner.findMany({
    where: {
      companyId,
    },
    include: {
      fieldDefs: {
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
  const rows = siteOwners.map((owner) => {
    // Base columns
    const row: Record<string, any> = {
      id: owner.id,
      name: owner.name,
      code: owner.code,
      notes: owner.notes || '',
    };

    // Field definition columns
    if (owner.fieldDefs.length > 0) {
      const fieldDefColumns = createFieldDefinitionColumns(
        owner.fieldDefs.map((field) => ({
          key: field.key,
          label: field.label,
          type: field.type,
          required: field.required,
          config: field.config,
          orderIndex: field.orderIndex,
        }))
      );
      Object.assign(row, fieldDefColumns);
    }

    return row;
  });

  return generateCSV(rows, format);
}
