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
  moveField: (activeFieldId: string, overId: string, activeSectionId: string, overSectionId: string) => void;
  
  setSelectedSection: (id: string | null) => void;
  setSelectedField: (id: string | null, sectionId?: string | null) => void;
  setSchema: (schema: WorksheetSchema) => void;
  setMetadata: (updates: Partial<WorksheetSchema['metadata']>) => void;
  setReportTemplatePath: (path: string | undefined) => void;
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

  moveField: (activeFieldId, overId, activeSectionId, overSectionId) => set((state) => {
    const newSchema = { ...state.schema, sections: [...state.schema.sections] };
    
    // 1. Find source and target sections
    const sourceSectionIndex = newSchema.sections.findIndex(s => s.id === activeSectionId);
    const targetSectionIndex = newSchema.sections.findIndex(s => s.id === overSectionId);
    
    if (sourceSectionIndex === -1 || targetSectionIndex === -1) return state;
    
    const sourceSection = { ...newSchema.sections[sourceSectionIndex] };
    const targetSection = sourceSectionIndex === targetSectionIndex 
      ? sourceSection 
      : { ...newSchema.sections[targetSectionIndex] };

    // Helper to get field array property name
    const getFieldProp = (s: SectionSchema) => {
      if (s.type === 'DATA_TABLE') return 'columns';
      if (s.type === 'GROUPED_TABLE') return 'dataColumns';
      return 'fields';
    };

    const sourceProp = getFieldProp(sourceSection);
    const targetProp = getFieldProp(targetSection);

    const sourceFields = [...((sourceSection as any)[sourceProp] || [])];
    const itemIndex = sourceFields.findIndex(f => f.id === activeFieldId);
    
    if (itemIndex === -1) return state;
    
    const [movedItem] = sourceFields.splice(itemIndex, 1);
    (sourceSection as any)[sourceProp] = sourceFields;

    const targetFields = sourceSectionIndex === targetSectionIndex 
      ? sourceFields 
      : [...((targetSection as any)[targetProp] || [])];
      
    let overIndex = targetFields.findIndex(f => f.id === overId);
    if (overIndex === -1) overIndex = targetFields.length; // Drop at end if not over a specific item

    targetFields.splice(overIndex, 0, movedItem);
    (targetSection as any)[targetProp] = targetFields;

    newSchema.sections[sourceSectionIndex] = sourceSection;
    if (sourceSectionIndex !== targetSectionIndex) {
        newSchema.sections[targetSectionIndex] = targetSection;
    }

    return { 
      schema: newSchema, 
      selectedFieldId: activeFieldId, 
      selectedSectionId: overSectionId 
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
  setReportTemplatePath: (path) => set((state) => ({
    schema: { ...state.schema, reportTemplatePath: path }
  })),
  reset: () => set({ 
    schema: { id: `draft_${Date.now()}`, sections: [], metadata: { title: 'New Test Method', standard: '' } }, 
    selectedSectionId: null, 
    selectedFieldId: null 
  })
}));
