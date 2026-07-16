export interface AdrLiveFrame {
  time: number;      // seconds
  load: number;      // kN
  stress: number;    // MPa
  pace: number;      // MPa/s
  rawLine: string;
  integrityHash: string;
  timestamp: Date;   // browser-side receipt timestamp
}

export interface AdrConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  portInfo?: any; // SerialPort
  errorMessage?: string;
}

export type AdrDataProfile = 'LIVE' | 'UNKNOWN';
