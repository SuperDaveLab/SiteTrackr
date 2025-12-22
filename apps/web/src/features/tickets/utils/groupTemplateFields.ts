import { TemplateField } from '../../templates/api/templatesApi';

export interface FieldSectionGroup {
  sectionName: string;
  sectionOrder: number;
  fields: TemplateField[];
}

/**
 * Groups template fields by section for organized display in ticket forms.
 * Fields without a section are placed in a "General" section.
 */
export function groupTemplateFields(fields: TemplateField[]): FieldSectionGroup[] {
  const groups = new Map<string, { sectionOrder: number; fields: TemplateField[] }>();

  for (const field of fields) {
    const sectionName = field.section && field.section.trim().length > 0 ? field.section : 'General';
    const sectionOrder = field.sectionOrder ?? 0;

    if (!groups.has(sectionName)) {
      groups.set(sectionName, { sectionOrder, fields: [] });
    }

    groups.get(sectionName)!.fields.push(field);
  }

  return Array.from(groups.entries())
    .map(([sectionName, group]) => ({
      sectionName,
      sectionOrder: group.sectionOrder,
      fields: group.fields.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)),
    }))
    .sort(
      (a, b) =>
        a.sectionOrder - b.sectionOrder ||
        a.sectionName.localeCompare(b.sectionName)
    );
}
