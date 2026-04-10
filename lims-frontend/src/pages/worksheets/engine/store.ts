import { create } from 'zustand';
import type { WorksheetSchema } from '../../methods/designer/types';
import { recomputeAllFormulas, runAllValidations } from './FormulaEngine';

interface EngineState {
  schema: WorksheetSchema | null;
  
  // The active state of all fields, keyed by Section ID
  // SINGLE_VALUE -> Record<string, any> (key: fieldId)
  // DATA_TABLE -> Array<Record<string, any>> (array of rows)
  data: Record<string, any>;
  
  // Validation errors: Record<"sectionId.fieldId" | "sectionId.rowIndex.fieldId", { message: string, severity: string }>
  errors: Record<string, { message: string, severity: 'WARNING' | 'ERROR' }>;

  // Actions
  initialize: (schema: WorksheetSchema, initialData?: Record<string, any>) => void;
  
  // Update a single field in a generic section
  updateFieldValue: (sectionId: string, fieldId: string, value: any) => void;
  
  // Update a field inside a specific row of a DATA_TABLE
  updateRowValue: (sectionId: string, rowIndex: number, fieldId: string, value: any) => void;
  
  // Dynamic Table row management
  addRow: (sectionId: string) => void;
  removeRow: (sectionId: string, rowIndex: number) => void;
}

export const useEngineStore = create<EngineState>((set) => ({
  schema: null,
  data: {},
  errors: {},

  initialize: (schema, initialData) => {
    // Scaffold initial structure based on schema
    const cleanData: Record<string, any> = { ...(initialData || {}) };
    
    // Ensure header object exists if there are header fields defined
    if (schema.headerFields?.length && !cleanData['header']) {
      cleanData['header'] = {};
    }

    schema.sections.forEach(sec => {
      // If data for this section is missing, scaffold it
      if (!cleanData[sec.id]) {
        if (sec.type === 'SINGLE_VALUE') {
          cleanData[sec.id] = {};
        } else if (sec.type === 'DATA_TABLE' || sec.type === 'GROUPED_TABLE') {
          if (sec.orientation === 'ROWS_AS_RECORDS' || !sec.orientation) {
            // Pre-fill mandatory rows (e.g. minRows = 3)
            cleanData[sec.id] = Array.from({ length: sec.minRows || 1 }, () => ({}));
          } else {
            // COLUMNS_AS_TRIALS
            cleanData[sec.id] = Array.from({ length: sec.trialCount || 1 }, () => ({}));
          }
        }
      }
    });

    set({ schema, data: cleanData, errors: {} });
  },

  updateFieldValue: (sectionId, fieldId, value) => set((state) => {
    if (!state.schema) return state;
    const newData = {
      ...state.data,
      [sectionId]: {
        ...(state.data[sectionId] || {}),
        [fieldId]: value
      }
    };
    const nextData = recomputeAllFormulas(state.schema, newData);
    const nextErrors = runAllValidations(state.schema, nextData);
    return { data: nextData, errors: nextErrors };
  }),

  updateRowValue: (sectionId, rowIndex, fieldId, value) => set((state) => {
    if (!state.schema) return state;
    const list = [...(state.data[sectionId] || [])];
    if (!list[rowIndex]) list[rowIndex] = {};
    list[rowIndex] = { ...list[rowIndex], [fieldId]: value };
    
    const newData = {
      ...state.data,
      [sectionId]: list
    };
    
    const nextData = recomputeAllFormulas(state.schema, newData);
    const nextErrors = runAllValidations(state.schema, nextData);
    return { data: nextData, errors: nextErrors };
  }),

  addRow: (sectionId) => set((state) => {
    if (!state.schema) return state;
    const list = [...(state.data[sectionId] || [])];
    list.push({});
    
    const newData = {
      ...state.data,
      [sectionId]: list
    };
    
    const nextData = recomputeAllFormulas(state.schema, newData);
    const nextErrors = runAllValidations(state.schema, nextData);
    return { data: nextData, errors: nextErrors };
  }),

  removeRow: (sectionId, rowIndex) => set((state) => {
    if (!state.schema) return state;
    const list = [...(state.data[sectionId] || [])];
    list.splice(rowIndex, 1);
    
    const newData = {
      ...state.data,
      [sectionId]: list
    };
    
    const nextData = recomputeAllFormulas(state.schema, newData);
    const nextErrors = runAllValidations(state.schema, nextData);
    return { data: nextData, errors: nextErrors };
  })
}));
