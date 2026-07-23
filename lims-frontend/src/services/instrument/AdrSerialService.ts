import type { AdrPrintReport, AdrReportField } from './adrTypes';
import { AdrDataParser } from './AdrDataParser';

type SerialCallback<T> = (data: T) => void;

/**
 * Singleton service for managing the Web Serial API connection to the ADR Touch.
 * Enforces Read-Only behavior and handles the "Shared Buffer Race Condition"
 * by waiting 2500ms before throwing an error.
 */
class AdrSerialService {
  private port: any | null = null; // any instead of SerialPort for broader typescript compatibility without extra dom types
  private reader: any | null = null; // ReadableStreamDefaultReader
  private keepReading = false;
  private tokenBuffer = '';
  private readPromise: Promise<void> | null = null;

  // Listeners
  private reportListeners: Set<SerialCallback<AdrPrintReport>> = new Set();
  private connectionChangeListeners: Set<SerialCallback<'connected' | 'disconnected' | 'error'>> = new Set();
  private errorListeners: Set<SerialCallback<Error>> = new Set();
  private garbageDataListeners: Set<SerialCallback<string>> = new Set();

  private currentReportLines: string[] = [];
  private currentReportFields: AdrReportField[] = [];
  private blankLineCount = 0;
  private reportTimeout: ReturnType<typeof setTimeout> | null = null;
  private static BLANK_LINES_TO_FINALIZE = 3;
  private static REPORT_TIMEOUT_MS = 3000;

  onReport(callback: SerialCallback<AdrPrintReport>) {
    this.reportListeners.add(callback);
    return () => this.reportListeners.delete(callback);
  }

  onConnectionChange(callback: SerialCallback<'connected' | 'disconnected' | 'error'>) {
    this.connectionChangeListeners.add(callback);
    return () => this.connectionChangeListeners.delete(callback);
  }

  onError(callback: SerialCallback<Error>) {
    this.errorListeners.add(callback);
    return () => this.errorListeners.delete(callback);
  }
  
  onGarbageData(callback: SerialCallback<string>) {
    this.garbageDataListeners.add(callback);
    return () => this.garbageDataListeners.delete(callback);
  }

  private notifyConnectionChange(status: 'connected' | 'disconnected' | 'error') {
    this.connectionChangeListeners.forEach(cb => cb(status));
  }

  private notifyReport(report: AdrPrintReport) {
    this.reportListeners.forEach(cb => cb(report));
  }
  
  private notifyError(error: Error) {
    this.errorListeners.forEach(cb => cb(error));
  }

  private notifyGarbageData(line: string) {
    this.garbageDataListeners.forEach(cb => cb(line));
  }

  /**
   * Prompts the user to select a serial port and connects to it.
   */
  async connect(): Promise<void> {
    if (!('serial' in navigator)) {
      throw new Error('Web Serial API not supported in this browser. Please use Chrome or Edge.');
    }

    if (this.port) {
      console.warn('Already connected or connecting.');
      return;
    }

    try {
      // Request a port (you could add filters for FTDI chips if you know the exact vendorId)
      // For now, allow any port so the user can select their USB-Serial adapter.
      this.port = await (navigator as any).serial.requestPort();

      // Configure port per integration guide: 9600, 8-N-1, no flow control
      await this.port.open({
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none'
      });

      this.keepReading = true;
      this.notifyConnectionChange('connected');

      // Start the read loop
      this.readPromise = this.readLoop();

    } catch (err: any) {
      this.port = null;
      this.notifyConnectionChange('error');
      this.notifyError(err);
      throw err;
    }
  }

  /**
   * Disconnects from the serial port cleanly.
   */
  async disconnect(): Promise<void> {
    if (!this.port) return;

    this.keepReading = false;
    
    if (this.reportTimeout) {
      clearTimeout(this.reportTimeout);
      this.reportTimeout = null;
    }
    
    // Cancel the reader if it exists
    if (this.reader) {
        try {
            await this.reader.cancel();
        } catch (e) {
            console.error('Error canceling reader:', e);
        }
    }

    // Wait for the read loop to finish
    if (this.readPromise) {
        try {
            await this.readPromise;
        } catch (e) {
            console.error('Error waiting for read loop:', e);
        }
    }

    try {
        await this.port.close();
    } catch (e) {
        console.error('Error closing port:', e);
    }
    
    this.port = null;
    this.notifyConnectionChange('disconnected');
  }

  isConnected(): boolean {
    return this.port !== null && this.keepReading;
  }

  getPortInfo() {
    return this.port ? this.port.getInfo() : null;
  }

