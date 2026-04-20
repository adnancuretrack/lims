export type InputType = 
  | 'TEXT' | 'NUMERIC' | 'DATE' | 'TIME' | 'DATETIME'
  | 'SELECTION_INLINE' | 'SELECTION_DROPDOWN'
  | 'RADIO' | 'CHECKBOX' | 'YES_NO' | 'TEXTAREA' | 'READONLY' | 'CALCULATED';

export type SectionType = 
  | 'SINGLE_VALUE' | 'GROUPED_TABLE' | 'DATA_TABLE'
  | 'EQUIPMENT' | 'SIGNATURE' | 'NOTES' | 'REFERENCE_TABLE' | 'CHART';

export type TableOrientation = 'COLUMNS_AS_TRIALS' | 'ROWS_AS_RECORDS';

export interface ValidationRule {
  rule: string;
  message: string;
  severity: 'WARNING' | 'ERROR';
}

export interface FieldSchema {
  id: string;
  label: string;
  inputType: InputType;
  precision?: number;
  unit?: string;
  options?: string[];
  formula?: string;
  width?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  required?: boolean;
  visibilityCondition?: string;
  validations?: ValidationRule[];
  isFinalResult?: boolean; // If true, this field is extracted and sent to the TestResult COA API.
  originalFormula?: string; // Reference to the original Excel formula (for auditing).
  systemMapping?: string; // e.g. "sample.sampleNumber", "job.jobNumber" for pre-filling.
}

export interface ColumnGroupSchema {
  id?: string;
  label: string;
  span?: string[]; // list of field aliases
  subGroups?: ColumnGroupSchema[];
}

export interface SectionSchema {
  id: string;
  type: SectionType;
  title?: string;
  description?: string;
  layout?: 'SINGLE_COLUMN' | 'TWO_COLUMN' | 'THREE_COLUMN';
  fields?: FieldSchema[];        // For SINGLE_VALUE
  columns?: FieldSchema[];       // For DATA_TABLE
  dataColumns?: FieldSchema[];   // For GROUPED_TABLE
  orientation?: TableOrientation;
  minRows?: number;         // Used as 'Min Rows' for Dynamic Rows, or 'Min Columns/Trials' for Dynamic Columns
  maxRows?: number;         // Used as 'Max Rows' for Dynamic Rows, or 'Max Columns/Trials' for Dynamic Columns
  trialCount?: number;      // Deprecated: Use minRows instead for dynamic columns
  showTotalRow?: boolean;
  totalRowLabel?: string;
  totalColumns?: string[];
  columnGroups?: ColumnGroupSchema[];
  visibilityCondition?: string;

  // Charting Configuration
  chartType?: 'SCATTER' | 'LINE';
  xAxisLabel?: string;
  yAxisLabel?: string;
  dataSourceSectionId?: string; // The section.id of the table to poll data from
  chartSeries?: { xFieldId: string, yFieldId: string, name: string }[];
}

export interface WorksheetMetadata {
  title?: string;
  name?: string;
  code?: string;
  standard?: string;
  standardRef?: string;
  documentRef?: string;
  issueDate?: string;
}

export interface WorksheetSchema {
  id: string;
  version?: string;
  metadata?: WorksheetMetadata;
  sections: SectionSchema[];
  reportTemplatePath?: string;
}
