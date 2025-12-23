import type { FastifyInstance } from 'fastify';
import {
  parseCSV,
  extractBaseColumns,
  extractCustomFieldValues,
  coerceFieldValue,
  type ParsedRow,
} from './csv';
import type { ImportResult } from './importSiteOwners';
import { generateNextTicketNumber } from '../tickets/ticketNumber.service';

/**
 * Import tickets from CSV/Excel content
 */
export async function importTickets(
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
        entity: 'Ticket',
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
  const ticketNumber = base.ticketNumber?.trim();
  const externalId = base.externalId?.trim();
  const siteCode = base.siteCode?.trim();
  const templateCode = base.templateCode?.trim();
  const summary = base.summary?.trim();
  const description = base.description?.trim();
  const status = base.status?.trim()?.toUpperCase() || 'OPEN';
  const priority = base.priority?.trim()?.toUpperCase() || 'NORMAL';
  const assignedToEmail = base.assignedToEmail?.trim();
  const scheduledStartAt = base.scheduledStartAt?.trim();
  const scheduledEndAt = base.scheduledEndAt?.trim();

  // Validate required fields
  if (!siteCode) {
    throw new Error('Missing required field: siteCode');
  }
  if (!templateCode) {
    throw new Error('Missing required field: templateCode');
  }
  if (!summary) {
    throw new Error('Missing required field: summary');
  }

  // Resolve site by code
  const site = await fastify.prisma.site.findFirst({
    where: {
      companyId,
      code: siteCode,
    },
  });

  if (!site) {
    throw new Error(`Site not found with code: ${siteCode}`);
  }

  // Resolve template by code
  const template = await fastify.prisma.ticketTemplate.findFirst({
    where: {
      companyId,
      code: templateCode,
    },
    include: {
      fields: true,
    },
  });

  if (!template) {
    throw new Error(`Ticket template not found with code: ${templateCode}`);
  }

  // Resolve assigned user by email (if provided)
  let assignedToUserId: string | null = null;
  if (assignedToEmail) {
    const assignedUser = await fastify.prisma.user.findUnique({
      where: { email: assignedToEmail },
    });
    
    if (!assignedUser) {
      throw new Error(`User not found with email: ${assignedToEmail}`);
    }
    
    if (assignedUser.companyId !== companyId) {
      throw new Error(`User ${assignedToEmail} does not belong to this company`);
    }
    
    assignedToUserId = assignedUser.id;
  }

  // Extract custom field values
  const customFieldValues = extractCustomFieldValues(row);

  // Validate and coerce custom field values
  const validatedCustomFields: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(customFieldValues)) {
    const fieldDef = template.fields.find((f: any) => f.key === key);
    
    if (!fieldDef) {
      throw new Error(`Custom field '${key}' not defined for template '${templateCode}'`);
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

  // Validate status
  const validStatuses = ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
  }

  // Validate priority
  const validPriorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
  if (!validPriorities.includes(priority)) {
    throw new Error(`Invalid priority: ${priority}. Must be one of: ${validPriorities.join(', ')}`);
  }

  // Parse dates
  const scheduledStart = scheduledStartAt ? new Date(scheduledStartAt) : null;
  const scheduledEnd = scheduledEndAt ? new Date(scheduledEndAt) : null;

  if (scheduledStart && isNaN(scheduledStart.getTime())) {
    throw new Error(`Invalid scheduledStartAt date: ${scheduledStartAt}`);
  }
  if (scheduledEnd && isNaN(scheduledEnd.getTime())) {
    throw new Error(`Invalid scheduledEndAt date: ${scheduledEndAt}`);
  }

  // Determine upsert strategy:
  // 1. If id is provided, update by id
  // 2. If externalId is provided, update by externalId
  // 3. If ticketNumber is provided, update by ticketNumber
  // 4. Otherwise, create new with generated ticketNumber

  let existingTicket = null;
  let whereClause: any = null;

  if (id) {
    existingTicket = await fastify.prisma.ticket.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!existingTicket) {
      throw new Error(`Ticket with id ${id} not found`);
    }
    whereClause = { id };
  } else if (externalId) {
    existingTicket = await fastify.prisma.ticket.findFirst({
      where: {
        companyId,
        externalId,
      } as any,
    });
    whereClause = { companyId_externalId: { companyId, externalId } };
  } else if (ticketNumber) {
    existingTicket = await fastify.prisma.ticket.findFirst({
      where: {
        ticketNumber,
      } as any,
    });
    whereClause = { ticketNumber };
  }

  // Get the user who is performing the import (for createdBy)
  // In a real scenario, this should come from the request context
  // For now, we'll use the first admin user
  const adminUser = await fastify.prisma.user.findFirst({
    where: {
      companyId,
      role: 'ADMIN',
    },
  });

  if (!adminUser) {
    throw new Error('No admin user found to set as creator');
  }

  const ticketData: any = {
    companyId,
    templateId: template.id,
    siteId: site.id,
    summary,
    description: description || null,
    status: status as any,
    priority: priority as any,
    assignedToUserId,
    scheduledStartAt: scheduledStart,
    scheduledEndAt: scheduledEnd,
    customFields: Object.keys(validatedCustomFields).length > 0 ? validatedCustomFields : undefined,
    externalId: externalId || null,
  };

  if (existingTicket) {
    // Update existing ticket
    await fastify.prisma.ticket.update({
      where: whereClause,
      data: ticketData,
    });
    result.summary.updated++;
  } else {
    // Create new ticket with generated ticketNumber
    const newTicketNumber = ticketNumber || await generateNextTicketNumber(fastify);
    
    await fastify.prisma.ticket.create({
      data: {
        ...ticketData,
        ticketNumber: newTicketNumber,
        createdByUserId: adminUser.id,
      },
    });
    result.summary.created++;
  }
}