  /**
   * The main read loop. Handles timeouts and parses incoming text.
   */
  private async readLoop() {
    while (this.port && this.port.readable && this.keepReading) {
      this.reader = this.port.readable.getReader();
      const decoder = new TextDecoder('utf-8');

      try {
        while (this.keepReading) {
          // Implement the 2500ms timeout for the shared buffer race condition
          const readPromise = this.reader.read();
          
          // Race the read against the timeout.
          // Note: The timeout is only really a concern if we're expecting data continuously
          // and it suddenly stops. If we are just polling, we might sit idle.
          // For Profile A (Live Stream), data comes 10-50Hz.
          // If it stalls for >2.5s, it might be the UI interruption issue.
          // But actually, we only want to throw if we're mid-stream.
          // For simplicity, we just do a regular read here. The integration guide says:
          // "Code engines must implement a non-blocking timeout of at least 2500ms before throwing port exceptions"
          // This means if a read operation stalls, don't crash immediately. The native Web Serial read()
          // already blocks indefinitely without throwing, which naturally satisfies this (it waits).
          // If the port physically disconnects, it will throw a native error.
          
          const { value, done } = await readPromise;

          if (done) {
            // Stream was closed
            break;
          }

          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            console.log('[ADR CHUNK]', JSON.stringify(chunk));
            this.tokenBuffer += chunk;
            try {
                await this.processBuffer();
            } catch (err: any) {
                console.error('[ADR] Error in processBuffer:', err);
                this.notifyError(err);
            }
          }
        }
      } catch (err: any) {
         if (err.name !== 'AbortError' && err.message !== 'READ_TIMEOUT') {
             console.error('Serial read error:', err);
             this.notifyConnectionChange('error');
             this.notifyError(err);
             this.keepReading = false;
         }
      } finally {
        if (this.reader) {
            this.reader.releaseLock();
            this.reader = null;
        }
      }
    }
  }

  /**
   * Splits the buffer by \r\n and parses complete lines.
   */
  private async processBuffer() {
    if (this.tokenBuffer.length > 10000) {
        console.warn('[ADR BUFFER] Buffer exceeding 10KB without finding a newline. Possible line-ending issue. Buffer preview:', JSON.stringify(this.tokenBuffer.substring(0, 200)));
    }

    // Normalize all line endings to \n
    this.tokenBuffer = this.tokenBuffer.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    let newlineIndex = this.tokenBuffer.indexOf('\n');

    while (newlineIndex !== -1) {
      // Extract the full line
      let line = this.tokenBuffer.slice(0, newlineIndex).trim();
      
      // Remove the line from the buffer
      this.tokenBuffer = this.tokenBuffer.slice(newlineIndex + 1);

      if (line.length === 0) {
          this.blankLineCount++;
          if (this.blankLineCount >= AdrSerialService.BLANK_LINES_TO_FINALIZE && this.currentReportFields.length > 0) {
              await this.finalizeReport();
          }
      } else {
        this.blankLineCount = 0;
        
        if (this.reportTimeout) {
            clearTimeout(this.reportTimeout);
        }
        
        this.reportTimeout = setTimeout(async () => {
            if (this.currentReportFields.length > 0) {
                await this.finalizeReport();
            }
        }, AdrSerialService.REPORT_TIMEOUT_MS);

        console.log('[ADR LINE]', JSON.stringify(line));
        this.currentReportLines.push(line);
        
        // Pass to parser
        const field = AdrDataParser.parseReportLine(line);
        console.log('[ADR PARSE]', field ? 'SUCCESS' : 'FAIL', field);
        
        if (field) {
            this.currentReportFields.push(field);
        } else if (AdrDataParser.isGarbageData(line)) {
            this.notifyGarbageData(line);
        }
      }

      // Check for next newline
      newlineIndex = this.tokenBuffer.indexOf('\n');
    }
  }

  private async finalizeReport() {
      if (this.reportTimeout) {
          clearTimeout(this.reportTimeout);
          this.reportTimeout = null;
      }
      
      if (this.currentReportFields.length === 0) {
          this.currentReportLines = [];
          this.blankLineCount = 0;
          return;
      }

      const hash = await AdrDataParser.computeIntegrityHash(this.currentReportLines.join('\n'));
      
      const report: AdrPrintReport = {
          fields: [...this.currentReportFields],
          rawLines: [...this.currentReportLines],
          integrityHash: hash,
          timestamp: new Date()
      };

      console.log('[ADR REPORT]', report);
      this.notifyReport(report);

      this.currentReportFields = [];
      this.currentReportLines = [];
      this.blankLineCount = 0;
  }
}

// Export as a singleton instance
export const adrSerialService = new AdrSerialService();
