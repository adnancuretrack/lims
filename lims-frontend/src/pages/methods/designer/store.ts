import { create } from 'zustand';
import type { SectionType, WorksheetSchema, FieldSchema, SectionSchema } from './types';

interface DesignerState {
  schema: WorksheetSchema;
  selectedSectionId: string | null;
  selectedFieldId: string | null;
  
  // Actions
  addSection: (type: SectionType) => void;
  updateSection: (id: string, updates: Partial<SectionSchema>) => void;
  removeSection: (id: string) => void;
  reorderSections: (oldIndex: number, newIndex: number) => void;
  
  addField: (sectionId: string) => void;
  updateField: (sectionId: string, fieldId: string, updates: Partial<FieldSchema>) => void;
  removeField: (sectionId: string, fieldId: string) => void;
  
  setSelectedSection: (id: string | null) => void;
  setSelectedField: (id: string | null, sectionId?: string | null) => void;
  setSchema: (schema: WorksheetSchema) => void;
  setMetadata: (updates: Partial<WorksheetSchema['metadata']>) => void;
  reset: () => void;
}

export const useDesignerStore = create<DesignerState>((set) => ({
  schema: { id: 'draft_worksheet', sections: [] },
  selectedSectionId: null,
  selectedFieldId: null,

  setSchema: (schema) => set({ schema, selectedSectionId: null, selectedFieldId: null }),

  addSection: (type) => set((state) => {
    const newId = `section_${crypto.randomUUID().slice(0, 8)}`;
    const newSection: SectionSchema = {
      id: newId,
      type,
      title: `New ${type.replace('_', ' ')}`
    };
    console.log(`[Designer] Added Section: ${newId} (${type})`);
    return { 
      schema: { ...state.schema, sections: [...state.schema.sections, newSection] },
      selectedSectionId: newId,
      selectedFieldId: null
    };
  }),
  
  updateSection: (id, updates) => set((state) => ({
    schema: {
      ...state.schema,
      sections: state.schema.sections.map(s => 
        s.id === id ? { ...s, ...updates } : s
      )
    }
  })),

  removeSection: (id) => set((state) => ({
    schema: {
      ...state.schema,
      sections: state.schema.sections.filter(s => s.id !== id)
    },
    selectedSectionId: state.selectedSectionId === id ? null : state.selectedSectionId,
    selectedFieldId: null
  })),

  reorderSections: (oldIndex, newIndex) => set((state) => {
    if (oldIndex === -1 || newIndex === -1) return state;
    const sections = [...state.schema.sections];
    const [moved] = sections.splice(oldIndex, 1);
    sections.splice(newIndex, 0, moved);
    return { schema: { ...state.schema, sections } };
  }),

  addField: (sectionId) => set((state) => {
    let newFieldId = '';
    const newSchema = {
      ...state.schema,
      sections: state.schema.sections.map(s => {
        if (s.id !== sectionId) return s;
        
        newFieldId = `field_${crypto.randomUUID().slice(0,8)}`;
        const newField: FieldSchema = {
          id: newFieldId,
          label: 'New Field',
          inputType: 'TEXT'
        };
        
        if (s.type === 'DATA_TABLE') {
          return { ...s, columns: [...(s.columns || []), newField] };
        } else if (s.type === 'GROUPED_TABLE') {
          return { ...s, dataColumns: [...(s.dataColumns || []), newField] };
        } else {
          return { ...s, fields: [...(s.fields || []), newField] };
        }
      })
    };
    console.log(`[Designer] Added Field: ${newFieldId} in section ${sectionId}`);
    return { schema: newSchema, selectedFieldId: newFieldId, selectedSectionId: sectionId };
  }),

  updateField: (sectionId, fieldId, updates) => set((state) => {
    const mapFields = (fields: FieldSchema[] = []) => 
      fields.map(f => f.id === fieldId ? { ...f, ...updates } : f);

    return {
      schema: {
        ...state.schema,
        sections: state.schema.sections.map(s => {
          if (s.id !== sectionId) return s;
          
          if (s.type === 'DATA_TABLE') {
            return { ...s, columns: mapFields(s.columns) };
          } else if (s.type === 'GROUPED_TABLE') {
            return { ...s, dataColumns: mapFields(s.dataColumns) };
          } else {
            return { ...s, fields: mapFields(s.fields) };
          }
        })
      }
    };
  }),

  removeField: (sectionId, fieldId) => set((state) => {
     const filterFields = (fields: FieldSchema[] = []) => 
      fields.filter(f => f.id !== fieldId);

    return {
      schema: {
        ...state.schema,
        sections: state.schema.sections.map(s => {
          if (s.id !== sectionId) return s;
          
          if (s.type === 'DATA_TABLE') {
            return { ...s, columns: filterFields(s.columns) };
          } else if (s.type === 'GROUPED_TABLE') {
            return { ...s, dataColumns: filterFields(s.dataColumns) };
          } else {
            return { ...s, fields: filterFields(s.fields) };
          }
        })
      },
      selectedFieldId: state.selectedFieldId === fieldId ? null : state.selectedFieldId
    };
  }),

  setSelectedSection: (id) => set({ selectedSectionId: id, selectedFieldId: null }),
  setSelectedField: (id, sectionId) => set((state) => ({ 
    selectedFieldId: id, 
    selectedSectionId: sectionId === undefined ? state.selectedSectionId : sectionId 
  })),
  setMetadata: (updates) => set((state) => ({
    schema: {
      ...state.schema,
      metadata: { ...(state.schema.metadata || {}), ...updates }
    }
  })),
  reset: () => set({ 
    schema: { id: `draft_${Date.now()}`, sections: [], metadata: { title: 'New Test Method', standard: '' } }, 
    selectedSectionId: null, 
    selectedFieldId: null 
  })
}));
