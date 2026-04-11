import type { WorksheetSchema } from '../../methods/designer/types';

interface EvaluationContext {
  formula: string;
  schema: WorksheetSchema;
  data: Record<string, any>;
  currentSectionId: string;
  currentRowIndex: number | null;
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
      const { sectionId, fieldId } = parseFieldRef(fieldRef, currentSectionId);
      const sectionData = data[sectionId];
      
      if (!Array.isArray(sectionData)) return '0'; // If not a table, aggregates don't apply

      const values = sectionData.map(row => Number(row[fieldId])).filter(v => !isNaN(v));

      let result = 0;
      switch (funcName) {
        case 'SUM_ALL':
          result = values.reduce((sum, v) => sum + v, 0);
          break;
        case 'SUM_RUNNING':
          if (currentRowIndex !== null) {
             const runningVals = values.slice(0, currentRowIndex + 1);
             result = runningVals.reduce((sum, v) => sum + v, 0);
          } else {
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

    // 2. Resolve Simple Variables: {fieldId} or {sectionId.fieldId}
    const varRegex = /\{([^}]+)\}/g;
    expression = expression.replace(varRegex, (_, fieldRef) => {
      const { sectionId, fieldId } = parseFieldRef(fieldRef, currentSectionId);
      let val: any = null;

      const secSchema = schema.sections.find(s => s.id === sectionId);
      if (secSchema?.type === 'DATA_TABLE' || secSchema?.type === 'GROUPED_TABLE') {
        const tableData = data[sectionId] || [];
        if (currentRowIndex !== null && tableData[currentRowIndex]) {
          val = tableData[currentRowIndex][fieldId];
        }
      } else {
        val = data[sectionId]?.[fieldId];
      }

      // If value is empty or unparseable text, return 0 or null placeholder so math doesn't result in NaN unexpectedly
      if (val === undefined || val === null || val === '') return '0';
      if (typeof val === 'boolean') return val ? '1' : '0';
      
      // If it's pure numeric string or number
      if (!isNaN(Number(val))) return String(val);
      
      // If resolving to text for string formulas like CONTAINS, quote it
      return `"${val}"`;
    });

    // 3. Resolve Custom Scalar Functions (e.g. HOURS_BETWEEN, ABS)
    const absRegex = /ABS\(([^)]+)\)/g;
    expression = expression.replace(absRegex, 'Math.abs($1)');
    
    // Evaluate the final JS expression safely
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
    return null; // Don't crash the UI on a bad formula
  }
};

const parseFieldRef = (ref: string, fallbackSectionId: string) => {
  if (ref.includes('.')) {
    const parts = ref.split('.');
    return { sectionId: parts[0], fieldId: parts[1] };
  }
  return { sectionId: fallbackSectionId, fieldId: ref };
};

export const evaluateCondition = (context: EvaluationContext & { formula: string }): boolean => {
  const { formula, schema, data, currentSectionId, currentRowIndex } = context;
  if (!formula || formula.trim() === '') return true; // If no condition, it is visible by default

  try {
    let expression = formula;

    // Resolve Variables: {fieldId} or {sectionId.fieldId}
    const varRegex = /\{([^}]+)\}/g;
    expression = expression.replace(varRegex, (_, fieldRef) => {
      const { sectionId, fieldId } = parseFieldRef(fieldRef, currentSectionId);
      
      const secSchema = schema.sections.find(s => s.id === sectionId);
      let val: any = null;
      if (secSchema?.type === 'DATA_TABLE' || secSchema?.type === 'GROUPED_TABLE') {
        const tableData = data[sectionId] || [];
        if (currentRowIndex !== null && tableData[currentRowIndex]) {
          val = tableData[currentRowIndex][fieldId];
        } else {
          // If referencing a table from outside it, maybe default to row 0 or false
          val = tableData[0]?.[fieldId];
        }
      } else {
        val = data[sectionId]?.[fieldId];
      }

      if (val === undefined || val === null) return 'null';
      if (typeof val === 'boolean') return val.toString();
      if (!isNaN(Number(val)) && val !== '') return String(val);
      
      // Escape inner quotes
      const safeString = String(val).replace(/'/g, "\\'");
      return `'${safeString}'`;
    });

    // Contains operator helper: CONTAINS('text', 'search') => 'text'.includes('search')
    const containsRegex = /CONTAINS\(([^,]+),\s*([^)]+)\)/g;
    expression = expression.replace(containsRegex, 'String($1).includes(String($2))');

    // AND / OR aliases
    expression = expression.replace(/\bAND\b/g, '&&').replace(/\bOR\b/g, '||');

    // eslint-disable-next-line no-new-func
    const result = new Function(`return !!(${expression})`)();
    return result === true;
  } catch (err) {
    console.warn(`Visibility condition evaluation failed for: ${formula}`, err);
    return true; // Default to visible if broken syntax
  }
};

