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
import type { ImportResult } from './importSiteOwners';

/**
 * Import ticket templates from CSV/Excel content
 */
export async function importTicketTemplates(
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
        entity: 'TicketTemplate',
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
  const description = base.description?.trim();
  const isActive = base.isActive !== undefined ? parseBoolean(base.isActive) : true;

  // Validate required fields
  if (!name) {
    throw new Error('Missing required field: name');
  }
  if (!code) {
    throw new Error('Missing required field: code');
  }

  // Extract field definitions
  const fieldDefs = extractFieldDefinitions(row);

  // Check if template exists
  let existingTemplate = null;
  if (id) {
    existingTemplate = await fastify.prisma.ticketTemplate.findFirst({
      where: {
        id,
        companyId,
      },
      include: {
        fields: true,
      },
    });

    if (!existingTemplate) {
      throw new Error(`Ticket template with id ${id} not found`);
    }
  } else {
    // Check if code already exists
    existingTemplate = await fastify.prisma.ticketTemplate.findFirst({
      where: {
        companyId,
        code,
      },
      include: {
        fields: true,
      },
    });
  }

  // Upsert the template
  const template = await fastify.prisma.ticketTemplate.upsert({
    where: id
      ? { id }
      : { companyId_code: { companyId, code } },
    create: {
      companyId,
      name,
      code,
      description: description || null,
      isActive,
    },
    update: {
      name,
      code,
      description: description || null,
      isActive,
    },
  });

  // Track creation vs update
  if (existingTemplate) {
    result.summary.updated++;
  } else {
    result.summary.created++;
  }

  // Process field definitions
  await processFieldDefinitions(fastify, template.id, fieldDefs);
}

async function processFieldDefinitions(
  fastify: FastifyInstance,
  templateId: string,
  fieldDefs: Record<string, FieldDefinitionColumns>
): Promise<void> {
  for (const [key, def] of Object.entries(fieldDefs)) {
    const label = def.label?.trim();
    const type = def.type?.trim()?.toUpperCase();
    const required = parseBoolean(def.required);
    const options = parseOptions(def.options);
    const help = def.help?.trim();
    const group = def.group?.trim();
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
    await fastify.prisma.ticketTemplateField.upsert({
      where: {
        templateId_key: {
          templateId,
          key,
        },
      },
      create: {
        templateId,
        key,
        label,
        type: type as any,
        required,
        orderIndex,
        section: group || null,
        sectionOrder: 0,
        config,
      },
      update: {
        label,
        type: type as any,
        required,
        orderIndex,
        section: group || null,
        config,
      },
    });
  }
}
