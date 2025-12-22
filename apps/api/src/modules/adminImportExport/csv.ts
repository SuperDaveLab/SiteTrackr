import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

export interface ParsedRow {
  [key: string]: string | undefined;
}

export interface FieldDefinitionColumns {
  key: string;
  label?: string;
  type?: string;
  required?: string;
  options?: string;
  help?: string;
  group?: string;
  order?: string;
}

export interface CustomFieldColumns {
  [key: string]: string | undefined;
}

/**
 * Parse CSV content from a buffer or string
 */
export function parseCSV(content: Buffer | string): ParsedRow[] {
  const text = typeof content === 'string' ? content : content.toString('utf-8');
  
  const records = parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relaxColumnCount: true,
  });

  return records;
}

/**
 * Generate CSV content from rows
 */
export function generateCSV(rows: Record<string, any>[]): string {
  if (rows.length === 0) {
    return '';
  }

  return stringify(rows, {
    header: true,
    quoted: true,
  });
}

/**
 * Extract field definition columns from a parsed row
 * Matches columns like: field:myKey:label, field:myKey:type, etc.
 */
export function extractFieldDefinitions(row: ParsedRow): Record<string, FieldDefinitionColumns> {
  const fieldDefs: Record<string, FieldDefinitionColumns> = {};
  const fieldPattern = /^field:([^:]+):(.+)$/;

  for (const [columnName, value] of Object.entries(row)) {
    const match = columnName.match(fieldPattern);
    if (match) {
      const [, key, property] = match;
      
      if (!fieldDefs[key]) {
        fieldDefs[key] = { key };
      }

      // Assign the property value
      switch (property) {
        case 'label':
          fieldDefs[key].label = value;
          break;
        case 'type':
          fieldDefs[key].type = value;
          break;
        case 'required':
          fieldDefs[key].required = value;
          break;
        case 'options':
          fieldDefs[key].options = value;
          break;
        case 'help':
          fieldDefs[key].help = value;
          break;
        case 'group':
          fieldDefs[key].group = value;
          break;
        case 'order':
          fieldDefs[key].order = value;
          break;
      }
    }
  }

  return fieldDefs;
}

/**
 * Extract custom field values from a parsed row
 * Matches columns like: cf:fieldKey
 */
export function extractCustomFieldValues(row: ParsedRow): Record<string, string> {
  const customFields: Record<string, string> = {};
  const cfPattern = /^cf:(.+)$/;

  for (const [columnName, value] of Object.entries(row)) {
    const match = columnName.match(cfPattern);
    if (match && value !== undefined && value !== '') {
      const [, key] = match;
      customFields[key] = value;
    }
  }

  return customFields;
}

/**
 * Extract base columns (non-field, non-cf columns) from a parsed row
 */
export function extractBaseColumns(row: ParsedRow, exclude: string[] = []): Record<string, string> {
  const baseColumns: Record<string, string> = {};
  const fieldPattern = /^field:/;
  const cfPattern = /^cf:/;

  for (const [columnName, value] of Object.entries(row)) {
    if (
      !fieldPattern.test(columnName) &&
      !cfPattern.test(columnName) &&
      !exclude.includes(columnName) &&
      value !== undefined
    ) {
      baseColumns[columnName] = value;
    }
  }

  return baseColumns;
}

/**
 * Create field definition columns for export
 */
export function createFieldDefinitionColumns(
  fields: Array<{
    key: string;
    label: string;
    type: string;
    required: boolean;
    config?: any;
    orderIndex?: number;
    section?: string;
    sectionOrder?: number;
  }>
): Record<string, string> {
  const columns: Record<string, string> = {};

  for (const field of fields) {
    columns[`field:${field.key}:label`] = field.label;
    columns[`field:${field.key}:type`] = field.type;
    columns[`field:${field.key}:required`] = field.required ? 'true' : 'false';
    
    if (field.config?.options && Array.isArray(field.config.options)) {
      columns[`field:${field.key}:options`] = field.config.options.join('|');
    }
    
    if (field.config?.help) {
      columns[`field:${field.key}:help`] = field.config.help;
    }
    
    // For ticket templates (includes section and order)
    if (field.section !== undefined) {
      columns[`field:${field.key}:group`] = field.section || '';
    }
    
    if (field.orderIndex !== undefined) {
      columns[`field:${field.key}:order`] = field.orderIndex.toString();
    }
  }

  return columns;
}

/**
 * Create custom field value columns for export
 */
export function createCustomFieldColumns(customFields: Record<string, any>): Record<string, string> {
  const columns: Record<string, string> = {};

  for (const [key, value] of Object.entries(customFields)) {
    if (value !== null && value !== undefined) {
      // Convert arrays to pipe-separated strings
      if (Array.isArray(value)) {
        columns[`cf:${key}`] = value.join('|');
      } else {
        columns[`cf:${key}`] = String(value);
      }
    }
  }

  return columns;
}

/**
 * Parse a boolean value from a string
 */
export function parseBoolean(value: string | undefined): boolean {
  if (!value) return false;
  const lower = value.toLowerCase().trim();
  return lower === 'true' || lower === '1' || lower === 'yes';
}

/**
 * Parse options from a pipe-separated string
 */
export function parseOptions(value: string | undefined): string[] {
  if (!value) return [];
  return value.split('|').map(s => s.trim()).filter(s => s.length > 0);
}

/**
 * Coerce a value to match a field type
 */
export function coerceFieldValue(value: string, fieldType: string): any {
  if (!value || value === '') return null;

  switch (fieldType) {
    case 'NUMBER':
    case 'READING':
      const num = parseFloat(value);
      return isNaN(num) ? null : num;
    
    case 'BOOLEAN':
      return parseBoolean(value);
    
    case 'MULTI_SELECT':
      return parseOptions(value);
    
    case 'SELECT':
    case 'TEXT':
    case 'TEXTAREA':
    case 'DATE':
    case 'TIME':
    case 'DATETIME':
    case 'PHOTO_REF':
    default:
      return value;
  }
}