export const recomputeAllFormulas = (schema: WorksheetSchema, data: Record<string, any>): Record<string, any> => {
  // We do a deep clone so we don't mutate state directly until ready
  const nextData = JSON.parse(JSON.stringify(data));
  const maxPasses = 3; // Allows chained calculations up to 3 deep
  
  for (let pass = 0; pass < maxPasses; pass++) {

    schema.sections.forEach(section => {
      
      if (section.type === 'SINGLE_VALUE') {
        const calcFields = (section.fields || []).filter(f => f.inputType === 'CALCULATED' && f.formula);
        calcFields.forEach(f => {
           const val = evaluateFormula({
             formula: f.formula!,
             schema,
             data: nextData,
             currentSectionId: section.id,
             currentRowIndex: null
           }, f.precision);
           
           if (!nextData[section.id]) nextData[section.id] = {};
           nextData[section.id][f.id] = val;
        });
      }

      if (section.type === 'DATA_TABLE' || section.type === 'GROUPED_TABLE') {
        const columns = section.columns || section.dataColumns || [];
        const calcFields = columns.filter(f => f.inputType === 'CALCULATED' && f.formula);
        
        const tableData: any[] = nextData[section.id] || [];
        
        tableData.forEach((row, rowIndex) => {
          calcFields.forEach(f => {
            const val = evaluateFormula({
              formula: f.formula!,
              schema,
              data: nextData,
              currentSectionId: section.id,
              currentRowIndex: rowIndex
            }, f.precision);
            
            row[f.id] = val;
          });
        });
        
        nextData[section.id] = tableData;
      }
    });
  }

  return nextData;
};

export const runAllValidations = (
  schema: import('../../methods/designer/types').WorksheetSchema,
  data: Record<string, any>
): Record<string, { message: string; severity: 'WARNING' | 'ERROR' }> => {
  const newErrors: Record<string, { message: string; severity: 'WARNING' | 'ERROR' }> = {};

  schema.sections.forEach(section => {
    // 1. Scalar Fields
    if (section.type === 'SINGLE_VALUE') {
      (section.fields || []).forEach(f => {
        if (!f.validations || f.validations.length === 0) return;
        
        for (const rule of f.validations) {
          const isValid = evaluateCondition({
            formula: rule.rule,
            schema,
            data,
            currentSectionId: section.id,
            currentRowIndex: null
          });
          
          if (!isValid) {
            newErrors[`${section.id}.${f.id}`] = { message: rule.message, severity: rule.severity };
            break; // Stop at first broken rule
          }
        }
      });
    }

    // 2. Data Table Fields (Rows)
    if (section.type === 'DATA_TABLE' || section.type === 'GROUPED_TABLE') {
      const columns = section.columns || section.dataColumns || [];
      const fieldsWithRules = columns.filter(f => f.validations && f.validations.length > 0);
      
      const tableData: any[] = data[section.id] || [];
      
      tableData.forEach((_row, rowIndex) => {
        fieldsWithRules.forEach(f => {
          for (const rule of f.validations!) {
            const isValid = evaluateCondition({
              formula: rule.rule,
              schema,
              data,
              currentSectionId: section.id,
              currentRowIndex: rowIndex
            });

            if (!isValid) {
              newErrors[`${section.id}.${rowIndex}.${f.id}`] = { message: rule.message, severity: rule.severity };
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
  schema: import('../../methods/designer/types').WorksheetSchema,
  data: Record<string, any>
): Record<string, { value: any, unit?: string, label: string }> => {
  const finalResults: Record<string, { value: any, unit?: string, label: string }> = {};

  schema.sections.forEach(section => {
    if (section.type === 'SINGLE_VALUE') {
      (section.fields || []).forEach(f => {
        if (f.isFinalResult) {
          const val = data[section.id]?.[f.id];
          if (val !== undefined && val !== null && val !== '') {
            finalResults[`${section.id}.${f.id}`] = {
              value: val,
              unit: f.unit,
              label: f.label
            };
          }
        }
      });
    }

    if (section.type === 'DATA_TABLE' || section.type === 'GROUPED_TABLE') {
      const columns = section.columns || section.dataColumns || [];
      columns.forEach(c => {
        if (c.isFinalResult) {
          const tableData: any[] = data[section.id] || [];
          // For tables, extract an array of all trial values for the COA
          const values = tableData.map(row => row[c.id]).filter(v => v !== undefined && v !== null && v !== '');
          if (values.length > 0) {
            finalResults[`${section.id}.${c.id}`] = {
              value: values.length === 1 ? values[0] : values, // Scalar if only 1 array element natively
              unit: c.unit,
              label: c.label
            };
          }
        }
      });
    }
  });

  return finalResults;
};
