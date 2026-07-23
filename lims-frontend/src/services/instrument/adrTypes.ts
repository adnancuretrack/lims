/** A single parsed key-value field from a print report line */
export interface AdrReportField {
  label: string;       // e.g. "Maximum Load", "Stress"
  value: string;       // raw string value e.g. "782.97", "Cylinder"
  unit?: string;       // e.g. "kN", "MPa", "mm"
  numericValue?: number; // parsed float if the value is numeric, undefined otherwise
}

/** A complete test report assembled from multiple serial lines */
export interface AdrPrintReport {
  fields: AdrReportField[];    // all parsed fields in order received
  rawLines: string[];          // complete raw text for audit
  integrityHash: string;       // SHA-256 of concatenated rawLines
  timestamp: Date;             // browser-side receipt timestamp
}

export interface AdrConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  portInfo?: any; // SerialPort
  errorMessage?: string;
}
