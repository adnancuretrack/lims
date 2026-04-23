import type { WorksheetSchema } from '../../methods/designer/types';

interface EvaluationContext {
  formula: string;
  schema: WorksheetSchema;
  data: Record<string, any>;
  currentSectionId: string;
  currentRowIndex: number | string | null; // number for array index, string for rowHeader ID
}

export const evaluateFormula = (context: EvaluationContext, precision?: number): number | string | null => {
  const { formula, schema, data, currentSectionId, currentRowIndex } = context;
  if (!formula || formula.trim() === '') return null;

  try {
    let expression = formula;

    // 1. Resolve Cross-Row Aggregate Functions First
    // Pattern: FUNCTION({fieldId}) or FUNCTION({sectionId.fieldId})
    const aggRegex = /(SUM_RUNNING|SUM_ALL|AVG_ALL|COUNT_ALL|MIN_ALL|MAX_ALL)\(\{([^}]+)\}\)/g;
    expression = expression.replace(aggRegex, (_, funcName, fieldRef) => {
      const ref = parseFieldRef(fieldRef, currentSectionId);
      const sectionData = data[ref.sectionId];
      
      let values: number[] = [];

      if (Array.isArray(sectionData)) {
        // Standard Table
        values = sectionData.map(row => Number(row[ref.fieldId])).filter(v => !isNaN(v));
      } else if (sectionData && typeof sectionData === 'object') {
        // Matrix Table: sectionData is Record<rowId, Record<columnId, value>>
        values = Object.values(sectionData)
          .map((row: any) => Number(row[ref.fieldId]))
          .filter(v => !isNaN(v));
      }

      let result = 0;
      switch (funcName) {
        case 'SUM_ALL':
          result = values.reduce((sum, v) => sum + v, 0);
          break;
        case 'SUM_RUNNING':
          if (typeof currentRowIndex === 'number') {
             const runningVals = values.slice(0, currentRowIndex + 1);
             result = runningVals.reduce((sum, v) => sum + v, 0);
          } else {
             // For Matrix, running sum doesn't have a clear "top-to-bottom" without sorting logic
             // Default to sum all for now
             result = values.reduce((sum, v) => sum + v, 0);
          }
          break;
        case 'AVG_ALL':
          result = values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
          break;
        case 'COUNT_ALL':
          result = values.length;
          break;
        case 'MIN_ALL':
          result = values.length > 0 ? Math.min(...values) : 0;
          break;
        case 'MAX_ALL':
          result = values.length > 0 ? Math.max(...values) : 0;
          break;
      }
      return result.toString();
    });

    // 2. Resolve Variables: {fieldId}, {sectionId.fieldId}, or {sectionId.rowId.fieldId}
    const varRegex = /\{([^}]+)\}/g;
    expression = expression.replace(varRegex, (_, fieldRef) => {
      const ref = parseFieldRef(fieldRef, currentSectionId);
      let val: any = null;

      const secSchema = schema.sections.find(s => s.id === ref.sectionId);
      
      if (secSchema?.type === 'DATA_TABLE' || secSchema?.type === 'GROUPED_TABLE') {
        const tableData = data[ref.sectionId] || [];
        // If it's a 3-part ref {sec.rowIdx.field}, rowId is index
        const idx = ref.rowId !== undefined ? Number(ref.rowId) : (typeof currentRowIndex === 'number' ? currentRowIndex : null);
        if (idx !== null && tableData[idx]) {
          val = tableData[idx][ref.fieldId];
        }
      } else if (secSchema?.type === 'MATRIX_TABLE') {
        const matrixData = data[ref.sectionId] || {};
        const rId = ref.rowId || (typeof currentRowIndex === 'string' ? currentRowIndex : null);
        if (rId && matrixData[rId]) {
          val = matrixData[rId][ref.fieldId];
        }
      } else {
        val = data[ref.sectionId]?.[ref.fieldId];
      }

      // If value is empty or unparseable text, return 0 or null placeholder
      if (val === undefined || val === null || val === '') return '0';
      if (typeof val === 'boolean') return val ? '1' : '0';
      if (!isNaN(Number(val))) return String(val);
      return `"${val}"`;
    });

    // 3. Resolve Custom Scalar Functions
    const absRegex = /ABS\(([^)]+)\)/g;
    expression = expression.replace(absRegex, 'Math.abs($1)');
    
    // eslint-disable-next-line no-new-func
    const result = new Function(`return (${expression})`)();

    if (result === Infinity || result === -Infinity || Number.isNaN(result)) {
      return null;
    }

    if (typeof result === 'number' && precision !== undefined && precision !== null) {
      return Number(Number(result).toFixed(precision));
    }

    return result;

  } catch (err) {
    console.warn(`Formula evaluation failed for: ${formula}`, err);
    return null;
  }
};

