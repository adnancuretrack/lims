/** A single parsed measurement from the NL 5032X/001 data push */
export interface NlMeasurementRecord {
  job: string;           // JOB: Job Record ID
  wetDensity: number;    // WD: kg/m³
  dryDensity: number;    // DD: kg/m³
  moisture: number;      // MC: %
  compaction: number;    // COMP: %
  temperature: number;   // TEMP: °C
  latitude?: number;     // LAT: decimal degrees (optional GPS)
  longitude?: number;    // LON: decimal degrees (optional GPS)
}

/** A validated report assembled from a single data frame */
export interface NlMeasurementReport {
  record: NlMeasurementRecord;
  rawLine: string;              // original serial text for audit
  integrityHash: string;        // SHA-256 of raw line
  timestamp: Date;              // browser-side receipt timestamp
  sensorFault?: string;         // e.g. "Temperature probe disconnected"
}

export interface NlConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  portInfo?: any;
  errorMessage?: string;
}
