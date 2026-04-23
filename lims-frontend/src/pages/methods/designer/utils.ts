import type { FieldSchema, ColumnGroupSchema, SectionSchema } from './types';

export interface ColumnBuilderOptions {
  fields: FieldSchema[];
  groups?: ColumnGroupSchema[];
  buildCol: (field: FieldSchema) => any;
}

/**
 * Shared utility to build Ant Design Table columns with support for nested super-headers.
 */
export const getGroupedColumns = ({ fields, groups, buildCol }: ColumnBuilderOptions): any[] => {
  if (!groups || groups.length === 0) {
    return fields.map(buildCol);
  }

  const handledFieldIds = new Set<string>();
  const result: any[] = [];

  const traverseGrouping = (groupDef: ColumnGroupSchema): any => {
    const groupColumnItem: any = {
      title: groupDef.label,
      align: 'center',
      children: []
    };

    // Recursively process subgroups
    if (groupDef.subGroups && groupDef.subGroups.length > 0) {
      groupDef.subGroups.forEach(sg => {
        groupColumnItem.children.push(traverseGrouping(sg));
      });
    }

    // Process leaf fields in this group
    if (groupDef.span && groupDef.span.length > 0) {
      groupDef.span.forEach(fId => {
        const matchedField = fields.find(f => f.id === fId);
        if (matchedField && !handledFieldIds.has(fId)) {
          handledFieldIds.add(fId);
          groupColumnItem.children.push(buildCol(matchedField));
        }
      });
    }

    return groupColumnItem;
  };

  // 1. Process all defined groups
  groups.forEach(g => {
    result.push(traverseGrouping(g));
  });

  // 2. Add remaining fields that were not part of any group
  fields.forEach(f => {
    if (!handledFieldIds.has(f.id)) {
      result.push(buildCol(f));
    }
  });

  return result;
};

export const DEFAULT_NOTES_SECTION: SectionSchema = {
  id: 'default_notes',
  type: 'SINGLE_VALUE',
  title: 'Observations & Notes',
  fields: [{
    id: 'notes',
    label: 'Notes',
    inputType: 'TEXTAREA',
    required: false
  }]
};