const parseFieldRef = (ref: string, fallbackSectionId: string) => {
  const parts = ref.split('.');
  if (parts.length === 3) {
    return { sectionId: parts[0], rowId: parts[1], fieldId: parts[2] };
  } else if (parts.length === 2) {
    return { sectionId: parts[0], fieldId: parts[1] };
  }
  return { sectionId: fallbackSectionId, fieldId: ref };
};

export const evaluateCondition = (context: EvaluationContext & { formula: string }): boolean => {
  const { formula, schema, data, currentSectionId, currentRowIndex } = context;
  if (!formula || formula.trim() === '') return true;

  try {
    let expression = formula;

    // Resolve Variables
    const varRegex = /\{([^}]+)\}/g;
    expression = expression.replace(varRegex, (_, fieldRef) => {
      const ref = parseFieldRef(fieldRef, currentSectionId);
      const secSchema = schema.sections.find(s => s.id === ref.sectionId);
      
      let val: any = null;
      if (secSchema?.type === 'DATA_TABLE' || secSchema?.type === 'GROUPED_TABLE') {
        const tableData = data[ref.sectionId] || [];
        const idx = ref.rowId !== undefined ? Number(ref.rowId) : (typeof currentRowIndex === 'number' ? currentRowIndex : null);
        if (idx !== null && tableData[idx]) {
          val = tableData[idx][ref.fieldId];
        } else {
          val = tableData[0]?.[ref.fieldId];
        }
      } else if (secSchema?.type === 'MATRIX_TABLE') {
        const matrixData = data[ref.sectionId] || {};
        const rId = ref.rowId || (typeof currentRowIndex === 'string' ? currentRowIndex : null);
        if (rId && matrixData[rId]) {
          val = matrixData[rId][ref.fieldId];
        } else {
          // Default to first row if no row context
          const firstRowId = secSchema.rowHeaders?.[0]?.id;
          if (firstRowId) val = matrixData[firstRowId]?.[ref.fieldId];
        }
      } else {
        val = data[ref.sectionId]?.[ref.fieldId];
      }

      if (val === undefined || val === null) return 'null';
      if (typeof val === 'boolean') return val.toString();
      if (!isNaN(Number(val)) && val !== '') return String(val);
      const safeString = String(val).replace(/'/g, "\\'");
      return `'${safeString}'`;
    });

    const containsRegex = /CONTAINS\(([^,]+),\s*([^)]+)\)/g;
    expression = expression.replace(containsRegex, 'String($1).includes(String($2))');
    expression = expression.replace(/\bAND\b/g, '&&').replace(/\bOR\b/g, '||');

    // eslint-disable-next-line no-new-func
    const result = new Function(`return !!(${expression})`)();
    return result === true;
  } catch (err) {
    console.warn(`Condition evaluation failed for: ${formula}`, err);
    return true;
  }
};

export const recomputeAllFormulas = (schema: WorksheetSchema, data: Record<string, any>): Record<string, any> => {
  const nextData = JSON.parse(JSON.stringify(data));
  const maxPasses = 3;
  
  for (let pass = 0; pass < maxPasses; pass++) {
    schema.sections.forEach(section => {
      if (section.type === 'SINGLE_VALUE') {
        (section.fields || []).filter(f => f.inputType === 'CALCULATED' && f.formula).forEach(f => {
           nextData[section.id] = nextData[section.id] || {};
           nextData[section.id][f.id] = evaluateFormula({
             formula: f.formula!,
             schema,
             data: nextData,
             currentSectionId: section.id,
             currentRowIndex: null
           }, f.precision);
        });
      } else if (section.type === 'DATA_TABLE' || section.type === 'GROUPED_TABLE') {
        const calcFields = (section.columns || section.dataColumns || []).filter(f => f.inputType === 'CALCULATED' && f.formula);
        const tableData = nextData[section.id] || [];
        tableData.forEach((row: any, rowIndex: number) => {
          calcFields.forEach(f => {
            row[f.id] = evaluateFormula({
              formula: f.formula!,
              schema,
              data: nextData,
              currentSectionId: section.id,
              currentRowIndex: rowIndex
            }, f.precision);
          });
        });
        nextData[section.id] = tableData;
      } else if (section.type === 'MATRIX_TABLE') {
        const matrixData = nextData[section.id] || {};
        const calcFields = (section.columns || []).filter(f => f.inputType === 'CALCULATED' && f.formula);
        section.rowHeaders?.forEach(rh => {
          matrixData[rh.id] = matrixData[rh.id] || {};
          calcFields.forEach(f => {
            matrixData[rh.id][f.id] = evaluateFormula({
              formula: f.formula!,
              schema,
              data: nextData,
              currentSectionId: section.id,
              currentRowIndex: rh.id
            }, f.precision);
          });
        });
        nextData[section.id] = matrixData;
      }
    });
  }
  return nextData;
};

