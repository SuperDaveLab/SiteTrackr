import type { FastifyInstance } from 'fastify';
import {
  generateCSV,
} from './csv';

/**
 * Export tickets to CSV format
 */
export async function exportTickets(
  fastify: FastifyInstance,
  companyId: string
): Promise<string> {
  // Fetch all tickets with related data
  const tickets = await fastify.prisma.ticket.findMany({
    where: {
      companyId,
    },
    include: {
      site: true,
      template: {
        include: {
          fields: true,
        },
      },
      assignedTo: true,
      createdBy: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Collect all unique custom field keys across all templates
  const allFieldKeys = new Set<string>();
  const templateFieldsByTemplateId = new Map<string, any[]>();

  for (const ticket of tickets) {
    if (!templateFieldsByTemplateId.has(ticket.template.id)) {
      templateFieldsByTemplateId.set(ticket.template.id, ticket.template.fields);
    }
    for (const field of ticket.template.fields) {
      allFieldKeys.add(field.key);
    }
  }

  // Convert to CSV rows
  const rows = tickets.map((ticket) => {
    // Base columns
    const row: Record<string, any> = {
      id: ticket.id,
      ticketNumber: (ticket as any).ticketNumber || '',
      externalId: (ticket as any).externalId || '',
      siteCode: ticket.site.code || '',
      templateCode: ticket.template.code,
      summary: ticket.summary,
      description: ticket.description || '',
      status: ticket.status,
      priority: ticket.priority,
      assignedToEmail: ticket.assignedTo?.email || '',
      scheduledStartAt: ticket.scheduledStartAt ? ticket.scheduledStartAt.toISOString() : '',
      scheduledEndAt: ticket.scheduledEndAt ? ticket.scheduledEndAt.toISOString() : '',
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
    };

    // Custom field columns (only include fields defined for this ticket's template)
    const customFields = (ticket.customFields as Record<string, any>) || {};
    
    // Add all possible custom field columns (leave blank if not applicable)
    for (const fieldKey of allFieldKeys) {
      const columnName = `cf:${fieldKey}`;
      
      const fieldDef = ticket.template.fields.find((f: any) => f.key === fieldKey);
      if (fieldDef && customFields[fieldKey] !== undefined && customFields[fieldKey] !== null) {
        const value = customFields[fieldKey];
        row[columnName] = Array.isArray(value) ? value.join('|') : String(value);
      } else {
        row[columnName] = '';
      }
    }

    return row;
  });

  return generateCSV(rows);
}
