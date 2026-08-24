/** A single station reading from the Troxler 3440 project dump (Profile A — Soil mode) */
export interface TroxlerStationRecord {
  staNum: number;
  time: string;           // "2:30 PM"
  date: string;           // "3/16/2000"
  depth: string;          // "4 inches"
  timeVal: string;        // "15 seconds"
  units: string;          // "PCF"
  stdD: number;           // Standard Count D
  stdM: number;           // Standard Count M
  densCnt: number;        // Density Count
  moistCnt: number;       // Moisture Count

  // Soil mode (PR/%PR)
  wd?: string;            // Wet Density (may be "–" placeholder or a number)
  dd?: string;            // Dry Density
  pr?: string;            // Proctor Ratio
  pctPr?: string;         // %PR

  // Common
  m?: string;             // Moisture
  pctM?: string;          // %Moisture
  optData?: string;       // Optional/FHWA data
}

/** A complete project block from a single-project memory dump */
export interface TroxlerProjectBlock {
  projectId: string;
  serialNum: string;
  date: string;
  stations: TroxlerStationRecord[];
  rawText: string;        // exact bytes: header asterisks through closing "**"
  sha256: string;         // SHA-256 of rawText, computed before field mapping
  capturedAt: string;     // ISO-8601 timestamp
}

export interface TroxlerConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  portInfo?: any;
  errorMessage?: string;
}
