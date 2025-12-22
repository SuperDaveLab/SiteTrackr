import type { FastifyInstance } from 'fastify';
import {
  parseCSV,
  extractBaseColumns,
  extractFieldDefinitions,
  parseBoolean,
  parseOptions,
  type ParsedRow,
  type FieldDefinitionColumns,
} from './csv';

export interface ImportError {
  row: number;
  entity: string;
  message: string;
}

export interface ImportResult {
  summary: {
    totalRows: number;
    created: number;
    updated: number;
    rejected: number;
  };
  errors: ImportError[];
}

/**
 * Import site owners from CSV content
 */
export async function importSiteOwners(
  fastify: FastifyInstance,
  companyId: string,
  csvContent: Buffer | string
): Promise<ImportResult> {
  const rows = parseCSV(csvContent);
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
        entity: 'SiteOwner',
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
  const notes = base.notes?.trim();

  // Validate required fields
  if (!name) {
    throw new Error('Missing required field: name');
  }
  if (!code) {
    throw new Error('Missing required field: code');
  }

  // Extract field definitions
  const fieldDefs = extractFieldDefinitions(row);

  // Check if site owner exists
  let existingOwner = null;
  if (id) {
    existingOwner = await fastify.prisma.siteOwner.findFirst({
      where: {
        id,
        companyId,
      },
      include: {
        fieldDefs: true,
      },
    });

    if (!existingOwner) {
      throw new Error(`Site owner with id ${id} not found`);
    }
  } else {
    // Check if code already exists
    existingOwner = await fastify.prisma.siteOwner.findFirst({
      where: {
        companyId,
        code,
      },
      include: {
        fieldDefs: true,
      },
    });
  }

  // Upsert the site owner
  const siteOwner = await fastify.prisma.siteOwner.upsert({
    where: id
      ? { id }
      : { companyId_code: { companyId, code } },
    create: {
      companyId,
      name,
      code,
      notes: notes || null,
    },
    update: {
      name,
      code,
      notes: notes || null,
    },
  });

  // Track creation vs update
  if (existingOwner) {
    result.summary.updated++;
  } else {
    result.summary.created++;
  }

  // Process field definitions
  await processFieldDefinitions(fastify, companyId, siteOwner.id, fieldDefs);
}

async function processFieldDefinitions(
  fastify: FastifyInstance,
  companyId: string,
  siteOwnerId: string,
  fieldDefs: Record<string, FieldDefinitionColumns>
): Promise<void> {
  for (const [key, def] of Object.entries(fieldDefs)) {
    const label = def.label?.trim();
    const type = def.type?.trim()?.toUpperCase();
    const required = parseBoolean(def.required);
    const options = parseOptions(def.options);
    const help = def.help?.trim();
    const orderStr = def.order?.trim();
    const orderIndex = orderStr ? parseInt(orderStr, 10) : 0;

    // Validate required field definition fields
    if (!label) {
      throw new Error(`Field ${key}: missing label`);
    }
    if (!type) {
      throw new Error(`Field ${key}: missing type`);
    }

    // Validate type
    const validTypes = [
      'TEXT',
      'TEXTAREA',
      'NUMBER',
      'BOOLEAN',
      'SELECT',
      'MULTI_SELECT',
      'DATE',
      'TIME',
      'DATETIME',
      'PHOTO_REF',
      'READING',
    ];
    if (!validTypes.includes(type)) {
      throw new Error(`Field ${key}: invalid type ${type}`);
    }

    // Build config
    const config: any = {};
    if (options.length > 0) {
      config.options = options;
    }
    if (help) {
      config.help = help;
    }

    // Upsert field definition
    await fastify.prisma.siteFieldDefinition.upsert({
      where: {
        companyId_siteOwnerId_key: {
          companyId,
          siteOwnerId,
          key,
        },
      },
      create: {
        companyId,
        siteOwnerId,
        key,
        label,
        type: type as any,
        required,
        orderIndex,
        config,
      },
      update: {
        label,
        type: type as any,
        required,
        orderIndex,
        config,
      },
    });
  }
}