export const runAllValidations = (
  schema: WorksheetSchema,
  data: Record<string, any>
): Record<string, { message: string; severity: 'WARNING' | 'ERROR' }> => {
  const newErrors: Record<string, { message: string; severity: 'WARNING' | 'ERROR' }> = {};

  schema.sections.forEach(section => {
    if (section.type === 'SINGLE_VALUE') {
      (section.fields || []).forEach(f => {
        (f.validations || []).forEach(rule => {
          if (!evaluateCondition({ formula: rule.rule, schema, data, currentSectionId: section.id, currentRowIndex: null })) {
            newErrors[`${section.id}.${f.id}`] = { message: rule.message, severity: rule.severity };
          }
        });
      });
    } else if (section.type === 'DATA_TABLE' || section.type === 'GROUPED_TABLE') {
      const fieldsWithRules = (section.columns || section.dataColumns || []).filter(f => f.validations?.length);
      (data[section.id] || []).forEach((_row: any, rowIndex: number) => {
        fieldsWithRules.forEach(f => {
          for (const rule of f.validations!) {
            if (!evaluateCondition({ formula: rule.rule, schema, data, currentSectionId: section.id, currentRowIndex: rowIndex })) {
              newErrors[`${section.id}.${rowIndex}.${f.id}`] = { message: rule.message, severity: rule.severity };
              break;
            }
          }
        });
      });
    } else if (section.type === 'MATRIX_TABLE') {
      const fieldsWithRules = (section.columns || []).filter(f => f.validations?.length);
      section.rowHeaders?.forEach(rh => {
        fieldsWithRules.forEach(f => {
          for (const rule of f.validations!) {
            if (!evaluateCondition({ formula: rule.rule, schema, data, currentSectionId: section.id, currentRowIndex: rh.id })) {
              newErrors[`${section.id}.${rh.id}.${f.id}`] = { message: rule.message, severity: rule.severity };
              break;
            }
          }
        });
      });
    }
  });
  return newErrors;
};

export const extractFinalResults = (
  schema: WorksheetSchema,
  data: Record<string, any>
): Record<string, { value: any, unit?: string, label: string }> => {
  const finalResults: Record<string, { value: any, unit?: string, label: string }> = {};

  schema.sections.forEach(section => {
    if (section.type === 'SINGLE_VALUE') {
      (section.fields || []).filter(f => f.isFinalResult).forEach(f => {
        const val = data[section.id]?.[f.id];
        if (val != null && val !== '') {
          finalResults[`${section.id}.${f.id}`] = { value: val, unit: f.unit, label: f.label };
        }
      });
    } else if (section.type === 'DATA_TABLE' || section.type === 'GROUPED_TABLE') {
      (section.columns || section.dataColumns || []).filter(c => c.isFinalResult).forEach(c => {
        const values = (data[section.id] || []).map((row: any) => row[c.id]).filter((v: any) => v != null && v !== '');
        if (values.length > 0) {
          finalResults[`${section.id}.${c.id}`] = { value: values.length === 1 ? values[0] : values, unit: c.unit, label: c.label };
        }
      });
    } else if (section.type === 'MATRIX_TABLE') {
      (section.columns || []).filter(c => c.isFinalResult).forEach(c => {
        const matrixData = data[section.id] || {};
        const values = (section.rowHeaders || [])
          .map(rh => matrixData[rh.id]?.[c.id])
          .filter(v => v != null && v !== '');
        if (values.length > 0) {
          finalResults[`${section.id}.${c.id}`] = { value: values.length === 1 ? values[0] : values, unit: c.unit, label: c.label };
        }
      });
    }
  });
  return finalResults;
};
