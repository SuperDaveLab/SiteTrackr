import type { FastifyInstance } from 'fastify';
import {
  parseCSV,
  extractBaseColumns,
  extractCustomFieldValues,
  coerceFieldValue,
  type ParsedRow,
} from './csv';
import type { ImportResult } from './importSiteOwners';

/**
 * Import sites from CSV/Excel content
 */
export async function importSites(
  fastify: FastifyInstance,
  companyId: string,
  csvContent: Buffer | string,
  filename?: string
): Promise<ImportResult> {
  const rows = parseCSV(csvContent, filename);
  const result: ImportResult = {
    summary: {
      totalRows: rows.length,
      created: 0,
      updated: 0,
      rejected: 0,
    },
    errors: [],
  };

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2; // +2 because row 1 is header, and we're 0-indexed
    const row = rows[i];

    try {
      await processRow(fastify, companyId, row, result, rowNum);
    } catch (error: any) {
      result.summary.rejected++;
      result.errors.push({
        row: rowNum,
        entity: 'Site',
        message: error.message || 'Unknown error',
      });
    }
  }

  return result;
}

async function processRow(
  fastify: FastifyInstance,
  companyId: string,
  row: ParsedRow,
  result: ImportResult,
  _rowNum: number
): Promise<void> {
  // Extract base columns
  const base = extractBaseColumns(row);
  const id = base.id?.trim();
  const name = base.name?.trim();
  const code = base.code?.trim();
  const siteOwnerName = base.siteOwnerName?.trim();
  const latitude = base.latitude ? parseFloat(base.latitude) : null;
  const longitude = base.longitude ? parseFloat(base.longitude) : null;
  const addressLine1 = base.addressLine1?.trim();
  const addressLine2 = base.addressLine2?.trim();
  const city = base.city?.trim();
  const state = base.state?.trim();
  const postalCode = base.postalCode?.trim();
  const county = base.county?.trim();
  const equipmentType = base.equipmentType?.trim();
  const marketName = base.marketName?.trim();
  const towerType = base.towerType?.trim();
  const notes = base.notes?.trim();

  // Validate required fields
  if (!name) {
    throw new Error('Missing required field: name');
  }

  // Resolve site owner by name (if provided)
  let siteOwnerId: string | null = null;
  let siteOwner: any = null;
  
  if (siteOwnerName) {
    siteOwner = await fastify.prisma.siteOwner.findFirst({
      where: {
        companyId,
        name: siteOwnerName,
      },
      include: {
        fieldDefs: true,
      },
    });

    if (!siteOwner) {
      throw new Error(`Site owner not found: ${siteOwnerName}`);
    }
    siteOwnerId = siteOwner.id;
  }

  // Extract custom field values
  const customFieldValues = extractCustomFieldValues(row);

  // Validate and coerce custom field values
  const validatedCustomFields: Record<string, any> = {};
  
  if (siteOwner && Object.keys(customFieldValues).length > 0) {
    for (const [key, value] of Object.entries(customFieldValues)) {
      const fieldDef = siteOwner.fieldDefs.find((f: any) => f.key === key);
      
      if (!fieldDef) {
        throw new Error(`Custom field '${key}' not defined for site owner '${siteOwnerName}'`);
      }

      const coercedValue = coerceFieldValue(value, fieldDef.type);
      
      // Check required fields
      if (fieldDef.required && (coercedValue === null || coercedValue === '')) {
        throw new Error(`Custom field '${key}' is required`);
      }

      if (coercedValue !== null) {
        validatedCustomFields[key] = coercedValue;
      }
    }
  }

  // Check if site exists
  let existingSite = null;
  if (id) {
    existingSite = await fastify.prisma.site.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!existingSite) {
      throw new Error(`Site with id ${id} not found`);
    }
  }

  // Upsert the site
  const siteData: any = {
    companyId,
    name,
    code: code || null,
    siteOwnerId,
    latitude: latitude && !isNaN(latitude) ? latitude : null,
    longitude: longitude && !isNaN(longitude) ? longitude : null,
    addressLine1: addressLine1 || null,
    addressLine2: addressLine2 || null,
    city: city || null,
    state: state || null,
    postalCode: postalCode || null,
    county: county || null,
    equipmentType: equipmentType || null,
    marketName: marketName || null,
    towerType: towerType || null,
    notes: notes || null,
    customFields: Object.keys(validatedCustomFields).length > 0 ? validatedCustomFields : undefined,
  };

  if (id) {
    await fastify.prisma.site.update({
      where: { id },
      data: siteData,
    });
    result.summary.updated++;
  } else {
    await fastify.prisma.site.create({
      data: siteData,
    });
    result.summary.created++;
  }
}
