import { create } from 'zustand';
import type { WorksheetSchema } from '../../methods/designer/types';
import { recomputeAllFormulas, runAllValidations } from './FormulaEngine';

interface EngineState {
  schema: WorksheetSchema | null;
  data: Record<string, any>;
  errors: Record<string, { message: string, severity: 'WARNING' | 'ERROR' }>;
  specimenStatuses: any[];

  initialize: (schema: WorksheetSchema, initialData?: Record<string, any>, specimenStatuses?: any[]) => void;
  updateFieldValue: (sectionId: string, fieldId: string, value: any) => void;
  updateRowValue: (sectionId: string, rowIndex: number, fieldId: string, value: any) => void;
  addRow: (sectionId: string) => void;
  removeRow: (sectionId: string, rowIndex: number) => void;
  updateMatrixValue: (sectionId: string, rowHeaderId: string, columnId: string, value: any) => void;
}

export const useEngineStore = create<EngineState>((set) => ({
  schema: null,
  data: {},
  errors: {},
  specimenStatuses: [],

  initialize: (schema, initialData, specimenStatuses) => {
    const cleanData: Record<string, any> = { ...(initialData || {}) };
    

    (schema.sections || []).forEach(sec => {
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
            cleanData[sec.id] = Array.from({ length: sec.minRows || 1 }, () => ({}));
          }
        } else if (sec.type === 'MATRIX_TABLE') {
          cleanData[sec.id] = {};
          sec.rowHeaders?.forEach(rh => {
            cleanData[sec.id][rh.id] = {};
          });
        }
      }
    });

    set({ schema, data: cleanData, errors: {}, specimenStatuses: specimenStatuses || [] });
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
    const nextData = recomputeAllFormulas(state.schema, newData, state.specimenStatuses);
    const nextErrors = runAllValidations(state.schema, nextData, state.specimenStatuses);
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
    
    const nextData = recomputeAllFormulas(state.schema, newData, state.specimenStatuses);
    const nextErrors = runAllValidations(state.schema, nextData, state.specimenStatuses);
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
    
    const nextData = recomputeAllFormulas(state.schema, newData, state.specimenStatuses);
    const nextErrors = runAllValidations(state.schema, nextData, state.specimenStatuses);
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
    
    const nextData = recomputeAllFormulas(state.schema, newData, state.specimenStatuses);
    const nextErrors = runAllValidations(state.schema, nextData, state.specimenStatuses);
    return { data: nextData, errors: nextErrors };
  }),

  updateMatrixValue: (sectionId, rowHeaderId, columnId, value) => set((state) => {
    if (!state.schema) return state;
    const sectionData = { ...(state.data[sectionId] || {}) };
    sectionData[rowHeaderId] = {
      ...(sectionData[rowHeaderId] || {}),
      [columnId]: value
    };
    
    const newData = {
      ...state.data,
      [sectionId]: sectionData
    };
    
    const nextData = recomputeAllFormulas(state.schema, newData, state.specimenStatuses);
    const nextErrors = runAllValidations(state.schema, nextData, state.specimenStatuses);
    return { data: nextData, errors: nextErrors };
  })
}));
