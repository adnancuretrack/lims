import type { WorksheetSchema } from '../../methods/designer/types';

interface EvaluationContext {
  formula: string;
  schema: WorksheetSchema;
  data: Record<string, any>;
  currentSectionId: string;
  currentRowIndex: number | string | null; // number for array index, string for rowHeader ID
  specimenStatuses?: any[];
}

const calculateSampleStdev = (values: number[]): number | null => {
  if (values.length < 2) return null;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
};

const calculateCV = (values: number[]): number | null => {
  if (values.length < 2) return null;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  if (mean === 0) return null;
  const stdev = calculateSampleStdev(values);
  return stdev !== null ? (stdev / mean) * 100 : null;
};

const calculateMedian = (values: number[]): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) / 2;
};

export const evaluateFormula = (context: EvaluationContext, precision?: number): number | string | null => {
  const { formula, schema, data, currentSectionId, currentRowIndex, specimenStatuses } = context;
  if (!formula || formula.trim() === '') return null;

  try {
    // Brackets normalization: convert {table[0].field} to {table.0.field}
    let expression = formula.replace(/\{([^}]+)\}/g, (_, fieldRef) => {
      const normalized = fieldRef.replace(/\[(\d+)\]/g, '.$1');
      return `{${normalized}}`;
    });

    // 1. Resolve Cross-Row Aggregate Functions First
    // Pattern: FUNCTION(args) where args contains {fieldRef} and optional extra parameters
    const aggRegex = /(SUM_RUNNING|SUM_ALL|AVG_ALL|COUNT_ALL|MIN_ALL|MAX_ALL|STDEV_ALL|CV_ALL|MEDIAN_ALL|SUM_CURRENT|AVG_CURRENT|COUNT_CURRENT|MIN_CURRENT|MAX_CURRENT|STDEV_CURRENT|CV_CURRENT|AVG_AUTHORIZED|SUM_AUTHORIZED|AVG_BATCH|SUM_BATCH)\(([^)]+)\)/g;
    expression = expression.replace(aggRegex, (_, funcName, matchContent) => {
      const args = matchContent.split(',');
      const fieldRef = args[0].replace(/[\{\}]/g, '').trim().replace(/\[(\d+)\]/g, '.$1');
      const ref = parseFieldRef(fieldRef, currentSectionId);
      const sectionData = data[ref.sectionId];
      const secSchema = (schema.sections || []).find(s => s.id === ref.sectionId);
      const hasMultiDaySpecimen = secSchema?.hasMultiDaySpecimen === true;

      const getSpecimenStatus = (idx: number): string => {
        const spec = (specimenStatuses || []).find((s: any) => s.specimenNumber === idx + 1);
        return spec?.status || 'DRAFT';
      };

      const getSpecimenBatchNumber = (idx: number): number => {
        const authSpecimens = (specimenStatuses || [])
          .filter((s: any) => s.status === 'AUTHORIZED' && s.authorizedAt)
          .sort((a, b) => new Date(a.authorizedAt).getTime() - new Date(b.authorizedAt).getTime());

        const batches: any[][] = [];
        authSpecimens.forEach(spec => {
          const time = new Date(spec.authorizedAt).getTime();
          let placed = false;
          for (const batch of batches) {
            const firstTime = new Date(batch[0].authorizedAt).getTime();
            if (Math.abs(time - firstTime) < 10000) {
              batch.push(spec);
              placed = true;
              break;
            }
          }
          if (!placed) {
            batches.push([spec]);
          }
        });

        const spec = (specimenStatuses || []).find((s: any) => s.specimenNumber === idx + 1);
        if (!spec) return batches.length + 1;

        if (spec.status !== 'AUTHORIZED') {
          return batches.length + 1;
        }

        const foundBatchIdx = batches.findIndex(batch => batch.some(s => s.specimenNumber === spec.specimenNumber));
        return foundBatchIdx !== -1 ? foundBatchIdx + 1 : batches.length + 1;
      };

      let values: number[] = [];

      if (Array.isArray(sectionData)) {
        sectionData.forEach((row, idx) => {
          const valStr = row[ref.fieldId];
          if (valStr === undefined || valStr === null || valStr === '') return;
          const val = Number(valStr);
          if (isNaN(val)) return;

          if (funcName.endsWith('_CURRENT') && hasMultiDaySpecimen) {
            if (getSpecimenStatus(idx) === 'AUTHORIZED') return;
          } else if (funcName.endsWith('_AUTHORIZED') && hasMultiDaySpecimen) {
            if (getSpecimenStatus(idx) !== 'AUTHORIZED') return;
          } else if ((funcName === 'AVG_BATCH' || funcName === 'SUM_BATCH') && hasMultiDaySpecimen) {
            const targetBatch = args[1] ? Number(args[1].trim()) : 1;
            if (getSpecimenBatchNumber(idx) !== targetBatch) return;
          }

          values.push(val);
        });
      } else if (sectionData && typeof sectionData === 'object') {
        Object.values(sectionData).forEach((row: any) => {
          const valStr = row[ref.fieldId];
          if (valStr === undefined || valStr === null || valStr === '') return;
          const val = Number(valStr);
          if (!isNaN(val)) {
            values.push(val);
          }
        });
      }

      let result: number | null = 0;
      switch (funcName) {
        case 'SUM_ALL':
        case 'SUM_CURRENT':
        case 'SUM_AUTHORIZED':
        case 'SUM_BATCH':
          result = values.reduce((sum, v) => sum + v, 0);
          break;
        case 'SUM_RUNNING':
          if (typeof currentRowIndex === 'number') {
             const runningVals = values.slice(0, currentRowIndex + 1);
             result = runningVals.reduce((sum, v) => sum + v, 0);
          } else {
             result = values.reduce((sum, v) => sum + v, 0);
          }
          break;
        case 'AVG_ALL':
        case 'AVG_CURRENT':
        case 'AVG_AUTHORIZED':
        case 'AVG_BATCH':
          result = values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
          break;
        case 'COUNT_ALL':
        case 'COUNT_CURRENT':
          result = values.length;
          break;
        case 'MIN_ALL':
        case 'MIN_CURRENT':
          result = values.length > 0 ? Math.min(...values) : 0;
          break;
        case 'MAX_ALL':
        case 'MAX_CURRENT':
          result = values.length > 0 ? Math.max(...values) : 0;
          break;
        case 'STDEV_ALL':
        case 'STDEV_CURRENT':
          result = calculateSampleStdev(values);
          break;
        case 'CV_ALL':
        case 'CV_CURRENT':
          result = calculateCV(values);
          break;
        case 'MEDIAN_ALL':
          result = calculateMedian(values);
          break;
      }
      return result !== null ? result.toString() : 'null';
    });

    // 2. Resolve Variables: {fieldId}, {sectionId.fieldId}, or {sectionId.rowId.fieldId}
    const varRegex = /\{([^}]+)\}/g;
    let hasMissingDependencies = false;

    expression = expression.replace(varRegex, (_, fieldRef) => {
      const ref = parseFieldRef(fieldRef, currentSectionId);
      let val: any = null;

      const secSchema = (schema.sections || []).find(s => s.id === ref.sectionId);
      
      if (secSchema?.type === 'DATA_TABLE' || secSchema?.type === 'GROUPED_TABLE') {
        const tableData = data[ref.sectionId] || [];
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

      if (val === undefined || val === null || val === '') {
        hasMissingDependencies = true;
        return '0';
      }
      if (typeof val === 'boolean') return val ? '1' : '0';
      if (!isNaN(Number(val))) return String(val);
      return `"${val}"`;
    });

    if (hasMissingDependencies) return null;

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
    let expression = formula.replace(/\{([^}]+)\}/g, (_, fieldRef) => {
      const normalized = fieldRef.replace(/\[(\d+)\]/g, '.$1');
      return `{${normalized}}`;
    });

    // Resolve Variables
    const varRegex = /\{([^}]+)\}/g;
    expression = expression.replace(varRegex, (_, fieldRef) => {
      const ref = parseFieldRef(fieldRef, currentSectionId);
      const secSchema = (schema.sections || []).find(s => s.id === ref.sectionId);
      
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

export const recomputeAllFormulas = (
  schema: WorksheetSchema,
  data: Record<string, any>,
  specimenStatuses?: any[]
): Record<string, any> => {
  const nextData = JSON.parse(JSON.stringify(data));
  const maxPasses = 3;
  
  for (let pass = 0; pass < maxPasses; pass++) {
    (schema.sections || []).forEach(section => {
      if (section.type === 'SINGLE_VALUE') {
        (section.fields || []).filter(f => f.inputType === 'CALCULATED' && f.formula).forEach(f => {
           nextData[section.id] = nextData[section.id] || {};
           nextData[section.id][f.id] = evaluateFormula({
             formula: f.formula!,
             schema,
             data: nextData,
             currentSectionId: section.id,
             currentRowIndex: null,
             specimenStatuses
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
              currentRowIndex: rowIndex,
              specimenStatuses
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
              currentRowIndex: rh.id,
              specimenStatuses
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
  data: Record<string, any>,
  specimenStatuses?: any[]
): Record<string, { message: string; severity: 'WARNING' | 'ERROR' }> => {
  const newErrors: Record<string, { message: string; severity: 'WARNING' | 'ERROR' }> = {};

  (schema.sections || []).forEach(section => {
    if (section.type === 'SINGLE_VALUE') {
      (section.fields || []).forEach(f => {
        (f.validations || []).forEach(rule => {
          if (!evaluateCondition({ formula: rule.rule, schema, data, currentSectionId: section.id, currentRowIndex: null, specimenStatuses })) {
            newErrors[`${section.id}.${f.id}`] = { message: rule.message, severity: rule.severity };
          }
        });
      });
    } else if (section.type === 'DATA_TABLE' || section.type === 'GROUPED_TABLE') {
      const fieldsWithRules = (section.columns || section.dataColumns || []).filter(f => f.validations?.length);
      (data[section.id] || []).forEach((_row: any, rowIndex: number) => {
        fieldsWithRules.forEach(f => {
          for (const rule of f.validations!) {
            if (!evaluateCondition({ formula: rule.rule, schema, data, currentSectionId: section.id, currentRowIndex: rowIndex, specimenStatuses })) {
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
            if (!evaluateCondition({ formula: rule.rule, schema, data, currentSectionId: section.id, currentRowIndex: rh.id, specimenStatuses })) {
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
