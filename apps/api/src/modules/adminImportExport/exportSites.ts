import type { FastifyInstance } from 'fastify';
import {
  generateCSV,
} from './csv';

/**
 * Export sites to CSV or Excel format
 */
export async function exportSites(
  fastify: FastifyInstance,
  companyId: string,
  format: 'csv' | 'xlsx' = 'csv'
): Promise<string | Buffer> {
  // Fetch all sites with their owner information
  const sites = await fastify.prisma.site.findMany({
    where: {
      companyId,
    },
    include: {
      owner: {
        include: {
          fieldDefs: true,
        },
      },
    },
    orderBy: [
      { code: 'asc' },
      { name: 'asc' },
    ],
  });

  // Collect all unique custom field keys across all owners
  const allFieldKeys = new Set<string>();
  const ownerFieldsByOwnerId = new Map<string, any[]>();

  for (const site of sites) {
    if (site.owner) {
      if (!ownerFieldsByOwnerId.has(site.owner.id)) {
        ownerFieldsByOwnerId.set(site.owner.id, site.owner.fieldDefs);
      }
      for (const field of site.owner.fieldDefs) {
        allFieldKeys.add(field.key);
      }
    }
  }

  // Convert to CSV rows
  const rows = sites.map((site) => {
    // Base columns
    const row: Record<string, any> = {
      id: site.id,
      name: site.name,
      code: site.code || '',
      siteOwnerName: site.owner?.name || '',
      latitude: site.latitude ?? '',
      longitude: site.longitude ?? '',
      addressLine1: site.addressLine1 || '',
      addressLine2: site.addressLine2 || '',
      city: site.city || '',
      state: site.state || '',
      postalCode: site.postalCode || '',
      county: site.county || '',
      equipmentType: site.equipmentType || '',
      marketName: site.marketName || '',
      towerType: site.towerType || '',
      notes: site.notes || '',
    };

    // Custom field columns (only include fields defined for this site's owner)
    const customFields = (site.customFields as Record<string, any>) || {};
    
    // Add all possible custom field columns (leave blank if not applicable)
    for (const fieldKey of allFieldKeys) {
      const columnName = `cf:${fieldKey}`;
      
      // Check if this field is defined for this site's owner
      if (site.owner) {
        const fieldDef = site.owner.fieldDefs.find((f: any) => f.key === fieldKey);
        if (fieldDef && customFields[fieldKey] !== undefined && customFields[fieldKey] !== null) {
          const value = customFields[fieldKey];
          row[columnName] = Array.isArray(value) ? value.join('|') : String(value);
        } else {
          row[columnName] = '';
        }
      } else {
        row[columnName] = '';
      }
    }

    return row;
  });

  return generateCSV(rows, format);
}
